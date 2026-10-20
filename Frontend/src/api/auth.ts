import { request } from './client';
import type { AuthResponseDTO, LoginRequestDTO, RegisterRequestDTO } from '../types/auth';

// `auth: false` = no token header and no global logout on 401
// (a 401 here means wrong credentials, which the form shows inline).

export function login(body: LoginRequestDTO): Promise<AuthResponseDTO> {
  return request<AuthResponseDTO>('/auth/login', { method: 'POST', body, auth: false });
}

export function register(body: RegisterRequestDTO): Promise<AuthResponseDTO> {
  return request<AuthResponseDTO>('/auth/register', { method: 'POST', body, auth: false });
}
