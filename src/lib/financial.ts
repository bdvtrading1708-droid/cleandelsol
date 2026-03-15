/**
 * Central financial calculation layer for Clean Del Sol.
 *
 * ALL financial figures in the app must flow through these functions
 * to guarantee consistent numbers across every screen.
 */

import { getJobHours, getJobRevenue, getJobPayout, getJobKm, getCleanerHours, getCleanerPayout } from './utils'
import type { JobCleaner } from './types'

// ─── Constants ───────────────────────────────────────────────────────────────

/** Mileage reimbursement rate per kilometer */
export const KM_RATE = 0.10

// ─── Period filtering ────────────────────────────────────────────────────────

export type Period = 'dag' | 'week' | 'maand' | 'jaar' | 'alles'

/** Build a YYYY-MM-DD string without timezone issues */
function toDateStr(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Get the Monday of the week containing `d` */
function getMonday(d: Date): Date {
  const copy = new Date(d)
  const dow = copy.getDay()
  const diff = dow === 0 ? 6 : dow - 1
  copy.setDate(copy.getDate() - diff)
  return copy
}

/**
 * Filter jobs by period. Uses calendar definitions:
 *  - dag   = exact calendar day (today)
 *  - week  = Monday–Sunday of current week
 *  - maand = current calendar month
 *  - jaar  = current calendar year
 *  - alles = no filter
 */
export function filterByPeriod<T extends { date?: string }>(items: T[], period: Period): T[] {
  if (period === 'alles') return items

  const now = new Date()

  if (period === 'dag') {
    const today = toDateStr(now)
    return items.filter(item => item.date === today)
  }

  if (period === 'week') {
    const mon = getMonday(now)
    const sun = new Date(mon)
    sun.setDate(mon.getDate() + 6)
    const monStr = toDateStr(mon)
    const sunStr = toDateStr(sun)
    return items.filter(item => item.date != null && item.date >= monStr && item.date <= sunStr)
  }

  if (period === 'maand') {
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    return items.filter(item => item.date?.startsWith(ym))
  }

  // jaar
  const y = String(now.getFullYear())
  return items.filter(item => item.date?.startsWith(y))
}

// ─── Per-job calculations ────────────────────────────────────────────────────

type JobLike = {
  client_price?: number
  cleaner_payout?: number
  start_time?: string
  end_time?: string
  hours_worked?: number
  km_driven?: number
  extra_costs?: number
  status?: string
  property?: { pricing_type?: string } | null
  cleaners?: JobCleaner[]
}

/** Full financial breakdown for a single job */
export function getJobFinancials(job: JobLike) {
  const hours = getJobHours(job)
  const revenue = getJobRevenue(job)
  const payout = getJobPayout(job)
  const kmCost = getJobKm(job) * KM_RATE
  // Sum extra_costs from per-cleaner entries + job-level (legacy)
  const cleanerExtraCosts = (job.cleaners || []).reduce((s, jc) => s + (jc.extra_costs || 0), 0)
  const extraCosts = cleanerExtraCosts + (job.extra_costs || 0)
  const totalCost = payout + kmCost + extraCosts
  const profit = revenue - totalCost

  return { hours, revenue, payout, kmCost, extraCosts, totalCost, profit }
}

// ─── Aggregation ─────────────────────────────────────────────────────────────

export interface FinancialSummary {
  revenue: number
  payout: number
  kmCost: number
  extraCosts: number
  totalCost: number
  profit: number
  margin: number
  jobCount: number
  hours: number
}

/** Aggregate financial totals for a list of jobs */
export function aggregateFinancials(jobs: JobLike[]): FinancialSummary {
  let revenue = 0
  let payout = 0
  let kmCost = 0
  let extraCosts = 0
  let hours = 0

  for (const job of jobs) {
    const f = getJobFinancials(job)
    revenue += f.revenue
    payout += f.payout
    kmCost += f.kmCost
    extraCosts += f.extraCosts
    hours += f.hours
  }

  const totalCost = payout + kmCost + extraCosts
  const profit = revenue - totalCost
  const margin = revenue > 0 ? Math.round((profit / revenue) * 100) : 0

  return { revenue, payout, kmCost, extraCosts, totalCost, profit, margin, jobCount: jobs.length, hours }
}

// ─── Per-cleaner breakdown ───────────────────────────────────────────────────

export interface CleanerFinancials extends FinancialSummary {
  cleanerId: string
  outstanding: number       // payout for delivered (not yet paid) jobs
  earned: number            // payout for done (paid) jobs
  totalPayout: number       // total payout across ALL statuses
}

/** Break down financials per cleaner (supports multi-cleaner jobs) */
export function aggregateByCleaners(
  jobs: (JobLike & { cleaners?: JobCleaner[]; cleaner_id?: string; status?: string })[],
  cleanerIds: string[]
): CleanerFinancials[] {
  return cleanerIds.map(cleanerId => {
    // Find jobs that involve this cleaner
    const cleanerJobs = jobs.filter(j => {
      if (j.cleaners && j.cleaners.length > 0) {
        return j.cleaners.some(jc => jc.cleaner_id === cleanerId)
      }
      return j.cleaner_id === cleanerId
    })

    // Calculate per-cleaner financials
    let revenue = 0
    let payout = 0
    let kmCost = 0
    let extraCosts = 0
    let hours = 0
    let outstanding = 0
    let earned = 0
    let totalPayout = 0

    for (const job of cleanerJobs) {
      // Revenue: full job revenue attributed to this cleaner's job
      revenue += getJobRevenue(job)

      if (job.cleaners && job.cleaners.length > 0) {
        const jc = job.cleaners.find(c => c.cleaner_id === cleanerId)
        if (jc) {
          const cleanerHours = getCleanerHours(jc)
          const cleanerPayoutTotal = getCleanerPayout(jc)
          const jcKmCost = (jc.km_driven || 0) * KM_RATE
          const jcExtraCosts = jc.extra_costs || 0
          const cleanerTotalWithCosts = cleanerPayoutTotal + jcKmCost + jcExtraCosts
          payout += cleanerPayoutTotal
          kmCost += jcKmCost
          extraCosts += jcExtraCosts
          hours += cleanerHours
          totalPayout += cleanerTotalWithCosts

          if (job.status === 'delivered') outstanding += cleanerTotalWithCosts
          if (job.status === 'done') earned += cleanerTotalWithCosts
        }
      } else {
        // Legacy single-cleaner
        const jobPayout = getJobPayout(job)
        const legacyKmCost = (job.km_driven || 0) * KM_RATE
        const legacyTotalWithCosts = jobPayout + legacyKmCost
        payout += jobPayout
        kmCost += legacyKmCost
        hours += getJobHours(job)
        totalPayout += legacyTotalWithCosts

        if (job.status === 'delivered') outstanding += legacyTotalWithCosts
        if (job.status === 'done') earned += legacyTotalWithCosts
      }

      extraCosts += job.extra_costs || 0
    }

    const totalCost = payout + kmCost + extraCosts
    const profit = revenue - totalCost
    const margin = revenue > 0 ? Math.round((profit / revenue) * 100) : 0

    return { revenue, payout, kmCost, extraCosts, totalCost, profit, margin, jobCount: cleanerJobs.length, hours, cleanerId, outstanding, earned, totalPayout }
  })
}

// ─── Helper: today string for comparisons ────────────────────────────────────

export { toDateStr, getMonday }
