import { CalendarDays } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { EmptyState } from '../components/ui/States';

/**
 * Placeholder for Phase (a). FullCalendar + event CRUD is built in Phase (b).
 */
export function CalendarPage() {
  return (
    <div>
      <PageHeader
        title="My calendar"
        description="Manage your personal schedule and categories."
      />
      <EmptyState
        icon={<CalendarDays className="h-6 w-6" aria-hidden="true" />}
        title="Personal calendar"
        description="FullCalendar view, category filters, and event modals are coming in Phase (b)."
      />
    </div>
  );
}
