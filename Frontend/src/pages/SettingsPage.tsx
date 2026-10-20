import { LogOut, User } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';

/**
 * Basic profile & logout for Phase (a); danger zone ("Delete all events") is added in Phase (d).
 */
export function SettingsPage() {
  const { user, logout } = useAuth();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Your account details and preferences."
      />

      <section className="rounded-2xl border border-dark-border bg-dark-surface/60 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3.5">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-500/30">
              <User className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">Signed in as</p>
              <p className="text-base font-semibold text-zinc-100">{user?.username}</p>
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
      </section>
    </div>
  );
}
