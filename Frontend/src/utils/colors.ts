import { HEX_COLOR_REGEX } from './validation';

/**
 * Default color used for events that don't have any category assigned.
 */
export const DEFAULT_EVENT_COLOR = '#6366F1';

/**
 * Curated 24 distinct, vibrant 6-digit hex colors for category creation,
 * routines, and schedule highlights.
 * All values match the backend's `^#[A-Fa-f0-9]{6}$` rule.
 */
export const CATEGORY_COLOR_PRESETS: readonly { hex: string; name: string }[] = [
  { hex: '#6366F1', name: 'Indigo' },
  { hex: '#4F46E5', name: 'Deep Indigo' },
  { hex: '#8B5CF6', name: 'Violet' },
  { hex: '#A855F7', name: 'Purple' },
  { hex: '#D946EF', name: 'Fuchsia' },
  { hex: '#EC4899', name: 'Pink' },
  { hex: '#F43F5E', name: 'Rose' },
  { hex: '#EF4444', name: 'Red' },
  { hex: '#DC2626', name: 'Crimson' },
  { hex: '#F97316', name: 'Orange' },
  { hex: '#EA580C', name: 'Burnt Orange' },
  { hex: '#F59E0B', name: 'Amber' },
  { hex: '#EAB308', name: 'Yellow' },
  { hex: '#84CC16', name: 'Lime' },
  { hex: '#22C55E', name: 'Green' },
  { hex: '#10B981', name: 'Emerald' },
  { hex: '#14B8A6', name: 'Teal' },
  { hex: '#06B6D4', name: 'Cyan' },
  { hex: '#0EA5E9', name: 'Sky' },
  { hex: '#3B82F6', name: 'Blue' },
  { hex: '#2563EB', name: 'Royal Blue' },
  { hex: '#64748B', name: 'Slate' },
  { hex: '#78716C', name: 'Stone' },
  { hex: '#A16207', name: 'Bronze' },
];

/**
 * Distinct color palette assigned to squad members in the squad calendar.
 */
export const SQUAD_MEMBER_PALETTE: readonly string[] = [
  '#6366F1', // Indigo
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#A855F7', // Purple
  '#F97316', // Orange
  '#3B82F6', // Blue
  '#84CC16', // Lime
  '#14B8A6', // Teal
  '#D946EF', // Fuchsia
  '#F43F5E', // Rose
  '#22C55E', // Green
  '#0EA5E9', // Sky
  '#8B5CF6', // Violet
  '#EA580C', // Burnt Orange
  '#EAB308', // Yellow
  '#2563EB', // Royal Blue
  '#DC2626', // Crimson
  '#4F46E5', // Deep Indigo
];

/**
 * Returns a consistent color for a member based on their position in the member list
 * (with fallback to their `userId`).
 */
export function getMemberColor(index: number, userId: number): string {
  const paletteIndex = (index >= 0 ? index : Math.abs(userId)) % SQUAD_MEMBER_PALETTE.length;
  return SQUAD_MEMBER_PALETTE[paletteIndex] ?? DEFAULT_EVENT_COLOR;
}

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
