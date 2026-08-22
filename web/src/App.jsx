import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { I18nProvider } from '@/context/I18nContext';
import { useAuthStore } from '@/features/auth/store';
import TopLoadingBar from '@/components/TopLoadingBar';

import Login from '@/features/auth/pages/Login';
import Register from '@/features/auth/pages/Register';
import GoogleCallback from '@/features/auth/pages/GoogleCallback';
import InvalidURLPage from '@/features/urls/pages/InvalidURLPage';

import DashboardLayout from '@/features/dashboard/pages/DashboardLayout';
import Overview from '@/features/dashboard/pages/OverviewPage';
import URLs from '@/features/urls/pages/URLsPage';
import URLDetailPage from '@/features/urls/pages/URLDetailPage';
import Analytics from '@/features/analytics/pages/AnalyticsPage';
import AdminUsers from '@/features/admin/pages/AdminUsersPage';
import Account from '@/features/account/pages/AccountPage';

function PrivateRoute({ children, adminOnly = false }) {
  const { isAuthenticated, user, isLoading } = useAuthStore();

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

  if (adminOnly && user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
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

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} storageKey="theme-mode">
      <I18nProvider>
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
                  <Login />
                </PublicRoute>
              }
            />
            <Route
              path="/register"
              element={
                <PublicRoute>
                  <Register />
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
              <Route index element={<Overview />} />
              <Route path="urls" element={<URLs />} />
              <Route path="urls/:id" element={<URLDetailPage />} />
              <Route path="analytics" element={<Analytics />} />
              <Route
                path="admin"
                element={
                  <PrivateRoute adminOnly>
                    <AdminUsers />
                  </PrivateRoute>
                }
              />
              <Route path="account" element={<Account />} />
            </Route>

            {/* Fallback wildcard route */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Router>
      </I18nProvider>
    </ThemeProvider>
  );
}
