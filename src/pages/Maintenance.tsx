import { useEffect, useState } from 'react';
import { 
  Plus, 
  Search, 
  MoreVertical, 
  Wrench,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function Maintenance() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('all');
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (user) {
      fetchRequests();
    }
  }, [user]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('maintenance_requests')
        .select(`
          *,
          profiles:tenant_id (
            full_name
          ),
          units (
            unit_number,
            properties (
              name
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error: any) {
      console.error('Error fetching maintenance requests:', error);
      toast.error('Failed to load maintenance requests');
    } finally {
      setLoading(false);
    }
  };

  const filteredRequests = requests.filter(r => {
    const matchesTab = activeTab === 'all' || r.status.toLowerCase() === activeTab.replace('-', '_');
    const matchesSearch = r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         r.units?.properties?.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Maintenance</h1>
          <p className="text-muted-foreground">Track and manage repair requests from tenants.</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          New Request
        </Button>
      </div>

      <Tabs defaultValue="all" className="w-full" onValueChange={setActiveTab}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="in-progress">In Progress</TabsTrigger>
            <TabsTrigger value="resolved">Resolved</TabsTrigger>
          </TabsList>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search requests..." 
              className="pl-8" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <TabsContent value={activeTab} className="mt-6">
          {loading ? (
            <div className="flex items-center justify-center min-h-[200px]">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredRequests.length > 0 ? (
            <div className="grid gap-4">
              {filteredRequests.map((request) => (
                <Card key={request.id}>
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg">{request.title}</CardTitle>
                          <Badge 
                            variant={
                              request.priority === 'URGENT' ? 'destructive' : 
                              request.priority === 'HIGH' ? 'default' : 'secondary'
                            }
                            className="text-[10px] h-5"
                          >
                            {request.priority}
                          </Badge>
                        </div>
                        <CardDescription>
                          {request.units?.properties?.name} • {request.units?.unit_number} • Reported by {request.profiles?.full_name}
                        </CardDescription>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8" />}>
                          <MoreVertical className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>View Details</DropdownMenuItem>
                          <DropdownMenuItem>Update Status</DropdownMenuItem>
                          <DropdownMenuItem>Assign Contractor</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">Reject Request</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {request.description}
                    </p>
                    <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(request.created_at), 'MMM dd, yyyy')}
                      </div>
                      <div className="flex items-center gap-1">
                        {request.status === 'RESOLVED' ? (
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                        ) : request.status === 'IN_PROGRESS' ? (
                          <Wrench className="h-3 w-3 text-blue-500" />
                        ) : (
                          <AlertTriangle className="h-3 w-3 text-orange-500" />
                        )}
                        <span className="capitalize">{request.status.replace('_', ' ')}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-muted/20 rounded-lg border-2 border-dashed">
              <Wrench className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">No maintenance requests</h3>
              <p className="text-muted-foreground">Everything seems to be in order.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
