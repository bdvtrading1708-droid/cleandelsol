'use client'

import { useJobs } from '@/lib/hooks/use-jobs'
import { useCleaners } from '@/lib/hooks/use-cleaners'
import { useLocale } from '@/lib/i18n'
import { useState, useMemo } from 'react'
import { formatCurrency, getJobTotalRevenue } from '@/lib/utils'
import { STATUS_COLORS, getCleanerColor } from '@/lib/constants'
import { CleanerAvatar } from '@/components/cleaners/cleaner-avatar'
import { filterByPeriod, filterByMonth, aggregateFinancials, toDateStr, getMonday, type Period } from '@/lib/financial'
import { RevenueChart, type ChartDataPoint } from '@/components/dashboard/revenue-chart'

export default function DashboardPage() {
  const { data: jobs = [], isLoading } = useJobs()
  const { data: cleaners = [] } = useCleaners()
  const { t, tArray } = useLocale()
  const [period, setPeriod] = useState<Period>('week')
  const [agendaPeriod, setAgendaPeriod] = useState<Period>('maand')
  const [selectedCleaner, setSelectedCleaner] = useState<string | null>(null)
  const [chartMonth, setChartMonth] = useState(new Date().getMonth())
  const [chartYear, setChartYear] = useState(new Date().getFullYear())

  // Filter by cleaner first
  const cleanerJobs = selectedCleaner
    ? jobs.filter(j => (j.cleaners || []).some(jc => jc.cleaner_id === selectedCleaner) || j.cleaner_id === selectedCleaner)
    : jobs

  // For maand period, use the selected month; for others, use filterByPeriod
  const filtered = period === 'maand'
    ? filterByMonth(cleanerJobs, chartMonth, chartYear)
    : filterByPeriod(cleanerJobs, period)
  const { revenue: rev, totalCost: costs, profit, margin, kmCost, extraCosts, payout } = aggregateFinancials(filtered)

  const today = toDateStr(new Date())
  const now = new Date()
  const days = tArray('days')
  const months = tArray('months')

  // Build chart data based on period
  const chartData: ChartDataPoint[] = useMemo(() => {
    if (period === 'dag') {
      // Show hours of today: 06, 08, 10, 12, 14, 16, 18, 20
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

    // alles - group by month from first to last data
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
      const totalMonths = points.length + ((lastYear - firstYear) * 12 + lastMonth - firstMonth + 1) - points.length
      points.push({
        label: `${months[m]?.slice(0, 3)}'${String(y).slice(2)}`,
        value: monthJobs.reduce((s, j) => s + getJobTotalRevenue(j), 0),
        isCurrent: m === now.getMonth() && y === now.getFullYear(),
        showLabel: true, // will thin out below
      })
      m++
      if (m > 11) { m = 0; y++ }
    }
    // Thin labels if too many
    if (points.length > 8) {
      const step = Math.ceil(points.length / 6)
      points.forEach((p, i) => { p.showLabel = i === 0 || i === points.length - 1 || i % step === 0 })
    }
    return points
  }, [period, cleanerJobs, today, chartMonth, chartYear, days, months, now.getDate(), now.getMonth(), now.getFullYear()])

  if (isLoading) {
    return <div className="flex items-center justify-center py-20" style={{ color: 'var(--t3)' }}>{t('loading')}</div>
  }

  // Month navigation handlers
  const prevMonth = () => {
    if (chartMonth === 0) { setChartMonth(11); setChartYear(chartYear - 1) }
    else setChartMonth(chartMonth - 1)
  }
  const nextMonth = () => {
    if (chartMonth === 11) { setChartMonth(0); setChartYear(chartYear + 1) }
    else setChartMonth(chartMonth + 1)
  }

  // Agenda
  const agendaJobs = filterByPeriod(jobs, agendaPeriod)
    .filter(j => j.date != null && j.date >= today)
    .sort((a, b) => (a.date || '').localeCompare(b.date || '') || (a.start_time || '').localeCompare(b.start_time || ''))
  const grouped: Record<string, typeof jobs> = {}
  agendaJobs.forEach(j => {
    if (!grouped[j.date]) grouped[j.date] = []
    grouped[j.date].push(j)
  })

  const periods: Period[] = ['dag', 'week', 'maand', 'jaar', 'alles']

  // Hero subtitle
  const periodLabel = period === 'maand'
    ? `${months[chartMonth]} ${chartYear}`
    : t(period)

  return (
    <>
      {/* Hero Widget */}
      <div className="rounded-[22px] p-[22px] mt-3.5 relative overflow-hidden" style={{ background: 'var(--hero-bg)', boxShadow: 'var(--shadow-md)' }}>
        <div className="text-[11px] font-medium mb-1" style={{ color: 'rgba(255,255,255,0.45)' }}>
          {selectedCleaner ? cleaners.find(c => c.id === selectedCleaner)?.name?.split(' ')[0] : t('allCl')} · {periodLabel}
        </div>
        <div className="text-[44px] font-bold tracking-[-2px] leading-none mb-0.5 text-white">
          {formatCurrency(rev)}
        </div>
        <div className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.40)' }}>{t('revenue').toLowerCase()}</div>

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

        {/* Month selector (only for maand) */}
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

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 mb-2">
          <div className="rounded-[18px] p-3" style={{ background: 'rgba(255,255,255,0.09)' }}>
            <div className="flex items-center gap-1.5 mb-1">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 2L6 10M6 10L3 7M6 10L9 7" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <div className="text-[9px] font-semibold tracking-[.1em] uppercase" style={{ color: 'rgba(255,255,255,0.40)' }}>Kosten</div>
            </div>
            <div className="text-[20px] font-bold tracking-[-0.5px] leading-none text-white">{formatCurrency(costs)}</div>
            <div className="text-[10px] font-semibold mt-0.5 text-red-400">
              ↓ {formatCurrency(payout)} loon · {formatCurrency(kmCost + extraCosts)} overig
            </div>
          </div>
          <div className="rounded-[18px] p-3" style={{ background: 'rgba(255,255,255,0.09)' }}>
            <div className="text-[9px] font-semibold tracking-[.1em] uppercase mb-1" style={{ color: 'rgba(255,255,255,0.40)' }}>{t('profit')}</div>
            <div className="text-[20px] font-bold tracking-[-0.5px] leading-none text-white">{formatCurrency(profit)}</div>
            <div className={`text-[10px] font-semibold mt-0.5 ${margin > 0 ? 'text-green-400' : 'text-white/30'}`}>
              {margin > 0 ? '↑' : ''}{margin}%
            </div>
          </div>
        </div>
        <div className="rounded-[18px] p-3 mb-4" style={{ background: 'rgba(255,255,255,0.09)' }}>
          <div className="text-[9px] font-semibold tracking-[.1em] uppercase mb-1" style={{ color: 'rgba(255,255,255,0.40)' }}>{t('orders')}</div>
          <div className="flex items-baseline gap-3">
            <div className="text-[20px] font-bold tracking-[-0.5px] leading-none text-white">{filtered.length}</div>
            <div className="text-[10px] font-semibold" style={{ color: 'rgba(255,255,255,0.30)' }}>
              {t('revenue').toLowerCase()}: {formatCurrency(rev)}
            </div>
          </div>
        </div>

        {/* Cleaner avatars */}
        <div className="border-t pt-3.5" style={{ borderColor: 'rgba(255,255,255,0.10)' }}>
          <div className="text-[9px] font-bold tracking-[.12em] uppercase mb-2.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
            {t('cleaners')} — {t('revenue').toLowerCase()} ({t(period)})
          </div>
          <div className="flex gap-2.5 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none' }}>
            <div
              className="flex flex-col items-center gap-1 cursor-pointer shrink-0"
              onClick={() => setSelectedCleaner(null)}
            >
              <div className={`w-[38px] h-[38px] rounded-full flex items-center justify-center text-[10px] font-extrabold text-white ${!selectedCleaner ? 'outline outline-[2.5px] outline-white outline-offset-2' : ''}`} style={{ background: 'rgba(255,255,255,0.14)' }}>
                ALL
              </div>
              <div className="text-[9px] font-semibold max-w-[42px] text-center truncate" style={{ color: 'rgba(255,255,255,0.40)' }}>{t('allCl')}</div>
            </div>
            {cleaners.map(c => (
              <div
                key={c.id}
                className="flex flex-col items-center gap-1 cursor-pointer shrink-0"
                onClick={() => setSelectedCleaner(c.id)}
              >
                <div className={selectedCleaner === c.id ? 'outline outline-[2.5px] outline-white outline-offset-2 rounded-full' : ''}>
                  <CleanerAvatar src={c.avatar_url} name={c.name} size={38} />
                </div>
                <div className="text-[9px] font-semibold max-w-[42px] text-center truncate" style={{ color: 'rgba(255,255,255,0.40)' }}>{c.name?.split(' ')[0]}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Agenda */}
      <div className="flex items-center justify-between mt-5 mb-3">
        <div className="text-xl font-bold tracking-[-0.5px]" style={{ color: 'var(--t1)' }}>{t('upcoming')}</div>
        <div className="flex rounded-full p-0.5 gap-0.5" style={{ background: 'var(--fill)' }}>
          {(['dag', 'week', 'maand'] as Period[]).map(p => (
            <button
              key={p}
              className="px-3 py-1 rounded-full text-[11px] font-semibold transition-all"
              style={{
                background: agendaPeriod === p ? 'var(--card)' : 'transparent',
                color: agendaPeriod === p ? 'var(--t1)' : 'var(--t3)',
                boxShadow: agendaPeriod === p ? 'var(--shadow)' : 'none',
              }}
              onClick={() => setAgendaPeriod(p)}
            >
              {t(p)}
            </button>
          ))}
        </div>
      </div>

      {Object.keys(grouped).length === 0 ? (
        <div className="text-center py-9" style={{ color: 'var(--t3)' }}>
          <div className="text-sm font-semibold" style={{ color: 'var(--t2)' }}>{t('noJobsToday')}</div>
        </div>
      ) : (
        Object.entries(grouped).map(([date, dateJobs]) => {
          const d = new Date(date + 'T00:00:00')
          const isToday = date === today
          const dow = d.getDay() === 0 ? 6 : d.getDay() - 1
          const dayLabel = isToday
            ? t('today')
            : `${days[dow]} ${d.getDate()} ${months[d.getMonth()]?.slice(0, 3)}`

          return (
            <div key={date} className="mb-1.5">
              <div className="text-[11px] font-bold tracking-[.03em] uppercase py-2.5" style={{ color: 'var(--t3)' }}>
                {dayLabel}
              </div>
              <div className="rounded-[22px] overflow-hidden mb-1.5" style={{ background: 'var(--card)', boxShadow: 'var(--shadow)' }}>
                {dateJobs.map((j, ji) => (
                  <div
                    key={j.id}
                    className="flex items-center gap-3 px-3.5 py-3.5 cursor-pointer transition-colors"
                    style={{ borderBottom: ji < dateJobs.length - 1 ? '1px solid var(--border)' : 'none' }}
                  >
                    <div className="w-10 text-center shrink-0">
                      <div className={`text-[22px] font-bold tracking-[-0.5px] leading-none ${isToday ? 'w-[30px] h-[30px] rounded-full inline-flex items-center justify-center text-sm' : ''}`}
                        style={isToday ? { background: 'var(--t1)', color: 'var(--bg)' } : { color: 'var(--t1)' }}>
                        {d.getDate()}
                      </div>
                      <div className="text-[9px] font-bold uppercase tracking-[.06em] mt-0.5" style={{ color: 'var(--t3)' }}>{days[dow]}</div>
                    </div>
                    <div className="w-[3px] h-9 rounded-[2px] shrink-0" style={{ background: getCleanerColor((j.cleaners || [])[0]?.cleaner?.name || j.cleaner?.name) }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold tracking-[-0.2px] truncate" style={{ color: 'var(--t1)' }}>{j.property?.name || j.custom_property_name || '—'}</div>
                      <div className="flex items-center gap-1 mt-1 flex-wrap">
                        {(j.cleaners || []).map(jc => jc.cleaner && (
                          <div
                            key={jc.id}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full"
                            style={{ background: getCleanerColor(jc.cleaner.name) + '18' }}
                          >
                            <CleanerAvatar src={jc.cleaner.avatar_url} name={jc.cleaner.name} size={18} />
                            <span className="text-[11px] font-medium pr-1" style={{ color: getCleanerColor(jc.cleaner.name) }}>
                              {jc.cleaner.name.split(' ')[0]}
                            </span>
                          </div>
                        ))}
                        {(!j.cleaners || j.cleaners.length === 0) && j.cleaner && (
                          <div
                            className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-full"
                            style={{ background: getCleanerColor(j.cleaner.name) + '18' }}
                          >
                            <CleanerAvatar src={j.cleaner.avatar_url} name={j.cleaner.name} size={18} />
                            <span className="text-[11px] font-medium pr-1" style={{ color: getCleanerColor(j.cleaner.name) }}>
                              {j.cleaner.name.split(' ')[0]}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[13px] font-bold tracking-[-0.2px]" style={{ color: 'var(--t1)' }}>{j.start_time || '—'}</div>
                      <div className="text-[11px] font-medium mt-0.5" style={{ color: 'var(--t3)' }}>{formatCurrency(getJobTotalRevenue(j))}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })
      )}
    </>
  )
}
