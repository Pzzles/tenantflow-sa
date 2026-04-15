import { useEffect, useState } from 'react';
import { 
  Plus, 
  Search, 
  MoreVertical, 
  MapPin, 
  Home,
  Users,
  Building2,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export default function Properties() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchProperties();
    }
  }, [user]);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('properties')
        .select(`
          *,
          units (
            id,
            status
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const processedProperties = data.map(p => ({
        ...p,
        totalUnits: p.units?.length || 0,
        occupiedUnits: p.units?.filter((u: any) => u.status === 'OCCUPIED').length || 0
      }));

      setProperties(processedProperties);
    } catch (error: any) {
      console.error('Error fetching properties:', error);
      toast.error('Failed to load properties');
    } finally {
      setLoading(false);
    }
  };

  const filteredProperties = properties.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Properties</h1>
          <p className="text-muted-foreground">Manage your real estate portfolio.</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Property
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search properties..."
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
      ) : filteredProperties.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredProperties.map((property) => (
            <Card key={property.id} className="overflow-hidden">
              <div className="aspect-video relative">
                <img 
                  src={property.image_url || `https://picsum.photos/seed/${property.id}/400/250`} 
                  alt={property.name}
                  className="object-cover w-full h-full"
                  referrerPolicy="no-referrer"
                />
                <Badge className="absolute top-2 right-2 bg-white/90 text-black hover:bg-white">
                  {property.type}
                </Badge>
              </div>
              <CardHeader className="p-4 pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-xl">{property.name}</CardTitle>
                  <DropdownMenu>
                    <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8" />}>
                      <MoreVertical className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Edit Details</DropdownMenuItem>
                      <DropdownMenuItem>View Units</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  {property.address}
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="flex items-center justify-between mt-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Home className="h-4 w-4 text-muted-foreground" />
                    <span>{property.totalUnits} Units</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{property.occupiedUnits} Occupied</span>
                  </div>
                </div>
                <div className="w-full bg-muted rounded-full h-2 mt-2">
                  <div 
                    className="bg-primary h-2 rounded-full" 
                    style={{ width: `${property.totalUnits > 0 ? (property.occupiedUnits / property.totalUnits) * 100 : 0}%` }}
                  />
                </div>
              </CardContent>
              <CardFooter className="p-4 border-t bg-muted/20">
                <Button variant="outline" className="w-full">View Details</Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-muted/20 rounded-lg border-2 border-dashed">
          <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">No properties found</h3>
          <p className="text-muted-foreground mb-4">Get started by adding your first property.</p>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add Property
          </Button>
        </div>
      )}
    </div>
  );
}
