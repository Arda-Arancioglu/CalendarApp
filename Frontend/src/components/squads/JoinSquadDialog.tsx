import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { UserPlus } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';
import { useJoinSquad } from '../../hooks/useSquads';
import { useToast } from '../../hooks/useToast';
import { applyFieldErrors, getErrorMessage } from '../../utils/errors';
import {
  INVITE_CODE_LENGTH,
  joinSquadSchema,
  type JoinSquadFormValues,
} from '../../utils/validation';

interface JoinSquadDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

function JoinSquadBody({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const toast = useToast();
  const joinMutation = useJoinSquad();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<JoinSquadFormValues>({
    resolver: zodResolver(joinSquadSchema),
    defaultValues: { inviteCode: '' },
  });

  const onSubmit = async (values: JoinSquadFormValues) => {
    setFormError(null);
    try {
      // Trim the code first (never force uppercase in case codes are case-sensitive)
      const joined = await joinMutation.mutateAsync({
        inviteCode: values.inviteCode.trim(),
      });
      toast.success(`Joined "${joined.squadName}"`);
      onClose();
      navigate(`/squads/${joined.squadId}`);
    } catch (error) {
      const mapped = applyFieldErrors(error, setError, ['inviteCode']);
      if (!mapped) setFormError(getErrorMessage(error));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {formError && <Alert variant="error">{formError}</Alert>}

      <Input
        label="Invite code"
        placeholder="8-character code"
        autoFocus
        helperText={`Enter the ${INVITE_CODE_LENGTH}-character code shared by a squad member.`}
        error={errors.inviteCode?.message}
        className="font-mono tracking-wider"
        {...register('inviteCode')}
      />

      <div className="flex items-center justify-end gap-2.5 pt-2">
        <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          type="submit"
          isLoading={isSubmitting}
          loadingText="Joining…"
          leftIcon={<UserPlus className="h-4 w-4" aria-hidden="true" />}
        >
          Join squad
        </Button>
      </div>
    </form>
  );
}

export function JoinSquadDialog({ isOpen, onClose }: JoinSquadDialogProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Join a squad" maxWidth="sm">
      {isOpen && <JoinSquadBody onClose={onClose} />}
    </Modal>
  );
}
