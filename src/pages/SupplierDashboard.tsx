import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { MaintenanceRequest } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wrench, Clock, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';

export default function SupplierDashboard() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchAssignedRequests();
    }
  }, [user]);

  const fetchAssignedRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('maintenance_requests')
        .select('*')
        .eq('supplier_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data as any[]);
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-500/10 text-yellow-500';
      case 'APPROVED': return 'bg-blue-500/10 text-blue-500';
      case 'IN_PROGRESS': return 'bg-purple-500/10 text-purple-500';
      case 'RESOLVED': return 'bg-green-500/10 text-green-500';
      case 'REJECTED': return 'bg-red-500/10 text-red-500';
      default: return 'bg-gray-500/10 text-gray-500';
    }
  };

  if (loading) return <div className="p-8">Loading assigned jobs...</div>;

  return (
    <div className="p-4 md:p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Supplier Dashboard</h1>
        <p className="text-muted-foreground">Manage your assigned maintenance jobs.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Jobs</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {requests.filter(r => r.status === 'APPROVED').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {requests.filter(r => r.status === 'IN_PROGRESS').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {requests.filter(r => r.status === 'RESOLVED').length}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Assigned Maintenance Requests</h2>
        {requests.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              No maintenance requests assigned to you yet.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {requests.map((request) => (
              <Card key={request.id}>
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">{request.title}</h3>
                        <Badge className={getStatusColor(request.status)}>
                          {request.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{request.description}</p>
                      <p className="text-xs text-muted-foreground">
                        Assigned on: {format(new Date(request.createdAt), 'PPP')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {request.status === 'APPROVED' && (
                        <button 
                          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"
                          onClick={async () => {
                            await supabase
                              .from('maintenance_requests')
                              .update({ status: 'IN_PROGRESS' })
                              .eq('id', request.id);
                            fetchAssignedRequests();
                          }}
                        >
                          Start Job
                        </button>
                      )}
                      {request.status === 'IN_PROGRESS' && (
                        <button 
                          className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium"
                          onClick={async () => {
                            await supabase
                              .from('maintenance_requests')
                              .update({ status: 'RESOLVED' })
                              .eq('id', request.id);
                            fetchAssignedRequests();
                          }}
                        >
                          Mark Resolved
                        </button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
