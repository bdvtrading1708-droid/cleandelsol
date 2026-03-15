'use client'

import { useJobs } from '@/lib/hooks/use-jobs'
import { useCleaners } from '@/lib/hooks/use-cleaners'
import { useLocale } from '@/lib/i18n'
import { useState } from 'react'
import { formatCurrency, getJobRevenue } from '@/lib/utils'
import { STATUS_COLORS } from '@/lib/constants'
import { CleanerAvatar } from '@/components/cleaners/cleaner-avatar'
import { filterByPeriod, aggregateFinancials, toDateStr, type Period } from '@/lib/financial'

function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return ''
  const d: string[] = [`M ${pts[0].x},${pts[0].y}`]
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || { x: 2 * pts[0].x - pts[1].x, y: 2 * pts[0].y - pts[1].y }
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] || { x: 2 * p2.x - p1.x, y: 2 * p2.y - p1.y }
    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6
    d.push(`C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`)
  }
  return d.join(' ')
}

export default function DashboardPage() {
  const { data: jobs = [], isLoading } = useJobs()
  const { data: cleaners = [] } = useCleaners()
  const { t, tArray } = useLocale()
  const [period, setPeriod] = useState<Period>('week')
  const [agendaPeriod, setAgendaPeriod] = useState<Period>('week')
  const [selectedCleaner, setSelectedCleaner] = useState<string | null>(null)

  if (isLoading) {
    return <div className="flex items-center justify-center py-20" style={{ color: 'var(--t3)' }}>{t('loading')}</div>
  }

  // Filter by cleaner first, then by period
  const cleanerJobs = selectedCleaner ? jobs.filter(j => j.cleaner_id === selectedCleaner) : jobs
  const filtered = filterByPeriod(cleanerJobs, period)
  const { revenue: rev, totalCost: costs, profit, margin } = aggregateFinancials(filtered)

  // 7-day chart
  const today = toDateStr(new Date())
  const days = tArray('days')
  const bars = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const ds = toDateStr(d)
    const dayJobs = cleanerJobs.filter(j => j.date === ds)
    const dow = d.getDay() === 0 ? 6 : d.getDay() - 1
    bars.push({ label: days[dow], value: dayJobs.reduce((s, j) => s + getJobRevenue(j), 0), isToday: ds === today })
  }
  const maxBar = Math.max(1, ...bars.map(b => b.value))

  // Agenda
  const agendaJobs = filterByPeriod(jobs, agendaPeriod).sort((a, b) => (a.date || '').localeCompare(b.date || '') || (a.start_time || '').localeCompare(b.start_time || ''))
  const grouped: Record<string, typeof jobs> = {}
  agendaJobs.forEach(j => {
    if (!grouped[j.date]) grouped[j.date] = []
    grouped[j.date].push(j)
  })

  const periods: Period[] = ['dag', 'week', 'maand', 'jaar', 'alles']

  return (
    <>
      {/* Hero Widget */}
      <div className="rounded-[22px] p-[22px] mt-3.5 relative overflow-hidden" style={{ background: 'var(--hero-bg)', boxShadow: 'var(--shadow-md)' }}>
        <div className="text-[11px] font-medium mb-1" style={{ color: 'rgba(255,255,255,0.45)' }}>
          {selectedCleaner ? cleaners.find(c => c.id === selectedCleaner)?.name?.split(' ')[0] : t('allCl')} · {t(period)}
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
              onClick={() => setPeriod(p)}
            >
              {t(p)}
            </button>
          ))}
        </div>

        {/* Chart */}
        {(() => {
          const cw = 200, ch = 44, pt = 4, pb = 4, uh = ch - pt - pb
          const points = bars.map((b, i) => ({
            x: (i / (bars.length - 1)) * cw,
            y: pt + uh - (b.value / maxBar) * uh,
          }))
          const linePath = smoothPath(points)
          const curvePart = linePath.indexOf('C') >= 0 ? linePath.slice(linePath.indexOf('C')) : `L ${points[points.length - 1].x},${points[points.length - 1].y}`
          const fillPath = `M 0,${ch} L ${points[0].x},${points[0].y} ${curvePart} L ${cw},${ch} Z`
          const todayIdx = bars.findIndex(b => b.isToday)
          return (
            <>
              <svg viewBox={`0 0 ${cw} ${ch}`} className="w-full h-[52px] mb-1" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="heroChartGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgba(80,200,120,0.25)" />
                    <stop offset="100%" stopColor="rgba(80,200,120,0)" />
                  </linearGradient>
                </defs>
                <path d={fillPath} fill="url(#heroChartGrad)" />
                <path d={linePath} fill="none" stroke="rgba(80,200,120,0.7)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                {todayIdx >= 0 && (
                  <circle cx={points[todayIdx].x} cy={points[todayIdx].y} r="2.5" fill="rgba(80,200,120,0.9)" />
                )}
              </svg>
              <div className="flex justify-between mb-4">
                {bars.map((b, i) => (
                  <div key={i} className="text-[7px] font-semibold text-center" style={{ color: b.isToday ? 'rgba(255,255,255,0.50)' : 'rgba(255,255,255,0.30)' }}>
                    {b.label}
                  </div>
                ))}
              </div>
            </>
          )
        })()}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="rounded-[18px] p-3" style={{ background: 'rgba(255,255,255,0.09)' }}>
            <div className="text-[9px] font-semibold tracking-[.1em] uppercase mb-1" style={{ color: 'rgba(255,255,255,0.40)' }}>{t('profit')}</div>
            <div className="text-[20px] font-bold tracking-[-0.5px] leading-none text-white">{formatCurrency(profit)}</div>
            <div className={`text-[10px] font-semibold mt-0.5 ${margin > 0 ? 'text-green-400' : 'text-white/30'}`}>
              {margin > 0 ? '↑' : ''}{margin}%
            </div>
          </div>
          <div className="rounded-[18px] p-3" style={{ background: 'rgba(255,255,255,0.09)' }}>
            <div className="text-[9px] font-semibold tracking-[.1em] uppercase mb-1" style={{ color: 'rgba(255,255,255,0.40)' }}>{t('orders')}</div>
            <div className="text-[20px] font-bold tracking-[-0.5px] leading-none text-white">{filtered.length}</div>
            <div className="text-[10px] font-semibold mt-0.5" style={{ color: 'rgba(255,255,255,0.30)' }}>
              {t('totalCost').split(' ')[0]}: {formatCurrency(costs)}
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
          const months = tArray('months')
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
                    <div className="w-[3px] h-9 rounded-[2px] shrink-0" style={{ background: STATUS_COLORS[j.status] || '#0064D2' }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold tracking-[-0.2px] truncate" style={{ color: 'var(--t1)' }}>{j.property?.name || '—'}</div>
                      <div className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--t2)' }}>{j.cleaner?.name || '—'}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[13px] font-bold tracking-[-0.2px]" style={{ color: 'var(--t1)' }}>{j.start_time || '—'}</div>
                      <div className="text-[11px] font-medium mt-0.5" style={{ color: 'var(--t3)' }}>{formatCurrency(getJobRevenue(j))}</div>
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
