import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { FullScreenLoader } from '../components/ui/Spinner';

/**
 * Layout route that only renders its children for logged-in users.
 * Anonymous users are sent to /login, remembering where they wanted to go.
 */
export function PrivateRoute() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'checking') return <FullScreenLoader label="Checking your session" />;
  if (status === 'anonymous') return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}
