import { useCallback, useEffect, useRef, useState } from 'react';
import { updateUserTheme } from '../api/user';
import { getStoredToken, getStoredUser, saveUser } from '../utils/authStorage';
import {
  applyTheme,
  getStoredTheme,
  isCustomHexTheme,
  QUICK_SWATCHES,
  resolveThemeAccentHex,
  subscribeToThemeChanges,
  THEME_OPTIONS,
} from '../utils/theme';
import type { ThemeId } from '../types/user';

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeId>(() => getStoredTheme());
  const [isSyncing, setIsSyncing] = useState(false);
  const syncTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return subscribeToThemeChanges((next) => {
      setThemeState(next);
    });
  }, []);

  useEffect(() => {
    return () => {
      if (syncTimerRef.current !== null) {
        window.clearTimeout(syncTimerRef.current);
      }
    };
  }, []);

  const persistThemeToServer = useCallback(async (applied: ThemeId) => {
    const token = getStoredToken();
    if (!token) return;

    setIsSyncing(true);
    try {
      const updatedUser = await updateUserTheme(applied);
      saveUser(updatedUser);
    } catch {
      const existing = getStoredUser();
      if (existing) {
        saveUser({ ...existing, theme: applied });
      }
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const setTheme = useCallback(
    async (nextTheme: ThemeId, options?: { debounceSync?: boolean }) => {
      const applied = applyTheme(nextTheme);
      setThemeState(applied);

      if (syncTimerRef.current !== null) {
        window.clearTimeout(syncTimerRef.current);
        syncTimerRef.current = null;
      }

      if (options?.debounceSync) {
        syncTimerRef.current = window.setTimeout(() => {
          void persistThemeToServer(applied);
        }, 250);
        return;
      }

      await persistThemeToServer(applied);
    },
    [persistThemeToServer],
  );

  return {
    theme,
    accentHex: resolveThemeAccentHex(theme),
    isCustom: isCustomHexTheme(theme),
    setTheme,
    isSyncing,
    options: THEME_OPTIONS,
    quickSwatches: QUICK_SWATCHES,
  };
}
