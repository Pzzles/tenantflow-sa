import { useEffect, useState } from 'react';
import { 
  Plus, 
  Search, 
  MoreVertical, 
  Download,
  Filter,
  ArrowUpRight,
  ArrowDownLeft,
  Loader2,
  CreditCard
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/utils';

export default function Payments() {
  const { user, profile } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    collected: 0,
    pending: 0,
    overdue: 0
  });

  const isTenant = profile?.role === 'TENANT';

  useEffect(() => {
    if (user) {
      fetchPayments();
    }
  }, [user]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          profiles:tenant_id (
            full_name
          ),
          leases (
            units (
              unit_number
            )
          )
        `)
        .order('date', { ascending: false });

      if (error) throw error;

      const processedPayments = data || [];
      setPayments(processedPayments);

      // Calculate stats for current month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const collected = processedPayments
        .filter(p => p.status === 'PAID' && new Date(p.date) >= startOfMonth)
        .reduce((sum, p) => sum + Number(p.amount), 0);

      const pending = processedPayments
        .filter(p => p.status === 'PENDING')
        .reduce((sum, p) => sum + Number(p.amount), 0);

      const overdue = processedPayments
        .filter(p => p.status === 'OVERDUE')
        .reduce((sum, p) => sum + Number(p.amount), 0);

      setStats({ collected, pending, overdue });
    } catch (error: any) {
      console.error('Error fetching payments:', error);
      toast.error('Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  const filteredPayments = payments.filter(p => 
    p.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.profiles?.full_name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payments</h1>
          <p className="text-muted-foreground">
            {isTenant ? 'Track your rent and utility payments.' : 'Track rent, deposits, and utility payments.'}
          </p>
        </div>
        <div className="flex gap-2">
          {!isTenant && (
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
          )}
          <Button className="gap-2">
            {isTenant ? (
              <>
                <CreditCard className="h-4 w-4" />
                Pay Rent
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Log Payment
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {isTenant ? 'Total Paid (Month)' : 'Total Collected (Month)'}
            </CardTitle>
            <ArrowDownLeft className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.collected)}</div>
            <p className="text-xs text-muted-foreground">
              {isTenant ? 'Paid this month' : 'Received this month'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {isTenant ? 'Upcoming Payments' : 'Pending Payments'}
            </CardTitle>
            <Filter className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.pending)}</div>
            <p className="text-xs text-muted-foreground">
              {isTenant ? 'Due soon' : 'Awaiting confirmation'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Amount</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.overdue)}</div>
            <p className="text-xs text-muted-foreground">Requires attention</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-sm:w-full sm:max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search payments..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="rounded-md border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayments.length > 0 ? (
                filteredPayments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">{payment.reference}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">{payment.profiles?.full_name}</div>
                        <div className="text-muted-foreground">Unit {payment.leases?.units?.unit_number}</div>
                      </div>
                    </TableCell>
                    <TableCell>{format(new Date(payment.date), 'MMM dd, yyyy')}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{payment.type}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{formatCurrency(payment.amount)}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={
                          payment.status === 'PAID' ? 'default' : 
                          payment.status === 'OVERDUE' ? 'destructive' : 'secondary'
                        }
                      >
                        {payment.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8" />}>
                          <MoreVertical className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>View Receipt</DropdownMenuItem>
                          <DropdownMenuItem>Edit Record</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">Void Payment</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <CreditCard className="h-8 w-8" />
                      <p>No payments found.</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
