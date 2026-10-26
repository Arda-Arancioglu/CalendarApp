import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, Star, Users } from 'lucide-react';
import { RoleBadge, VisibilityBadge } from './SquadBadges';
import { useToggleFavoriteSquad } from '../../hooks/useSquads';
import { useToast } from '../../hooks/useToast';
import { cn } from '../../utils/cn';
import type { SquadSummaryResponseDTO } from '../../types/squad';

interface SquadCardProps {
  squad: SquadSummaryResponseDTO;
}

/**
 * Card rendered on /squads for each squad the user belongs to.
 */
export function SquadCard({ squad }: SquadCardProps) {
  const toggleFavoriteMutation = useToggleFavoriteSquad();
  const toast = useToast();
  const isFavorite = squad.favoriteOrder !== null && squad.favoriteOrder !== undefined;

  const handleToggleFavorite = async () => {
    try {
      await toggleFavoriteMutation.mutateAsync(squad.squadId);
      toast.success(
        isFavorite
          ? `Removed "${squad.squadName}" from favorites`
          : `Pinned "${squad.squadName}" to favorites`,
      );
    } catch {
      // MutationCache handles error toast
    }
  };

  return (
    <article className="group flex flex-col justify-between rounded-2xl border border-dark-border bg-dark-surface/75 p-5 transition-all hover:border-indigo-500/40 hover:bg-dark-surface">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-500/30">
              <Users className="h-5 w-5" aria-hidden="true" />
            </span>
            <h2 className="truncate text-base font-semibold text-zinc-50">
              {squad.squadName}
            </h2>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              disabled={toggleFavoriteMutation.isPending}
              onClick={() => void handleToggleFavorite()}
              aria-label={isFavorite ? `Unstar ${squad.squadName}` : `Star ${squad.squadName}`}
              aria-pressed={isFavorite}
              title={isFavorite ? 'Remove from favorites' : 'Pin to sidebar favorites'}
              className={cn(
                'rounded-lg p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400',
                isFavorite
                  ? 'text-amber-400 hover:bg-amber-500/15'
                  : 'text-zinc-500 hover:bg-dark-hover hover:text-zinc-200',
              )}
            >
              <Star
                className={cn('h-4 w-4', isFavorite && 'fill-amber-400')}
                aria-hidden="true"
              />
            </button>
            <RoleBadge role={squad.role} />
          </div>
        </div>

        <p className="mt-3 line-clamp-2 min-h-[2.5rem] text-sm text-zinc-400">
          {squad.squadDescription || 'No description provided.'}
        </p>

        <div className="mt-4 flex items-center justify-between rounded-xl border border-dark-border/80 bg-dark-bg/50 px-3 py-2 text-xs">
          <span className="text-zinc-400">My calendar visibility</span>
          <VisibilityBadge visibility={squad.myVisibility} />
        </div>
      </div>

      <div className="mt-5 flex items-center gap-2 border-t border-dark-border pt-4">
        <Link
          to={`/squads/${squad.squadId}/calendar`}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-indigo-500/15 px-3 py-2 text-xs font-medium text-indigo-200 ring-1 ring-inset ring-indigo-400/30 transition-colors hover:bg-indigo-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
        >
          <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
          Squad calendar
        </Link>
        <Link
          to={`/squads/${squad.squadId}`}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-dark-border bg-dark-elevated px-3 py-2 text-xs font-medium text-zinc-200 transition-colors hover:border-zinc-600 hover:bg-dark-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
        >
          Manage
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}
