'use client'

import { useState } from 'react'
import { useJobs } from '@/lib/hooks/use-jobs'
import { useCleaners } from '@/lib/hooks/use-cleaners'
import { usePartners } from '@/lib/hooks/use-partners'
import { useLocale } from '@/lib/i18n'
import { formatCurrency } from '@/lib/utils'
import TopPartnersByRevenue from '@/components/financial/top-partners'

type Period = 'maand' | 'jaar' | 'alles'

export default function FinancialPage() {
  const { data: jobs = [], isLoading } = useJobs()
  const { data: cleaners = [] } = useCleaners()
  const { data: partners = [] } = usePartners()
  const { t } = useLocale()
  const [period, setPeriod] = useState<Period>('maand')

  if (isLoading) {
    return <div className="flex items-center justify-center py-20" style={{ color: 'var(--t3)' }}>{t('loading')}</div>
  }

  const now = new Date()
  const filtered = (() => {
    if (period === 'maand') {
      const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      return jobs.filter(j => j.date?.startsWith(ym))
    }
    if (period === 'jaar') return jobs.filter(j => j.date?.startsWith(String(now.getFullYear())))
    return jobs
  })()

  const KM_RATE = 0.10
  const totalRev = filtered.reduce((s, j) => s + (j.client_price || 0), 0)
  const totalCost = filtered.reduce((s, j) => s + (j.cleaner_payout || 0) + (j.km_driven || 0) * KM_RATE, 0)
  const netProfit = totalRev - totalCost
  const margin = totalRev > 0 ? Math.round((netProfit / totalRev) * 100) : 0

  // Per-cleaner breakdown
  const perCleaner = cleaners.map(c => {
    const cJobs = filtered.filter(j => j.cleaner_id === c.id)
    const rev = cJobs.reduce((s, j) => s + (j.client_price || 0), 0)
    const cost = cJobs.reduce((s, j) => s + (j.cleaner_payout || 0) + (j.km_driven || 0) * KM_RATE, 0)
    const outstanding = cJobs.filter(j => j.status === 'delivered').reduce((s, j) => s + (j.cleaner_payout || 0), 0)
    return { cleaner: c, jobCount: cJobs.length, rev, cost, profit: rev - cost, outstanding }
  }).filter(c => c.jobCount > 0).sort((a, b) => b.rev - a.rev)

  const maxRev = Math.max(1, ...perCleaner.map(c => c.rev))

  const periods: Period[] = ['maand', 'jaar', 'alles']

  return (
    <>
      {/* Hero */}
      <div className="rounded-[22px] p-[22px] mt-3.5 relative overflow-hidden" style={{ background: 'var(--hero-bg)', boxShadow: 'var(--shadow-md)' }}>
        <div className="text-[11px] font-medium mb-1" style={{ color: 'rgba(255,255,255,0.45)' }}>
          {t('fin')} · {t(period)}
        </div>
        <div className="text-[44px] font-bold tracking-[-2px] leading-none mb-0.5 text-white">
          {formatCurrency(totalRev)}
        </div>
        <div className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.40)' }}>{t('totalRev').toLowerCase()}</div>

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

        {/* Revenue / Cost / Profit */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-[18px] p-3" style={{ background: 'rgba(255,255,255,0.09)' }}>
            <div className="text-[9px] font-semibold tracking-[.1em] uppercase mb-1" style={{ color: 'rgba(255,255,255,0.40)' }}>{t('totalRev')}</div>
            <div className="text-[18px] font-bold tracking-[-0.5px] leading-none text-white">{formatCurrency(totalRev)}</div>
          </div>
          <div className="rounded-[18px] p-3" style={{ background: 'rgba(255,255,255,0.09)' }}>
            <div className="text-[9px] font-semibold tracking-[.1em] uppercase mb-1" style={{ color: 'rgba(255,255,255,0.40)' }}>{t('totalCost')}</div>
            <div className="text-[18px] font-bold tracking-[-0.5px] leading-none text-white">{formatCurrency(totalCost)}</div>
          </div>
          <div className="rounded-[18px] p-3" style={{ background: 'rgba(255,255,255,0.09)' }}>
            <div className="text-[9px] font-semibold tracking-[.1em] uppercase mb-1" style={{ color: 'rgba(255,255,255,0.40)' }}>{t('netProfit')}</div>
            <div className="text-[18px] font-bold tracking-[-0.5px] leading-none text-white">{formatCurrency(netProfit)}</div>
            <div className={`text-[10px] font-semibold mt-0.5 ${margin > 0 ? 'text-green-400' : 'text-white/30'}`}>
              {margin > 0 ? '+' : ''}{margin}%
            </div>
          </div>
        </div>
      </div>

      {/* Top Partners */}
      <TopPartnersByRevenue jobs={jobs} partners={partners} />

      {/* Per cleaner breakdown */}
      <div className="flex items-center justify-between mt-5 mb-3">
        <div className="text-xl font-bold tracking-[-0.5px]" style={{ color: 'var(--t1)' }}>{t('perCleaner')}</div>
      </div>

      {perCleaner.length === 0 ? (
        <div className="text-center py-9" style={{ color: 'var(--t3)' }}>
          <div className="text-sm font-semibold" style={{ color: 'var(--t2)' }}>{t('noJobs')}</div>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {perCleaner.map(({ cleaner, jobCount, rev, cost, profit, outstanding }) => (
            <div
              key={cleaner.id}
              className="rounded-[18px] p-4"
              style={{ background: 'var(--card)', boxShadow: 'var(--shadow)' }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-[38px] h-[38px] rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                  style={{ background: 'var(--hero-bg)' }}
                >
                  {(cleaner.name || '?')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-bold tracking-[-0.2px] truncate" style={{ color: 'var(--t1)' }}>{cleaner.name}</div>
                  <div className="text-[11px]" style={{ color: 'var(--t3)' }}>{jobCount} {t('jobs').toLowerCase()}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[16px] font-bold tracking-[-0.3px]" style={{ color: 'var(--t1)' }}>{formatCurrency(rev)}</div>
                  <div className="text-[10px] font-semibold" style={{ color: 'var(--t3)' }}>{t('revenue').toLowerCase()}</div>
                </div>
              </div>

              {/* Revenue bar */}
              <div className="h-[6px] rounded-full overflow-hidden mb-3" style={{ background: 'var(--fill)' }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.round((rev / maxRev) * 100)}%`, background: 'var(--hero-bg)' }}
                />
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center">
                  <div className="text-[9px] font-semibold uppercase tracking-[.08em] mb-0.5" style={{ color: 'var(--t3)' }}>{t('totalCost')}</div>
                  <div className="text-[13px] font-bold" style={{ color: 'var(--t1)' }}>{formatCurrency(cost)}</div>
                </div>
                <div className="text-center">
                  <div className="text-[9px] font-semibold uppercase tracking-[.08em] mb-0.5" style={{ color: 'var(--t3)' }}>{t('profit')}</div>
                  <div className="text-[13px] font-bold" style={{ color: profit > 0 ? '#00A651' : 'var(--t1)' }}>{formatCurrency(profit)}</div>
                </div>
                <div className="text-center">
                  <div className="text-[9px] font-semibold uppercase tracking-[.08em] mb-0.5" style={{ color: 'var(--t3)' }}>{t('outstanding')}</div>
                  <div className="text-[13px] font-bold" style={{ color: outstanding > 0 ? '#FF9900' : 'var(--t3)' }}>{formatCurrency(outstanding)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
