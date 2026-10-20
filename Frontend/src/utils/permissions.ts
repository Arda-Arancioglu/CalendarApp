import type { SquadRole } from '../types/squad';

/**
 * ALL squad permission rules live here, derived from `myRole` (from the squad
 * detail response). The UI uses these to hide/disable controls. The server is
 * still the real authority, so 403 responses are handled anyway.
 *
 * Parameters:
 *  - myRole:     my role in this squad
 *  - targetRole: role of the member I want to act on
 *  - isSelf:     whether that member is me
 */

/** Every member can see (and copy) the invite code. */
export function canSeeInviteCode(_myRole: SquadRole): boolean {
  return true;
}

/**
 * OWNER can kick anyone except themselves.
 * ADMIN can kick only VIEWERs.
 * VIEWER cannot kick.
 */
export function canKick(myRole: SquadRole, targetRole: SquadRole, isSelf: boolean): boolean {
  if (isSelf) return false;
  switch (myRole) {
    case 'OWNER':
      return targetRole !== 'OWNER';
    case 'ADMIN':
      return targetRole === 'VIEWER';
    case 'VIEWER':
      return false;
  }
}

/**
 * Roles I may assign to a member (excluding their current role).
 * OWNER is never in this list: handing over ownership is a separate,
 * confirmed action (see `canTransferOwnership`).
 *
 * OWNER can set ADMIN or VIEWER for any other member.
 * ADMIN can only promote a VIEWER to ADMIN.
 * VIEWER cannot change roles.
 */
export function assignableRoles(
  myRole: SquadRole,
  targetRole: SquadRole,
  isSelf: boolean,
): SquadRole[] {
  if (isSelf || targetRole === 'OWNER') return [];
  switch (myRole) {
    case 'OWNER': {
      const options: SquadRole[] = ['ADMIN', 'VIEWER'];
      return options.filter((role) => role !== targetRole);
    }
    case 'ADMIN':
      return targetRole === 'VIEWER' ? ['ADMIN'] : [];
    case 'VIEWER':
      return [];
  }
}

export function canChangeRole(myRole: SquadRole, targetRole: SquadRole, isSelf: boolean): boolean {
  return assignableRoles(myRole, targetRole, isSelf).length > 0;
}

/** Only the OWNER can transfer ownership, and only to someone else. */
export function canTransferOwnership(myRole: SquadRole, isSelf: boolean): boolean {
  return myRole === 'OWNER' && !isSelf;
}

/** Everyone can leave, except the OWNER (they must transfer ownership first). */
export function canLeaveSquad(myRole: SquadRole): boolean {
  return myRole !== 'OWNER';
}

/** Tooltip shown on the disabled Leave button for owners. */
export const LEAVE_BLOCKED_REASON = 'Transfer ownership first';

/** Only the OWNER can delete the squad. */
export function canDeleteSquad(myRole: SquadRole): boolean {
  return myRole === 'OWNER';
}

/** Every member controls their own visibility. */
export function canChangeOwnVisibility(_myRole: SquadRole): boolean {
  return true;
}
