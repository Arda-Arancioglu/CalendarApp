import type { PresetThemeId, ThemeId } from '../types/user';

export const THEME_STORAGE_KEY = 'calendar.theme';
export const DEFAULT_THEME: PresetThemeId = 'indigo';
const THEME_CHANGE_EVENT = 'calendar:theme-change';

export interface ThemeOption {
  id: PresetThemeId;
  name: string;
  badge: string;
  description: string;
  accentHex: string;
  surfaceHex: string;
  bgHex: string;
}

export interface QuickSwatch {
  id: PresetThemeId;
  name: string;
  hex: string;
}

export const QUICK_SWATCHES: readonly QuickSwatch[] = [
  { id: 'sakura', name: 'Sakura Pink', hex: '#F472B6' },
  { id: 'rose', name: 'Rose', hex: '#FB7185' },
  { id: 'indigo', name: 'Cyber Indigo', hex: '#6366F1' },
  { id: 'emerald', name: 'Emerald', hex: '#10B981' },
  { id: 'ocean', name: 'Ocean Cyan', hex: '#06B6D4' },
  { id: 'amber', name: 'Amber', hex: '#F59E0B' },
  { id: 'ruby', name: 'Ruby Red', hex: '#EF4444' },
  { id: 'violet', name: 'Violet', hex: '#8B5CF6' },
] as const;

export const THEME_OPTIONS: readonly ThemeOption[] = [
  {
    id: 'sakura',
    name: 'Sakura Pink',
    badge: '🌸',
    description: 'Soft pastel pink accents with warm dark rose surfaces.',
    accentHex: '#F472B6',
    surfaceHex: '#20101B',
    bgHex: '#160B12',
  },
  {
    id: 'rose',
    name: 'Blush Rose',
    badge: '🌷',
    description: 'Elegant blush rose gold highlights with velvet dark tones.',
    accentHex: '#FB7185',
    surfaceHex: '#1E1116',
    bgHex: '#130A0E',
  },
  {
    id: 'indigo',
    name: 'Cyber Indigo',
    badge: '⚡',
    description: 'Signature electric indigo and violet glow (Default).',
    accentHex: '#6366F1',
    surfaceHex: '#11131F',
    bgHex: '#090A0F',
  },
  {
    id: 'emerald',
    name: 'Forest Emerald',
    badge: '🌿',
    description: 'Deep vibrant forest green with crisp botanical accents.',
    accentHex: '#10B981',
    surfaceHex: '#0E1C17',
    bgHex: '#07110E',
  },
  {
    id: 'ocean',
    name: 'Ocean Cyan',
    badge: '🌊',
    description: 'Aquatic electric cyan and deep abyssal navy.',
    accentHex: '#06B6D4',
    surfaceHex: '#0D1B24',
    bgHex: '#071017',
  },
  {
    id: 'amber',
    name: 'Sunset Amber',
    badge: '🌇',
    description: 'Warm golden amber and sunset orange glow.',
    accentHex: '#F59E0B',
    surfaceHex: '#1F160E',
    bgHex: '#140E08',
  },
  {
    id: 'ruby',
    name: 'Ruby Red',
    badge: '♦️',
    description: 'Bold crimson ruby accents with warm obsidian surfaces.',
    accentHex: '#EF4444',
    surfaceHex: '#1F0E12',
    bgHex: '#14080A',
  },
  {
    id: 'violet',
    name: 'Royal Violet',
    badge: '💜',
    description: 'Luminous ultraviolet glow over deep cosmic purple.',
    accentHex: '#8B5CF6',
    surfaceHex: '#171024',
    bgHex: '#0E0916',
  },
  {
    id: 'midnight',
    name: 'Midnight Slate',
    badge: '🌙',
    description: 'Sleek minimalist monochrome slate and neutral dark.',
    accentHex: '#94A3B8',
    surfaceHex: '#14171F',
    bgHex: '#0B0D12',
  },
] as const;

const VALID_THEME_IDS = new Set<string>(THEME_OPTIONS.map((t) => t.id));

