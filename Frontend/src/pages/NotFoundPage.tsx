import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { EmptyState } from '../components/ui/States';
import { Button } from '../components/ui/Button';

export function NotFoundPage() {
  return (
    <div className="py-12">
      <EmptyState
        icon={<Compass className="h-6 w-6" aria-hidden="true" />}
        title="Page not found"
        description="The page you're looking for doesn't exist or has moved."
        action={
          <Link to="/calendar">
            <Button variant="secondary">Back to my calendar</Button>
          </Link>
        }
      />
    </div>
  );
}
