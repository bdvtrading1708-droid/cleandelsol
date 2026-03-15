'use client'

import { useState, useMemo } from 'react'
import { useLocale } from '@/lib/i18n'
import { formatCurrency, getJobRevenue } from '@/lib/utils'
import { filterByPeriod, type Period } from '@/lib/financial'
import type { Job, Partner } from '@/lib/types'

const PERIODS: Period[] = ['dag', 'week', 'maand', 'jaar', 'alles']

const BAR_COLORS = ['#00A651', '#0064D2', 'var(--hero-bg)', 'var(--hero-bg)', 'var(--hero-bg)']
const RANK_BG = ['rgba(0,166,81,0.10)', 'rgba(0,100,210,0.10)', 'var(--fill)']
const RANK_COLOR = ['#00A651', '#0064D2', 'var(--t2)']

export default function TopPartnersByRevenue({ jobs, partners }: { jobs: Job[]; partners: Partner[] }) {
  const { t } = useLocale()
  const [period, setPeriod] = useState<Period>('maand')

  const { ranked, totalRevenue } = useMemo(() => {
    const filtered = filterByPeriod(jobs, period)
    const revenueMap = new Map<string, { revenue: number; jobCount: number }>()

    for (const job of filtered) {
      const pid = job.property?.partner_id
      if (!pid) continue
      const existing = revenueMap.get(pid) || { revenue: 0, jobCount: 0 }
      existing.revenue += getJobRevenue(job)
      existing.jobCount += 1
      revenueMap.set(pid, existing)
    }

    const ranked = Array.from(revenueMap.entries())
      .map(([partnerId, data]) => ({
        partner: partners.find(p => p.id === partnerId),
        revenue: data.revenue,
        jobCount: data.jobCount,
      }))
      .filter(r => r.partner)
      .sort((a, b) => b.revenue - a.revenue)

    const totalRevenue = ranked.reduce((s, r) => s + r.revenue, 0)
    return { ranked, totalRevenue }
  }, [jobs, partners, period])

  const maxRevenue = ranked[0]?.revenue || 1

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xl font-bold tracking-[-0.5px]" style={{ color: 'var(--t1)' }}>
          {t('topPartners')}
        </div>
      </div>

      <div className="rounded-[22px] p-[22px]" style={{ background: 'var(--card)', boxShadow: 'var(--shadow-md)' }}>
        {/* Period filter */}
        <div className="flex gap-0.5 mb-5 rounded-full p-0.5 w-fit" style={{ background: 'rgba(0,0,0,0.05)' }}>
          {PERIODS.map(p => (
            <button
              key={p}
              className="px-3 py-1 rounded-full text-[11px] font-semibold transition-all"
              style={{
                background: period === p ? 'var(--hero-bg)' : 'transparent',
                color: period === p ? '#fff' : 'var(--t3)',
              }}
              onClick={() => setPeriod(p)}
            >
              {t(p)}
            </button>
          ))}
        </div>

        {ranked.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-sm font-semibold" style={{ color: 'var(--t3)' }}>{t('noPartnerData')}</div>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row gap-6">
            {/* Left: Bar chart */}
            <div className="flex-1 min-w-0">
              <div className="text-[9px] font-semibold tracking-[.1em] uppercase mb-3" style={{ color: 'var(--t3)' }}>
                {t('partnerRevenue')}
              </div>
              <div className="flex flex-col gap-3.5">
                {ranked.map((entry, i) => {
                  const pct = totalRevenue > 0 ? Math.round((entry.revenue / totalRevenue) * 100) : 0
                  return (
                    <div key={entry.partner!.id}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="text-[13px] font-semibold truncate" style={{ color: 'var(--t1)' }}>
                          {entry.partner!.name}
                        </div>
                        <div className="text-[13px] font-bold shrink-0 ml-3" style={{ color: 'var(--t1)' }}>
                          {formatCurrency(entry.revenue)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-[8px] rounded-full overflow-hidden" style={{ background: 'var(--fill)' }}>
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.round((entry.revenue / maxRevenue) * 100)}%`,
                              background: BAR_COLORS[Math.min(i, BAR_COLORS.length - 1)],
                            }}
                          />
                        </div>
                        <div className="text-[11px] font-semibold shrink-0 w-[36px] text-right" style={{ color: 'var(--t3)' }}>
                          {pct}%
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Right: Ranked stats */}
            <div className="md:w-[40%] shrink-0">
              <div className="text-[9px] font-semibold tracking-[.1em] uppercase mb-3" style={{ color: 'var(--t3)' }}>
                Ranking
              </div>
              <div className="flex flex-col">
                {ranked.map((entry, i) => {
                  const pct = totalRevenue > 0 ? Math.round((entry.revenue / totalRevenue) * 100) : 0
                  return (
                    <div
                      key={entry.partner!.id}
                      className="flex items-center gap-3 py-3"
                      style={{ borderBottom: i < ranked.length - 1 ? '1px solid var(--fill)' : 'none' }}
                    >
                      <div
                        className="w-[28px] h-[28px] rounded-full flex items-center justify-center text-[12px] font-bold shrink-0"
                        style={{
                          background: RANK_BG[Math.min(i, RANK_BG.length - 1)],
                          color: RANK_COLOR[Math.min(i, RANK_COLOR.length - 1)],
                        }}
                      >
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[14px] font-bold tracking-[-0.2px] truncate" style={{ color: 'var(--t1)' }}>
                          {entry.partner!.name}
                        </div>
                        <div className="text-[11px]" style={{ color: 'var(--t3)' }}>
                          {entry.jobCount} {t('jobs').toLowerCase()} · {pct}% {t('ofTotal')}
                        </div>
                      </div>
                      <div className="text-[16px] font-bold tracking-[-0.3px] shrink-0" style={{ color: 'var(--t1)' }}>
                        {formatCurrency(entry.revenue)}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
