import { createContext } from 'react';
import type { LoginRequestDTO, RegisterRequestDTO } from '../types/auth';
import type { UserResponseDTO } from '../types/user';

/**
 * - 'checking':      we have a stored token and are asking GET /user/me if it's still valid
 * - 'authenticated': logged in
 * - 'anonymous':     logged out
 */
export type AuthStatus = 'checking' | 'authenticated' | 'anonymous';

export interface AuthContextValue {
  status: AuthStatus;
  user: UserResponseDTO | null;
  isAuthenticated: boolean;
  /** One-off message for the login page, e.g. "Your session has expired". */
  notice: string | null;
  clearNotice: () => void;
  /** Throws ApiError on failure so the form can show the server's message inline. */
  login: (body: LoginRequestDTO) => Promise<void>;
  register: (body: RegisterRequestDTO) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
