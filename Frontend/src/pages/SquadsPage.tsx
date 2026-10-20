import { Users } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { EmptyState } from '../components/ui/States';

/**
 * Placeholder for Phase (a). Squad list, create, and join are built in Phase (c).
 */
export function SquadsPage() {
  return (
    <div>
      <PageHeader
        title="Squads"
        description="Share availability with friends and teammates."
      />
      <EmptyState
        icon={<Users className="h-6 w-6" aria-hidden="true" />}
        title="Your squads"
        description="Squad cards, creating squads, and joining via invite code are coming in Phase (c)."
      />
    </div>
  );
}
