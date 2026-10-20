import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { CalendarDays, LogOut, Menu, Settings, Tags, Users, X, type LucideIcon } from 'lucide-react';
import { Logo } from './Logo';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../utils/cn';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/calendar', label: 'My calendar', icon: CalendarDays },
  { to: '/squads', label: 'Squads', icon: Users },
  { to: '/categories', label: 'Categories', icon: Tags },
  { to: '/settings', label: 'Settings', icon: Settings },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav aria-label="Main" className="flex flex-col gap-1">
      {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400',
              isActive
                ? 'bg-indigo-500/15 text-indigo-100 ring-1 ring-inset ring-indigo-400/25'
                : 'text-zinc-400 hover:bg-dark-hover hover:text-zinc-100',
            )
          }
        >
          {({ isActive }) => (
            <>
              <Icon
                className={cn('h-4.5 w-4.5', isActive ? 'text-indigo-300' : 'text-zinc-500 group-hover:text-zinc-300')}
                aria-hidden="true"
              />
              {label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

function UserCard() {
  const { user, logout } = useAuth();
  const initial = user?.username.charAt(0).toUpperCase() ?? '?';
  return (
    <div className="flex items-center gap-3 rounded-xl border border-dark-border bg-dark-elevated/60 p-2.5">
      <span
        aria-hidden="true"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-sm font-semibold text-white"
      >
        {initial}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-zinc-100">{user?.username}</p>
        <p className="text-xs text-zinc-500">Signed in</p>
      </div>
      <button
        type="button"
        onClick={logout}
        className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-dark-hover hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
        aria-label="Log out"
        title="Log out"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  );
}

/**
 * Layout for all logged-in pages: a sidebar on desktop and a top bar with a
 * slide-in drawer on phones. The current page renders in <Outlet />.
 */
export function AppShell() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const closeDrawer = () => setDrawerOpen(false);

  return (
    <div className="min-h-dvh lg:pl-64">
      <a
        href="#main-content"
        className="sr-only z-[200] rounded-md bg-indigo-600 px-3 py-2 text-sm text-white focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-dark-border bg-dark-surface/80 px-4 py-5 backdrop-blur-xl lg:flex">
        <Logo className="px-2" />
        <div className="mt-8 flex-1">
          <NavLinks />
        </div>
        <UserCard />
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-dark-border bg-dark-bg/80 px-4 backdrop-blur-xl lg:hidden">
        <Logo />
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="rounded-lg p-2 text-zinc-300 hover:bg-dark-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          aria-label="Open menu"
          aria-expanded={drawerOpen}
          aria-controls="mobile-drawer"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={closeDrawer} />
          <div
            id="mobile-drawer"
            className="absolute inset-y-0 right-0 flex w-72 max-w-[85vw] flex-col border-l border-dark-border bg-dark-surface px-4 py-5 animate-slide-in-right"
          >
            <div className="flex items-center justify-between">
              <Logo />
              <button
                type="button"
                onClick={closeDrawer}
                className="rounded-lg p-2 text-zinc-400 hover:bg-dark-hover hover:text-zinc-100"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-8 flex-1">
              <NavLinks onNavigate={closeDrawer} />
            </div>
            <UserCard />
          </div>
        </div>
      )}

      <main id="main-content" className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <Outlet />
      </main>
    </div>
  );
}
