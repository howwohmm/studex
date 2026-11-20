import { catalog, type CopyKey } from './catalog';

export type { CopyKey };
export { catalog };

export type CopyParams = Record<string, string | number>;

/** Placeholder names extracted from a template: "{n} more" → 'n'. */
type Placeholders<S> = S extends `${string}{${infer K}}${infer Rest}`
  ? K | Placeholders<Rest>
  : never;

type ParamsFor<K extends CopyKey> = (typeof catalog)[K] extends string
  ? Placeholders<(typeof catalog)[K]>
  : (typeof catalog)[K] extends { one: infer A; other: infer B }
    ? Placeholders<A> | Placeholders<B>
    : never;

type TArgs<K extends CopyKey> = [ParamsFor<K>] extends [never]
  ? [params?: CopyParams]
  : [params: Record<ParamsFor<K> & string, string | number> & CopyParams];

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

export function t<K extends CopyKey>(key: K, ...args: TArgs<K>): string {
  const params: CopyParams = args[0] ?? {};
  const entry = catalog[key];
  if (typeof entry === 'string') return interpolate(entry, params);
  const n = typeof params.n === 'number' ? params.n : Number(params.n);
  const form = Number.isFinite(n) && pluralRules.select(n) === 'one' ? entry.one : entry.other;
  return interpolate(form, params);
}
