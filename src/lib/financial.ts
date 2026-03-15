/**
 * Central financial calculation layer for Clean Del Sol.
 *
 * ALL financial figures in the app must flow through these functions
 * to guarantee consistent numbers across every screen.
 */

import { getJobHours, getJobRevenue, getJobPayout } from './utils'

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
  status?: string
  property?: { pricing_type?: string } | null
}

/** Full financial breakdown for a single job */
export function getJobFinancials(job: JobLike) {
  const hours = getJobHours(job)
  const revenue = getJobRevenue(job)
  const payout = getJobPayout(job)
  const kmCost = (job.km_driven || 0) * KM_RATE
  const totalCost = payout + kmCost
  const profit = revenue - totalCost

  return { hours, revenue, payout, kmCost, totalCost, profit }
}

// ─── Aggregation ─────────────────────────────────────────────────────────────

export interface FinancialSummary {
  revenue: number
  payout: number
  kmCost: number
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
  let hours = 0

  for (const job of jobs) {
    const f = getJobFinancials(job)
    revenue += f.revenue
    payout += f.payout
    kmCost += f.kmCost
    hours += f.hours
  }

  const totalCost = payout + kmCost
  const profit = revenue - totalCost
  const margin = revenue > 0 ? Math.round((profit / revenue) * 100) : 0

  return { revenue, payout, kmCost, totalCost, profit, margin, jobCount: jobs.length, hours }
}

// ─── Per-cleaner breakdown ───────────────────────────────────────────────────

export interface CleanerFinancials extends FinancialSummary {
  cleanerId: string
  outstanding: number       // payout for delivered (not yet paid) jobs
  earned: number            // payout for done (paid) jobs
}

/** Break down financials per cleaner */
export function aggregateByCleaners(
  jobs: (JobLike & { cleaner_id?: string })[],
  cleanerIds: string[]
): CleanerFinancials[] {
  return cleanerIds.map(cleanerId => {
    const cleanerJobs = jobs.filter(j => j.cleaner_id === cleanerId)
    const summary = aggregateFinancials(cleanerJobs)

    const outstanding = cleanerJobs
      .filter(j => j.status === 'delivered')
      .reduce((s, j) => s + getJobPayout(j), 0)

    const earned = cleanerJobs
      .filter(j => j.status === 'done')
      .reduce((s, j) => s + getJobPayout(j), 0)

    return { ...summary, cleanerId, outstanding, earned }
  })
}

// ─── Helper: today string for comparisons ────────────────────────────────────

export { toDateStr, getMonday }
