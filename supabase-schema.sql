-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  role TEXT CHECK (role IN ('ADMIN', 'LANDLORD', 'TENANT', 'SUPPLIER')) DEFAULT 'TENANT',
  full_name TEXT,
  phone TEXT,
  id_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    COALESCE(new.raw_user_meta_data->>'role', 'TENANT')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Properties table
CREATE TABLE properties (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  landlord_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  type TEXT CHECK (type IN ('APARTMENT', 'HOUSE', 'ROOM', 'COMMERCIAL')) NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Units table
CREATE TABLE units (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID REFERENCES properties ON DELETE CASCADE NOT NULL,
  unit_number TEXT NOT NULL,
  status TEXT CHECK (status IN ('VACANT', 'OCCUPIED', 'MAINTENANCE')) DEFAULT 'VACANT',
  rent_amount NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Leases table
CREATE TABLE leases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  unit_id UUID REFERENCES units ON DELETE CASCADE NOT NULL,
  tenant_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  landlord_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  rent_amount NUMERIC NOT NULL,
  deposit_amount NUMERIC NOT NULL,
  status TEXT CHECK (status IN ('ACTIVE', 'INACTIVE', 'PENDING', 'TERMINATED')) DEFAULT 'PENDING',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Payments table
CREATE TABLE payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lease_id UUID REFERENCES leases ON DELETE CASCADE NOT NULL,
  tenant_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  landlord_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  amount NUMERIC NOT NULL,
  date TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  status TEXT CHECK (status IN ('PAID', 'PENDING', 'OVERDUE', 'PARTIAL')) DEFAULT 'PENDING',
  type TEXT CHECK (type IN ('RENT', 'DEPOSIT', 'UTILITIES', 'OTHER')) DEFAULT 'RENT',
  reference TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Maintenance Requests table
CREATE TABLE maintenance_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  unit_id UUID REFERENCES units ON DELETE CASCADE NOT NULL,
  tenant_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  landlord_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  supplier_id UUID REFERENCES auth.users ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  images TEXT[] DEFAULT '{}',
  priority TEXT CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')) DEFAULT 'MEDIUM',
  status TEXT CHECK (status IN ('PENDING', 'APPROVED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED')) DEFAULT 'PENDING',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Suppliers table
CREATE TABLE suppliers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  landlord_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  category TEXT CHECK (category IN ('PLUMBING', 'ELECTRICAL', 'CLEANING', 'SECURITY', 'GENERAL', 'OTHER')) NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- RLS Policies

-- Profiles: Users can read their own profile, admins can read all
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Properties: Landlords can manage their own properties
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Landlords can manage own properties" ON properties USING (auth.uid() = landlord_id);
CREATE POLICY "Admins can manage all properties" ON properties USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
);
CREATE POLICY "Tenants can view their property" ON properties FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM leases 
    JOIN units ON leases.unit_id = units.id 
    WHERE units.property_id = properties.id AND leases.tenant_id = auth.uid()
  )
);

-- Units: Landlords can manage units of their properties
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Landlords can manage units" ON units USING (
  EXISTS (SELECT 1 FROM properties WHERE properties.id = units.property_id AND properties.landlord_id = auth.uid())
);
CREATE POLICY "Admins can manage all units" ON units USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
);
CREATE POLICY "Tenants can view their unit" ON units FOR SELECT USING (
  EXISTS (SELECT 1 FROM leases WHERE leases.unit_id = units.id AND leases.tenant_id = auth.uid())
);

-- Leases: Landlords and involved tenants can view
ALTER TABLE leases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Landlords can manage leases" ON leases USING (auth.uid() = landlord_id);
CREATE POLICY "Admins can manage all leases" ON leases USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
);
CREATE POLICY "Tenants can view own leases" ON leases FOR SELECT USING (auth.uid() = tenant_id);

-- Payments: Landlords and involved tenants can view
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Landlords can manage payments" ON payments USING (auth.uid() = landlord_id);
CREATE POLICY "Admins can manage all payments" ON payments USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
);
CREATE POLICY "Tenants can view own payments" ON payments FOR SELECT USING (auth.uid() = tenant_id);

-- Maintenance Requests: Landlords and involved tenants can view
ALTER TABLE maintenance_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Landlords can manage maintenance" ON maintenance_requests USING (auth.uid() = landlord_id);
CREATE POLICY "Admins can manage all maintenance" ON maintenance_requests USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
);
CREATE POLICY "Tenants can manage own maintenance" ON maintenance_requests USING (auth.uid() = tenant_id);
CREATE POLICY "Suppliers can view and update assigned maintenance" ON maintenance_requests 
  FOR ALL USING (auth.uid() = supplier_id);

-- Suppliers: Landlords can manage their own suppliers
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Landlords can manage suppliers" ON suppliers USING (auth.uid() = landlord_id);
CREATE POLICY "Admins can manage all suppliers" ON suppliers USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
);
