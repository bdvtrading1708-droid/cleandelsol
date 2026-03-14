import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, locale = 'nl'): string {
  return `€${Math.round(amount).toLocaleString(locale)}`
}

export function formatDate(date: string, locale = 'nl'): string {
  return new Date(date + 'T00:00:00').toLocaleDateString(locale === 'nl' ? 'nl-NL' : locale === 'es' ? 'es-ES' : 'en-GB', {
    day: 'numeric',
    month: 'short',
  })
}

export function getInitials(name: string): string {
  return (name || '?')[0].toUpperCase()
}
