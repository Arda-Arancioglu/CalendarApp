import { useContext } from 'react';
import { AuthContext, type AuthContextValue } from '../context/AuthContext';

/** Access the current user and login/logout functions from any component. */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
