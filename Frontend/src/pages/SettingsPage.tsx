import { Link } from 'react-router-dom';
import { ArrowRight, Clock, Eye, LogOut, ShieldCheck, Tag, User, Users } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';
import { useCategories } from '../hooks/useCategories';
import { useMySquads } from '../hooks/useSquads';
import { getStoredToken } from '../utils/authStorage';
import { getTokenExpiry } from '../utils/jwt';
import { formatDateTime } from '../utils/date';

export function SettingsPage() {
  const { user, logout } = useAuth();
  const categoriesQuery = useCategories();
  const squadsQuery = useMySquads();

  const token = getStoredToken();
  const tokenExpiry = token ? getTokenExpiry(token) : null;

  const categoryCount = categoriesQuery.data?.length ?? 0;
  const squadCount = squadsQuery.data?.length ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Your account details, session status, and privacy overview."
      />

      {/* Profile & Session Card */}
      <section className="rounded-2xl border border-dark-border bg-dark-surface/60 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3.5">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-500/30">
              <User className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-base font-semibold text-zinc-100">{user?.username}</p>
                {user?.userId !== undefined && (
                  <span className="rounded-md border border-dark-border bg-dark-elevated px-2 py-0.5 text-xs font-mono text-zinc-400">
                    ID #{user.userId}
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-zinc-400">Authenticated account</p>
            </div>
          </div>

          <Button
            variant="secondary"
            onClick={logout}
            leftIcon={<LogOut className="h-4 w-4" aria-hidden="true" />}
          >
            Log out
          </Button>
        </div>

        <div className="mt-5 grid gap-3 border-t border-dark-border/80 pt-5 sm:grid-cols-2">
          <div className="flex items-start gap-3 rounded-xl border border-dark-border/70 bg-dark-bg/50 p-3.5">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
            <div>
              <p className="text-xs font-semibold text-zinc-200">Session status</p>
              <p className="mt-0.5 text-xs text-zinc-400">
                Verified via <code className="text-zinc-300">GET /api/user/me</code>
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-dark-border/70 bg-dark-bg/50 p-3.5">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-indigo-400" aria-hidden="true" />
            <div>
              <p className="text-xs font-semibold text-zinc-200">Token expiration</p>
              <p className="mt-0.5 text-xs text-zinc-400">
                {tokenExpiry
                  ? `Expires ${formatDateTime(tokenExpiry)}`
                  : 'Managed by server session'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Workspace summary links */}
      <section className="grid gap-4 sm:grid-cols-2">
        <Link
          to="/categories"
          className="group flex items-center justify-between rounded-2xl border border-dark-border bg-dark-surface/60 p-5 transition-colors hover:border-indigo-500/40 hover:bg-dark-surface"
        >
          <div className="flex items-center gap-3.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-500/30">
              <Tag className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold text-zinc-100">Categories</p>
              <p className="text-xs text-zinc-400">
                {categoriesQuery.isLoading
                  ? 'Loading categories…'
                  : `${categoryCount} ${categoryCount === 1 ? 'category' : 'categories'} configured`}
              </p>
            </div>
          </div>
          <ArrowRight
            className="h-4 w-4 text-zinc-500 transition-transform group-hover:translate-x-0.5 group-hover:text-indigo-300"
            aria-hidden="true"
          />
        </Link>

        <Link
          to="/squads"
          className="group flex items-center justify-between rounded-2xl border border-dark-border bg-dark-surface/60 p-5 transition-colors hover:border-indigo-500/40 hover:bg-dark-surface"
        >
          <div className="flex items-center gap-3.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-500/30">
              <Users className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold text-zinc-100">Squads</p>
              <p className="text-xs text-zinc-400">
                {squadsQuery.isLoading
                  ? 'Loading squads…'
                  : `${squadCount} ${squadCount === 1 ? 'squad' : 'squads'} joined`}
              </p>
            </div>
          </div>
          <ArrowRight
            className="h-4 w-4 text-zinc-500 transition-transform group-hover:translate-x-0.5 group-hover:text-indigo-300"
            aria-hidden="true"
          />
        </Link>
      </section>

      {/* Privacy & sharing guide */}
      <section className="rounded-2xl border border-dark-border bg-dark-surface/60 p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-500/30">
            <Eye className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-zinc-100">How event privacy works</h2>
            <p className="text-xs leading-relaxed text-zinc-400">
              Each squad has its own visibility setting (<strong className="text-zinc-200">Public</strong>,{' '}
              <strong className="text-zinc-200">Busy only</strong>, or{' '}
              <strong className="text-zinc-200">Muted</strong>). Marking an individual event as{' '}
              <strong className="text-zinc-200">Private</strong> hides its title in all squads (showing
              only as <code className="text-zinc-300">Busy</code>), even in squads where your visibility is
              set to Public. Event descriptions are never shared with squads.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
