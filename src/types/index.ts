export type UserRole = 'ADMIN' | 'LANDLORD' | 'TENANT' | 'SUPPLIER';

export interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
  fullName: string;
  phone?: string;
  idNumber?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Property {
  id: string;
  landlordId: string;
  name: string;
  address: string;
  type: 'APARTMENT' | 'HOUSE' | 'ROOM' | 'COMMERCIAL';
  imageUrl?: string;
  createdAt: number;
}

export interface Unit {
  id: string;
  propertyId: string;
  unitNumber: string;
  status: 'VACANT' | 'OCCUPIED' | 'MAINTENANCE';
  rentAmount: number;
  createdAt: number;
}

export interface Lease {
  id: string;
  unitId: string;
  tenantId: string;
  landlordId: string;
  startDate: string;
  endDate: string;
  rentAmount: number;
  depositAmount: number;
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'TERMINATED';
  createdAt: number;
}

export interface Payment {
  id: string;
  leaseId: string;
  tenantId: string;
  landlordId: string;
  amount: number;
  date: number;
  status: 'PAID' | 'PENDING' | 'OVERDUE' | 'PARTIAL';
  type: 'RENT' | 'DEPOSIT' | 'UTILITIES' | 'OTHER';
  reference: string;
  notes?: string;
}

export interface MaintenanceRequest {
  id: string;
  unitId: string;
  tenantId: string;
  landlordId: string;
  supplierId?: string;
  title: string;
  description: string;
  images: string[];
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'PENDING' | 'APPROVED' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED';
  createdAt: number;
  updatedAt: number;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  createdAt: number;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  read: boolean;
  type: 'RENT_DUE' | 'RENT_OVERDUE' | 'MAINTENANCE_UPDATE' | 'LEASE_EXPIRY' | 'MESSAGE';
  createdAt: number;
}

export interface Supplier {
  id: string;
  landlordId: string;
  name: string;
  category: 'PLUMBING' | 'ELECTRICAL' | 'CLEANING' | 'SECURITY' | 'GENERAL' | 'OTHER';
  email?: string;
  phone?: string;
  address?: string;
  createdAt: number;
}
