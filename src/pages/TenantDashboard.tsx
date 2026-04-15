import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Wrench, 
  MessageSquare, 
  Home, 
  Clock,
  Plus,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Lease, Payment, MaintenanceRequest, Unit, Property } from '@/types';
import { cn, formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { MediaUpload } from '@/components/ui/MediaUpload';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function TenantDashboard() {
  const { user, profile } = useAuth();
  const [lease, setLease] = useState<any | null>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [maintenance, setMaintenance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMaintenanceDialogOpen, setIsMaintenanceDialogOpen] = useState(false);

  // Maintenance form state
  const [maintenanceForm, setMaintenanceForm] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM' as MaintenanceRequest['priority']
  });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  useEffect(() => {
    if (user) {
      fetchTenantData();
    }
  }, [user]);

  const fetchTenantData = async () => {
    try {
      setLoading(true);
      
      // Get active lease with unit and property details
      const { data: leaseData, error: leaseError } = await supabase
        .from('leases')
        .select(`
          *,
          units (
            *,
            properties (*)
          )
        `)
        .eq('tenant_id', user?.id)
        .eq('status', 'ACTIVE')
        .single();

      if (leaseError && leaseError.code !== 'PGRST116') {
        throw leaseError;
      }
      
      setLease(leaseData);

      // Get payments
      const { data: paymentsData } = await supabase
        .from('payments')
        .select('*')
        .eq('tenant_id', user?.id)
        .order('date', { ascending: false })
        .limit(10);

      setPayments(paymentsData || []);

      // Get maintenance requests
      const { data: maintenanceData } = await supabase
        .from('maintenance_requests')
        .select('*')
        .eq('tenant_id', user?.id)
        .order('created_at', { ascending: false });

      setMaintenance(maintenanceData || []);

    } catch (error: any) {
      console.error('Error fetching tenant data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleMaintenanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !lease) return;

    try {
      // In a real app, we would upload files to storage first and get URLs
      const mockImageUrls = selectedFiles.map((_, i) => `https://picsum.photos/seed/maintenance-${i}/800/600`);

      const { error } = await supabase
        .from('maintenance_requests')
        .insert({
          ...maintenanceForm,
          unit_id: lease.unit_id,
          tenant_id: user.id,
          landlord_id: lease.landlord_id,
          images: mockImageUrls,
          status: 'PENDING',
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      toast.success('Maintenance request submitted successfully');
      setIsMaintenanceDialogOpen(false);
      setMaintenanceForm({ title: '', description: '', priority: 'MEDIUM' });
      setSelectedFiles([]);
      fetchTenantData();
    } catch (error: any) {
      console.error('Error submitting maintenance request:', error);
      toast.error('Failed to submit request');
    }
  };

  const handlePayRent = () => {
    toast.info('Rent payment feature coming soon! Integrating with PayFast/Stripe.');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Welcome, {profile?.fullName?.split(' ')[0]}</h1>
        <p className="text-muted-foreground">Here's what's happening with your tenancy.</p>
      </div>

      {!lease ? (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>No Active Lease</CardTitle>
            <CardDescription>You don't have an active lease agreement in the system yet.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Please contact your landlord to be added to a property.</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 md:w-auto">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Monthly Rent</CardTitle>
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(lease.rent_amount)}</div>
                  <p className="text-xs text-muted-foreground">Due on the 1st of every month</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Lease Status</CardTitle>
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{lease.status}</div>
                  <p className="text-xs text-muted-foreground">Ends {format(new Date(lease.end_date), 'MMM d, yyyy')}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Maintenance</CardTitle>
                  <Wrench className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{maintenance.filter(m => m.status !== 'RESOLVED').length}</div>
                  <p className="text-xs text-muted-foreground">Active requests</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Next Payment</CardTitle>
                  <Clock className="h-4 w-4 text-orange-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(lease.rent_amount)}</div>
                  <p className="text-xs text-muted-foreground">Due in 5 days</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-7">
              <Card className="md:col-span-4">
                <CardHeader>
                  <CardTitle>Your Home</CardTitle>
                  <CardDescription>Details about your current residence.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="h-24 w-24 rounded-lg bg-muted flex items-center justify-center overflow-hidden border">
                      {lease.units?.properties?.image_url ? (
                        <img src={lease.units.properties.image_url} alt={lease.units.properties.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <Home className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 space-y-1">
                      <h3 className="font-bold text-lg">{lease.units?.properties?.name || 'Loading...'}</h3>
                      <p className="text-sm text-muted-foreground">{lease.units?.properties?.address}</p>
                      <div className="flex gap-2 pt-2">
                        <Badge variant="outline">Unit {lease.units?.unit_number}</Badge>
                        <Badge variant="outline">{lease.units?.properties?.type}</Badge>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-semibold">Move-in Date</p>
                      <p className="text-sm font-medium">{format(new Date(lease.start_date), 'MMMM d, yyyy')}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-semibold">Deposit Paid</p>
                      <p className="text-sm font-medium">{formatCurrency(lease.deposit_amount)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="md:col-span-3">
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button className="w-full justify-start gap-2" size="lg" onClick={handlePayRent}>
                    <CreditCard className="h-4 w-4" />
                    Pay Rent Online
                  </Button>
                  <Button variant="outline" className="w-full justify-start gap-2" size="lg" onClick={() => setIsMaintenanceDialogOpen(true)}>
                    <Wrench className="h-4 w-4" />
                    Report an Issue
                  </Button>
                  <Button variant="outline" className="w-full justify-start gap-2" size="lg">
                    <MessageSquare className="h-4 w-4" />
                    Message Landlord
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="payments" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Payment History</CardTitle>
                  <CardDescription>View your past rent and utility payments.</CardDescription>
                </div>
                <Button onClick={handlePayRent}>Pay Rent</Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {payments.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">No payment records found.</div>
                  ) : (
                    payments.map((payment) => (
                      <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "h-10 w-10 rounded-full flex items-center justify-center",
                            payment.status === 'PAID' ? "bg-green-100 text-green-600" : "bg-orange-100 text-orange-600"
                          )}>
                            <CreditCard className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-medium">{payment.type} - {format(new Date(payment.date), 'MMMM yyyy')}</p>
                            <p className="text-xs text-muted-foreground">Ref: {payment.reference}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{formatCurrency(payment.amount)}</p>
                          <Badge variant={payment.status === 'PAID' ? 'default' : 'outline'}>
                            {payment.status}
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="maintenance" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">Maintenance Requests</h2>
              <Dialog open={isMaintenanceDialogOpen} onOpenChange={setIsMaintenanceDialogOpen}>
                <DialogTrigger render={<Button className="gap-2" />}>
                  <Plus className="h-4 w-4" />
                  New Request
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Report a Maintenance Issue</DialogTitle>
                    <DialogDescription>Describe the problem and attach photos or videos to help us fix it faster.</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleMaintenanceSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Issue Title</Label>
                      <Input 
                        id="title" 
                        placeholder="e.g. Leaking kitchen tap" 
                        required 
                        value={maintenanceForm.title}
                        onChange={e => setMaintenanceForm({...maintenanceForm, title: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="priority">Priority</Label>
                      <Select 
                        value={maintenanceForm.priority} 
                        onValueChange={(v: any) => setMaintenanceForm({...maintenanceForm, priority: v})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="LOW">Low - Not urgent</SelectItem>
                          <SelectItem value="MEDIUM">Medium - Normal</SelectItem>
                          <SelectItem value="HIGH">High - Urgent</SelectItem>
                          <SelectItem value="URGENT">Emergency - Immediate attention</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea 
                        id="description" 
                        placeholder="Please provide more details about the issue..." 
                        className="min-h-[100px]"
                        required
                        value={maintenanceForm.description}
                        onChange={e => setMaintenanceForm({...maintenanceForm, description: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Photos & Videos</Label>
                      <MediaUpload onFilesSelected={setSelectedFiles} />
                    </div>
                    <DialogFooter>
                      <Button type="submit">Submit Request</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4">
              {maintenance.length === 0 ? (
                <Card className="border-dashed py-12 text-center">
                  <p className="text-muted-foreground">No maintenance requests yet.</p>
                </Card>
              ) : (
                maintenance.map((request) => (
                  <Card key={request.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-lg">{request.title}</CardTitle>
                          <div className="flex gap-2">
                            <Badge variant="outline">{request.priority}</Badge>
                            <Badge>{request.status}</Badge>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">{format(new Date(request.created_at), 'MMM d, yyyy')}</p>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{request.description}</p>
                      {request.images && request.images.length > 0 && (
                        <div className="flex gap-2 overflow-x-auto pb-2">
                          {request.images.map((img: string, i: number) => (
                            <img key={i} src={img} alt="Issue" className="h-16 w-16 rounded object-cover border" referrerPolicy="no-referrer" />
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
