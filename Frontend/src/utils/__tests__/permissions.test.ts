import { describe, expect, it } from 'vitest';
import {
  assignableRoles,
  canChangeOwnVisibility,
  canChangeRole,
  canDeleteSquad,
  canKick,
  canLeaveSquad,
  canSeeInviteCode,
  canTransferOwnership,
} from '../permissions';

describe('squad permission matrix', () => {
  it('enforces kick rules across OWNER, ADMIN, and VIEWER', () => {
    // Nobody can kick themselves
    expect(canKick('OWNER', 'OWNER', true)).toBe(false);
    expect(canKick('ADMIN', 'ADMIN', true)).toBe(false);
    expect(canKick('VIEWER', 'VIEWER', true)).toBe(false);

    // OWNER can kick ADMIN and VIEWER
    expect(canKick('OWNER', 'ADMIN', false)).toBe(true);
    expect(canKick('OWNER', 'VIEWER', false)).toBe(true);

    // ADMIN can kick VIEWER, but cannot kick OWNER or another ADMIN
    expect(canKick('ADMIN', 'VIEWER', false)).toBe(true);
    expect(canKick('ADMIN', 'ADMIN', false)).toBe(false);
    expect(canKick('ADMIN', 'OWNER', false)).toBe(false);

    // VIEWER cannot kick anyone
    expect(canKick('VIEWER', 'VIEWER', false)).toBe(false);
    expect(canKick('VIEWER', 'ADMIN', false)).toBe(false);
  });

  it('computes assignable roles accurately', () => {
    // Cannot change own role or the OWNER's role
    expect(assignableRoles('OWNER', 'OWNER', true)).toEqual([]);
    expect(assignableRoles('ADMIN', 'OWNER', false)).toEqual([]);

    // OWNER can promote VIEWER -> ADMIN or demote ADMIN -> VIEWER
    expect(assignableRoles('OWNER', 'VIEWER', false)).toEqual(['ADMIN']);
    expect(assignableRoles('OWNER', 'ADMIN', false)).toEqual(['VIEWER']);
    expect(canChangeRole('OWNER', 'VIEWER', false)).toBe(true);

    // ADMIN can promote VIEWER -> ADMIN, but cannot demote another ADMIN
    expect(assignableRoles('ADMIN', 'VIEWER', false)).toEqual(['ADMIN']);
    expect(assignableRoles('ADMIN', 'ADMIN', false)).toEqual([]);
    expect(canChangeRole('ADMIN', 'ADMIN', false)).toBe(false);

    // VIEWER cannot change any roles
    expect(assignableRoles('VIEWER', 'VIEWER', false)).toEqual([]);
  });

  it('restricts ownership transfer and squad deletion to OWNER', () => {
    expect(canTransferOwnership('OWNER', false)).toBe(true);
    expect(canTransferOwnership('OWNER', true)).toBe(false);
    expect(canTransferOwnership('ADMIN', false)).toBe(false);
    expect(canTransferOwnership('VIEWER', false)).toBe(false);

    expect(canDeleteSquad('OWNER')).toBe(true);
    expect(canDeleteSquad('ADMIN')).toBe(false);
    expect(canDeleteSquad('VIEWER')).toBe(false);
  });

  it('blocks OWNER from leaving until ownership is transferred, while allowing ADMIN and VIEWER', () => {
    expect(canLeaveSquad('OWNER')).toBe(false);
    expect(canLeaveSquad('ADMIN')).toBe(true);
    expect(canLeaveSquad('VIEWER')).toBe(true);
  });

  it('allows all members to view invite code and change their own visibility', () => {
    for (const role of ['OWNER', 'ADMIN', 'VIEWER'] as const) {
      expect(canSeeInviteCode(role)).toBe(true);
      expect(canChangeOwnVisibility(role)).toBe(true);
    }
  });
});
