import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

export function absoluteUrl(path: string): string {
  const origin = process.env.WEB_ORIGIN ?? 'http://localhost:3000';
  return `${origin}${path}`;
}
