import type { ReactNode } from 'react';
import { Eye, EyeOff, Users } from 'lucide-react';
import { Logo } from '../layout/Logo';

/**
 * Decorative "squad availability" preview for the auth screens.
 * Purely visual (aria-hidden): rows = members, colored blocks = busy times.
 */
function AvailabilityPreview() {
  const members = [
    { name: 'Ada', color: 'bg-indigo-400', blocks: [[1, 3], [6, 8]] },
    { name: 'Linus', color: 'bg-emerald-400', blocks: [[0, 2], [5, 6]] },
    { name: 'Grace', color: 'bg-amber-400', blocks: [[3, 5], [9, 11]] },
    { name: 'Alan', color: 'bg-zinc-500', blocks: [[2, 4], [7, 9]], busy: true },
  ];
  const SLOTS = 12;

  return (
    <div aria-hidden="true" className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.03] p-5 shadow-2xl shadow-black/40 backdrop-blur-md">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-zinc-200">
          <Users className="h-4 w-4 text-indigo-300" />
          Weekend Hikers
        </div>
        <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-[11px] font-medium text-emerald-300 ring-1 ring-emerald-400/30">
          2 free slots
        </span>
      </div>
      <div className="space-y-2.5">
        {members.map((member) => (
          <div key={member.name} className="flex items-center gap-3">
            <span className="w-12 text-xs text-zinc-400">{member.name}</span>
            <div className="relative grid h-6 flex-1 grid-cols-12 gap-0.5">
              {Array.from({ length: SLOTS }, (_, slot) => {
                const isBusy = member.blocks.some(([from = 0, to = 0]) => slot >= from && slot < to);
                const isFree = slot === 4 || slot === 11;
                return (
                  <span
                    key={slot}
                    className={
                      isBusy
                        ? `${member.color} ${member.busy ? 'opacity-50' : 'opacity-90'} rounded-sm`
                        : isFree
                          ? 'rounded-sm bg-emerald-400/20 ring-1 ring-inset ring-emerald-400/40'
                          : 'rounded-sm bg-white/[0.04]'
                    }
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-4 text-[11px] text-zinc-400">
        <span className="inline-flex items-center gap-1.5">
          <Eye className="h-3.5 w-3.5" /> Public
        </span>
        <span className="inline-flex items-center gap-1.5">
          <EyeOff className="h-3.5 w-3.5" /> Busy only
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-emerald-400/40" /> Everyone free
        </span>
      </div>
    </div>
  );
}

const CURRENT_YEAR = new Date().getFullYear();

interface AuthLayoutProps {
  title: string;
  subtitle: ReactNode;
  children: ReactNode;
  footer: ReactNode;
}

/** Split-screen layout for login/register: brand panel on desktop, form only on phones. */
export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      {/* Brand panel (desktop only) */}
      <section className="relative hidden overflow-hidden border-r border-dark-border lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(99,102,241,0.35),transparent_55%),radial-gradient(ellipse_at_bottom_right,rgba(16,185,129,0.18),transparent_55%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />

        <Logo className="relative" />

        <div className="relative space-y-8">
          <div className="space-y-4">
            <p className="text-4xl font-semibold leading-tight tracking-tight text-zinc-50 xl:text-5xl">
              Your time,
              <br />
              <span className="bg-gradient-to-r from-indigo-300 via-violet-300 to-emerald-300 bg-clip-text text-transparent">
                in sync with your squad.
              </span>
            </p>
            <p className="max-w-md text-base text-zinc-400">
              Keep your personal calendar, join squads with an invite code, and see when everyone is
              free, while you decide exactly how much each squad can see.
            </p>
          </div>
          <AvailabilityPreview />
        </div>

        <p className="relative text-xs text-zinc-500">© {CURRENT_YEAR} EventFlow</p>
      </section>

      {/* Form panel */}
      <section className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-sm animate-fade-up">
          <Logo className="mb-10 lg:hidden" />
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">{title}</h1>
          <p className="mt-2 text-sm text-zinc-400">{subtitle}</p>
          <div className="mt-8">{children}</div>
          <div className="mt-8 text-center text-sm text-zinc-400">{footer}</div>
        </div>
      </section>
    </div>
  );
}
