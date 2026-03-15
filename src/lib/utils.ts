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

/**
 * Calculate hours for a job from start_time/end_time or hours_worked.
 * Returns 1 if no time data available (so rate = total).
 */
export function getJobHours(job: { start_time?: string; end_time?: string; hours_worked?: number }): number {
  if (job.hours_worked && job.hours_worked > 0) return job.hours_worked
  if (!job.start_time || !job.end_time) return 1
  const [sh, sm] = job.start_time.split(':').map(Number)
  const [eh, em] = job.end_time.split(':').map(Number)
  const diff = (eh * 60 + em) - (sh * 60 + sm)
  return diff > 0 ? diff / 60 : 1
}

/** Total revenue for a job: client_price (rate) × hours */
export function getJobRevenue(job: { client_price?: number; start_time?: string; end_time?: string; hours_worked?: number }): number {
  return (job.client_price || 0) * getJobHours(job)
}

/** Total payout for a job: cleaner_payout (rate) × hours */
export function getJobPayout(job: { cleaner_payout?: number; start_time?: string; end_time?: string; hours_worked?: number }): number {
  return (job.cleaner_payout || 0) * getJobHours(job)
}
