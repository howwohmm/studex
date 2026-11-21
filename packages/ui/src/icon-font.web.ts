import { Ionicons } from '@expo/vector-icons';

// Shared font-ready promise: every consumer (Icon, useSettled) awaits the same
// load. A rejection is logged once and resolves false so screens still settle
// and glyphs render (unstyled) instead of an unhandled rejection.
let promise: Promise<boolean> | null = null;
let warned = false;
export function ioniconsReady(): Promise<boolean> {
  if (!promise) {
    promise = Ionicons.loadFont()
      .then(() => true)
      .catch((err: unknown) => {
        if (!warned) {
          warned = true;
          console.warn('[ui] ionicons font failed to load', err);
        }
        return false;
      });
  }
  return promise;
}
