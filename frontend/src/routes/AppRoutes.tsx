import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

// Pages
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { FDRRepositoryPage } from '../pages/FDRRepositoryPage';
import { NewFDRPage } from '../pages/NewFDRPage';
import { FDRDetailsPage } from '../pages/FDRDetailsPage';
import { OcrWorkspacePage } from '../pages/OcrWorkspacePage';
import { VerificationScrutinyPage } from '../pages/VerificationScrutinyPage';
import { RenewalsMaturityPage } from '../pages/RenewalsMaturityPage';
import { ReleasesPage } from '../pages/ReleasesPage';
import { NotificationsPage } from '../pages/NotificationsPage';
import { AuditTrailPage } from '../pages/AuditTrailPage';
import { ReportsAnalyticsPage } from '../pages/ReportsAnalyticsPage';
import { UserManagementPage } from '../pages/UserManagementPage';
import { InstitutionManagementPage } from '../pages/InstitutionManagementPage';
import { ProfileSettingsPage } from '../pages/ProfileSettingsPage';

const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles?: string[] }> = ({
  children,
  allowedRoles,
}) => {
  const { isAuthenticated, isLoading, role } = useAuth();

  if (isLoading) {
    return <LoadingSpinner message="Verifying security credentials..." fullPage />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* Protected Dashboard Layout */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="fdrs" element={<FDRRepositoryPage />} />
        <Route path="fdrs/new" element={<NewFDRPage />} />
        <Route path="fdrs/:id" element={<FDRDetailsPage />} />
        
        {/* Core AI Flagship Route */}
        <Route path="ocr-workspace" element={<OcrWorkspacePage />} />

        {/* Scrutiny Queue for Officers & Admins */}
        <Route
          path="scrutiny-queue"
          element={
            <ProtectedRoute allowedRoles={['AICTE_OFFICER', 'ADMIN']}>
              <VerificationScrutinyPage />
            </ProtectedRoute>
          }
        />

        <Route path="renewals" element={<RenewalsMaturityPage />} />
        <Route path="releases" element={<ReleasesPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="reports" element={<ReportsAnalyticsPage />} />
        <Route path="institutions" element={<InstitutionManagementPage />} />
        
        {/* Admin and Officer routes */}
        <Route
          path="audit-trail"
          element={
            <ProtectedRoute allowedRoles={['AICTE_OFFICER', 'ADMIN']}>
              <AuditTrailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="users"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <UserManagementPage />
            </ProtectedRoute>
          }
        />

        <Route path="settings" element={<ProfileSettingsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

