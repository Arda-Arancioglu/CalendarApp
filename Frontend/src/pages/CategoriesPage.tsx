import { useState } from 'react';
import { Pencil, Plus, Tags, Trash2 } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { EmptyState, ErrorState } from '../components/ui/States';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { CategoryFormModal } from '../components/categories/CategoryFormModal';
import { useCategories, useDeleteCategory } from '../hooks/useCategories';
import { useToast } from '../hooks/useToast';
import { normalizeHexColor, withAlpha } from '../utils/colors';
import type { CategoryResponseDTO } from '../types/category';

export function CategoriesPage() {
  const toast = useToast();
  const {
    data: categories,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useCategories();
  const deleteMutation = useDeleteCategory();

  const [formOpen, setFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryResponseDTO | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<CategoryResponseDTO | null>(null);

  const openCreate = () => {
    setEditingCategory(null);
    setFormOpen(true);
  };

  const openEdit = (category: CategoryResponseDTO) => {
    setEditingCategory(category);
    setFormOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingCategory) return;
    try {
      await deleteMutation.mutateAsync(deletingCategory.categoryId);
      toast.success(`Deleted category "${deletingCategory.name}"`);
      setDeletingCategory(null);
    } catch {
      // MutationCache already shows the server error toast.
    }
  };

  return (
    <div>
      <PageHeader
        title="Categories"
        description="Color-code your personal events. An event's calendar color comes from its first category."
        actions={
          <Button
            onClick={openCreate}
            leftIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
          >
            New category
          </Button>
        }
      />

      {isLoading ? (
        <div className="flex justify-center py-20 text-indigo-400">
          <Spinner size="lg" label="Loading categories" />
        </div>
      ) : isError ? (
        <ErrorState
          error={error}
          onRetry={() => void refetch()}
          isRetrying={isFetching}
        />
      ) : !categories || categories.length === 0 ? (
        <EmptyState
          icon={<Tags className="h-6 w-6" aria-hidden="true" />}
          title="No categories yet"
          description="Create colored categories like Work, Lectures, or Gym to organize and filter your personal calendar."
          action={
            <Button
              onClick={openCreate}
              leftIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
            >
              Create your first category
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => {
            const color = normalizeHexColor(category.color);
            return (
              <div
                key={category.categoryId}
                className="group flex items-center justify-between gap-3 rounded-2xl border border-dark-border bg-dark-surface/70 p-4 transition-colors hover:border-zinc-700"
              >
                <div className="flex min-w-0 items-center gap-3.5">
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-white/15"
                    style={{ backgroundColor: withAlpha(color, 0.2) }}
                  >
                    <span
                      className="h-4 w-4 rounded-full shadow-xs"
                      style={{ backgroundColor: color }}
                    />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-zinc-100">
                      {category.name}
                    </p>
                    <p className="font-mono text-xs uppercase text-zinc-400">
                      {color}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => openEdit(category)}
                    className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-dark-hover hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                    aria-label={`Edit ${category.name}`}
                    title="Edit category"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeletingCategory(category)}
                    className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-red-500/15 hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                    aria-label={`Delete ${category.name}`}
                    title="Delete category"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit modal */}
      <CategoryFormModal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        category={editingCategory}
      />

      {/* Delete confirmation with explicit warning that deleting a category may affect events */}
      <ConfirmDialog
        isOpen={deletingCategory !== null}
        onClose={() => setDeletingCategory(null)}
        onConfirm={() => void handleConfirmDelete()}
        title="Delete category?"
        confirmLabel="Delete category"
        isLoading={deleteMutation.isPending}
        description={
          <div className="space-y-2">
            <p>
              Are you sure you want to delete{' '}
              <span className="font-semibold text-zinc-100">
                {deletingCategory?.name}
              </span>
              ?
            </p>
            <p className="text-xs text-amber-200/90">
              Warning: Deleting this category may affect existing events that use it (it will be
              removed from those events, which may change their calendar color).
            </p>
          </div>
        }
      />
    </div>
  );
}
