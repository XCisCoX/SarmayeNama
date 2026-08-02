import { fa, type FaDictionary } from './fa.js';
import { en, type EnDictionary } from './en.js';

export type Lang = 'fa' | 'en';

/** String-typed dictionary (intersection of literal types would collapse to never). */
export type Dictionary = { [K in keyof FaDictionary]: string };

const dictionaries: Record<Lang, Dictionary> = { fa, en };

export function getDictionary(lang: Lang): Dictionary {
  return dictionaries[lang];
}

export function isLang(value: string | undefined | null): value is Lang {
  return value === 'fa' || value === 'en';
}

export function normalizeLang(value: string | undefined | null, fallback: Lang = 'fa'): Lang {
  return isLang(value) ? value : fallback;
}

/** Interpolate {placeholders} in a dictionary string. */
export function tpl(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    key in values ? String(values[key]) : `{${key}}`
  );
}
