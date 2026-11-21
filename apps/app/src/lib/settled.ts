import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { ioniconsReady } from '@studex/ui';

// Marks a screen's root with data-settled once it has fully settled: mount
// effects (scheme/clock param reads), entrance animations, and the web icon
// font are done. E2E tests wait on [data-settled="true"] instead of sleeping.
// The timeout defers past the whole passive-effects flush, so parent layout
// effects that set browser-derived state have already committed. If ready
// drops again — or a dep (e.g. the resolved scheme) changes — the marker is
// cleared and a new settle window starts.
export function useSettled(
  ready = true,
  deps: readonly unknown[] = [],
): { settledProps: { dataSet?: { settled: 'true' } } } {
  const depKey = deps.join(' ');
  const [mark, setMark] = useState<string | null>(null);
  const settled = mark === depKey;
  useEffect(() => {
    if (!ready || settled) {
      if (!ready && settled) queueMicrotask(() => setMark(null));
      return;
    }
    const id = setTimeout(() => {
      const done = () => setMark(depKey);
      if (Platform.OS === 'web') void ioniconsReady().then(done);
      else done();
    }, 0);
    return () => clearTimeout(id);
  }, [ready, settled, depKey]);
  return { settledProps: settled && Platform.OS === 'web' ? { dataSet: { settled: 'true' } } : {} };
}
