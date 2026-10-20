import { useState } from 'react';
import { CalendarClock, FileText, Lock, Pencil, Repeat, Tags, Trash2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { useDeleteEvent } from '../../hooks/useEvents';
import { useToast } from '../../hooks/useToast';
import { formatDateTime } from '../../utils/date';
import { DEFAULT_EVENT_COLOR, normalizeHexColor, withAlpha } from '../../utils/colors';
import type { EventResponseDTO } from '../../types/event';

interface EventDetailModalProps {
  event: EventResponseDTO | null;
  onClose: () => void;
  onEdit: (event: EventResponseDTO) => void;
}

/**
 * View modal when the user clicks an event on their personal calendar.
 * Shows full event metadata and actions to Edit or Delete.
 */
export function EventDetailModal({ event, onClose, onEdit }: EventDetailModalProps) {
  const toast = useToast();
  const deleteMutation = useDeleteEvent();
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  if (!event) return null;

  const primaryColor = normalizeHexColor(
    event.categories[0]?.color ?? DEFAULT_EVENT_COLOR,
  );

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(event.eventId);
      toast.success(`Deleted "${event.title}"`);
      setConfirmDeleteOpen(false);
      onClose();
    } catch {
      // MutationCache already shows the server error toast.
    }
  };

  return (
    <>
      <Modal isOpen={true} onClose={onClose} title="Event details" maxWidth="md">
        <div className="space-y-5">
          {/* Colored header card */}
          <div
            className="rounded-xl border-l-4 p-4"
            style={{
              borderLeftColor: primaryColor,
              backgroundColor: withAlpha(primaryColor, 0.14),
            }}
          >
            <h3 className="text-lg font-semibold text-zinc-50">{event.title}</h3>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-300">
              <CalendarClock className="h-4 w-4 shrink-0 text-zinc-400" aria-hidden="true" />
              <span>
                {formatDateTime(event.startTime)} → {formatDateTime(event.endTime)}
              </span>
            </div>
          </div>

          {/* Flags: Private / Flexible */}
          {(event.isPrivate || event.isFlexible) && (
            <div className="flex flex-wrap items-center gap-2">
              {event.isPrivate && (
                <Badge
                  variant="zinc"
                  title='Shown to squads as "Busy" even when your squad visibility is PUBLIC'
                >
                  <Lock className="h-3 w-3" aria-hidden="true" />
                  Private (shown as Busy to squads)
                </Badge>
              )}
              {event.isFlexible && (
                <Badge variant="amber" title="Flexible time">
                  <Repeat className="h-3 w-3" aria-hidden="true" />
                  Flexible time
                </Badge>
              )}
            </div>
          )}

          {/* Categories */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-zinc-400">
              <Tags className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Categories</span>
            </div>
            {event.categories.length === 0 ? (
              <p className="text-sm text-zinc-500">Uncategorized</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {event.categories.map((cat) => {
                  const color = normalizeHexColor(cat.color);
                  return (
                    <span
                      key={cat.categoryId}
                      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium text-zinc-100"
                      style={{
                        borderColor: color,
                        backgroundColor: withAlpha(color, 0.22),
                      }}
                    >
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: color }}
                        aria-hidden="true"
                      />
                      {cat.name}
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-zinc-400">
              <FileText className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Description</span>
            </div>
            {event.description ? (
              <p className="whitespace-pre-wrap rounded-xl border border-dark-border bg-dark-bg/50 p-3 text-sm leading-relaxed text-zinc-200">
                {event.description}
              </p>
            ) : (
              <p className="text-sm italic text-zinc-500">No description</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between border-t border-dark-border pt-4">
            <Button
              variant="danger"
              size="sm"
              onClick={() => setConfirmDeleteOpen(true)}
              leftIcon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
            >
              Delete
            </Button>

            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={onClose}>
                Close
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => onEdit(event)}
                leftIcon={<Pencil className="h-4 w-4" aria-hidden="true" />}
              >
                Edit event
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={() => void handleDelete()}
        title="Delete event?"
        confirmLabel="Delete event"
        isLoading={deleteMutation.isPending}
        description={
          <p>
            Are you sure you want to delete{' '}
            <span className="font-semibold text-zinc-100">{event.title}</span>? This cannot be
            undone.
          </p>
        }
      />
    </>
  );
}
