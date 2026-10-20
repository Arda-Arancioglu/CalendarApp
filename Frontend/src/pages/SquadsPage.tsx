import { useState } from 'react';
import { Plus, UserPlus, Users } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { EmptyState, ErrorState } from '../components/ui/States';
import { SquadCard } from '../components/squads/SquadCard';
import { CreateSquadDialog } from '../components/squads/CreateSquadDialog';
import { JoinSquadDialog } from '../components/squads/JoinSquadDialog';
import { useMySquads } from '../hooks/useSquads';

export function SquadsPage() {
  const {
    data: squads,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useMySquads();

  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);

  return (
    <div>
      <PageHeader
        title="Squads"
        description="Coordinate schedules with friends, study groups, or teammates while controlling your calendar visibility per squad."
        actions={
          <div className="flex items-center gap-2.5">
            <Button
              variant="secondary"
              onClick={() => setJoinOpen(true)}
              leftIcon={<UserPlus className="h-4 w-4" aria-hidden="true" />}
            >
              Join with code
            </Button>
            <Button
              onClick={() => setCreateOpen(true)}
              leftIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
            >
              Create squad
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <div className="flex justify-center py-20 text-indigo-400">
          <Spinner size="lg" label="Loading your squads" />
        </div>
      ) : isError ? (
        <ErrorState
          error={error}
          onRetry={() => void refetch()}
          isRetrying={isFetching}
        />
      ) : !squads || squads.length === 0 ? (
        <EmptyState
          icon={<Users className="h-6 w-6" aria-hidden="true" />}
          title="You aren't in any squads yet"
          description="Create a new squad to get an 8-character invite code, or join an existing squad with a code from a friend."
          action={
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              <Button
                variant="secondary"
                onClick={() => setJoinOpen(true)}
                leftIcon={<UserPlus className="h-4 w-4" aria-hidden="true" />}
              >
                Join with code
              </Button>
              <Button
                onClick={() => setCreateOpen(true)}
                leftIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
              >
                Create squad
              </Button>
            </div>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {squads.map((squad) => (
            <SquadCard key={squad.squadId} squad={squad} />
          ))}
        </div>
      )}

      <CreateSquadDialog isOpen={createOpen} onClose={() => setCreateOpen(false)} />
      <JoinSquadDialog isOpen={joinOpen} onClose={() => setJoinOpen(false)} />
    </div>
  );
}
