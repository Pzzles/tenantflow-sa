import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  CreditCard, 
  Wrench, 
  MessageSquare, 
  Bell, 
  Settings,
  LogOut,
  Truck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const sidebarItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/', roles: ['ADMIN', 'LANDLORD', 'TENANT', 'SUPPLIER'] },
  { icon: Building2, label: 'Properties', href: '/properties', roles: ['ADMIN', 'LANDLORD'] },
  { icon: Users, label: 'Tenants', href: '/tenants', roles: ['ADMIN', 'LANDLORD'] },
  { icon: Truck, label: 'Suppliers', href: '/suppliers', roles: ['ADMIN', 'LANDLORD'] },
  { icon: Users, label: 'Users', href: '/users', roles: ['ADMIN'] },
  { icon: CreditCard, label: 'Payments', href: '/payments', roles: ['ADMIN', 'LANDLORD', 'TENANT'] },
  { icon: Wrench, label: 'Maintenance', href: '/maintenance', roles: ['ADMIN', 'LANDLORD', 'TENANT', 'SUPPLIER'] },
  { icon: MessageSquare, label: 'Messages', href: '/messages', roles: ['ADMIN', 'LANDLORD', 'TENANT', 'SUPPLIER'] },
  { icon: Bell, label: 'Notifications', href: '/notifications', roles: ['ADMIN', 'LANDLORD', 'TENANT', 'SUPPLIER'] },
  { icon: Settings, label: 'Settings', href: '/settings', roles: ['ADMIN', 'LANDLORD', 'TENANT', 'SUPPLIER'] },
];

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, loading, dbReady, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
      navigate('/auth');
    } catch (error) {
      toast.error('Failed to logout');
    }
  };

  const filteredItems = sidebarItems.filter(item => 
    profile && item.roles.includes(profile.role)
  );

  if (!dbReady) {
    return (
      <div className="hidden border-r bg-muted/40 md:block w-64">
        <div className="flex h-full flex-col items-center justify-center p-6 text-center space-y-4">
          <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
            <Building2 className="h-6 w-6" />
          </div>
          <h3 className="font-bold text-destructive">Database Not Ready</h3>
          <p className="text-xs text-muted-foreground">
            The "profiles" table is missing. Please run the SQL in <code className="bg-muted px-1 rounded">supabase-schema.sql</code> in your Supabase SQL Editor.
          </p>
          <Button variant="outline" size="sm" onClick={() => window.open('https://supabase.com/dashboard', '_blank')}>
            Open Supabase
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="hidden border-r bg-muted/40 md:block w-64">
        <div className="flex h-full flex-col gap-2 p-6">
          <div className="h-8 w-32 bg-muted animate-pulse rounded" />
          <div className="space-y-4 mt-8">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-10 w-full bg-muted animate-pulse rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="hidden border-r bg-muted/40 md:block w-64">
        <div className="flex h-full flex-col items-center justify-center p-6 text-center space-y-4">
          <p className="text-sm text-muted-foreground">Profile not found. Please try logging out and back in.</p>
          <Button variant="outline" size="sm" onClick={handleLogout}>Logout</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="hidden border-r bg-muted/40 md:block w-64">
      <div className="flex h-full max-h-screen flex-col gap-2">
        <div className="flex h-14 items-center border-b px-6">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <Building2 className="h-6 w-6 text-primary" />
            <span className="">TenantFlow SA</span>
          </Link>
        </div>
        <ScrollArea className="flex-1 px-4">
          <nav className="grid items-start gap-2 py-4">
            {filteredItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:text-primary",
                  location.pathname === item.href 
                    ? "bg-primary text-primary-foreground" 
                    : "text-muted-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>
        </ScrollArea>
        <div className="mt-auto p-4 border-t">
          <div className="px-2 py-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Account</p>
            <div className="flex items-center gap-3 px-2 mb-4">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                {profile?.fullName?.charAt(0) || 'U'}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-medium truncate">{profile?.fullName || user?.displayName || 'User'}</p>
                <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
                <p className="text-xs font-semibold text-primary truncate">{profile?.role || 'Role'}</p>
              </div>
            </div>
          </div>
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>
    </div>
  );
}

