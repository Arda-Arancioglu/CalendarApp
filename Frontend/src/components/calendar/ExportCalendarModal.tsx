import { useState } from 'react';
import { toPng } from 'html-to-image';
import { Camera, Download, EyeOff, LayoutGrid, Moon, Palette } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Time24Input } from '../ui/Time24Input';
import { useToast } from '../../hooks/useToast';
import { toApiDate } from '../../utils/date';
import type { ScheduleLayoutMode } from '../../utils/scheduleCompression';

export interface CalendarExportOptions {
  maskPrivateEvents: boolean;
  preserveCategoryColors: boolean;
  hideInactiveNightHours: boolean;
  visibleStartTime: string; // 'HH:mm' in 24h
  visibleEndTime: string; // 'HH:mm' in 24h
  layoutMode?: ScheduleLayoutMode;
}

export interface ExportCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  calendarContainerRef: React.RefObject<HTMLElement | null>;
  defaultVisibleStartTime?: string;
  defaultVisibleEndTime?: string;
  defaultLayoutMode?: ScheduleLayoutMode;
  onApplyExportOptions?: (options: CalendarExportOptions | null) => Promise<void> | void;
}

function waitNextFrame(): Promise<void> {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => {
      window.setTimeout(resolve, 60);
    });
  });
}

