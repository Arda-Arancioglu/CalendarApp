import { request } from './client';
import type { ThemeUpdateRequestDTO, UserResponseDTO } from '../types/user';

/** Used on app start to check that the stored token is still accepted. */
export function getMe(signal?: AbortSignal): Promise<UserResponseDTO> {
  return request<UserResponseDTO>('/user/me', { signal });
}

/** Persist the user's preferred color theme across devices (`PUT /api/user/theme`). */
export function updateUserTheme(theme: string): Promise<UserResponseDTO> {
  const body: ThemeUpdateRequestDTO = { theme };
  return request<UserResponseDTO>('/user/theme', {
    method: 'PUT',
    body,
  });
}
