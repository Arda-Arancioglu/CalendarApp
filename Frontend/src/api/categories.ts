import { request } from './client';
import type { CategoryRequestDTO, CategoryResponseDTO } from '../types/category';

export function getCategories(signal?: AbortSignal): Promise<CategoryResponseDTO[]> {
  return request<CategoryResponseDTO[]>('/categories', { signal });
}

export function createCategory(body: CategoryRequestDTO): Promise<CategoryResponseDTO> {
  return request<CategoryResponseDTO>('/categories', { method: 'POST', body });
}

export function updateCategory(
  categoryId: number,
  body: CategoryRequestDTO,
): Promise<CategoryResponseDTO> {
  return request<CategoryResponseDTO>(`/categories/${categoryId}`, { method: 'PUT', body });
}

/** 204 No Content */
export function deleteCategory(categoryId: number): Promise<void> {
  return request<void>(`/categories/${categoryId}`, { method: 'DELETE' });
}
