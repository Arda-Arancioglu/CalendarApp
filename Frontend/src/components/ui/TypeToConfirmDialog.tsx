import { useState, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';
import { Input } from './Input';
import { Button } from './Button';

interface TypeToConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: ReactNode;
  /** Exact text the user must type to enable the confirm button (e.g. the squad name). */
  confirmText: string;
  confirmButtonLabel?: string;
  isLoading?: boolean;
}

function TypeToConfirmBody({
  onClose,
  onConfirm,
  description,
  confirmText,
  confirmButtonLabel = 'Delete permanently',
  isLoading = false,
}: Omit<TypeToConfirmDialogProps, 'isOpen' | 'title'>) {
  const [typed, setTyped] = useState('');
  const matches = typed.trim() === confirmText.trim();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (matches && !isLoading) onConfirm();
      }}
      className="space-y-4"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-500/15 text-red-300 ring-1 ring-red-500/30">
          <AlertTriangle className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="text-sm leading-relaxed text-zinc-300">{description}</div>
      </div>

      <Input
        label={`Type "${confirmText}" to confirm`}
        placeholder={confirmText}
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        autoFocus
        disabled={isLoading}
      />

      <div className="flex items-center justify-end gap-2.5 pt-1">
        <Button variant="secondary" onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button
          type="submit"
          variant="danger"
          disabled={!matches || isLoading}
          isLoading={isLoading}
        >
          {confirmButtonLabel}
        </Button>
      </div>
    </form>
  );
}

/**
 * High-friction confirmation modal that requires typing `confirmText` before confirming.
 * Used for deleting a squad (type the squad name).
 */
export function TypeToConfirmDialog({
  isOpen,
  onClose,
  title,
  ...rest
}: TypeToConfirmDialogProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={rest.isLoading ? () => {} : onClose}
      title={title}
      maxWidth="md"
    >
      {isOpen && (
        <TypeToConfirmBody
          key={rest.confirmText}
          onClose={onClose}
          {...rest}
        />
      )}
    </Modal>
  );
}
