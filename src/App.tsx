/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import Properties from './pages/Properties';
import Tenants from './pages/Tenants';
import Payments from './pages/Payments';
import Maintenance from './pages/Maintenance';
import Auth from './pages/Auth';
import Suppliers from './pages/Suppliers';
import Users from './pages/Users';
import TenantDashboard from './pages/TenantDashboard';
import SupplierDashboard from './pages/SupplierDashboard';
import { useAuth } from './contexts/AuthContext';
import { UserRole } from './types';
import { StatusPage } from './components/ui/StatusPage';

import { Toaster } from 'sonner';

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: UserRole[] }) {
  const { user, profile, loading } = useAuth();

  if (loading) return <div className="flex h-screen items-center justify-center">Loading...</div>;
  if (!user) return <Navigate to="/auth" />;
  
  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    return <Navigate to="/" />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={
              <RoleBasedHome />
            } />
            <Route path="properties" element={
              <ProtectedRoute allowedRoles={['ADMIN', 'LANDLORD']}>
                <Properties />
              </ProtectedRoute>
            } />
            <Route path="tenants" element={
              <ProtectedRoute allowedRoles={['ADMIN', 'LANDLORD']}>
                <Tenants />
              </ProtectedRoute>
            } />
            <Route path="payments" element={<Payments />} />
            <Route path="maintenance" element={<Maintenance />} />
            <Route path="suppliers" element={
              <ProtectedRoute allowedRoles={['ADMIN', 'LANDLORD']}>
                <Suppliers />
              </ProtectedRoute>
            } />
            <Route path="users" element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <Users />
              </ProtectedRoute>
            } />
            <Route path="messages" element={<StatusPage type="coming-soon" title="Messaging Center" />} />
            <Route path="notifications" element={<StatusPage type="coming-soon" title="Notifications" />} />
            <Route path="settings" element={<StatusPage type="coming-soon" title="Account Settings" />} />
          </Route>
          <Route path="/auth" element={<Auth />} />
          <Route path="/500" element={<StatusPage type="500" />} />
          <Route path="*" element={<StatusPage type="404" />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </>
  );
}

function RoleBasedHome() {
  const { profile } = useAuth();
  
  if (profile?.role === 'TENANT') {
    return <TenantDashboard />;
  }

  if (profile?.role === 'SUPPLIER') {
    return <SupplierDashboard />;
  }
  
  return <Dashboard />;
}
