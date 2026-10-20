import type { ApiDate } from './api';

/** POST /api/auth/login */
export interface LoginRequestDTO {
  username: string;
  password: string;
}

/** POST /api/auth/register */
export interface RegisterRequestDTO {
  username: string;
  password: string;
  birthDate: ApiDate;
}

/** Response of both login and register. */
export interface AuthResponseDTO {
  token: string;
  userId: number;
  username: string;
}
