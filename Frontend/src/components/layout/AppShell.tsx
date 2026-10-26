import { useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronUp,
  LogOut,
  Menu,
  Palette,
  PanelLeftClose,
  PanelLeftOpen,
  Pipette,
  Settings,
  Star,
  Tags,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Logo } from './Logo';
import { useAuth } from '../../hooks/useAuth';
import { useMySquads, useReorderFavoriteSquads } from '../../hooks/useSquads';
import { useTheme } from '../../hooks/useTheme';
import { cn } from '../../utils/cn';
import { parseCustomColorToHex } from '../../utils/theme';
import type { SquadSummaryResponseDTO } from '../../types/squad';

const SIDEBAR_COLLAPSED_KEY = 'calendar.sidebarCollapsed';

function readInitialSidebarCollapsed(): boolean {
  try {
    return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
  } catch {
    return false;
  }
}

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

function NavLinks({
  collapsed = false,
  onNavigate,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <nav aria-label="Main" className="flex flex-col gap-1">
      {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          onClick={onNavigate}
          title={collapsed ? label : undefined}
          className={({ isActive }) =>
            cn(
              'group flex items-center rounded-lg py-2.5 text-sm font-medium transition-colors',
              collapsed ? 'justify-center px-2' : 'gap-3 px-3',
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
                className={cn(
                  'h-4.5 w-4.5 shrink-0',
                  isActive ? 'text-indigo-300' : 'text-zinc-500 group-hover:text-zinc-300',
                )}
                aria-hidden="true"
              />
              {!collapsed && <span className="truncate">{label}</span>}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

function FavoriteSquadsSection({
  collapsed = false,
  onNavigate,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const { data: squads = [] } = useMySquads();
  const reorderMutation = useReorderFavoriteSquads();
  const location = useLocation();

  const favoriteSquads = useMemo<SquadSummaryResponseDTO[]>(() => {
    return squads
      .filter((sq) => sq.favoriteOrder !== null && sq.favoriteOrder !== undefined)
      .sort((a, b) => (a.favoriteOrder ?? 0) - (b.favoriteOrder ?? 0));
  }, [squads]);

  if (favoriteSquads.length === 0) return null;

  const handleMove = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= favoriteSquads.length) return;
    const nextOrder = [...favoriteSquads];
    const current = nextOrder[index];
    const target = nextOrder[targetIndex];
    if (!current || !target) return;
    nextOrder[index] = target;
    nextOrder[targetIndex] = current;
    void reorderMutation.mutateAsync(nextOrder.map((s) => s.squadId));
  };

  return (
    <div className="mt-6 border-t border-dark-border/80 pt-4">
      {!collapsed ? (
        <div className="mb-2 flex items-center gap-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
          <Star className="h-3 w-3 fill-amber-400 text-amber-400" aria-hidden="true" />
          <span>Favorite squads</span>
        </div>
      ) : (
        <div className="mb-2 flex justify-center" title="Favorite squads">
          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
        </div>
      )}

      <div className="flex flex-col gap-1" role="list" aria-label="Favorite squads">
        {favoriteSquads.map((squad, idx) => {
          const initial = squad.squadName.charAt(0).toUpperCase() || 'S';
          const squadBasePath = `/squads/${squad.squadId}`;
          const isSquadActive =
            location.pathname === squadBasePath ||
            location.pathname.startsWith(`${squadBasePath}/`);

          return (
            <div
              key={squad.squadId}
              role="listitem"
              className="group/fav flex items-center gap-1"
            >
              <Link
                to={`/squads/${squad.squadId}/calendar`}
                onClick={onNavigate}
                title={collapsed ? `${squad.squadName} calendar` : undefined}
                aria-current={isSquadActive ? 'page' : undefined}
                className={cn(
                  'flex min-w-0 flex-1 items-center rounded-lg py-2 text-xs font-medium transition-colors',
                  collapsed ? 'justify-center px-1.5' : 'gap-2.5 px-2.5',
                  isSquadActive
                    ? 'bg-indigo-500/15 text-indigo-100 ring-1 ring-inset ring-indigo-400/25'
                    : 'text-zinc-300 hover:bg-dark-hover hover:text-zinc-100',
                )}
              >
                <span
                  aria-hidden="true"
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-indigo-500/20 text-[11px] font-bold text-indigo-200 ring-1 ring-indigo-400/30"
                >
                  {initial}
                </span>
                {!collapsed && <span className="truncate">{squad.squadName}</span>}
              </Link>

              {!collapsed && (
                <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover/fav:opacity-100 focus-within:opacity-100">
                  <Link
                    to={`/squads/${squad.squadId}`}
                    onClick={onNavigate}
                    aria-label={`${squad.squadName} settings`}
                    title="Squad settings"
                    className="rounded p-1 text-zinc-400 transition-colors hover:bg-dark-hover hover:text-zinc-100"
                  >
                    <Settings className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>

                  {favoriteSquads.length > 1 && (
                    <div className="flex flex-col">
                      <button
                        type="button"
                        disabled={idx === 0 || reorderMutation.isPending}
                        onClick={() => handleMove(idx, -1)}
                        aria-label={`Move ${squad.squadName} up`}
                        title="Move up"
                        className="rounded p-0.5 text-zinc-400 hover:bg-dark-hover hover:text-zinc-100 disabled:opacity-30"
                      >
                        <ChevronUp className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === favoriteSquads.length - 1 || reorderMutation.isPending}
                        onClick={() => handleMove(idx, 1)}
                        aria-label={`Move ${squad.squadName} down`}
                        title="Move down"
                        className="rounded p-0.5 text-zinc-400 hover:bg-dark-hover hover:text-zinc-100 disabled:opacity-30"
                      >
                        <ChevronDown className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function QuickThemePicker({ collapsed = false }: { collapsed?: boolean }) {
  const { theme, accentHex, isCustom, setTheme, options, quickSwatches } = useTheme();
  const [open, setOpen] = useState(false);
  const [hexDraft, setHexDraft] = useState('');
  const [isEditingHex, setIsEditingHex] = useState(false);

  const activeOption = options.find((o) => o.id === theme);
  const displayLabel = isCustom
    ? `🎨 Custom (${accentHex})`
    : `${activeOption?.badge ?? '⚡'} ${activeOption?.name ?? 'Cyber Indigo'}`;

  const displayedHexInput = isEditingHex ? hexDraft : accentHex;

  const handleColorWheelChange = (rawHex: string) => {
    setIsEditingHex(false);
    void setTheme(rawHex.toUpperCase(), { debounceSync: true });
  };

  const handleHexInputChange = (value: string) => {
    setIsEditingHex(true);
    setHexDraft(value);
    const parsed = parseCustomColorToHex(value);
    if (parsed) {
      void setTheme(parsed, { debounceSync: true });
    }
  };

  const handleHexInputBlur = () => {
    const parsed = parseCustomColorToHex(hexDraft);
    setIsEditingHex(false);
    if (parsed) {
      void setTheme(parsed);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={`Theme: ${displayLabel}`}
        aria-label="Change color theme"
        aria-expanded={open}
        className={cn(
          'flex w-full items-center rounded-xl border border-dark-border bg-dark-elevated/50 text-xs font-medium text-zinc-300 transition-colors hover:border-indigo-400/40 hover:bg-dark-hover hover:text-zinc-100',
          collapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2',
        )}
      >
        <span className="flex items-center gap-2 truncate">
          <Palette className="h-4 w-4 shrink-0 text-indigo-300" aria-hidden="true" />
          {!collapsed && <span className="truncate">{displayLabel}</span>}
        </span>
        {!collapsed && (
          <span
            className="h-3 w-3 shrink-0 rounded-full ring-1 ring-white/20"
            style={{ backgroundColor: accentHex }}
            aria-hidden="true"
          />
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden="true" />
          <div
            role="menu"
            aria-label="Color themes"
            className={cn(
              'absolute bottom-full z-50 mb-2 w-64 rounded-xl border border-dark-border bg-dark-surface p-3 shadow-2xl animate-fade-up',
              collapsed ? 'left-0' : 'left-0 right-0 w-64',
            )}
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
              Quick swatches
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {quickSwatches.map((swatch) => {
                const isSwatchActive =
                  theme === swatch.id || accentHex.toUpperCase() === swatch.hex.toUpperCase();
                return (
                  <button
                    key={swatch.id}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setIsEditingHex(false);
                      void setTheme(swatch.id);
                    }}
                    title={`${swatch.name} (${swatch.hex})`}
                    aria-label={swatch.name}
                    className={cn(
                      'flex h-6 w-6 items-center justify-center rounded-full transition-transform hover:scale-110',
                      isSwatchActive
                        ? 'ring-2 ring-white ring-offset-2 ring-offset-dark-surface scale-105'
                        : 'ring-1 ring-white/20 opacity-90 hover:opacity-100',
                    )}
                    style={{ backgroundColor: swatch.hex }}
                  >
                    {isSwatchActive && (
                      <Check className="h-3 w-3 text-white drop-shadow" aria-hidden="true" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-3 border-t border-dark-border/80 pt-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                Custom Hex / RGB color
              </p>
              <div className="mt-1.5 flex items-center gap-2">
                <label
                  htmlFor="sidebar-custom-color-wheel"
                  title="Pick any color from color wheel"
                  className={cn(
                    'relative flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full ring-2 transition-transform hover:scale-105',
                    isCustom ? 'ring-indigo-400' : 'ring-white/20',
                  )}
                >
                  <input
                    id="sidebar-custom-color-wheel"
                    type="color"
                    aria-label="Custom color wheel"
                    value={accentHex}
                    onChange={(e) => handleColorWheelChange(e.target.value)}
                    className="color-wheel-input h-10 w-10 scale-125 cursor-pointer"
                  />
                </label>

                <div className="flex min-w-0 flex-1 items-center rounded-lg border border-dark-border bg-dark-bg/70 px-2.5 py-1.5 focus-within:border-indigo-400">
                  <Pipette className="mr-1.5 h-3.5 w-3.5 shrink-0 text-indigo-300" aria-hidden="true" />
                  <input
                    type="text"
                    aria-label="Custom Hex color"
                    placeholder="#FF69B4"
                    value={displayedHexInput}
                    onFocus={() => {
                      setIsEditingHex(true);
                      setHexDraft(accentHex);
                    }}
                    onChange={(e) => handleHexInputChange(e.target.value)}
                    onBlur={handleHexInputBlur}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.currentTarget.blur();
                      }
                    }}
                    maxLength={24}
                    className="w-full bg-transparent font-mono text-xs uppercase text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function UserCard({ collapsed = false }: { collapsed?: boolean }) {
  const { user, logout } = useAuth();
  const initial = user?.username.charAt(0).toUpperCase() ?? '?';

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dark-border bg-dark-elevated/60 p-2">
        <span
          title={user?.username}
          aria-hidden="true"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-xs font-semibold text-white"
        >
          {initial}
        </span>
        <button
          type="button"
          onClick={logout}
          className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-dark-hover hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          aria-label="Log out"
          title="Log out"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    );
  }

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
 * Layout for all logged-in pages: a collapsible sidebar on desktop (~240px vs ~64px)
 * and a top bar with a slide-in drawer on phones. The current page renders in <Outlet />.
 */
export function AppShell() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(readInitialSidebarCollapsed);
  const closeDrawer = () => setDrawerOpen(false);

  const toggleSidebarCollapsed = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  };

  return (
    <div
      className={cn(
        'min-h-dvh transition-[padding] duration-200',
        sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-60',
      )}
    >
      <a
        href="#main-content"
        className="sr-only z-[200] rounded-md bg-indigo-600 px-3 py-2 text-sm text-white focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-dark-border bg-dark-surface/85 py-5 backdrop-blur-xl transition-[width,padding] duration-200 lg:flex',
          sidebarCollapsed ? 'w-16 px-2' : 'w-60 px-4',
        )}
      >
        <div
          className={cn(
            'flex items-center',
            sidebarCollapsed ? 'flex-col gap-3' : 'justify-between px-1',
          )}
        >
          <Logo compact={sidebarCollapsed} />
          <button
            type="button"
            onClick={toggleSidebarCollapsed}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-dark-hover hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>
        </div>

        <div className="mt-7 flex-1 overflow-y-auto overflow-x-hidden">
          <NavLinks collapsed={sidebarCollapsed} />
          <FavoriteSquadsSection collapsed={sidebarCollapsed} />
        </div>

        <div className="mt-4 space-y-2.5">
          <QuickThemePicker collapsed={sidebarCollapsed} />
          <UserCard collapsed={sidebarCollapsed} />
        </div>
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
        <div
          className="fixed inset-0 z-40 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
        >
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={closeDrawer}
          />
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
            <div className="mt-8 flex-1 overflow-y-auto">
              <NavLinks onNavigate={closeDrawer} />
              <FavoriteSquadsSection onNavigate={closeDrawer} />
            </div>
            <div className="mt-4 space-y-2.5">
              <QuickThemePicker />
              <UserCard />
            </div>
          </div>
        </div>
      )}

      <main
        id="main-content"
        className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8"
      >
        <Outlet />
      </main>
    </div>
  );
}
