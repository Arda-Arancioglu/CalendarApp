export interface User {
  userId: number;
  username: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterCredentials {
  username: string;
  password: string;
  birthDate: string; // Format: "YYYY-MM-DD"
}

export interface AuthResponse {
  token: string;
  userId: number;
  username: string;
}
