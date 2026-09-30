import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import type { CreateEventPayload } from '../../types/event';
import { AlertCircle } from 'lucide-react';

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateEventPayload) => Promise<void>;
  initialDate?: Date | null;
}

// Helper to format Date object into HTML datetime-local input string (YYYY-MM-DDTHH:mm)
const formatToDatetimeLocal = (date: Date): string => {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const yyyy = date.getFullYear();
  const MM = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  return `${yyyy}-${MM}-${dd}T${hh}:${mm}`;
};

export const CreateEventModal: React.FC<CreateEventModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialDate,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTimeLocal, setStartTimeLocal] = useState('');
  const [endTimeLocal, setEndTimeLocal] = useState('');
  const [errors, setErrors] = useState<{
    title?: string;
    startTime?: string;
    endTime?: string;
    general?: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const baseDate = initialDate || new Date();
      const start = new Date(baseDate);
      if (!initialDate) {
        start.setMinutes(0, 0, 0);
      }
      const end = new Date(start.getTime() + 60 * 60 * 1000);

      setStartTimeLocal(formatToDatetimeLocal(start));
      setEndTimeLocal(formatToDatetimeLocal(end));
      setTitle('');
      setDescription('');
      setErrors({});
    }
  }, [isOpen, initialDate]);

  const validate = (): boolean => {
    const newErrors: { title?: string; startTime?: string; endTime?: string } = {};

    if (!title.trim()) {
      newErrors.title = 'Event title is required';
    }

    if (!startTimeLocal) {
      newErrors.startTime = 'Start time is required';
    }

    if (!endTimeLocal) {
      newErrors.endTime = 'End time is required';
    }

    if (startTimeLocal && endTimeLocal) {
      const startMs = new Date(startTimeLocal).getTime();
      const endMs = new Date(endTimeLocal).getTime();

      if (isNaN(startMs)) {
        newErrors.startTime = 'Invalid start time';
      }
      if (isNaN(endMs)) {
        newErrors.endTime = 'Invalid end time';
      }

      if (!isNaN(startMs) && !isNaN(endMs) && startMs >= endMs) {
        newErrors.endTime = 'End time must be strictly after start time';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      const payload: CreateEventPayload = {
        title: title.trim(),
        description: description.trim(),
        startTime: new Date(startTimeLocal).toISOString(),
        endTime: new Date(endTimeLocal).toISOString(),
      };

      await onSubmit(payload);
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'Failed to create event.';
      setErrors({ general: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Event" maxWidth="md">
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {errors.general && (
          <div className="p-3 bg-red-950/50 border border-red-800/60 rounded-xs flex items-start gap-2 text-xs text-red-300">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{errors.general}</span>
          </div>
        )}

        {/* Title Input */}
        <div>
          <Input
            label="Event Title"
            type="text"
            placeholder="e.g. API Sync & Code Review"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            error={errors.title}
            required
          />
        </div>

        {/* Description Textarea */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300">
            Description
          </label>
          <textarea
            rows={3}
            placeholder="Event details, meeting agenda, or notes..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-[#090A0F] text-zinc-100 text-sm p-3 rounded-sm border border-[#272A3D] focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors placeholder:text-zinc-500 resize-none"
          />
        </div>

        {/* Date & Time Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Input
              label="Start Time"
              type="datetime-local"
              value={startTimeLocal}
              onChange={(e) => setStartTimeLocal(e.target.value)}
              error={errors.startTime}
              required
            />
          </div>

          <div>
            <Input
              label="End Time"
              type="datetime-local"
              value={endTimeLocal}
              onChange={(e) => setEndTimeLocal(e.target.value)}
              error={errors.endTime}
              required
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#272A3D]">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            Create Event
          </Button>
        </div>
      </form>
    </Modal>
  );
};
