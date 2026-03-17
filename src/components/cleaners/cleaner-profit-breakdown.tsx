'use client'

import { formatCurrency } from '@/lib/utils'
import { useLocale } from '@/lib/i18n'
import type { CleanerFinancials } from '@/lib/financial'

interface Props {
  stats: CleanerFinancials | undefined
}

export function CleanerProfitBreakdown({ stats }: Props) {
  const { t } = useLocale()

  if (!stats || stats.revenue === 0) return null

  const items = [
    { label: t('revenue'), value: stats.revenue, color: 'var(--t1)', sign: '' },
    { label: t('payout') || 'Uitbetaling', value: stats.payout, color: 'var(--t2)', sign: '−' },
    { label: 'Kilometerkosten', value: stats.kmCost, color: 'var(--t2)', sign: '−' },
    { label: 'Extra kosten', value: stats.extraCosts, color: 'var(--t2)', sign: '−' },
  ]

  // Stacked bar proportions
  const payoutPct = stats.revenue > 0 ? Math.round((stats.totalCost / stats.revenue) * 100) : 0
  const profitPct = 100 - payoutPct

  return (
    <div className="rounded-[18px] p-4" style={{ background: 'var(--card)', boxShadow: 'var(--shadow)' }}>
      <div className="text-[11px] font-semibold uppercase tracking-[.08em] mb-3" style={{ color: 'var(--t3)' }}>
        Winstoverzicht
      </div>

      <div className="flex flex-col gap-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {item.sign && (
                <span className="text-[11px] font-bold w-3 text-center" style={{ color: 'var(--t3)' }}>{item.sign}</span>
              )}
              {!item.sign && <span className="w-3" />}
              <span className="text-[13px] font-medium" style={{ color: item.color }}>{item.label}</span>
            </div>
            <span className="text-[13px] font-bold tabular-nums" style={{ color: item.color }}>
              {formatCurrency(item.value)}
            </span>
          </div>
        ))}
      </div>

      {/* Divider */}
      <div className="h-px my-3" style={{ background: 'var(--border)' }} />

      {/* Profit */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold w-3 text-center" style={{ color: '#00A651' }}>=</span>
          <span className="text-[14px] font-bold" style={{ color: '#00A651' }}>{t('profit')}</span>
        </div>
        <div className="text-right">
          <span className="text-[16px] font-bold tabular-nums" style={{ color: '#00A651' }}>
            {formatCurrency(stats.profit)}
          </span>
          <span className="text-[11px] font-semibold ml-1.5" style={{ color: stats.margin > 0 ? '#00A651' : 'var(--t3)' }}>
            {stats.margin}%
          </span>
        </div>
      </div>

      {/* Stacked bar */}
      <div className="flex h-[8px] rounded-full overflow-hidden mt-3" style={{ background: 'var(--fill)' }}>
        <div
          className="h-full transition-all duration-500"
          style={{ width: `${payoutPct}%`, background: 'var(--t3)' }}
        />
        <div
          className="h-full transition-all duration-500"
          style={{ width: `${profitPct}%`, background: '#00A651' }}
        />
      </div>
      <div className="flex justify-between mt-1.5">
        <span className="text-[9px] font-semibold" style={{ color: 'var(--t3)' }}>Kosten {payoutPct}%</span>
        <span className="text-[9px] font-semibold" style={{ color: '#00A651' }}>{t('profit')} {profitPct}%</span>
      </div>
    </div>
  )
}
