'use client'

import { useMemo } from 'react'
import { formatCurrency, getJobTotalRevenue } from '@/lib/utils'
import { useLocale } from '@/lib/i18n'
import { RevenueChart, type ChartDataPoint } from '@/components/dashboard/revenue-chart'
import { filterByPeriod, filterByMonth, aggregateByCleaners, toDateStr, getMonday, type Period } from '@/lib/financial'
import { useCleanerPayments } from '@/lib/hooks/use-cleaner-payments'
import type { Job } from '@/lib/types'

interface Props {
  cleanerId: string
  jobs: Job[]
  period: Period
  setPeriod: (p: Period) => void
  chartMonth: number
  chartYear: number
  setChartMonth: (m: number) => void
  setChartYear: (y: number) => void
}

export function CleanerDetailHero({ cleanerId, jobs, period, setPeriod, chartMonth, chartYear, setChartMonth, setChartYear }: Props) {
  const { t, tArray } = useLocale()
  const days = tArray('days')
  const months = tArray('months')
  const now = new Date()
  const today = toDateStr(now)

  const cleanerJobs = jobs.filter(j =>
    (j.cleaners || []).some(jc => jc.cleaner_id === cleanerId) || j.cleaner_id === cleanerId
  )

  const filtered = period === 'maand'
    ? filterByMonth(cleanerJobs, chartMonth, chartYear)
    : filterByPeriod(cleanerJobs, period)

  const stats = aggregateByCleaners(filtered, [cleanerId])[0]

  // Outstanding is always calculated over ALL jobs (not period-filtered), minus cash payments
  const allStats = aggregateByCleaners(cleanerJobs, [cleanerId])[0]
  const { data: cashPayments = [] } = useCleanerPayments(cleanerId)
  const totalCashPaid = cashPayments.reduce((s, p) => s + p.amount, 0)
  const totalOutstanding = Math.max(0, (allStats?.outstanding || 0) - totalCashPaid)

  const chartData: ChartDataPoint[] = useMemo(() => {
    if (period === 'dag') {
      const slots = [6, 8, 10, 12, 14, 16, 18, 20]
      const todayJobs = cleanerJobs.filter(j => j.date === today)
      const currentHour = now.getHours()
      return slots.map((hour, i) => {
        const nextHour = slots[i + 1] ?? 22
        const slotJobs = todayJobs.filter(j => {
          if (!j.start_time) return false
          const h = parseInt(j.start_time.split(':')[0], 10)
          return h >= hour && h < nextHour
        })
        return {
          label: `${String(hour).padStart(2, '0')}:00`,
          value: slotJobs.reduce((s, j) => s + getJobTotalRevenue(j), 0),
          isCurrent: currentHour >= hour && currentHour < nextHour,
          showLabel: true,
        }
      })
    }

    if (period === 'week') {
      const monday = getMonday(now)
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(monday)
        d.setDate(monday.getDate() + i)
        const ds = toDateStr(d)
        const dayJobs = cleanerJobs.filter(j => j.date === ds)
        return {
          label: days[i],
          value: dayJobs.reduce((s, j) => s + getJobTotalRevenue(j), 0),
          isCurrent: ds === today,
          showLabel: true,
        }
      })
    }

    if (period === 'maand') {
      const daysInMonth = new Date(chartYear, chartMonth + 1, 0).getDate()
      const showLabelDays = new Set([1, 5, 10, 15, 20, 25, daysInMonth])
      const isCurrentMonth = chartMonth === now.getMonth() && chartYear === now.getFullYear()
      return Array.from({ length: daysInMonth }, (_, i) => {
        const dayNum = i + 1
        const ds = `${chartYear}-${String(chartMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
        const dayJobs = cleanerJobs.filter(j => j.date === ds)
        return {
          label: String(dayNum),
          value: dayJobs.reduce((s, j) => s + getJobTotalRevenue(j), 0),
          isCurrent: isCurrentMonth && dayNum === now.getDate(),
          showLabel: showLabelDays.has(dayNum),
        }
      })
    }

    if (period === 'jaar') {
      const currentYear = now.getFullYear()
      return Array.from({ length: 12 }, (_, i) => {
        const prefix = `${currentYear}-${String(i + 1).padStart(2, '0')}`
        const monthJobs = cleanerJobs.filter(j => j.date?.startsWith(prefix))
        return {
          label: months[i]?.slice(0, 3) || '',
          value: monthJobs.reduce((s, j) => s + getJobTotalRevenue(j), 0),
          isCurrent: i === now.getMonth() && currentYear === now.getFullYear(),
          showLabel: true,
        }
      })
    }

    // alles
    const allDates = cleanerJobs.map(j => j.date).filter(Boolean).sort()
    if (allDates.length === 0) {
      return [{ label: months[now.getMonth()]?.slice(0, 3) || '', value: 0, isCurrent: true, showLabel: true }]
    }
    const firstDate = allDates[0]!
    const lastDate = allDates[allDates.length - 1]!
    const firstYear = parseInt(firstDate.slice(0, 4))
    const firstMonth = parseInt(firstDate.slice(5, 7)) - 1
    const lastYear = parseInt(lastDate.slice(0, 4))
    const lastMonth = parseInt(lastDate.slice(5, 7)) - 1

    const points: ChartDataPoint[] = []
    let y = firstYear, m = firstMonth
    while (y < lastYear || (y === lastYear && m <= lastMonth)) {
      const prefix = `${y}-${String(m + 1).padStart(2, '0')}`
      const monthJobs = cleanerJobs.filter(j => j.date?.startsWith(prefix))
      points.push({
        label: `${months[m]?.slice(0, 3)}'${String(y).slice(2)}`,
        value: monthJobs.reduce((s, j) => s + getJobTotalRevenue(j), 0),
        isCurrent: m === now.getMonth() && y === now.getFullYear(),
        showLabel: true,
      })
      m++
      if (m > 11) { m = 0; y++ }
    }
    if (points.length > 8) {
      const step = Math.ceil(points.length / 6)
      points.forEach((p, i) => { p.showLabel = i === 0 || i === points.length - 1 || i % step === 0 })
    }
    return points
  }, [period, cleanerJobs, today, chartMonth, chartYear, days, months, now.getDate(), now.getMonth(), now.getFullYear()])

  const periods: Period[] = ['dag', 'week', 'maand', 'jaar', 'alles']

  const periodLabel = period === 'maand'
    ? `${months[chartMonth]} ${chartYear}`
    : t(period)

  const prevMonth = () => {
    if (chartMonth === 0) { setChartMonth(11); setChartYear(chartYear - 1) }
    else setChartMonth(chartMonth - 1)
  }
  const nextMonth = () => {
    if (chartMonth === 11) { setChartMonth(0); setChartYear(chartYear + 1) }
    else setChartMonth(chartMonth + 1)
  }

  return (
    <div className="rounded-[22px] p-[22px] relative overflow-hidden" style={{ background: 'var(--hero-bg)', boxShadow: 'var(--shadow-md)' }}>
      <div className="text-[11px] font-medium mb-1" style={{ color: 'rgba(255,255,255,0.45)' }}>
        {t('earned')} · {periodLabel}
      </div>
      <div className="text-[44px] font-bold tracking-[-2px] leading-none mb-0.5 text-white">
        {formatCurrency(stats?.earned || 0)}
      </div>
      <div className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.40)' }}>{t('earned').toLowerCase()}</div>

      {/* Period tabs */}
      <div className="flex gap-0.5 mb-4 rounded-full p-0.5 w-fit" style={{ background: 'rgba(255,255,255,0.08)' }}>
        {periods.map(p => (
          <button
            key={p}
            className="px-3 py-1 rounded-full text-[11px] font-semibold transition-all"
            style={{
              background: period === p ? 'rgba(255,255,255,0.18)' : 'transparent',
              color: period === p ? '#fff' : 'rgba(255,255,255,0.45)',
            }}
            onClick={() => {
              setPeriod(p)
              if (p === 'maand') {
                setChartMonth(now.getMonth())
                setChartYear(now.getFullYear())
              }
            }}
          >
            {t(p)}
          </button>
        ))}
      </div>

      {/* Month selector */}
      {period === 'maand' && (
        <div className="flex items-center justify-center gap-3 mb-3">
          <button
            onClick={prevMonth}
            className="w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.10)' }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M7.5 2.5L4.5 6L7.5 9.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <div className="text-[12px] font-semibold text-white min-w-[120px] text-center">
            {months[chartMonth]} {chartYear}
          </div>
          <button
            onClick={nextMonth}
            className="w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.10)' }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4.5 2.5L7.5 6L4.5 9.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>
      )}

      {/* Chart */}
      <RevenueChart data={chartData} />

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2 mb-2">
        <div className="rounded-[18px] p-3" style={{ background: 'rgba(255,255,255,0.09)' }}>
          <div className="text-[9px] font-semibold tracking-[.1em] uppercase mb-1" style={{ color: 'rgba(255,255,255,0.40)' }}>{t('revenue')}</div>
          <div className="text-[20px] font-bold tracking-[-0.5px] leading-none text-white">{formatCurrency(stats?.revenue || 0)}</div>
        </div>
        <div className="rounded-[18px] p-3" style={{ background: 'rgba(255,255,255,0.09)' }}>
          <div className="text-[9px] font-semibold tracking-[.1em] uppercase mb-1" style={{ color: 'rgba(255,255,255,0.40)' }}>{t('profit')}</div>
          <div className="text-[20px] font-bold tracking-[-0.5px] leading-none text-white">{formatCurrency(stats?.profit || 0)}</div>
          <div className={`text-[10px] font-semibold mt-0.5 ${(stats?.margin || 0) > 0 ? 'text-green-400' : 'text-white/30'}`}>
            {(stats?.margin || 0) > 0 ? '↑' : ''}{stats?.margin || 0}%
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-[18px] p-3" style={{ background: 'rgba(255,255,255,0.09)' }}>
          <div className="text-[9px] font-semibold tracking-[.1em] uppercase mb-1" style={{ color: 'rgba(255,255,255,0.40)' }}>{t('outstanding')}</div>
          <div className="text-[20px] font-bold tracking-[-0.5px] leading-none" style={{ color: totalOutstanding > 0 ? '#FF9900' : 'white' }}>
            {formatCurrency(totalOutstanding)}
          </div>
        </div>
        <div className="rounded-[18px] p-3" style={{ background: 'rgba(255,255,255,0.09)' }}>
          <div className="text-[9px] font-semibold tracking-[.1em] uppercase mb-1" style={{ color: 'rgba(255,255,255,0.40)' }}>{t('orders')}</div>
          <div className="text-[20px] font-bold tracking-[-0.5px] leading-none text-white">{stats?.jobCount || 0}</div>
          <div className="text-[10px] font-semibold mt-0.5" style={{ color: 'rgba(255,255,255,0.30)' }}>
            {stats?.hours || 0}h
          </div>
        </div>
      </div>
    </div>
  )
}
