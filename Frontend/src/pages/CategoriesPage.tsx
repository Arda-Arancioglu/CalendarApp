import { Tags } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { EmptyState } from '../components/ui/States';

/**
 * Placeholder for Phase (a). Categories CRUD + color picker is built in Phase (b).
 */
export function CategoriesPage() {
  return (
    <div>
      <PageHeader
        title="Categories"
        description="Color-code your personal events."
      />
      <EmptyState
        icon={<Tags className="h-6 w-6" aria-hidden="true" />}
        title="Event categories"
        description="Category management and color picker are coming in Phase (b)."
      />
    </div>
  );
}
