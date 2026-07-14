import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './lib/auth';
import { useAuth } from './lib/auth-context';
import { Toaster } from './lib/toast';
import { DashboardLayout } from './pages/DashboardLayout';
import { Login } from './pages/Login';
import { Overview } from './pages/Overview';
import { Services } from './pages/Services';
import { Customers } from './pages/Customers';
import { PaymentRequests } from './pages/PaymentRequests';
import { UsageEvents } from './pages/UsageEvents';
import { Webhooks } from './pages/Webhooks';
import { Quickstart } from './pages/Quickstart';
import { Preflight } from './pages/Preflight';
import { DemoService } from './pages/DemoService';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

/* Gate the dashboard behind login/demo mode. */
function RequireAuth() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<RequireAuth />}>
              <Route path="/" element={<DashboardLayout />}>
                <Route index element={<Overview />} />
                <Route path="services" element={<Services />} />
                <Route path="customers" element={<Customers />} />
                <Route path="payments" element={<PaymentRequests />} />
                <Route path="preflight" element={<Preflight />} />
                <Route path="usage" element={<UsageEvents />} />
                <Route path="webhooks" element={<Webhooks />} />
                <Route path="quickstart" element={<Quickstart />} />
              </Route>
              <Route path="/demo-service" element={<DemoService />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}