const CUSTOM_CSS_PROPERTIES = [
  '--color-dark-bg',
  '--color-dark-surface',
  '--color-dark-elevated',
  '--color-dark-border',
  '--color-dark-hover',
  '--color-accent',
  '--color-accent-hover',
  '--color-accent-border',
  '--color-accent-glow',
  '--color-accent-border-glow',
  '--color-indigo-50',
  '--color-indigo-100',
  '--color-indigo-200',
  '--color-indigo-300',
  '--color-indigo-400',
  '--color-indigo-500',
  '--color-indigo-600',
  '--color-indigo-950',
  '--color-violet-500',
  '--fc-accent-soft',
  '--fc-accent-highlight',
] as const;

function clampByte(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (v: number) => clampByte(v).toString(16).padStart(2, '0').toUpperCase();
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace(/^#/, '');
  const r = Number.parseInt(clean.slice(0, 2), 16);
  const g = Number.parseInt(clean.slice(2, 4), 16);
  const b = Number.parseInt(clean.slice(4, 6), 16);
  return [r, g, b];
}

function mixRgb(
  base: [number, number, number],
  target: [number, number, number],
  weight: number,
): string {
  const w = Math.max(0, Math.min(1, weight));
  const r = base[0] * (1 - w) + target[0] * w;
  const g = base[1] * (1 - w) + target[1] * w;
  const b = base[2] * (1 - w) + target[2] * w;
  return rgbToHex(r, g, b);
}

/**
 * Parses a raw Hex (`#FF69B4`, `FF69B4`, `#F6B`) or `rgb(r, g, b)` string into
 * a normalized 6-character uppercase `#RRGGBB` string, or returns `null` if invalid.
 */
export function parseCustomColorToHex(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();

  // Check #RRGGBB or RRGGBB
  const hex6Match = /^#?([0-9a-fA-F]{6})$/.exec(trimmed);
  if (hex6Match?.[1]) {
    return `#${hex6Match[1].toUpperCase()}`;
  }

  // Check #RGB shorthand
  const hex3Match = /^#([0-9a-fA-F]{3})$/.exec(trimmed);
  if (hex3Match?.[1]) {
    const [r, g, b] = hex3Match[1].toUpperCase().split('');
    return `#${r}${r}${g}${g}${b}${b}`;
  }

  // Check rgb(r, g, b)
  const rgbMatch = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*[\d.]+)?\s*\)$/i.exec(
    trimmed,
  );
  if (rgbMatch?.[1] && rgbMatch[2] && rgbMatch[3]) {
    const r = Number.parseInt(rgbMatch[1], 10);
    const g = Number.parseInt(rgbMatch[2], 10);
    const b = Number.parseInt(rgbMatch[3], 10);
    if (r <= 255 && g <= 255 && b <= 255) {
      return rgbToHex(r, g, b);
    }
  }

  return null;
}

export function isCustomHexTheme(theme: string | null | undefined): boolean {
  if (!theme) return false;
  return /^#[0-9A-F]{6}$/i.test(theme.trim());
}

/**
 * Normalizes any theme string:
 * - Preset IDs (`"sakura"`, `"pink"` -> `"sakura"`, `"indigo"`, etc.)
 * - Raw Hex/RGB color strings (`"#FF69B4"`, `"#00F0FF"`, `"rgb(255, 105, 180)"`) -> `"#RRGGBB"`
 */
export function normalizeThemeId(raw: string | null | undefined): ThemeId {
  if (!raw) return DEFAULT_THEME;
  const cleaned = raw.trim().toLowerCase();
  if (cleaned === 'pink') return 'sakura';
  if (VALID_THEME_IDS.has(cleaned)) return cleaned as PresetThemeId;

  const customHex = parseCustomColorToHex(raw);
  if (customHex) return customHex;

  return DEFAULT_THEME;
}

/**
 * Returns the active `#RRGGBB` accent color for any theme (preset or custom hex).
 */
export function resolveThemeAccentHex(theme: ThemeId): string {
  if (isCustomHexTheme(theme)) {
    return theme.toUpperCase();
  }
  const found = THEME_OPTIONS.find((opt) => opt.id === theme);
  return found?.accentHex ?? '#6366F1';
}

