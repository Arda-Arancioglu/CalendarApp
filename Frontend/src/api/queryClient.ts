import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { ApiError, getErrorMessage } from '../utils/errors';
import type { ToastApi } from '../context/ToastContext';

/**
 * Extra flags we can attach to queries/mutations via `meta`.
 * Registering them here gives us type checking on `meta: { ... }`.
 */
interface AppQueryMeta extends Record<string, unknown> {
  /** Don't show the global error toast (the page renders its own error state). */
  skipErrorToast?: boolean;
}
interface AppMutationMeta extends Record<string, unknown> {
  /** The form shows the error inline, so don't also toast it. */
  handlesErrorInline?: boolean;
}

declare module '@tanstack/react-query' {
  interface Register {
    defaultError: Error;
    queryMeta: AppQueryMeta;
    mutationMeta: AppMutationMeta;
  }
}

/**
 * Creates the app's QueryClient with global error handling:
 *  - 401: nothing here (request() already triggered the logout)
 *  - 403: toast the server's message
 *  - 404: nothing for queries (pages show a friendly not-found state)
 *  - 5xx / network: toast; queries get a "Retry" button
 *  - other mutation errors (400/409...): toast, unless the form handles them inline
 */
export function createQueryClient(toast: ToastApi): QueryClient {
  const queryClient: QueryClient = new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => {
        if (query.meta?.skipErrorToast) return;
        if (!(error instanceof ApiError)) {
          toast.error(getErrorMessage(error));
          return;
        }
        if (error.status === 403) {
          toast.error(error.message);
        } else if (error.isRetryable) {
          toast.error(error.message, {
            action: {
              label: 'Retry',
              onClick: () => void queryClient.refetchQueries({ queryKey: query.queryKey }),
            },
          });
        }
      },
    }),
    mutationCache: new MutationCache({
      onError: (error, _variables, _context, mutation) => {
        if (mutation.meta?.handlesErrorInline) return;
        if (error instanceof ApiError && error.status === 401) return;
        // For mutations the dialog/form stays open, so "retry" = submit again.
        toast.error(getErrorMessage(error));
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        // Retry only when it might help (server down / crashed), never on 4xx.
        retry: (failureCount, error) =>
          error instanceof ApiError && error.isRetryable && failureCount < 2,
      },
      mutations: {
        retry: false,
      },
    },
  });
  return queryClient;
}
