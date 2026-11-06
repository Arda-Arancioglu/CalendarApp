import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Palette, Plus, Tags, X } from 'lucide-react';
import { useCreateCategory } from '../../hooks/useCategories';
import { useToast } from '../../hooks/useToast';
import { CATEGORY_COLOR_PRESETS, normalizeHexColor, withAlpha } from '../../utils/colors';
import { CATEGORY_NAME_MAX } from '../../utils/validation';
import { getErrorMessage } from '../../utils/errors';
import { cn } from '../../utils/cn';
import type { CategoryResponseDTO } from '../../types/category';

interface CategoryMultiSelectProps {
  categories: CategoryResponseDTO[];
  selectedIds: number[];
  onChange: (nextIds: number[]) => void;
  disabled?: boolean;
}

/**
 * Multi-select pill group for assigning categories to an event,
 * with inline category creation directly inside the form.
 * The first selected category determines the event's color on the calendar.
 */
export function CategoryMultiSelect({
  categories,
  selectedIds,
  onChange,
  disabled = false,
}: CategoryMultiSelectProps) {
  const toast = useToast();
  const createCategoryMutation = useCreateCategory();

  const [isCreatingInline, setIsCreatingInline] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState<string>(
    CATEGORY_COLOR_PRESETS[0]?.hex ?? '#6366F1',
  );
  const [inlineError, setInlineError] = useState<string | null>(null);

  const toggleCategory = (categoryId: number) => {
    if (disabled) return;
    if (selectedIds.includes(categoryId)) {
      onChange(selectedIds.filter((id) => id !== categoryId));
    } else {
      onChange([...selectedIds, categoryId]);
    }
  };

  const handleCreateInline = async () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) {
      setInlineError('Category name is required.');
      return;
    }
    if (categories.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) {
      setInlineError(`Category "${trimmed}" already exists.`);
      return;
    }

    setInlineError(null);
    try {
      const created = await createCategoryMutation.mutateAsync({
        name: trimmed,
        color: newCategoryColor,
      });

      onChange([...selectedIds, created.categoryId]);
      toast.success(`Created category "${created.name}"`);
      setNewCategoryName('');
      setInlineError(null);
      setIsCreatingInline(false);
    } catch (err) {
      setInlineError(getErrorMessage(err));
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-zinc-300">Categories</span>
        <span className="text-xs text-zinc-400">
          {selectedIds.length === 0
            ? 'Optional (first category sets event color)'
            : `${selectedIds.length} selected`}
        </span>
      </div>

      {categories.length === 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-dashed border-dark-border bg-dark-bg/40 px-3.5 py-2.5 text-xs text-zinc-400">
          <span className="inline-flex items-center gap-2">
            <Tags className="h-3.5 w-3.5 text-zinc-500" aria-hidden="true" />
            No categories created yet.
          </span>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                setIsCreatingInline(true);
                setInlineError(null);
              }}
              className="inline-flex items-center gap-1 font-semibold text-indigo-400 transition-colors hover:text-indigo-300"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              <span>+ New category</span>
            </button>
            <span className="text-zinc-600">|</span>
            <Link
              to="/categories"
              className="font-medium text-zinc-400 transition-colors hover:text-zinc-200 hover:underline"
            >
              Manage
            </Link>
          </div>
        </div>
      ) : (
        <div
          role="group"
          aria-label="Event categories"
          className="flex flex-wrap items-center gap-2"
        >
          {categories.map((cat) => {
            const isSelected = selectedIds.includes(cat.categoryId);
            const isPrimary = selectedIds[0] === cat.categoryId;
            const color = normalizeHexColor(cat.color);

            return (
              <button
                key={cat.categoryId}
                type="button"
                disabled={disabled}
                aria-pressed={isSelected}
                onClick={() => toggleCategory(cat.categoryId)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400',
                  isSelected
                    ? 'text-zinc-50 shadow-xs'
                    : 'border-dark-border bg-dark-bg/60 text-zinc-300 hover:border-zinc-600 hover:text-zinc-100',
                )}
                style={
                  isSelected
                    ? {
                        borderColor: color,
                        backgroundColor: withAlpha(color, 0.25),
                      }
                    : undefined
                }
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: color }}
                  aria-hidden="true"
                />
                <span>{cat.name}</span>
                {isSelected && <Check className="h-3 w-3" aria-hidden="true" />}
                {isPrimary && (
                  <span className="sr-only"> (primary color)</span>
                )}
              </button>
            );
          })}

          {/* Quick inline "+ New category" button beside existing pills */}
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              setIsCreatingInline((prev) => !prev);
              setInlineError(null);
            }}
            className={cn(
              'inline-flex items-center gap-1 rounded-full border border-dashed px-2.5 py-1 text-xs font-medium transition-all',
              isCreatingInline
                ? 'border-indigo-400 bg-indigo-500/20 text-indigo-200 ring-1 ring-indigo-400/30'
                : 'border-dark-border bg-dark-bg/40 text-zinc-400 hover:border-indigo-400/50 hover:text-indigo-300',
            )}
          >
            <Plus className="h-3 w-3" aria-hidden="true" />
            <span>New category</span>
          </button>
        </div>
      )}

      {/* Inline Category Creator Panel */}
      {isCreatingInline && (
        <div
          role="region"
          aria-label="Create category inline"
          className="rounded-xl border border-indigo-500/30 bg-dark-elevated/95 p-3.5 space-y-3 shadow-xl animate-fade-in"
        >
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-indigo-200">
              <Palette className="h-3.5 w-3.5 text-indigo-300" aria-hidden="true" />
              New Category
            </span>
            <button
              type="button"
              onClick={() => {
                setIsCreatingInline(false);
                setInlineError(null);
              }}
              className="rounded-md p-1 text-zinc-400 transition-colors hover:bg-dark-hover hover:text-zinc-200"
              aria-label="Close inline category creator"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>

          <div>
            <input
              type="text"
              placeholder="Category name (e.g. Health, Uni, Gym)"
              maxLength={CATEGORY_NAME_MAX}
              value={newCategoryName}
              onChange={(e) => {
                setNewCategoryName(e.target.value);
                setInlineError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.stopPropagation();
                  void handleCreateInline();
                }
              }}
              className="h-9 w-full rounded-lg border border-dark-border bg-dark-bg px-3 text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-indigo-400 focus:outline-none"
              autoFocus
            />
          </div>

          {/* Color swatch picker */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-zinc-400">Color</span>
              <span className="font-mono text-[10px] text-zinc-400">{newCategoryColor}</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {CATEGORY_COLOR_PRESETS.map((preset) => {
                const isSelected = newCategoryColor.toUpperCase() === preset.hex.toUpperCase();
                return (
                  <button
                    key={preset.hex}
                    type="button"
                    onClick={() => setNewCategoryColor(preset.hex)}
                    title={`${preset.name} (${preset.hex})`}
                    className={cn(
                      'h-5 w-5 rounded-full transition-transform',
                      isSelected
                        ? 'scale-115 ring-2 ring-white ring-offset-2 ring-offset-dark-elevated'
                        : 'ring-1 ring-white/20 opacity-80 hover:opacity-100 hover:scale-110',
                    )}
                    style={{ backgroundColor: preset.hex }}
                  />
                );
              })}
              <input
                type="color"
                aria-label="Custom category color"
                value={newCategoryColor}
                onChange={(e) => setNewCategoryColor(e.target.value.toUpperCase())}
                className="color-wheel-input h-5 w-5 cursor-pointer rounded-full ring-1 ring-white/25"
              />
            </div>
          </div>

          {inlineError && (
            <p className="text-xs font-medium text-red-400">{inlineError}</p>
          )}

          <div className="flex items-center justify-end gap-2 border-t border-dark-border/60 pt-2">
            <button
              type="button"
              onClick={() => {
                setIsCreatingInline(false);
                setInlineError(null);
              }}
              disabled={createCategoryMutation.isPending}
              className="rounded-lg px-2.5 py-1 text-xs font-medium text-zinc-400 transition-colors hover:bg-dark-hover hover:text-zinc-200"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleCreateInline()}
              disabled={createCategoryMutation.isPending || !newCategoryName.trim()}
              className="rounded-lg bg-indigo-600 px-3 py-1 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500 disabled:opacity-50"
            >
              {createCategoryMutation.isPending ? 'Creating…' : 'Create'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