export function getStoredTheme(): ThemeId {
  try {
    return normalizeThemeId(window.localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return DEFAULT_THEME;
  }
}

function applyCustomHexVariables(root: HTMLElement, hexColor: string): void {
  const rgb = hexToRgb(hexColor);
  const [r, g, b] = rgb;

  // Compute subtle tinted dark backgrounds & border glows (15% and 30% alpha)
  const darkBg = mixRgb([9, 10, 15], rgb, 0.08);
  const darkSurface = mixRgb([17, 19, 31], rgb, 0.12);
  const darkElevated = mixRgb([26, 29, 45], rgb, 0.16);
  const darkHover = mixRgb([34, 38, 56], rgb, 0.20);
  const darkBorder = mixRgb([39, 42, 61], rgb, 0.30);

  const glow15 = `rgba(${r}, ${g}, ${b}, 0.15)`;
  const glow30 = `rgba(${r}, ${g}, ${b}, 0.30)`;

  root.style.setProperty('--color-dark-bg', darkBg);
  root.style.setProperty('--color-dark-surface', darkSurface);
  root.style.setProperty('--color-dark-elevated', darkElevated);
  root.style.setProperty('--color-dark-hover', darkHover);
  root.style.setProperty('--color-dark-border', darkBorder);

  root.style.setProperty('--color-accent', hexColor);
  root.style.setProperty('--color-accent-hover', mixRgb(rgb, [0, 0, 0], 0.12));
  root.style.setProperty('--color-accent-border', mixRgb(rgb, [0, 0, 0], 0.24));
  root.style.setProperty('--color-accent-glow', glow15);
  root.style.setProperty('--color-accent-border-glow', glow30);

  // Tinted shade ramp so buttons, active tabs, calendar badges & rings glow with custom hex
  root.style.setProperty('--color-indigo-50', mixRgb(rgb, [255, 255, 255], 0.92));
  root.style.setProperty('--color-indigo-100', mixRgb(rgb, [255, 255, 255], 0.82));
  root.style.setProperty('--color-indigo-200', mixRgb(rgb, [255, 255, 255], 0.65));
  root.style.setProperty('--color-indigo-300', mixRgb(rgb, [255, 255, 255], 0.36));
  root.style.setProperty('--color-indigo-400', mixRgb(rgb, [255, 255, 255], 0.14));
  root.style.setProperty('--color-indigo-500', hexColor);
  root.style.setProperty('--color-indigo-600', mixRgb(rgb, [0, 0, 0], 0.14));
  root.style.setProperty('--color-indigo-950', mixRgb(rgb, [0, 0, 0], 0.72));
  root.style.setProperty('--color-violet-500', hexColor);

  root.style.setProperty('--fc-accent-soft', glow15);
  root.style.setProperty('--fc-accent-highlight', glow30);
}

function clearCustomHexVariables(root: HTMLElement): void {
  for (const prop of CUSTOM_CSS_PROPERTIES) {
    root.style.removeProperty(prop);
  }
}

function applyThemeToDom(theme: ThemeId): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (isCustomHexTheme(theme)) {
    root.setAttribute('data-theme', 'custom');
    applyCustomHexVariables(root, theme.toUpperCase());
  } else {
    clearCustomHexVariables(root);
    root.setAttribute('data-theme', theme);
  }
}

/**
 * Applies `data-theme` (and custom CSS variables when a Hex color is given) to `<html>`,
 * saves to `localStorage`, and notifies listeners.
 */
export function applyTheme(raw: string | null | undefined): ThemeId {
  const theme = normalizeThemeId(raw);
  applyThemeToDom(theme);
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Ignore storage quota / private mode errors
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent<ThemeId>(THEME_CHANGE_EVENT, { detail: theme }));
  }
  return theme;
}

export function subscribeToThemeChanges(listener: (theme: ThemeId) => void): () => void {
  const handler = (event: Event) => {
    const custom = event as CustomEvent<ThemeId>;
    if (custom.detail) listener(custom.detail);
  };
  window.addEventListener(THEME_CHANGE_EVENT, handler);
  return () => window.removeEventListener(THEME_CHANGE_EVENT, handler);
}

// Apply stored theme immediately on module import to prevent any initial flash
if (typeof document !== 'undefined') {
  applyThemeToDom(getStoredTheme());
}
