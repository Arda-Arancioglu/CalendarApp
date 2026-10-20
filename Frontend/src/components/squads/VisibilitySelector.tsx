import { Check, Eye, EyeOff, Lock, VolumeX } from 'lucide-react';
import { Spinner } from '../ui/Spinner';
import { cn } from '../../utils/cn';
import type { EventVisibility } from '../../types/squad';

interface VisibilityOption {
  value: EventVisibility;
  title: string;
  badge?: string;
  description: string;
  icon: typeof Eye;
}

const VISIBILITY_OPTIONS: readonly VisibilityOption[] = [
  {
    value: 'PUBLIC',
    title: 'PUBLIC',
    description: 'Squad members see your event titles and times (never descriptions).',
    icon: Eye,
  },
  {
    value: 'BUSY',
    title: 'BUSY',
    badge: 'Default',
    description: 'Squad members see your events titled "Busy", with times.',
    icon: EyeOff,
  },
  {
    value: 'MUTED',
    title: 'MUTED',
    description:
      'Your events are not shown to squad members at all. (Reserved for a future AI scheduling bot that can still see availability.)',
    icon: VolumeX,
  },
];

interface VisibilitySelectorProps {
  value: EventVisibility;
  onChange: (next: EventVisibility) => void;
  isUpdating?: boolean;
}

/**
 * Selector for MY calendar visibility in a specific squad, with clear explanations
 * for PUBLIC, BUSY, and MUTED plus the private-event rule.
 */
export function VisibilitySelector({
  value,
  onChange,
  isUpdating = false,
}: VisibilitySelectorProps) {
  return (
    <section
      aria-labelledby="visibility-heading"
      className="rounded-2xl border border-dark-border bg-dark-surface/75 p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="visibility-heading" className="text-base font-semibold text-zinc-100">
            My calendar visibility in this squad
          </h2>
          <p className="mt-1 text-xs text-zinc-400">
            Choose how much of your personal calendar members of this squad can see.
          </p>
        </div>
        {isUpdating && (
          <span className="inline-flex items-center gap-1.5 text-xs text-indigo-300">
            <Spinner size="sm" label="Updating visibility" />
            Saving…
          </span>
        )}
      </div>

      <div
        role="radiogroup"
        aria-label="My calendar visibility"
        className="mt-4 grid gap-3 md:grid-cols-3"
      >
        {VISIBILITY_OPTIONS.map((option) => {
          const isSelected = value === option.value;
          const Icon = option.icon;

          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={isUpdating}
              onClick={() => {
                if (option.value !== value) onChange(option.value);
              }}
              className={cn(
                'flex flex-col justify-between rounded-xl border p-4 text-left transition-all',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400',
                isSelected
                  ? 'border-indigo-500/60 bg-indigo-500/15 ring-1 ring-inset ring-indigo-400/30'
                  : 'border-dark-border bg-dark-bg/50 hover:border-zinc-700 hover:bg-dark-bg/80',
                isUpdating && 'opacity-70',
              )}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-100">
                    <Icon
                      className={cn(
                        'h-4 w-4',
                        isSelected ? 'text-indigo-300' : 'text-zinc-400',
                      )}
                      aria-hidden="true"
                    />
                    {option.title}
                    {option.badge && (
                      <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-medium text-zinc-300">
                        {option.badge}
                      </span>
                    )}
                  </span>

                  {isSelected && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500 text-white">
                      <Check className="h-3 w-3" aria-hidden="true" />
                    </span>
                  )}
                </div>

                <p className="mt-2 text-xs leading-relaxed text-zinc-300">
                  {option.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-3.5 flex items-start gap-2 rounded-xl border border-dark-border/70 bg-dark-bg/50 px-3.5 py-2.5 text-xs text-zinc-400">
        <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-300" aria-hidden="true" />
        <p>
          Events marked <strong className="font-medium text-zinc-200">Private</strong> on your
          personal calendar are always shown to the squad as{' '}
          <strong className="font-medium text-zinc-200">"Busy"</strong> (times visible), even when
          your squad visibility is <strong className="font-medium text-zinc-200">PUBLIC</strong>.
        </p>
      </div>
    </section>
  );
}
