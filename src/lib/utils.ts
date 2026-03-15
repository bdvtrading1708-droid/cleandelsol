import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { JobCleaner } from './types'

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

/** Calculate hours from start_time/end_time or hours_worked */
export function calcHoursFromTimes(start_time?: string, end_time?: string, hours_worked?: number): number {
  if (hours_worked && hours_worked > 0) return hours_worked
  if (!start_time || !end_time) return 1
  const [sh, sm] = start_time.split(':').map(Number)
  const [eh, em] = end_time.split(':').map(Number)
  const diff = (eh * 60 + em) - (sh * 60 + sm)
  return diff > 0 ? diff / 60 : 1
}

/**
 * Calculate hours for a job from start_time/end_time or hours_worked.
 * Returns 1 if no time data available (so rate = total).
 */
export function getJobHours(job: { start_time?: string; end_time?: string; hours_worked?: number; cleaners?: JobCleaner[] }): number {
  // If job has cleaners, use first cleaner's times (for display purposes, total hours is per-cleaner)
  if (job.cleaners && job.cleaners.length > 0) {
    const first = job.cleaners[0]
    return calcHoursFromTimes(first.start_time, first.end_time, first.hours_worked)
  }
  return calcHoursFromTimes(job.start_time, job.end_time, job.hours_worked)
}

/** Get hours for a specific job_cleaner entry */
export function getCleanerHours(jc: { start_time?: string; end_time?: string; hours_worked?: number }): number {
  return calcHoursFromTimes(jc.start_time, jc.end_time, jc.hours_worked)
}

/** Total revenue for a job: fixed price OR hourly rate × hours (client pays one price regardless of cleaner count) */
export function getJobRevenue(job: { client_price?: number; start_time?: string; end_time?: string; hours_worked?: number; property?: { pricing_type?: string } | null; cleaners?: JobCleaner[] }): number {
  if (job.property?.pricing_type === 'fixed') return job.client_price || 0
  const hours = getJobHours(job)
  return (job.client_price || 0) * hours
}

/** Total payout for a job: sum of all cleaners' (payout × hours) */
export function getJobPayout(job: { cleaner_payout?: number; start_time?: string; end_time?: string; hours_worked?: number; cleaners?: JobCleaner[] }): number {
  if (job.cleaners && job.cleaners.length > 0) {
    return job.cleaners.reduce((sum, jc) => {
      const hours = getCleanerHours(jc)
      return sum + (jc.cleaner_payout || 0) * hours
    }, 0)
  }
  // Legacy fallback
  return (job.cleaner_payout || 0) * calcHoursFromTimes(job.start_time, job.end_time, job.hours_worked)
}

/** Get payout for a specific cleaner on a job */
export function getCleanerPayout(jc: { cleaner_payout?: number; start_time?: string; end_time?: string; hours_worked?: number }): number {
  return (jc.cleaner_payout || 0) * getCleanerHours(jc)
}

/** Total km for a job (sum of all cleaners) */
export function getJobKm(job: { km_driven?: number; cleaners?: JobCleaner[] }): number {
  if (job.cleaners && job.cleaners.length > 0) {
    return job.cleaners.reduce((sum, jc) => sum + (jc.km_driven || 0), 0)
  }
  return job.km_driven || 0
}
