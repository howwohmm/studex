import { useEffect, useState } from 'react';

// On web, reanimated's useReducedMotion is a module-level constant computed
// from matchMedia at bundle eval: SSR bakes `false` but a reduced-motion
// client computes `true`, which is a hydration mismatch. Start from the SSR
// value and sync the real setting after mount.
export function useReducedMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const mql = (
      globalThis as unknown as {
        matchMedia(q: string): {
          matches: boolean;
          addEventListener(type: string, l: () => void): void;
          removeEventListener(type: string, l: () => void): void;
        };
      }
    ).matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduce(mql.matches);
    void Promise.resolve().then(onChange);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);
  return reduce;
}
