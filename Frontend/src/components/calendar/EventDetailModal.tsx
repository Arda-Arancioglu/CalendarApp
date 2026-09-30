import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import type { CalendarEvent } from '../../types/event';
import { Calendar, Clock, Trash2, AlertCircle, FileText } from 'lucide-react';
import { format, parseISO, differenceInMinutes } from 'date-fns';

interface EventDetailModalProps {
  event: CalendarEvent | null;
  isOpen: boolean;
  onClose: () => void;
  onDelete: (eventId: number) => Promise<void>;
}

export const EventDetailModal: React.FC<EventDetailModalProps> = ({
  event,
  isOpen,
  onClose,
  onDelete,
}) => {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!event) return null;

  const startObj = parseISO(event.startTime);
  const endObj = parseISO(event.endTime);

  const durationMin = differenceInMinutes(endObj, startObj);
  const durationLabel =
    durationMin >= 60
      ? `${Math.floor(durationMin / 60)}h ${durationMin % 60 ? `${durationMin % 60}m` : ''}`
      : `${durationMin}m`;

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      await onDelete(event.id);
      setIsConfirmingDelete(false);
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'Failed to delete event.';
      setError(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        setIsConfirmingDelete(false);
        setError(null);
        onClose();
      }}
      title="Event Details"
      maxWidth="md"
    >
      <div className="space-y-5">
        {error && (
          <div className="p-3 bg-red-950/50 border border-red-800/60 rounded-xs flex items-start gap-2 text-xs text-red-300">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Title Header & Creator Badge */}
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-lg font-bold text-zinc-100 leading-snug">{event.title}</h2>
            <Badge variant="indigo" className="shrink-0 mt-0.5">
              Creator ID: {event.creatorId}
            </Badge>
          </div>

          {/* Time & Duration Info */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-400 font-mono bg-[#090A0F] p-3 rounded-xs border border-[#272A3D]">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              <span>{format(startObj, 'EEEE, MMM d, yyyy')}</span>
            </div>

            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              <span>
                {format(startObj, 'HH:mm')} – {format(endObj, 'HH:mm')} ({durationLabel})
              </span>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <span className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-zinc-500" />
            Description
          </span>
          <div className="p-3 bg-[#090A0F] rounded-xs border border-[#272A3D] text-sm text-zinc-200 whitespace-pre-wrap font-sans min-h-[60px]">
            {event.description ? event.description : <span className="text-zinc-500 italic">No description provided.</span>}
          </div>
        </div>

        {/* Footer & Delete Action */}
        <div className="pt-4 border-t border-[#272A3D] flex items-center justify-between">
          <div className="text-[11px] text-zinc-500 font-mono">Event ID: #{event.id}</div>

          <div className="flex items-center gap-2">
            {!isConfirmingDelete ? (
              <Button
                variant="danger"
                size="sm"
                onClick={() => setIsConfirmingDelete(true)}
                className="bg-red-950/60 hover:bg-red-900/80 text-red-300 border-red-800/60"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Event</span>
              </Button>
            ) : (
              <div className="flex items-center gap-2 bg-red-950/80 p-1.5 rounded-xs border border-red-800/80 animate-fadeIn">
                <span className="text-xs text-red-200 font-medium px-1">Confirm delete?</span>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleDelete}
                  isLoading={isDeleting}
                >
                  Yes, Delete
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsConfirmingDelete(false)}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
