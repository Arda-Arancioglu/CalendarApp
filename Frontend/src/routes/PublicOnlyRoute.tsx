import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { FullScreenLoader } from '../components/ui/Spinner';
import { getRedirectPath } from './redirect';

/**
 * Layout route for /login and /register: logged-in users are redirected away
 * (to the page they originally wanted, or /calendar). This is also what moves
 * the user to /calendar right after a successful login or registration.
 */
export function PublicOnlyRoute() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'checking') return <FullScreenLoader label="Checking your session" />;
  if (status === 'authenticated') return <Navigate to={getRedirectPath(location.state)} replace />;
  return <Outlet />;
}
