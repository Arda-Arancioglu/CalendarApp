import { useState } from 'react';
import { Check, Crown, Shield, UserCheck, UserCog, UserMinus } from 'lucide-react';
import { RoleBadge } from './SquadBadges';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { useChangeRole, useKickMember } from '../../hooks/useSquads';
import { useToast } from '../../hooks/useToast';
import { formatDate } from '../../utils/date';
import { cn } from '../../utils/cn';
import {
  assignableRoles,
  canKick,
  canTransferOwnership,
} from '../../utils/permissions';
import type { SquadMemberResponseDTO, SquadRole } from '../../types/squad';

interface MembersTableProps {
  squadId: number;
  myRole: SquadRole;
  currentUserId: number;
  members: SquadMemberResponseDTO[];
}

const ROLE_OPTIONS: readonly {
  role: SquadRole;
  title: string;
  description: string;
  icon: typeof Crown;
}[] = [
  {
    role: 'VIEWER',
    title: 'Viewer',
    description: 'Can view the squad calendar and invite code, and control their own visibility.',
    icon: UserCheck,
  },
  {
    role: 'ADMIN',
    title: 'Admin',
    description: 'Can promote Viewers to Admin and kick Viewers from the squad.',
    icon: Shield,
  },
  {
    role: 'OWNER',
    title: 'Owner (Transfer ownership)',
    description:
      'Full control over the squad. Passing ownership to this member will make them OWNER and make you ADMIN.',
    icon: Crown,
  },
];

function getRoleDisabledReason(
  myRole: SquadRole,
  targetRole: SquadRole,
  isSelf: boolean,
): string | undefined {
  if (isSelf) return 'You cannot change your own role';
  if (myRole === 'VIEWER') return 'Viewers cannot change member roles';
  if (myRole === 'ADMIN' && targetRole !== 'VIEWER') {
    return 'Admins can only promote Viewers to Admin';
  }
  return undefined;
}

/**
 * Clean Squad Members table on `/squads/:id`:
 * - Role column shows only the clean RoleBadge.
 * - Actions column has a "Change role" button (opens a role picker modal) and a "Kick" button.
 */
