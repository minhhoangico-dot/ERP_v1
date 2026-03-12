/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { AppShell } from '@/components/layout/AppShell';

import LoginPage from '@/app/login/page';
import DashboardPage from '@/app/dashboard/page';
import RequestsPage from '@/app/requests/page';
import CreateRequestPage from '@/app/requests/create/page';
import RequestDetailPage from '@/app/requests/[id]/page';
import ApprovalsPage from '@/app/approvals/page';
import InventoryPage from '@/app/inventory/page';
import PharmacyPage from '@/app/pharmacy/page';
import ValuationPage from '@/app/valuation/page';
import PortalPage from '@/app/portal/page';
import AdminPage from '@/app/admin/page';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<AppShell />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/requests" element={<RequestsPage />} />
            <Route path="/requests/create" element={<CreateRequestPage />} />
            <Route path="/requests/:id" element={<RequestDetailPage />} />
            <Route path="/approvals" element={<ApprovalsPage />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/pharmacy" element={<PharmacyPage />} />
            <Route path="/valuation" element={<ValuationPage />} />
            <Route path="/portal" element={<PortalPage />} />
            <Route path="/admin" element={<AdminPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
