import { catalog, type CopyKey } from './catalog';

export type { CopyKey };
export { catalog };

export type CopyParams = Record<string, string | number>;

const pluralRules = new Intl.PluralRules('en-IN');

function interpolate(template: string, params: CopyParams): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = params[name];
    if (value === undefined) {
      throw new Error(`copy: missing param '${name}' for '${template}'`);
    }
    return String(value);
  });
}

export function t(key: CopyKey, params: CopyParams = {}): string {
  const entry = catalog[key];
  if (typeof entry === 'string') return interpolate(entry, params);
  const n = typeof params.n === 'number' ? params.n : Number(params.n);
  const form = Number.isFinite(n) && pluralRules.select(n) === 'one' ? entry.one : entry.other;
  return interpolate(form, params);
}
