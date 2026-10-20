import { useMemo } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { createQueryClient } from './api/queryClient';
import { AuthProvider } from './context/AuthProvider';
import { ToastProvider } from './context/ToastProvider';
import { useToast } from './hooks/useToast';
import { PrivateRoute } from './routes/PrivateRoute';
import { PublicOnlyRoute } from './routes/PublicOnlyRoute';
import { AppShell } from './components/layout/AppShell';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { CalendarPage } from './pages/CalendarPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { SquadsPage } from './pages/SquadsPage';
import { SquadDetailPage } from './pages/SquadDetailPage';
import { SquadCalendarPage } from './pages/SquadCalendarPage';
import { SettingsPage } from './pages/SettingsPage';
import { NotFoundPage } from './pages/NotFoundPage';

/**
 * Inner app tree that creates the QueryClient with access to `useToast()`,
 * so global 403 / 5xx / network errors can show a toast notification.
 */
function AppProviders() {
  const toast = useToast();
  const queryClient = useMemo(() => createQueryClient(toast), [toast]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public-only auth routes (redirect logged-in users to /calendar) */}
            <Route element={<PublicOnlyRoute />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
            </Route>

            {/* Protected routes inside the responsive AppShell */}
            <Route element={<PrivateRoute />}>
              <Route element={<AppShell />}>
                <Route path="/calendar" element={<CalendarPage />} />
                <Route path="/categories" element={<CategoriesPage />} />
                <Route path="/squads" element={<SquadsPage />} />
                <Route path="/squads/:id" element={<SquadDetailPage />} />
                <Route path="/squads/:id/calendar" element={<SquadCalendarPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/" element={<Navigate to="/calendar" replace />} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export function App() {
  return (
    <ToastProvider>
      <AppProviders />
    </ToastProvider>
  );
}

export default App;
