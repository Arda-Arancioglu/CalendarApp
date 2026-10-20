import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as categoriesApi from '../api/categories';
import { queryKeys } from './queryKeys';
import type { CategoryRequestDTO } from '../types/category';

/**
 * Fetch all categories belonging to the current user.
 */
export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories.all,
    queryFn: ({ signal }) => categoriesApi.getCategories(signal),
    meta: { skipErrorToast: true },
  });
}

/**
 * Create a new category and invalidate both categories and events.
 */
export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CategoryRequestDTO) => categoriesApi.createCategory(body),
    meta: { handlesErrorInline: true },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
    },
  });
}

/**
 * Update an existing category's name or color.
 * Also invalidates events so event colors and category pills update immediately.
 */
export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ categoryId, body }: { categoryId: number; body: CategoryRequestDTO }) =>
      categoriesApi.updateCategory(categoryId, body),
    meta: { handlesErrorInline: true },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.events.all });
    },
  });
}

/**
 * Delete a category. Invalidates both categories and events (events that used
 * this category will reload without it).
 */
export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (categoryId: number) => categoriesApi.deleteCategory(categoryId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.events.all });
    },
  });
}
