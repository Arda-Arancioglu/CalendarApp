import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarDays,
  KeyRound,
  LogOut,
  Trash2,
} from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/Button';
import { CopyButton } from '../components/ui/CopyButton';
import { Spinner } from '../components/ui/Spinner';
import { ErrorState } from '../components/ui/States';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { TypeToConfirmDialog } from '../components/ui/TypeToConfirmDialog';
import { RoleBadge, VisibilityBadge } from '../components/squads/SquadBadges';
import { VisibilitySelector } from '../components/squads/VisibilitySelector';
import { MembersTable } from '../components/squads/MembersTable';
import {
  useChangeVisibility,
  useDeleteSquad,
  useLeaveSquad,
  useSquadDetail,
} from '../hooks/useSquads';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import {
  canDeleteSquad,
  canLeaveSquad,
  canSeeInviteCode,
  LEAVE_BLOCKED_REASON,
} from '../utils/permissions';
import type { EventVisibility } from '../types/squad';

export function SquadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const parsedId = Number(id);
  const squadId = Number.isInteger(parsedId) && parsedId > 0 ? parsedId : null;

  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();

  const {
    data: squad,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useSquadDetail(squadId);

  const visibilityMutation = useChangeVisibility(squadId ?? 0);
  const leaveMutation = useLeaveSquad();
  const deleteMutation = useDeleteSquad();

  const [confirmLeaveOpen, setConfirmLeaveOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  if (squadId === null) {
    return (
      <div className="space-y-4">
        <Link
          to="/squads"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-100"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to squads
        </Link>
        <ErrorState error={new Error('Invalid squad ID')} />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-20 text-indigo-400">
        <Spinner size="lg" label="Loading squad details" />
      </div>
    );
  }

  if (isError || !squad) {
    return (
      <div className="space-y-4">
        <Link
          to="/squads"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-100"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to squads
        </Link>
        <ErrorState
          error={error}
          onRetry={() => void refetch()}
          isRetrying={isFetching}
        />
      </div>
    );
  }

  const handleVisibilityChange = async (next: EventVisibility) => {
    try {
      await visibilityMutation.mutateAsync(next);
      toast.success(`Your visibility in "${squad.squadName}" is now ${next}`);
    } catch {
      // MutationCache handles error toast.
    }
  };

  const handleLeave = async () => {
    try {
      await leaveMutation.mutateAsync(squad.squadId);
      toast.success(`You left "${squad.squadName}"`);
      setConfirmLeaveOpen(false);
      navigate('/squads');
    } catch {
      // Server error is toasted by MutationCache.
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(squad.squadId);
      toast.success(`Deleted squad "${squad.squadName}"`);
      setConfirmDeleteOpen(false);
      navigate('/squads');
    } catch {
      // Server error is toasted by MutationCache.
    }
  };

  const allowedToLeave = canLeaveSquad(squad.myRole);
  const allowedToDelete = canDeleteSquad(squad.myRole);

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/squads"
          className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 transition-colors hover:text-zinc-100"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          All squads
        </Link>

        <PageHeader
          title={squad.squadName}
          description={squad.squadDescription || 'No squad description.'}
          actions={
            <div className="flex flex-wrap items-center gap-2.5">
              <RoleBadge role={squad.myRole} />
              <VisibilityBadge visibility={squad.myVisibility} />
              <Link to={`/squads/${squad.squadId}/calendar`}>
                <Button
                  leftIcon={<CalendarDays className="h-4 w-4" aria-hidden="true" />}
                >
                  Open squad calendar
                </Button>
              </Link>
            </div>
          }
        />
      </div>

      {/* Invite code card (visible to every member) */}
      {canSeeInviteCode(squad.myRole) && (
        <section
          aria-labelledby="invite-code-heading"
          className="flex flex-col justify-between gap-4 rounded-2xl border border-dark-border bg-dark-surface/75 p-5 sm:flex-row sm:items-center"
        >
          <div>
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-indigo-300" aria-hidden="true" />
              <h2 id="invite-code-heading" className="text-sm font-semibold text-zinc-100">
                Squad invite code
              </h2>
            </div>
            <p className="mt-1 text-xs text-zinc-400">
              Share this 8-character code with anyone you want to invite to{' '}
              <span className="font-medium text-zinc-200">{squad.squadName}</span>.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-dark-border bg-dark-bg/70 px-4 py-2.5">
            <span className="font-mono text-lg font-bold tracking-widest text-zinc-50 select-all">
              {squad.inviteCode}
            </span>
            <CopyButton value={squad.inviteCode} label="Copy code" />
          </div>
        </section>
      )}

      {/* My visibility selector with explanations */}
      <VisibilitySelector
        value={squad.myVisibility}
        onChange={(next) => void handleVisibilityChange(next)}
        isUpdating={visibilityMutation.isPending}
      />

      {/* Members table with inline Role selector & Kick column */}
      <MembersTable
        squadId={squad.squadId}
        myRole={squad.myRole}
        currentUserId={user?.userId ?? -1}
        members={squad.members}
      />

      {/* Leave squad card (separate from Delete squad!) */}
      <section
        aria-labelledby="leave-squad-heading"
        className="flex flex-col justify-between gap-4 rounded-2xl border border-dark-border bg-dark-surface/75 p-5 sm:flex-row sm:items-center"
      >
        <div>
          <h2 id="leave-squad-heading" className="text-base font-semibold text-zinc-100">
            Leave squad
          </h2>
          {allowedToLeave ? (
            <p className="mt-1 text-xs text-zinc-400">
              Leave <span className="font-medium text-zinc-200">{squad.squadName}</span>. Other
              members stay in the squad, and you can rejoin later with the invite code.
            </p>
          ) : (
            <p className="mt-1 text-xs text-amber-200/90">
              As the <strong className="font-semibold">OWNER</strong>, you must pass ownership to
              another member first (select <strong className="font-semibold">Set to OWNER</strong>{' '}
              in the Squad members table above) before you can leave without deleting the squad.
            </p>
          )}
        </div>

        <span
          title={!allowedToLeave ? LEAVE_BLOCKED_REASON : undefined}
          className="inline-block shrink-0"
        >
          <Button
            variant="secondary"
            disabled={!allowedToLeave}
            onClick={() => setConfirmLeaveOpen(true)}
            leftIcon={<LogOut className="h-4 w-4" aria-hidden="true" />}
          >
            Leave squad
          </Button>
        </span>
      </section>

      {/* Owner-only Delete Squad card */}
      {allowedToDelete && (
        <section
          aria-labelledby="delete-squad-heading"
          className="flex flex-col justify-between gap-4 rounded-2xl border border-red-500/30 bg-red-950/10 p-5 sm:flex-row sm:items-center"
        >
          <div>
            <h2 id="delete-squad-heading" className="text-base font-semibold text-red-200">
              Delete squad (Owner only)
            </h2>
            <p className="mt-1 text-xs text-zinc-400">
              Permanently disband{' '}
              <span className="font-medium text-zinc-200">{squad.squadName}</span> for all members.
              Personal calendars are not affected.
            </p>
          </div>

          <Button
            variant="danger"
            onClick={() => setConfirmDeleteOpen(true)}
            leftIcon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
            className="shrink-0"
          >
            Delete squad
          </Button>
        </section>
      )}

      {/* Leave confirmation */}
      <ConfirmDialog
        isOpen={confirmLeaveOpen}
        onClose={() => setConfirmLeaveOpen(false)}
        onConfirm={() => void handleLeave()}
        title="Leave squad?"
        confirmLabel="Leave squad"
        isLoading={leaveMutation.isPending}
        description={
          <p>
            Are you sure you want to leave{' '}
            <span className="font-semibold text-zinc-100">{squad.squadName}</span>? The squad will
            remain active for its other members, and you will need the invite code to join again.
          </p>
        }
      />

      {/* Delete squad type-the-squad-name confirmation */}
      <TypeToConfirmDialog
        isOpen={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={() => void handleDelete()}
        title="Delete squad permanently?"
        confirmText={squad.squadName}
        confirmButtonLabel="Delete squad"
        isLoading={deleteMutation.isPending}
        description={
          <p>
            Deleting <span className="font-semibold text-zinc-100">{squad.squadName}</span>{' '}
            permanently removes the squad for all {squad.members.length} members. Personal events
            are not affected.
          </p>
        }
      />
    </div>
  );
}
