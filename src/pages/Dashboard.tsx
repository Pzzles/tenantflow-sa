import React, { useEffect, useState } from 'react';
import { 
  Building2, 
  Users, 
  CreditCard, 
  TrendingUp,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { Navigate } from 'react-router-dom';

export default function Dashboard() {
  const { profile, loading: authLoading } = useAuth();
  const [stats, setStats] = useState({
    properties: 0,
    tenants: 0,
    income: 0,
    overdue: 0
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [maintenance, setMaintenance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile && (profile.role === 'LANDLORD' || profile.role === 'ADMIN')) {
      fetchLandlordStats();
    }
  }, [profile]);

  const fetchLandlordStats = async () => {
    try {
      setLoading(true);
      
      // Fetch properties count
      const { count: propertyCount } = await supabase
        .from('properties')
        .select('*', { count: 'exact', head: true });

      // Fetch active leases (tenants)
      const { count: tenantCount } = await supabase
        .from('leases')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'ACTIVE');

      // Fetch monthly income (paid payments this month)
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: payments } = await supabase
        .from('payments')
        .select('amount')
        .eq('status', 'PAID')
        .gte('date', startOfMonth.toISOString());

      const totalIncome = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

      // Fetch overdue payments
      const { count: overdueCount } = await supabase
        .from('payments')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'OVERDUE');

      // Fetch recent activity
      const { data: activity } = await supabase
        .from('payments')
        .select(`
          id,
          amount,
          date,
          type,
          leases (
            units (
              unit_number
            )
          )
        `)
        .order('date', { ascending: false })
        .limit(5);

      // Fetch maintenance requests
      const { data: requests } = await supabase
        .from('maintenance_requests')
        .select(`
          id,
          title,
          priority,
          created_at,
          profiles (
            full_name
          ),
          units (
            unit_number
          )
        `)
        .eq('status', 'PENDING')
        .order('created_at', { ascending: false })
        .limit(3);

      setStats({
        properties: propertyCount || 0,
        tenants: tenantCount || 0,
        income: totalIncome,
        overdue: overdueCount || 0
      });
      setRecentActivity(activity || []);
      setMaintenance(requests || []);

    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (profile?.role === 'TENANT') {
    return <Navigate to="/tenant-dashboard" replace />;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {profile?.fullName || 'Landlord'}. Here's what's happening today.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Properties</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.properties}</div>
            <p className="text-xs text-muted-foreground">Managed properties</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Tenants</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.tenants}</div>
            <p className="text-xs text-muted-foreground">Across all units</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Income</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.income)}</div>
            <p className="text-xs text-muted-foreground">Received this month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Payments</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.overdue}</div>
            <p className="text-xs text-muted-foreground">Requires attention</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.length > 0 ? (
                recentActivity.map((item) => (
                  <div key={item.id} className="flex items-center gap-4 border-b pb-4 last:border-0 last:pb-0">
                    <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
                      <CreditCard className="h-5 w-5" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {item.type} payment received from {item.leases?.units?.unit_number || 'Unit'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(item.date), { addSuffix: true })}
                      </p>
                    </div>
                    <div className="font-medium">{formatCurrency(item.amount)}</div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No recent activity</p>
              )}
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Maintenance Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {maintenance.length > 0 ? (
                maintenance.map((item) => (
                  <div key={item.id} className="flex flex-col gap-1 border-b pb-4 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{item.title} - {item.units?.unit_number}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        item.priority === 'URGENT' ? 'bg-red-100 text-red-800' :
                        item.priority === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {item.priority}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Reported by {item.profiles?.full_name} • {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No pending requests</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
