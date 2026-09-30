import { api, TOKEN_KEY, USER_KEY } from './api';
import type { AuthResponse, LoginCredentials, RegisterCredentials } from '../types/auth';

export const authService = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    try {
      const response = await api.post<AuthResponse>('/auth/login', credentials);
      if (response.data && response.data.token) {
        localStorage.setItem(TOKEN_KEY, response.data.token);
        localStorage.setItem(
          USER_KEY,
          JSON.stringify({ userId: response.data.userId, username: response.data.username })
        );
      }
      return response.data;
    } catch (err: any) {
      // If DEMO mode is explicitly enabled via env flag, fallback to mock demo auth
      if (import.meta.env.VITE_ENABLE_DEMO_MOCK === 'true') {
        const mockResponse: AuthResponse = {
          token: `demo-token-${Date.now()}`,
          userId: 1,
          username: credentials.username || 'demo_user',
        };
        localStorage.setItem(TOKEN_KEY, mockResponse.token);
        localStorage.setItem(
          USER_KEY,
          JSON.stringify({ userId: mockResponse.userId, username: mockResponse.username })
        );
        return mockResponse;
      }
      throw err;
    }
  },

  register: async (credentials: RegisterCredentials): Promise<AuthResponse> => {
    try {
      const response = await api.post<AuthResponse>('/auth/register', credentials);
      if (response.data && response.data.token) {
        localStorage.setItem(TOKEN_KEY, response.data.token);
        localStorage.setItem(
          USER_KEY,
          JSON.stringify({ userId: response.data.userId, username: response.data.username })
        );
      }
      return response.data;
    } catch (err: any) {
      if (import.meta.env.VITE_ENABLE_DEMO_MOCK === 'true') {
        const mockResponse: AuthResponse = {
          token: `demo-token-${Date.now()}`,
          userId: Math.floor(Math.random() * 1000) + 1,
          username: credentials.username || 'new_user',
        };
        localStorage.setItem(TOKEN_KEY, mockResponse.token);
        localStorage.setItem(
          USER_KEY,
          JSON.stringify({ userId: mockResponse.userId, username: mockResponse.username })
        );
        return mockResponse;
      }
      throw err;
    }
  },

  logout: (): void => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },

  getCurrentUser: () => {
    const userJson = localStorage.getItem(USER_KEY);
    if (!userJson) return null;
    try {
      return JSON.parse(userJson);
    } catch {
      return null;
    }
  },

  getToken: (): string | null => {
    return localStorage.getItem(TOKEN_KEY);
  },
};
