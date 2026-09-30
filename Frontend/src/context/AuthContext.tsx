import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User, LoginCredentials, RegisterCredentials } from '../types/auth';
import { authService } from '../services/authService';
import { setUnauthorizedCallback } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Synchronously initialize auth state from localStorage to prevent flash of unauthenticated content
  useEffect(() => {
    const storedToken = authService.getToken();
    const storedUser = authService.getCurrentUser();

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(storedUser);
    }
    setIsLoading(false);
  }, []);

  // Register 401/403 session clearing callback
  const handleUnauthorized = useCallback(() => {
    setUser(null);
    setToken(null);
    authService.logout();
  }, []);

  useEffect(() => {
    setUnauthorizedCallback(handleUnauthorized);
  }, [handleUnauthorized]);

  const login = async (credentials: LoginCredentials) => {
    const res = await authService.login(credentials);
    setToken(res.token);
    setUser({ userId: res.userId, username: res.username });
  };

  const register = async (credentials: RegisterCredentials) => {
    const res = await authService.register(credentials);
    setToken(res.token);
    setUser({ userId: res.userId, username: res.username });
  };

  const logout = () => {
    authService.logout();
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
