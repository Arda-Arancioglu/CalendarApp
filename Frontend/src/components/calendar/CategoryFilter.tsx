import { Link } from 'react-router-dom';
import { Lock, Repeat, Tags, Waves } from 'lucide-react';
import { DEFAULT_EVENT_COLOR, normalizeHexColor, withAlpha } from '../../utils/colors';
import { cn } from '../../utils/cn';
import type { CategoryResponseDTO } from '../../types/category';

/** Special filter id for events that have no categories assigned. */
export const UNCATEGORIZED_FILTER_ID = -1;

interface CategoryFilterProps {
  categories: CategoryResponseDTO[];
  /** Empty array means "Show all events". Otherwise only events matching at least one selected id are shown. */
  selectedCategoryIds: number[];
  onToggleCategory: (categoryId: number) => void;
  onClearFilter: () => void;
}

/**
 * Filter bar above the personal calendar: category filter chips + visual cue legend.
 */
export function CategoryFilter({
  categories,
  selectedCategoryIds,
  onToggleCategory,
  onClearFilter,
}: CategoryFilterProps) {
  const showingAll = selectedCategoryIds.length === 0;

  return (
    <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-dark-border bg-dark-surface/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      {/* Filter chips */}
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by category">
        <button
          type="button"
          aria-pressed={showingAll}
          onClick={onClearFilter}
          className={cn(
            'rounded-full px-3 py-1 text-xs font-medium transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400',
            showingAll
              ? 'bg-indigo-500/20 text-indigo-100 ring-1 ring-inset ring-indigo-400/40'
              : 'bg-dark-elevated text-zinc-400 hover:text-zinc-200',
          )}
        >
          All events
        </button>

        {categories.map((cat) => {
          const active = selectedCategoryIds.includes(cat.categoryId);
          const color = normalizeHexColor(cat.color);
          return (
            <button
              key={cat.categoryId}
              type="button"
              aria-pressed={active}
              onClick={() => onToggleCategory(cat.categoryId)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400',
                active
                  ? 'text-zinc-50'
                  : 'border-dark-border bg-dark-elevated/60 text-zinc-300 hover:border-zinc-600',
              )}
              style={
                active
                  ? {
                      borderColor: color,
                      backgroundColor: withAlpha(color, 0.25),
                    }
                  : undefined
              }
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: color }}
                aria-hidden="true"
              />
              {cat.name}
            </button>
          );
        })}

        <button
          type="button"
          aria-pressed={selectedCategoryIds.includes(UNCATEGORIZED_FILTER_ID)}
          onClick={() => onToggleCategory(UNCATEGORIZED_FILTER_ID)}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400',
            selectedCategoryIds.includes(UNCATEGORIZED_FILTER_ID)
              ? 'border-indigo-400 bg-indigo-500/25 text-zinc-50'
              : 'border-dark-border bg-dark-elevated/60 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200',
          )}
        >
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: DEFAULT_EVENT_COLOR }}
            aria-hidden="true"
          />
          Uncategorized
        </button>

        {categories.length === 0 && (
          <Link
            to="/categories"
            className="ml-1 inline-flex items-center gap-1 text-xs font-medium text-indigo-300 hover:text-indigo-200 hover:underline"
          >
            <Tags className="h-3.5 w-3.5" aria-hidden="true" />
            Add categories
          </Link>
        )}
      </div>

      {/* Visual cue legend for recurring, flexible & private events */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400">
        <span className="inline-flex items-center gap-1.5" title="Recurring series">
          <Repeat className="h-3.5 w-3.5 text-indigo-300" aria-hidden="true" />
          <span>Repeat = Recurring</span>
        </span>
        <span className="inline-flex items-center gap-1.5" title="Flexible events have a dashed border">
          <Waves className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" />
          <span>Dashed = Flexible</span>
        </span>
        <span className="inline-flex items-center gap-1.5" title="Private events appear as Busy to squads">
          <Lock className="h-3.5 w-3.5 text-zinc-300" aria-hidden="true" />
          <span>Lock = Private</span>
        </span>
      </div>
    </div>
  );
}