export function MembersTable({
  squadId,
  myRole,
  currentUserId,
  members,
}: MembersTableProps) {
  const toast = useToast();
  const changeRoleMutation = useChangeRole(squadId);
  const kickMutation = useKickMember(squadId);

  const [memberToEditRole, setMemberToEditRole] = useState<SquadMemberResponseDTO | null>(null);
  const [selectedRole, setSelectedRole] = useState<SquadRole>('VIEWER');
  const [memberToKick, setMemberToKick] = useState<SquadMemberResponseDTO | null>(null);

  const openRoleModal = (member: SquadMemberResponseDTO) => {
    const isSelf = member.userId === currentUserId;
    const otherAssignable = assignableRoles(myRole, member.role, isSelf);
    setMemberToEditRole(member);
    setSelectedRole(otherAssignable[0] ?? member.role);
  };

  const handleSaveRole = async () => {
    if (!memberToEditRole || selectedRole === memberToEditRole.role) {
      setMemberToEditRole(null);
      return;
    }

    try {
      await changeRoleMutation.mutateAsync({
        targetUserId: memberToEditRole.userId,
        role: selectedRole,
      });
      if (selectedRole === 'OWNER') {
        toast.success(
          `Transferred ownership to ${memberToEditRole.username}. You can now leave the squad if you wish.`,
        );
      } else {
        toast.success(`Updated ${memberToEditRole.username}'s role to ${selectedRole}`);
      }
      setMemberToEditRole(null);
    } catch {
      // MutationCache handles error toast.
    }
  };

  const handleConfirmKick = async () => {
    if (!memberToKick) return;
    try {
      await kickMutation.mutateAsync(memberToKick.userId);
      toast.success(`Kicked ${memberToKick.username} from the squad`);
      setMemberToKick(null);
    } catch {
      // MutationCache handles error toast.
    }
  };

  // Compute allowed target roles for the member currently open in the Change Role modal
  const modalAllowedRoles = new Set<SquadRole>();
  if (memberToEditRole) {
    const isSelf = memberToEditRole.userId === currentUserId;
    modalAllowedRoles.add(memberToEditRole.role);
    for (const r of assignableRoles(myRole, memberToEditRole.role, isSelf)) {
      modalAllowedRoles.add(r);
    }
    if (canTransferOwnership(myRole, isSelf) && memberToEditRole.role !== 'OWNER') {
      modalAllowedRoles.add('OWNER');
    }
  }

  return (
    <section
      aria-labelledby="members-heading"
      className="rounded-2xl border border-dark-border bg-dark-surface/75 p-5"
    >
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="members-heading" className="text-base font-semibold text-zinc-100">
            Squad members ({members.length})
          </h2>
          <p className="mt-0.5 text-xs text-zinc-400">
            Manage member roles or remove members from the squad.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-dark-border text-xs font-semibold uppercase tracking-wider text-zinc-400">
              <th className="pb-3 pr-4">Member</th>
              <th className="pb-3 px-4">Role</th>
              <th className="pb-3 px-4">Joined</th>
              <th className="pb-3 pl-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-border/60">
            {members.map((member) => {
              const isSelf = member.userId === currentUserId;
              const otherAssignable = assignableRoles(myRole, member.role, isSelf);
              const canMakeOwner = canTransferOwnership(myRole, isSelf) && member.role !== 'OWNER';
              const canEditRole = otherAssignable.length > 0 || canMakeOwner;
              const roleDisabledReason = getRoleDisabledReason(myRole, member.role, isSelf);
              const allowedToKick = canKick(myRole, member.role, isSelf);

              return (
                <tr key={member.userId} className="group">
                  {/* Member username */}
                  <td className="py-3.5 pr-4">
                    <div className="flex items-center gap-3">
                      <span
                        aria-hidden="true"
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-xs font-semibold text-indigo-200 ring-1 ring-indigo-400/30"
                      >
                        {member.username.charAt(0).toUpperCase()}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-zinc-100">{member.username}</span>
                        {isSelf && (
                          <span className="rounded-full bg-indigo-500/15 px-2 py-0.5 text-[11px] font-medium text-indigo-300 ring-1 ring-indigo-400/30">
                            You
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Clean Role badge */}
                  <td className="py-3.5 px-4">
                    <RoleBadge role={member.role} />
                  </td>

                  {/* Joined date */}
                  <td className="py-3.5 px-4 text-xs text-zinc-400">
                    {formatDate(member.joinedAt) || '—'}
                  </td>

                  {/* Actions: Change role button + Kick button */}
                  <td className="py-3.5 pl-4 text-right">
                    <div className="inline-flex items-center justify-end gap-2">
                      <span title={roleDisabledReason} className="inline-block">
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={!canEditRole}
                          onClick={() => openRoleModal(member)}
                          leftIcon={<UserCog className="h-3.5 w-3.5" aria-hidden="true" />}
                        >
                          Change role
                        </Button>
                      </span>

                      <span
                        title={
                          allowedToKick
                            ? undefined
                            : isSelf
                              ? 'You cannot kick yourself — use Leave squad instead'
                              : 'You do not have permission to kick this member'
                        }
                        className="inline-block"
                      >
                        <Button
                          variant={allowedToKick ? 'danger' : 'secondary'}
                          size="sm"
                          disabled={!allowedToKick}
                          onClick={() => setMemberToKick(member)}
                          leftIcon={<UserMinus className="h-3.5 w-3.5" aria-hidden="true" />}
                        >
                          Kick
                        </Button>
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Change Role Modal */}
      <Modal
        isOpen={memberToEditRole !== null}
        onClose={changeRoleMutation.isPending ? () => {} : () => setMemberToEditRole(null)}
        title={
          memberToEditRole ? `Change role for ${memberToEditRole.username}` : 'Change role'
        }
        maxWidth="md"
      >
        {memberToEditRole && (
          <div className="space-y-4">
            <div className="space-y-2.5" role="radiogroup" aria-label="Select squad role">
              {ROLE_OPTIONS.map((option) => {
                const isAllowed = modalAllowedRoles.has(option.role);
                const isSelected = selectedRole === option.role;
                const isCurrent = memberToEditRole.role === option.role;
                const Icon = option.icon;

                return (
                  <button
                    key={option.role}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    disabled={!isAllowed || changeRoleMutation.isPending}
                    onClick={() => setSelectedRole(option.role)}
                    className={cn(
                      'flex w-full items-start justify-between gap-3 rounded-xl border p-3.5 text-left transition-all',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400',
                      isSelected
                        ? option.role === 'OWNER'
                          ? 'border-amber-400/60 bg-amber-500/10 ring-1 ring-inset ring-amber-400/30'
                          : 'border-indigo-500/60 bg-indigo-500/15 ring-1 ring-inset ring-indigo-400/30'
                        : 'border-dark-border bg-dark-bg/50 hover:border-zinc-700',
                      !isAllowed && 'cursor-not-allowed opacity-45',
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <Icon
                        className={cn(
                          'mt-0.5 h-4 w-4 shrink-0',
                          option.role === 'OWNER'
                            ? 'text-amber-300'
                            : isSelected
                              ? 'text-indigo-300'
                              : 'text-zinc-400',
                        )}
                        aria-hidden="true"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-zinc-100">
                            {option.title}
                          </span>
                          {isCurrent && (
                            <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-medium text-zinc-300">
                              Current
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                          {option.description}
                        </p>
                      </div>
                    </div>

                    {isSelected && (
                      <span
                        className={cn(
                          'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white',
                          option.role === 'OWNER' ? 'bg-amber-500' : 'bg-indigo-500',
                        )}
                      >
                        <Check className="h-3 w-3" aria-hidden="true" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {selectedRole === 'OWNER' && memberToEditRole.role !== 'OWNER' && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 text-xs text-amber-100">
                Confirming will transfer squad ownership to{' '}
                <strong className="font-semibold">{memberToEditRole.username}</strong> and change
                your role to <strong className="font-semibold">ADMIN</strong>.
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                variant="secondary"
                onClick={() => setMemberToEditRole(null)}
                disabled={changeRoleMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                disabled={selectedRole === memberToEditRole.role || changeRoleMutation.isPending}
                isLoading={changeRoleMutation.isPending}
                onClick={() => void handleSaveRole()}
              >
                {selectedRole === 'OWNER' ? 'Transfer ownership' : 'Update role'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Kick confirmation */}
      <ConfirmDialog
        isOpen={memberToKick !== null}
        onClose={() => setMemberToKick(null)}
        onConfirm={() => void handleConfirmKick()}
        title="Kick squad member?"
        confirmLabel="Kick member"
        isLoading={kickMutation.isPending}
        description={
          <p>
            Are you sure you want to kick{' '}
            <span className="font-semibold text-zinc-100">{memberToKick?.username}</span> from this
            squad?
          </p>
        }
      />
    </section>
  );
}
