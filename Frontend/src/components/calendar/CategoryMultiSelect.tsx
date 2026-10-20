import { Link } from 'react-router-dom';
import { Check, Tags } from 'lucide-react';
import { normalizeHexColor, withAlpha } from '../../utils/colors';
import { cn } from '../../utils/cn';
import type { CategoryResponseDTO } from '../../types/category';

interface CategoryMultiSelectProps {
  categories: CategoryResponseDTO[];
  selectedIds: number[];
  onChange: (nextIds: number[]) => void;
  disabled?: boolean;
}

/**
 * Multi-select pill group for assigning categories to an event.
 * The first selected category determines the event's color on the calendar.
 */
export function CategoryMultiSelect({
  categories,
  selectedIds,
  onChange,
  disabled = false,
}: CategoryMultiSelectProps) {
  const toggleCategory = (categoryId: number) => {
    if (disabled) return;
    if (selectedIds.includes(categoryId)) {
      onChange(selectedIds.filter((id) => id !== categoryId));
    } else {
      onChange([...selectedIds, categoryId]);
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
        <div className="flex items-center justify-between rounded-xl border border-dashed border-dark-border bg-dark-bg/40 px-3.5 py-2.5 text-xs text-zinc-400">
          <span className="inline-flex items-center gap-2">
            <Tags className="h-3.5 w-3.5 text-zinc-500" aria-hidden="true" />
            No categories created yet.
          </span>
          <Link
            to="/categories"
            className="font-medium text-indigo-300 hover:text-indigo-200 hover:underline"
          >
            Manage categories
          </Link>
        </div>
      ) : (
        <div
          role="group"
          aria-label="Event categories"
          className="flex flex-wrap gap-2"
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
        </div>
      )}
    </div>
  );
}
