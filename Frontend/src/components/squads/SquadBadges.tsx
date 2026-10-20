import { Crown, Eye, EyeOff, Shield, UserCheck, VolumeX } from 'lucide-react';
import { Badge, type BadgeVariant } from '../ui/Badge';
import type { EventVisibility, SquadRole } from '../../types/squad';

const ROLE_CONFIG: Record<
  SquadRole,
  { label: string; variant: BadgeVariant; icon: typeof Crown }
> = {
  OWNER: { label: 'Owner', variant: 'amber', icon: Crown },
  ADMIN: { label: 'Admin', variant: 'indigo', icon: Shield },
  VIEWER: { label: 'Viewer', variant: 'zinc', icon: UserCheck },
};

export function RoleBadge({ role }: { role: SquadRole }) {
  const cfg = ROLE_CONFIG[role];
  const Icon = cfg.icon;
  return (
    <Badge variant={cfg.variant}>
      <Icon className="h-3 w-3" aria-hidden="true" />
      {cfg.label}
    </Badge>
  );
}

const VISIBILITY_CONFIG: Record<
  EventVisibility,
  { label: string; variant: BadgeVariant; icon: typeof Eye; hint: string }
> = {
  PUBLIC: {
    label: 'Public',
    variant: 'emerald',
    icon: Eye,
    hint: 'Squad members see your event titles and times (never descriptions)',
  },
  BUSY: {
    label: 'Busy only',
    variant: 'sky',
    icon: EyeOff,
    hint: 'Squad members see your events titled "Busy", with times',
  },
  MUTED: {
    label: 'Muted',
    variant: 'zinc',
    icon: VolumeX,
    hint: 'Your events are hidden from squad members',
  },
};

export function VisibilityBadge({ visibility }: { visibility: EventVisibility }) {
  const cfg = VISIBILITY_CONFIG[visibility];
  const Icon = cfg.icon;
  return (
    <Badge variant={cfg.variant} title={cfg.hint}>
      <Icon className="h-3 w-3" aria-hidden="true" />
      {cfg.label}
    </Badge>
  );
}
