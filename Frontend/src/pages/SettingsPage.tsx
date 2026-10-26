import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  Clock,
  Eye,
  LogOut,
  Palette,
  Pipette,
  ShieldCheck,
  Tag,
  User,
  Users,
} from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';
import { useCategories } from '../hooks/useCategories';
import { useMySquads } from '../hooks/useSquads';
import { useTheme } from '../hooks/useTheme';
import { useToast } from '../hooks/useToast';
import { getStoredToken } from '../utils/authStorage';
import { cn } from '../utils/cn';
import { getTokenExpiry } from '../utils/jwt';
import { formatDateTime } from '../utils/date';
import { parseCustomColorToHex } from '../utils/theme';
import type { ThemeId } from '../types/user';

export function SettingsPage() {
  const { user, logout } = useAuth();
  const { theme, accentHex, isCustom, setTheme, isSyncing, options, quickSwatches } = useTheme();
  const toast = useToast();
  const categoriesQuery = useCategories();
  const squadsQuery = useMySquads();

  const [hexDraft, setHexDraft] = useState<string>('');
  const [isEditingHex, setIsEditingHex] = useState(false);

  const displayedHexInput = isEditingHex ? hexDraft : accentHex;

  const token = getStoredToken();
  const tokenExpiry = token ? getTokenExpiry(token) : null;

  const categoryCount = categoriesQuery.data?.length ?? 0;
  const squadCount = squadsQuery.data?.length ?? 0;

  const handleSelectTheme = async (nextId: ThemeId, name: string) => {
    setIsEditingHex(false);
    await setTheme(nextId);
    toast.success(`Theme switched to ${name}`);
  };

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
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Your account details, cross-device color theme, session status, and privacy overview."
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

      {/* Color Theme Palette Card */}
      <section
        aria-labelledby="theme-palette-heading"
        className="rounded-2xl border border-dark-border bg-dark-surface/60 p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-500/30">
              <Palette className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <h2 id="theme-palette-heading" className="text-base font-semibold text-zinc-100">
                Color theme &amp; appearance
              </h2>
              <p className="text-xs text-zinc-400">
                Pick a curated preset or any custom Hex/RGB color. Synced across all your devices.
              </p>
            </div>
          </div>

          {isSyncing && (
            <span className="text-xs font-medium text-indigo-300">Syncing theme…</span>
          )}
        </div>

        {/* Quick-Pick Swatch Row + Custom Color Wheel & Hex/RGB Input */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-dark-border bg-dark-bg/60 p-4">
          <div className="flex flex-wrap items-center gap-2.5" role="group" aria-label="Quick color swatches">
            <span className="mr-1 text-xs font-semibold text-zinc-300">Quick pick:</span>
            {quickSwatches.map((swatch) => {
              const isSwatchActive =
                theme === swatch.id || accentHex.toUpperCase() === swatch.hex.toUpperCase();
              return (
                <button
                  key={swatch.id}
                  type="button"
                  onClick={() => void handleSelectTheme(swatch.id, swatch.name)}
                  title={`${swatch.name} (${swatch.hex})`}
                  aria-label={`${swatch.name} ${swatch.hex}`}
                  aria-pressed={isSwatchActive}
                  className={cn(
                    'relative flex h-8 w-8 items-center justify-center rounded-full transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400',
                    isSwatchActive
                      ? 'ring-2 ring-white ring-offset-2 ring-offset-dark-bg scale-105'
                      : 'ring-1 ring-white/20 opacity-90 hover:opacity-100',
                  )}
                  style={{ backgroundColor: swatch.hex }}
                >
                  {isSwatchActive && (
                    <Check className="h-3.5 w-3.5 text-white drop-shadow" aria-hidden="true" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Custom Color Wheel + Hex/RGB Input */}
          <div className="flex flex-wrap items-center gap-2.5">
            <label
              htmlFor="settings-custom-color-wheel"
              className={cn(
                'relative flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors',
                isCustom
                  ? 'border-indigo-400 bg-indigo-500/15 text-indigo-100 ring-1 ring-inset ring-indigo-400/40'
                  : 'border-dark-border bg-dark-surface text-zinc-200 hover:border-zinc-600',
              )}
              title="Open custom color wheel"
            >
              <span className="relative flex h-6 w-6 items-center justify-center overflow-hidden rounded-full ring-1 ring-white/25">
                <input
                  id="settings-custom-color-wheel"
                  type="color"
                  aria-label="Custom color wheel"
                  value={accentHex}
                  onChange={(e) => handleColorWheelChange(e.target.value)}
                  className="color-wheel-input h-8 w-8 scale-125 cursor-pointer"
                />
              </span>
              <Pipette className="h-3.5 w-3.5 text-indigo-300" aria-hidden="true" />
              <span>Custom wheel</span>
            </label>

            <div className="flex items-center rounded-xl border border-dark-border bg-dark-surface px-2.5 py-1.5 focus-within:border-indigo-400 focus-within:ring-1 focus-within:ring-indigo-400/40">
              <span
                className="mr-2 h-3.5 w-3.5 shrink-0 rounded-full ring-1 ring-white/20"
                style={{ backgroundColor: accentHex }}
                aria-hidden="true"
              />
              <input
                type="text"
                aria-label="Custom Hex or RGB color"
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
                className="w-24 bg-transparent font-mono text-xs uppercase text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Curated Theme Cards */}
        <div
          role="radiogroup"
          aria-label="Color theme palette"
          className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
        >
          {options.map((opt) => {
            const isSelected = opt.id === theme;
            return (
              <button
                key={opt.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => void handleSelectTheme(opt.id, opt.name)}
                className={cn(
                  'group relative flex flex-col justify-between rounded-xl border p-4 text-left transition-all',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400',
                  isSelected
                    ? 'border-indigo-400 bg-indigo-500/15 ring-1 ring-inset ring-indigo-400/40'
                    : 'border-dark-border bg-dark-bg/50 hover:border-zinc-600 hover:bg-dark-elevated/60',
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
                      <span>{opt.badge}</span>
                      <span>{opt.name}</span>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                      {opt.description}
                    </p>
                  </div>

                  <span
                    className={cn(
                      'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors',
                      isSelected
                        ? 'border-indigo-400 bg-indigo-500 text-white'
                        : 'border-zinc-600 bg-dark-surface',
                    )}
                  >
                    {isSelected && <Check className="h-3 w-3" aria-hidden="true" />}
                  </span>
                </div>

                {/* Color Swatch Preview Bar */}
                <div className="mt-4 flex items-center gap-2">
                  <span
                    className="h-4 w-8 rounded-full ring-1 ring-white/15"
                    style={{ backgroundColor: opt.accentHex }}
                    title="Accent color"
                  />
                  <span
                    className="h-4 w-8 rounded-full ring-1 ring-white/15"
                    style={{ backgroundColor: opt.surfaceHex }}
                    title="Surface color"
                  />
                  <span
                    className="h-4 w-8 rounded-full ring-1 ring-white/15"
                    style={{ backgroundColor: opt.bgHex }}
                    title="Background color"
                  />
                </div>
              </button>
            );
          })}
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
