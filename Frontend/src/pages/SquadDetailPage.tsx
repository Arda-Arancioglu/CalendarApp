import { useParams } from 'react-router-dom';
import { Users } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { EmptyState } from '../components/ui/States';

/**
 * Placeholder for Phase (a). Squad detail, members, roles, and visibility are built in Phase (c).
 */
export function SquadDetailPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <div>
      <PageHeader
        title={`Squad #${id ?? ''}`}
        description="Squad details, members, and visibility settings."
      />
      <EmptyState
        icon={<Users className="h-6 w-6" aria-hidden="true" />}
        title="Squad details"
        description="Members table, role management, and visibility controls are coming in Phase (c)."
      />
    </div>
  );
}
