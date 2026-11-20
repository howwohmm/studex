import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

// Marks a screen's root with data-settled once it has fully settled: mount
// effects (scheme/clock param reads) and entrance animations are done. E2E
// tests wait on [data-settled="true"] instead of sleeping. The timeout defers
// past the whole passive-effects flush, so parent layout effects that set
// browser-derived state have already committed.
export function useSettled(ready = true): { settledProps: { dataSet?: { settled: 'true' } } } {
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    if (!ready || settled) return;
    const id = setTimeout(() => setSettled(true), 0);
    return () => clearTimeout(id);
  }, [ready, settled]);
  return { settledProps: settled && Platform.OS === 'web' ? { dataSet: { settled: 'true' } } : {} };
}
