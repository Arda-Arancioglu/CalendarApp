import { HEX_COLOR_REGEX } from './validation';

/**
 * Default color used for events that don't have any category assigned.
 */
export const DEFAULT_EVENT_COLOR = '#6366F1';

/**
 * Curated palette for category creation and squad member colors.
 * All values match the backend's `^#[A-Fa-f0-9]{6}$` rule.
 */
export const CATEGORY_COLOR_PRESETS: readonly { hex: string; name: string }[] = [
  { hex: '#6366F1', name: 'Indigo' },
  { hex: '#3B82F6', name: 'Blue' },
  { hex: '#06B6D4', name: 'Cyan' },
  { hex: '#10B981', name: 'Emerald' },
  { hex: '#84CC16', name: 'Lime' },
  { hex: '#F59E0B', name: 'Amber' },
  { hex: '#F97316', name: 'Orange' },
  { hex: '#EF4444', name: 'Red' },
  { hex: '#EC4899', name: 'Pink' },
  { hex: '#A855F7', name: 'Purple' },
  { hex: '#14B8A6', name: 'Teal' },
  { hex: '#64748B', name: 'Slate' },
];

/**
 * Returns a valid 6-digit hex color, falling back to DEFAULT_EVENT_COLOR if malformed.
 */
export function normalizeHexColor(color: string | undefined | null): string {
  if (!color) return DEFAULT_EVENT_COLOR;
  const trimmed = color.trim();
  return HEX_COLOR_REGEX.test(trimmed) ? trimmed.toUpperCase() : DEFAULT_EVENT_COLOR;
}

/**
 * Converts "#6366F1" + alpha (0..1) into "rgba(99, 102, 241, alpha)" for tinted backgrounds.
 */
export function withAlpha(hex: string, alpha: number): string {
  const safe = normalizeHexColor(hex);
  const r = Number.parseInt(safe.slice(1, 3), 16);
  const g = Number.parseInt(safe.slice(3, 5), 16);
  const b = Number.parseInt(safe.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
