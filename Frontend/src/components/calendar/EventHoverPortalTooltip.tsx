import { createPortal } from 'react-dom';
import { Clock, Dumbbell, Waves } from 'lucide-react';
import { withAlpha } from '../../utils/colors';

export interface EventHoverTooltipData {
  timeSpan?: string;
  title: string;
  emoji?: string | null;
  subtitle?: string; // e.g. "Day 2 of 4"
  userLabel?: string; // e.g. squad member username
  userColor?: string;
  badge?: string;
  categories?: { categoryId: number; name: string; color?: string }[];
  description?: string | null;
  isBusyMasked?: boolean;
  isFlexible?: boolean;
}

export interface EventHoverPortalTooltipProps {
  coords: { x: number; y: number } | null;
  data: EventHoverTooltipData;
}

/**
 * Renders a crisp dark floating hover card clamped to viewport edges
 * using createPortal(..., document.body) to avoid any clipping from FullCalendar
 * or container overflow.
 */
export function EventHoverPortalTooltip({ coords, data }: EventHoverPortalTooltipProps) {
  if (!coords || typeof document === 'undefined' || !document.body) {
    return null;
  }

  const { x, y } = coords;
  const tooltipWidth = 260;
  const tooltipHeight = 110;

  // Viewport clamping
  const left = Math.min(
    Math.max(12, x - tooltipWidth / 2),
    window.innerWidth - tooltipWidth - 12,
  );
  const top = y > 150 ? y - tooltipHeight - 12 : y + 20;

  return createPortal(
    <div
      role="tooltip"
      style={{
        position: 'fixed',
        left: `${left}px`,
        top: `${top}px`,
        pointerEvents: 'none',
        zIndex: 99999,
        width: `${tooltipWidth}px`,
      }}
      className="animate-in fade-in-0 zoom-in-95 duration-100 pointer-events-none rounded-xl border border-dark-border/90 bg-dark-elevated/95 p-3 text-xs text-zinc-100 shadow-2xl backdrop-blur-md ring-1 ring-white/10"
    >
      {/* 24h Time Range */}
      {data.timeSpan && (
        <div className="flex items-center gap-1 font-mono text-[11px] font-semibold text-indigo-300">
          <Clock className="h-3 w-3 shrink-0" aria-hidden="true" />
          <span>{data.timeSpan}</span>
          {data.isFlexible && (
            <span className="ml-auto inline-flex items-center gap-0.5 text-amber-300 text-[10px] font-sans">
              <Waves className="h-2.5 w-2.5" />
              <span>Flexible</span>
            </span>
          )}
        </div>
      )}

      {/* Emoji + Title */}
      <div className="mt-1 flex items-start gap-1.5">
        {data.emoji && (
          <span className="text-sm select-none shrink-0 leading-tight">
            {data.emoji}
          </span>
        )}
        <h4 className="font-semibold text-white leading-tight break-words">
          {data.title}
        </h4>
      </div>

      {/* Routine or Squad user subtitle */}
      {data.subtitle && (
        <div className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-indigo-200">
          <Dumbbell className="h-2.5 w-2.5 shrink-0" />
          <span>{data.subtitle}</span>
        </div>
      )}

      {data.userLabel && (
        <div className="mt-1 flex items-center gap-1.5 text-[11px] text-zinc-300">
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: data.userColor || '#6366F1' }}
          />
          <span className="font-semibold text-zinc-100">{data.userLabel}</span>
        </div>
      )}

      {/* Categories */}
      {data.categories && data.categories.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {data.categories.map((cat) => (
            <span
              key={cat.categoryId}
              className="rounded-xs px-1.5 py-0.5 text-[10px] font-medium"
              style={{
                backgroundColor: withAlpha(cat.color || '#6366F1', 0.20),
                color: cat.color || '#A5B4FC',
              }}
            >
              {cat.name}
            </span>
          ))}
        </div>
      )}

      {/* Description Preview */}
      {!data.isBusyMasked && data.description && (
        <p className="mt-1.5 line-clamp-2 text-[11px] leading-snug text-zinc-300/85">
          {data.description}
        </p>
      )}

      {data.isBusyMasked && (
        <p className="mt-1 text-[11px] italic text-zinc-400">
          Busy (details hidden)
        </p>
      )}
    </div>,
    document.body,
  );
}
