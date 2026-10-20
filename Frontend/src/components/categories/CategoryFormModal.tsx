import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';
import { ColorPicker } from './ColorPicker';
import { useCreateCategory, useUpdateCategory } from '../../hooks/useCategories';
import { useToast } from '../../hooks/useToast';
import { applyFieldErrors, getErrorMessage } from '../../utils/errors';
import { CATEGORY_COLOR_PRESETS, normalizeHexColor, withAlpha } from '../../utils/colors';
import {
  CATEGORY_NAME_MAX,
  categorySchema,
  type CategoryFormValues,
} from '../../utils/validation';
import type { CategoryResponseDTO } from '../../types/category';

interface CategoryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** When provided, the modal edits this category instead of creating a new one. */
  category?: CategoryResponseDTO | null;
}

function CategoryFormBody({
  onClose,
  category,
}: {
  onClose: () => void;
  category?: CategoryResponseDTO | null;
}) {
  const isEditing = Boolean(category);
  const toast = useToast();
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const [formError, setFormError] = useState<string | null>(null);

  const defaultColor = CATEGORY_COLOR_PRESETS[0]?.hex ?? '#6366F1';

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: category?.name ?? '',
      color: category?.color ?? defaultColor,
    },
  });

  const watchedName = useWatch({ control, name: 'name' });
  const watchedColor = useWatch({ control, name: 'color' });
  const previewColor = normalizeHexColor(watchedColor);

  const onSubmit = async (values: CategoryFormValues) => {
    setFormError(null);
    const payload = {
      name: values.name.trim(),
      color: values.color.trim().toUpperCase(),
    };

    try {
      if (category) {
        await updateMutation.mutateAsync({
          categoryId: category.categoryId,
          body: payload,
        });
        toast.success(`Updated category "${payload.name}"`);
      } else {
        await createMutation.mutateAsync(payload);
        toast.success(`Created category "${payload.name}"`);
      }
      onClose();
    } catch (error) {
      const mapped = applyFieldErrors(error, setError, ['name', 'color']);
      if (!mapped) setFormError(getErrorMessage(error));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      {formError && <Alert variant="error">{formError}</Alert>}

      <Input
        label="Category name"
        placeholder="e.g. Deep Work, Lectures, Gym"
        maxLength={CATEGORY_NAME_MAX}
        autoFocus
        helperText={`${watchedName.trim().length}/${CATEGORY_NAME_MAX} characters`}
        error={errors.name?.message}
        {...register('name')}
      />

      <ColorPicker
        value={watchedColor}
        onChange={(hex) => setValue('color', hex, { shouldValidate: true, shouldDirty: true })}
        error={errors.color?.message}
      />

      {/* Live event pill preview */}
      <div className="rounded-xl border border-dark-border bg-dark-bg/50 p-3.5">
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-400">
          Calendar preview
        </p>
        <div
          className="flex items-center gap-2 rounded-lg border-l-4 px-3 py-2 text-sm font-medium text-zinc-100"
          style={{
            borderLeftColor: previewColor,
            backgroundColor: withAlpha(previewColor, 0.2),
          }}
        >
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: previewColor }}
          />
          <span className="truncate">{watchedName.trim() || 'Sample event title'}</span>
          <span className="ml-auto text-xs text-zinc-300">10:00 – 11:00</span>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2.5 pt-1">
        <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isSubmitting} loadingText="Saving…">
          {isEditing ? 'Save changes' : 'Create category'}
        </Button>
      </div>
    </form>
  );
}

export function CategoryFormModal({ isOpen, onClose, category }: CategoryFormModalProps) {
  const isEditing = Boolean(category);
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit category' : 'New category'}
      maxWidth="md"
    >
      {isOpen && (
        <CategoryFormBody
          key={category?.categoryId ?? 'new'}
          onClose={onClose}
          category={category}
        />
      )}
    </Modal>
  );
}
