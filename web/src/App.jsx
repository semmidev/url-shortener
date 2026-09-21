import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { I18nProvider } from '@/context/I18nContext';
import { PermissionProvider } from '@/context/PermissionContext';
import { TenantProvider } from '@/context/TenantContext';
import { useAuthStore } from '@/features/auth/store';
import TopLoadingBar from '@/components/TopLoadingBar';
import DirectionalTransition from '@/components/DirectionalTransition';

import Login from '@/features/auth/pages/Login';
import Register from '@/features/auth/pages/Register';
import GoogleCallback from '@/features/auth/pages/GoogleCallback';
import InvalidURLPage from '@/features/urls/pages/InvalidURLPage';

import DashboardLayout from '@/features/dashboard/pages/DashboardLayout';
import Overview from '@/features/dashboard/pages/OverviewPage';
import URLs from '@/features/urls/pages/URLsPage';
import URLDetailPage from '@/features/urls/pages/URLDetailPage';
import Analytics from '@/features/analytics/pages/AnalyticsPage';

import WorkspaceMembersPage from '@/features/tenant/pages/WorkspaceMembersPage';
import WorkspaceRolesPage from '@/features/tenant/pages/WorkspaceRolesPage';
import WorkspaceSettingsPage from '@/features/tenant/pages/WorkspaceSettingsPage';
import WorkspaceLinksPage from '@/features/tenant/pages/WorkspaceLinksPage';

import Account from '@/features/account/pages/AccountPage';
import NotificationsPage from '@/features/notifications/pages/NotificationsPage';

function PrivateRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function PublicRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default function App() {
  const initialize = useAuthStore((state) => state.initialize);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    initialize();
    const savedPreset = localStorage.getItem("theme-preset") || "claude";
    document.documentElement.setAttribute('data-theme', savedPreset);
  }, [initialize]);

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} storageKey="theme-mode">
      <I18nProvider>
        <TenantProvider user={user}>
          <PermissionProvider user={user}>
            <Toaster position="top-right" richColors />
            <Router>
            <TopLoadingBar />
            <Routes>
            {/* Root Redirect */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            {/* Public Auth Routes */}
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <DirectionalTransition>
                    <Login />
                  </DirectionalTransition>
                </PublicRoute>
              }
            />
            <Route
              path="/register"
              element={
                <PublicRoute>
                  <DirectionalTransition>
                    <Register />
                  </DirectionalTransition>
                </PublicRoute>
              }
            />
            <Route path="/auth/google/callback" element={<GoogleCallback />} />
            <Route path="/invalid-url" element={<InvalidURLPage />} />

            {/* Protected Dashboard Layout & Subroutes */}
            <Route
              path="/dashboard"
              element={
                <PrivateRoute>
                  <DashboardLayout />
                </PrivateRoute>
              }
            >
              <Route index element={<DirectionalTransition><Overview /></DirectionalTransition>} />
              <Route path="urls" element={<DirectionalTransition><URLs /></DirectionalTransition>} />
              <Route path="urls/:id" element={<DirectionalTransition><URLDetailPage /></DirectionalTransition>} />
              <Route path="analytics" element={<DirectionalTransition><Analytics /></DirectionalTransition>} />
              <Route path="workspace/links" element={<DirectionalTransition><WorkspaceLinksPage /></DirectionalTransition>} />
              <Route path="workspace/members" element={<DirectionalTransition><WorkspaceMembersPage /></DirectionalTransition>} />
              <Route path="workspace/roles" element={<DirectionalTransition><WorkspaceRolesPage /></DirectionalTransition>} />
              <Route path="workspace/settings" element={<DirectionalTransition><WorkspaceSettingsPage /></DirectionalTransition>} />
              <Route path="account" element={<DirectionalTransition><Account /></DirectionalTransition>} />
              <Route path="notifications" element={<DirectionalTransition><NotificationsPage /></DirectionalTransition>} />
            </Route>

            {/* Fallback wildcard route */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
          </Router>
        </PermissionProvider>
      </TenantProvider>
    </I18nProvider>
    </ThemeProvider>
  );
}
