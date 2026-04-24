// client/src/lib/utils.ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTZS(amount: number): string {
  return `TZS ${amount.toLocaleString()}`;
}

export function formatPlateNumber(input: string): string {
  const cleaned = input.replace(/\s+/g, '').toUpperCase();
  return cleaned;
}

export function formatDate(date: Date | string, locale: 'sw' | 'en' = 'sw'): string {
  return new Date(date).toLocaleDateString(locale === 'sw' ? 'sw-TZ' : 'en-TZ', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}