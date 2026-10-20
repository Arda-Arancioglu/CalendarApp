import { Check, EyeOff, Sparkles } from 'lucide-react';
import { withAlpha } from '../../utils/colors';
import { cn } from '../../utils/cn';

export interface SquadCalendarLegendMember {
  userId: number;
  username: string;
  color: string;
  eventCount: number;
  /**
   * True when the member is absent from the `/calendar` response or has 0 events.
   * Per the brief: "A MUTED member may be absent from the response or have an empty
   * events list: handle both and show them in the legend as 'hidden their calendar'."
   */
  isHiddenOrEmpty: boolean;
  isAbsentFromResponse: boolean;
}

interface MemberLegendProps {
  members: SquadCalendarLegendMember[];
  enabledUserIds: number[];
  onToggleMember: (userId: number) => void;
  onEnableAll: () => void;
  showFreeTime: boolean;
  onToggleFreeTime: () => void;
  isTimeGrid: boolean;
}

/**
 * Interactive member legend and "Find free time" toggle bar on `/squads/:id/calendar`.
 */
export function MemberLegend({
  members,
  enabledUserIds,
  onToggleMember,
  onEnableAll,
  showFreeTime,
  onToggleFreeTime,
  isTimeGrid,
}: MemberLegendProps) {
  const allEnabled = members.every((m) => enabledUserIds.includes(m.userId));

  return (
    <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-dark-border bg-dark-surface/70 p-4 lg:flex-row lg:items-center lg:justify-between">
      {/* Member toggle pills */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Members
          </span>
          {!allEnabled && (
            <button
              type="button"
              onClick={onEnableAll}
              className="text-xs font-medium text-indigo-300 hover:text-indigo-200 hover:underline"
            >
              Show all
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Toggle squad members">
          {members.map((member) => {
            const enabled = enabledUserIds.includes(member.userId);
            return (
              <button
                key={member.userId}
                type="button"
                aria-pressed={enabled}
                onClick={() => onToggleMember(member.userId)}
                className={cn(
                  'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition-all',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400',
                  enabled
                    ? 'text-zinc-100'
                    : 'border-dark-border bg-dark-bg/40 text-zinc-500 opacity-65 hover:opacity-100',
                )}
                style={
                  enabled
                    ? {
                        borderColor: member.color,
                        backgroundColor: withAlpha(member.color, 0.2),
                      }
                    : undefined
                }
              >
                <span
                  className="flex h-3.5 w-3.5 items-center justify-center rounded-full"
                  style={{ backgroundColor: member.color }}
                  aria-hidden="true"
                >
                  {enabled && <Check className="h-2.5 w-2.5 text-white" />}
                </span>
                <span>{member.username}</span>

                {member.isHiddenOrEmpty ? (
                  <span
                    className="inline-flex items-center gap-1 rounded-full bg-zinc-900/80 px-1.5 py-0.5 text-[10px] font-normal text-zinc-400"
                    title={
                      member.isAbsentFromResponse
                        ? 'This member has muted their calendar for this squad'
                        : 'No visible events in this range (or hidden their calendar)'
                    }
                  >
                    <EyeOff className="h-2.5 w-2.5" aria-hidden="true" />
                    hidden their calendar
                  </span>
                ) : (
                  <span className="rounded-full bg-black/30 px-1.5 py-0.5 text-[10px] text-zinc-200">
                    {member.eventCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Find free time overlay toggle */}
      <div className="flex flex-col items-start gap-1.5 sm:flex-row sm:items-center lg:flex-col lg:items-end">
        <button
          type="button"
          aria-pressed={showFreeTime}
          onClick={onToggleFreeTime}
          className={cn(
            'inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-all',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400',
            showFreeTime
              ? 'border-emerald-400/60 bg-emerald-500/20 text-emerald-100 ring-1 ring-inset ring-emerald-400/30'
              : 'border-dark-border bg-dark-elevated text-zinc-200 hover:border-zinc-600 hover:bg-dark-hover',
          )}
        >
          <Sparkles
            className={cn('h-4 w-4', showFreeTime ? 'text-emerald-300' : 'text-indigo-300')}
            aria-hidden="true"
          />
          {showFreeTime ? 'Showing free time (08:00–22:00)' : 'Find free time'}
        </button>

        {showFreeTime && (
          <p className="text-[11px] text-zinc-400">
            {isTimeGrid
              ? 'Green slots (≥30m, 08:00–22:00) show where all toggled-on visible members are free.'
              : 'Switch to Week or Day view to see highlighted 08:00–22:00 free slots.'}
          </p>
        )}
      </div>
    </div>
  );
}
