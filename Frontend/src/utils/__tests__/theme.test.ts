import { describe, expect, it } from 'vitest';
import {
  applyTheme,
  isCustomHexTheme,
  normalizeThemeId,
  parseCustomColorToHex,
  resolveThemeAccentHex,
} from '../theme';

describe('theme engine utilities', () => {
  it('parses valid Hex (#RRGGBB, RRGGBB, #RGB) and RGB strings', () => {
    expect(parseCustomColorToHex('#ff69b4')).toBe('#FF69B4');
    expect(parseCustomColorToHex('00f0ff')).toBe('#00F0FF');
    expect(parseCustomColorToHex('#f0a')).toBe('#FF00AA');
    expect(parseCustomColorToHex('rgb(225, 29, 72)')).toBe('#E11D48');
    expect(parseCustomColorToHex('not-a-color')).toBeNull();
  });

  it('normalizes preset IDs, pink alias, and custom Hex/RGB values', () => {
    expect(normalizeThemeId('pink')).toBe('sakura');
    expect(normalizeThemeId('SAKURA')).toBe('sakura');
    expect(normalizeThemeId('#ff69b4')).toBe('#FF69B4');
    expect(normalizeThemeId('rgb(0, 240, 255)')).toBe('#00F0FF');
    expect(normalizeThemeId('unknown')).toBe('indigo');
  });

  it('dynamically sets CSS variables on documentElement for custom Hex colors and clears them for presets', () => {
    const appliedHex = applyTheme('#FF69B4');
    expect(appliedHex).toBe('#FF69B4');
    expect(isCustomHexTheme(appliedHex)).toBe(true);
    expect(resolveThemeAccentHex(appliedHex)).toBe('#FF69B4');
    expect(document.documentElement.getAttribute('data-theme')).toBe('custom');
    expect(document.documentElement.style.getPropertyValue('--color-accent')).toBe('#FF69B4');
    expect(document.documentElement.style.getPropertyValue('--color-accent-glow')).toBe(
      'rgba(255, 105, 180, 0.15)',
    );
    expect(document.documentElement.style.getPropertyValue('--color-accent-border-glow')).toBe(
      'rgba(255, 105, 180, 0.30)',
    );

    // Switching back to a preset removes custom inline overrides
    const preset = applyTheme('sakura');
    expect(preset).toBe('sakura');
    expect(document.documentElement.getAttribute('data-theme')).toBe('sakura');
    expect(document.documentElement.style.getPropertyValue('--color-accent')).toBe('');
  });
});
