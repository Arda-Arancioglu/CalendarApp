import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, CheckCircle2, KeyRound } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';
import { CopyButton } from '../ui/CopyButton';
import { useCreateSquad } from '../../hooks/useSquads';
import { useToast } from '../../hooks/useToast';
import { applyFieldErrors, getErrorMessage } from '../../utils/errors';
import {
  createSquadSchema,
  SQUAD_DESCRIPTION_MAX,
  SQUAD_NAME_MAX,
  type CreateSquadFormValues,
} from '../../utils/validation';
import type { SquadResponseDTO } from '../../types/squad';

interface CreateSquadDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

function CreateSquadBody({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const toast = useToast();
  const createMutation = useCreateSquad();
  const [formError, setFormError] = useState<string | null>(null);
  const [createdSquad, setCreatedSquad] = useState<SquadResponseDTO | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CreateSquadFormValues>({
    resolver: zodResolver(createSquadSchema),
    defaultValues: { squadName: '', squadDescription: '' },
  });

  const watchedDescription = useWatch({ control, name: 'squadDescription' });

  const onSubmit = async (values: CreateSquadFormValues) => {
    setFormError(null);
    const trimmedDesc = values.squadDescription.trim();
    try {
      const created = await createMutation.mutateAsync({
        squadName: values.squadName.trim(),
        ...(trimmedDesc !== '' ? { squadDescription: trimmedDesc } : {}),
      });
      setCreatedSquad(created);
      toast.success(`Created squad "${created.squadName}"`);
    } catch (error) {
      const mapped = applyFieldErrors(error, setError, ['squadName', 'squadDescription']);
      if (!mapped) setFormError(getErrorMessage(error));
    }
  };

  // Step 2: Show the generated 8-character invite code with a copy button
  if (createdSquad) {
    return (
      <div className="space-y-5">
        <div className="flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-sm text-emerald-100">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" aria-hidden="true" />
          <div>
            <p className="font-semibold">Squad "{createdSquad.squadName}" is ready!</p>
            <p className="mt-0.5 text-xs text-emerald-200/90">
              Share this 8-character invite code so others can join your squad.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-dark-border bg-dark-bg/70 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-zinc-400">
                <KeyRound className="h-3.5 w-3.5 text-indigo-300" aria-hidden="true" />
                Invite code
              </span>
              <p className="mt-1 font-mono text-2xl font-bold tracking-widest text-zinc-50 select-all">
                {createdSquad.inviteCode}
              </p>
            </div>
            <CopyButton value={createdSquad.inviteCode} label="Copy code" />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-1">
          <Button variant="secondary" onClick={onClose}>
            Done
          </Button>
          <Button
            onClick={() => {
              onClose();
              navigate(`/squads/${createdSquad.squadId}`);
            }}
            leftIcon={<ArrowRight className="h-4 w-4" aria-hidden="true" />}
          >
            Open squad
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {formError && <Alert variant="error">{formError}</Alert>}

      <Input
        label="Squad name"
        placeholder="e.g. Weekend Hikers, Capstone Group"
        maxLength={SQUAD_NAME_MAX}
        autoFocus
        error={errors.squadName?.message}
        {...register('squadName')}
      />

      <Textarea
        label="Description"
        placeholder="Optional short description of this squad"
        maxLength={SQUAD_DESCRIPTION_MAX}
        rows={3}
        helperText={`${watchedDescription.length}/${SQUAD_DESCRIPTION_MAX} characters`}
        error={errors.squadDescription?.message}
        {...register('squadDescription')}
      />

      <div className="flex items-center justify-end gap-2.5 pt-2">
        <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isSubmitting} loadingText="Creating…">
          Create squad
        </Button>
      </div>
    </form>
  );
}

export function CreateSquadDialog({ isOpen, onClose }: CreateSquadDialogProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create a squad" maxWidth="md">
      {isOpen && <CreateSquadBody onClose={onClose} />}
    </Modal>
  );
}