export function ExportCalendarModal({
  isOpen,
  onClose,
  calendarContainerRef,
  defaultVisibleStartTime = '08:00',
  defaultVisibleEndTime = '23:00',
  defaultLayoutMode = 'standard',
  onApplyExportOptions,
}: ExportCalendarModalProps) {
  const toast = useToast();
  const [maskPrivateEvents, setMaskPrivateEvents] = useState<boolean>(true);
  const [preserveCategoryColors, setPreserveCategoryColors] = useState<boolean>(true);
  const [hideInactiveNightHours, setHideInactiveNightHours] = useState<boolean>(false);
  const [visibleStartTime, setVisibleStartTime] = useState<string>(
    defaultVisibleStartTime === '00:00' ? '08:00' : defaultVisibleStartTime,
  );
  const [visibleEndTime, setVisibleEndTime] = useState<string>(
    defaultVisibleEndTime === '24:00' ? '23:00' : defaultVisibleEndTime,
  );
  const [exportLayoutMode, setExportLayoutMode] =
    useState<ScheduleLayoutMode>(defaultLayoutMode);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleExportPng = async () => {
    const targetEl = calendarContainerRef.current;
    if (!targetEl) {
      toast.error('Calendar view is not ready to export.');
      return;
    }

    setIsExporting(true);
    try {
      await onApplyExportOptions?.({
        maskPrivateEvents,
        preserveCategoryColors,
        hideInactiveNightHours,
        visibleStartTime: hideInactiveNightHours ? visibleStartTime : '00:00',
        visibleEndTime: hideInactiveNightHours ? visibleEndTime : '24:00',
        layoutMode: exportLayoutMode,
      });

      await waitNextFrame();

      const computedBg =
        window.getComputedStyle(document.documentElement).getPropertyValue('--color-dark-surface').trim() ||
        '#11131F';

      const dataUrl = await toPng(targetEl, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: computedBg,
      });

      const dateStamp = toApiDate(new Date());
      const fileName = `Calendar_Export_${dateStamp}.png`;

      const link = document.createElement('a');
      link.download = fileName;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`Downloaded ${fileName}`);
      onClose();
    } catch {
      toast.error('Failed to generate calendar PNG export.');
    } finally {
      await onApplyExportOptions?.(null);
      setIsExporting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Export Calendar View (High-Res PNG)"
      maxWidth="lg"
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-3.5 text-xs leading-relaxed text-zinc-200">
          <div className="flex items-center gap-2 font-semibold text-indigo-200">
            <Camera className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>2x Retina Snapshot</span>
          </div>
          <p className="mt-1 text-zinc-300">
            Renders a crisp, high-resolution (<code className="text-indigo-200">pixelRatio: 2</code>) PNG
            of your active calendar view ready to share with friends, teammates, or coaches.
          </p>
        </div>

        {/* Layout Selector for Export */}
        <div className="space-y-1.5 rounded-xl border border-dark-border bg-dark-bg/60 p-3.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-100">
            <LayoutGrid className="h-3.5 w-3.5 text-indigo-300" aria-hidden="true" />
            <span>Export schedule layout (Week / Day views)</span>
          </div>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {[
              { id: 'standard' as const, label: 'Standard View', desc: 'Proportional 30-min time grid' },
              { id: 'cards' as const, label: 'Task View', desc: 'Uniform task cards + free-time slots' },
              { id: 'compressed' as const, label: 'Compressed View', desc: 'Only the time cuts that matter' },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setExportLayoutMode(opt.id)}
                className={`rounded-lg border p-2 text-left text-xs transition-colors ${
                  exportLayoutMode === opt.id
                    ? 'border-indigo-400 bg-indigo-500/20 text-indigo-100'
                    : 'border-dark-border bg-dark-surface text-zinc-300 hover:border-zinc-600'
                }`}
              >
                <p className="font-semibold">{opt.label}</p>
                <p className="mt-0.5 text-[10px] text-zinc-400">{opt.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2.5">
          {/* Option 1: Privacy Mask Toggle */}
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-dark-border bg-dark-bg/60 p-3.5 transition-colors hover:border-indigo-500/40">
            <input
              type="checkbox"
              checked={maskPrivateEvents}
              onChange={(e) => setMaskPrivateEvents(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-zinc-600 bg-dark-surface text-indigo-500 focus:ring-indigo-400"
            />
            <div className="text-xs leading-relaxed">
              <span className="flex items-center gap-1.5 font-semibold text-zinc-100">
                <EyeOff className="h-3.5 w-3.5 text-indigo-300" aria-hidden="true" />
                <span>Mask private events as &ldquo;BUSY&rdquo;</span>
              </span>
              <p className="mt-0.5 text-zinc-400">
                Replaces private event titles with &ldquo;BUSY&rdquo; and hides descriptions and category tags in the exported image.
              </p>
            </div>
          </label>

          {/* Option 2: Category Colors Preservation Toggle */}
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-dark-border bg-dark-bg/60 p-3.5 transition-colors hover:border-indigo-500/40">
            <input
              type="checkbox"
              checked={preserveCategoryColors}
              onChange={(e) => setPreserveCategoryColors(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-zinc-600 bg-dark-surface text-indigo-500 focus:ring-indigo-400"
            />
            <div className="text-xs leading-relaxed">
              <span className="flex items-center gap-1.5 font-semibold text-zinc-100">
                <Palette className="h-3.5 w-3.5 text-indigo-300" aria-hidden="true" />
                <span>Preserve user category colors</span>
              </span>
              <p className="mt-0.5 text-zinc-400">
                Keep your custom category &amp; routine colors, or uncheck for a clean monochrome slate palette.
              </p>
            </div>
          </label>

          {/* Option 3: Custom Active Hours Crop Toggle */}
          <div className="rounded-xl border border-dark-border bg-dark-bg/60 p-3.5">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={hideInactiveNightHours}
                onChange={(e) => setHideInactiveNightHours(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-zinc-600 bg-dark-surface text-indigo-500 focus:ring-indigo-400"
              />
              <div className="text-xs leading-relaxed">
                <span className="flex items-center gap-1.5 font-semibold text-zinc-100">
                  <Moon className="h-3.5 w-3.5 text-indigo-300" aria-hidden="true" />
                  <span>Hide inactive hours</span>
                </span>
                <p className="mt-0.5 text-zinc-400">
                  Off by default, so the full day (00:00 – 24:00) is exported. Turn on to pick a custom start and end hour.
                </p>
              </div>
            </label>

            {hideInactiveNightHours && (
              <div className="mt-3 grid gap-3 border-t border-dark-border/80 pt-3 sm:grid-cols-2">
                <Time24Input
                  label="Export from"
                  value={visibleStartTime}
                  onChange={setVisibleStartTime}
                />
                <Time24Input
                  label="Export until"
                  value={visibleEndTime === '24:00' ? '23:59' : visibleEndTime}
                  onChange={setVisibleEndTime}
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-dark-border pt-4">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isExporting}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={() => void handleExportPng()}
            isLoading={isExporting}
            leftIcon={<Download className="h-4 w-4" aria-hidden="true" />}
          >
            Download High-Res PNG
          </Button>
        </div>
      </div>
    </Modal>
  );
}
