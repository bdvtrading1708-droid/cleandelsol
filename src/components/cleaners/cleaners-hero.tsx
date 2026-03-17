'use client'

import { formatCurrency } from '@/lib/utils'
import { useLocale } from '@/lib/i18n'
import { aggregateByCleaners, type Period, type CleanerFinancials } from '@/lib/financial'

interface Props {
  cleanerStats: CleanerFinancials[]
  period: Period
  setPeriod: (p: Period) => void
  cleanerCount: number
}

export function CleanersHero({ cleanerStats, period, setPeriod, cleanerCount }: Props) {
  const { t } = useLocale()

  const totalOutstanding = cleanerStats.reduce((s, c) => s + c.outstanding, 0)
  const totalEarned = cleanerStats.reduce((s, c) => s + c.earned, 0)
  const totalJobs = cleanerStats.reduce((s, c) => s + c.jobCount, 0)

  const periods: Period[] = ['dag', 'week', 'maand', 'jaar', 'alles']

  return (
    <div className="rounded-[22px] p-[22px] mt-3.5 relative overflow-hidden" style={{ background: 'var(--hero-bg)', boxShadow: 'var(--shadow-md)' }}>
      <div className="text-[11px] font-medium mb-1" style={{ color: 'rgba(255,255,255,0.45)' }}>
        {cleanerCount} {t('cleaners').toLowerCase()} · {t(period)}
      </div>
      <div className="text-[44px] font-bold tracking-[-2px] leading-none mb-0.5 text-white">
        {formatCurrency(totalOutstanding)}
      </div>
      <div className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.40)' }}>{t('outstanding').toLowerCase()}</div>

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

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-[18px] p-3" style={{ background: 'rgba(255,255,255,0.09)' }}>
          <div className="text-[9px] font-semibold tracking-[.1em] uppercase mb-1" style={{ color: 'rgba(255,255,255,0.40)' }}>
            {t('earned')}
          </div>
          <div className="text-[20px] font-bold tracking-[-0.5px] leading-none text-white">
            {formatCurrency(totalEarned)}
          </div>
        </div>
        <div className="rounded-[18px] p-3" style={{ background: 'rgba(255,255,255,0.09)' }}>
          <div className="text-[9px] font-semibold tracking-[.1em] uppercase mb-1" style={{ color: 'rgba(255,255,255,0.40)' }}>
            {t('orders')}
          </div>
          <div className="text-[20px] font-bold tracking-[-0.5px] leading-none text-white">
            {totalJobs}
          </div>
        </div>
      </div>
    </div>
  )
}
