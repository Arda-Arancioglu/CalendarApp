import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as squadsApi from '../api/squads';
import { queryKeys } from './queryKeys';
import type {
  EventVisibility,
  JoinSquadRequestDTO,
  SquadCreateRequestDTO,
  SquadRole,
} from '../types/squad';

/**
 * List all squads the current user belongs to (`GET /api/squad`).
 */
export function useMySquads() {
  return useQuery({
    queryKey: queryKeys.squads.list(),
    queryFn: ({ signal }) => squadsApi.getMySquads(signal),
    meta: { skipErrorToast: true },
  });
}

/**
 * Fetch detail of one squad (`GET /api/squad/{id}`).
 */
export function useSquadDetail(squadId: number | null) {
  return useQuery({
    queryKey:
      squadId !== null ? queryKeys.squads.detail(squadId) : ['squads', 'detail', 'none'],
    queryFn: ({ signal }) => {
      if (squadId === null) throw new Error('squadId is required');
      return squadsApi.getSquad(squadId, signal);
    },
    enabled: squadId !== null,
    meta: { skipErrorToast: true },
  });
}

/**
 * Create a squad (`POST /api/squad`).
 */
export function useCreateSquad() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: SquadCreateRequestDTO) => squadsApi.createSquad(body),
    meta: { handlesErrorInline: true },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.squads.list() });
    },
  });
}

/**
 * Join a squad via 8-char invite code (`POST /api/squad/join`).
 */
export function useJoinSquad() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: JoinSquadRequestDTO) => squadsApi.joinSquad(body),
    meta: { handlesErrorInline: true },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.squads.list() });
    },
  });
}

/**
 * Leave a squad (`DELETE /api/squad/{id}/leave`).
 */
export function useLeaveSquad() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (squadId: number) => squadsApi.leaveSquad(squadId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.squads.all });
    },
  });
}

/**
 * Delete a squad (`DELETE /api/squad/{id}`). OWNER only.
 */
export function useDeleteSquad() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (squadId: number) => squadsApi.deleteSquad(squadId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.squads.all });
    },
  });
}

/**
 * Kick a member (`DELETE /api/squad/{id}/kick` with JSON body `{ targetUserId }`).
 */
export function useKickMember(squadId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (targetUserId: number) => squadsApi.kickMember(squadId, targetUserId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.squads.detail(squadId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.squads.calendarAll(squadId) });
    },
  });
}

/**
 * Change a member's role or transfer ownership (`PUT /api/squad/role`).
 * Always refetches the squad detail and squad list so the UI trusts the
 * server's resulting roles (especially after an ownership transfer).
 */
export function useChangeRole(squadId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ targetUserId, role }: { targetUserId: number; role: SquadRole }) =>
      squadsApi.changeRole({ squadId, targetUserId, role }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.squads.detail(squadId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.squads.list() });
    },
  });
}

/**
 * Change MY visibility in a squad (`PUT /api/squad/visibility`).
 */
export function useChangeVisibility(squadId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (visibility: EventVisibility) =>
      squadsApi.changeVisibility({ squadId, visibility }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.squads.detail(squadId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.squads.list() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.squads.calendarAll(squadId) });
    },
  });
}

/**
 * Toggle favorite status of a squad (`PATCH /api/squad/{squadId}/favorite`).
 */
export function useToggleFavoriteSquad() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (squadId: number) => squadsApi.toggleFavoriteSquad(squadId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.squads.all });
    },
  });
}

/**
 * Reorder favorite squads (`PUT /api/squad/favorites/order`).
 */
export function useReorderFavoriteSquads() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (squadIds: number[]) => squadsApi.reorderFavoriteSquads(squadIds),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.squads.all });
    },
  });
}
