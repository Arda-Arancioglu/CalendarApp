import { useParams } from 'react-router-dom';
import { CalendarDays } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { EmptyState } from '../components/ui/States';

/**
 * Placeholder for Phase (a). Combined squad calendar is built in Phase (c).
 */
export function SquadCalendarPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <div>
      <PageHeader
        title={`Squad #${id ?? ''} Calendar`}
        description="Combined member availability."
      />
      <EmptyState
        icon={<CalendarDays className="h-6 w-6" aria-hidden="true" />}
        title="Squad calendar"
        description="Combined availability calendar and free-time finder are coming in Phase (c)."
      />
    </div>
  );
}
