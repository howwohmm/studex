import { describe, expect, it } from 'vitest';
import { colors, hapticEvents, timings } from '../tokens';

function parse(color: string): [number, number, number, number] {
  if (color.startsWith('#')) {
    const h = color.slice(1);
    return [
      parseInt(h.slice(0, 2), 16) / 255,
      parseInt(h.slice(2, 4), 16) / 255,
      parseInt(h.slice(4, 6), 16) / 255,
      1,
    ];
  }
  const m = color.match(/rgba?\(([^)]+)\)/)!;
  const [r, g, b, a = '1'] = m[1]!.split(',').map((s) => s.trim());
  return [Number(r) / 255, Number(g) / 255, Number(b) / 255, Number(a)];
}

function composite(fg: string, bg: string): [number, number, number] {
  const [fr, fgG, fb, fa] = parse(fg);
  const [br, bgG, bb] = parse(bg);
  return [fr * fa + br * (1 - fa), fgG * fa + bgG * (1 - fa), fb * fa + bb * (1 - fa)];
}

function luminance([r, g, b]: [number, number, number]): number {
  const f = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function ratio(fg: string, bg: string): number {
  const l1 = luminance(composite(fg, bg));
  const l2 = luminance(composite(bg, bg));
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

describe('WCAG contrast (tokens)', () => {
  for (const scheme of ['light', 'dark'] as const) {
    const c = colors[scheme];
    for (const bgName of ['grouped', 'surface'] as const) {
      const bg = c.bg[bgName];
      it(`${scheme} label.primary on bg.${bgName} >= 4.5:1`, () => {
        expect(ratio(c.label.primary, bg)).toBeGreaterThanOrEqual(4.5);
      });
      it(`${scheme} label.secondary on bg.${bgName} >= 4.5:1`, () => {
        expect(ratio(c.label.secondary, bg)).toBeGreaterThanOrEqual(4.5);
      });
    }
    it(`${scheme} onAccent on accentSolid >= 4.5:1`, () => {
      expect(ratio(c.onAccent, c.accentSolid)).toBeGreaterThanOrEqual(4.5);
    });
    for (const bgName of ['grouped', 'surface'] as const) {
      it(`${scheme} accentText on accentSoft (over bg.${bgName}) >= 4.5:1`, () => {
        // tinted buttons / badges sit on accentSoft composited over the bg
        const soft = composite(c.accentSoft, c.bg[bgName]);
        const softHex =
          '#' +
          soft
            .map((v) =>
              Math.round(v * 255)
                .toString(16)
                .padStart(2, '0'),
            )
            .join('');
        expect(ratio(c.accentText, softHex)).toBeGreaterThanOrEqual(4.5);
      });
    }
    it(`${scheme} gauge tick (label.secondary) on fill.control >= 3:1`, () => {
      // tick sits on the quiet track (fill.control composited over bg.grouped)
      const track = composite(c.fill.control, c.bg.grouped);
      const trackHex =
        '#' +
        track
          .map((v) =>
            Math.round(v * 255)
              .toString(16)
              .padStart(2, '0'),
          )
          .join('');
      expect(ratio(c.label.secondary, trackHex)).toBeGreaterThanOrEqual(3);
    });
  }
});

describe('haptic events map', () => {
  it('covers every event with a supported kind', () => {
    const kinds = new Set([
      'impactLight',
      'notificationSuccess',
      'notificationWarning',
      'selection',
    ]);
    for (const [event, kind] of Object.entries(hapticEvents)) {
      expect(kinds.has(kind), `${event} → ${kind}`).toBe(true);
    }
  });
  it('mark and undo share the identical light haptic', () => {
    expect(hapticEvents.mark).toBe(hapticEvents.undo);
    expect(hapticEvents.mark).toBe('impactLight');
  });
});

describe('timing tokens', () => {
  it('carry durations and easing curves', () => {
    expect(timings.fade).toEqual({ duration: 180, easing: 'bezier(0.2,0,0,1)' });
    expect(timings.emphasized).toEqual({ duration: 320, easing: 'bezier(0.3,0,0,1)' });
  });
});
