import { Check } from 'lucide-react';
import { CATEGORY_COLOR_PRESETS, normalizeHexColor } from '../../utils/colors';
import { HEX_COLOR_REGEX } from '../../utils/validation';
import { cn } from '../../utils/cn';

interface ColorPickerProps {
  value: string;
  onChange: (hex: string) => void;
  error?: string;
}

/**
 * Color selector for categories: preset swatches + native color input + hex text field.
 */
export function ColorPicker({ value, onChange, error }: ColorPickerProps) {
  const safeColor = HEX_COLOR_REGEX.test(value.trim())
    ? value.trim().toUpperCase()
    : normalizeHexColor(value);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-zinc-300">Color</span>
        <span className="inline-flex items-center gap-1.5 font-mono text-xs text-zinc-400">
          <span
            className="h-3 w-3 rounded-full ring-1 ring-white/20"
            style={{ backgroundColor: safeColor }}
          />
          {value.toUpperCase()}
        </span>
      </div>

      {/* Preset color swatches */}
      <div
        role="radiogroup"
        aria-label="Preset category colors"
        className="grid grid-cols-6 gap-2 sm:grid-cols-12"
      >
        {CATEGORY_COLOR_PRESETS.map((preset) => {
          const isSelected = value.trim().toUpperCase() === preset.hex.toUpperCase();
          return (
            <button
              key={preset.hex}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={`${preset.name} (${preset.hex})`}
              title={`${preset.name} (${preset.hex})`}
              onClick={() => onChange(preset.hex)}
              className={cn(
                'flex h-8 w-full items-center justify-center rounded-lg transition-transform',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-dark-surface',
                isSelected ? 'scale-105 ring-2 ring-white' : 'hover:scale-105 opacity-85 hover:opacity-100',
              )}
              style={{ backgroundColor: preset.hex }}
            >
              {isSelected && <Check className="h-4 w-4 text-white drop-shadow" aria-hidden="true" />}
            </button>
          );
        })}
      </div>

      {/* Custom hex input + native color wheel */}
      <div className="flex items-center gap-2.5 pt-1">
        <label className="relative flex h-10 w-12 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-dark-border bg-dark-bg/70">
          <span className="sr-only">Pick custom color</span>
          <input
            type="color"
            value={safeColor}
            onChange={(e) => onChange(e.target.value.toUpperCase())}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
          <span
            className="h-6 w-6 rounded-md ring-1 ring-white/20"
            style={{ backgroundColor: safeColor }}
          />
        </label>

        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#6366F1"
          maxLength={7}
          aria-label="Hex color code"
          aria-invalid={error ? true : undefined}
          className={cn(
            'h-10 flex-1 rounded-lg border bg-dark-bg/70 px-3 font-mono text-sm uppercase text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:ring-2',
            error
              ? 'border-red-500/70 focus:border-red-400 focus:ring-red-500/30'
              : 'border-dark-border focus:border-indigo-400 focus:ring-indigo-500/30',
          )}
        />
      </div>

      {error && <p className="text-xs font-medium text-red-400">{error}</p>}
    </div>
  );
}
