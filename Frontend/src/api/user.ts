import { request } from './client';
import type { UserResponseDTO } from '../types/user';

/** Used on app start to check that the stored token is still accepted. */
export function getMe(signal?: AbortSignal): Promise<UserResponseDTO> {
  return request<UserResponseDTO>('/user/me', { signal });
}
