export type PresetThemeId =
  | 'indigo'
  | 'sakura'
  | 'rose'
  | 'emerald'
  | 'ocean'
  | 'midnight'
  | 'amber'
  | 'ruby'
  | 'violet';

/**
 * Accepts any preset theme identifier OR any custom `#RRGGBB` hex color string.
 */
export type ThemeId = PresetThemeId | `#${string}` | string;

/** GET /api/user/me */
export interface UserResponseDTO {
  userId: number;
  username: string;
  theme?: string | null;
}

/** PUT /api/user/theme */
export interface ThemeUpdateRequestDTO {
  theme: string;
}
