'use client'

import { formatCurrency } from '@/lib/utils'
import { useLocale } from '@/lib/i18n'
import { getCleanerColor } from '@/lib/constants'
import { CleanerAvatar } from '@/components/cleaners/cleaner-avatar'
import type { User } from '@/lib/types'
import type { CleanerFinancials } from '@/lib/financial'

interface Props {
  cleaner: User
  stats: CleanerFinancials | undefined
  onClick: () => void
}

export function CleanerListCard({ cleaner, stats, onClick }: Props) {
  const { t } = useLocale()

  const outstanding = stats?.outstanding || 0
  const earned = stats?.earned || 0
  const jobCount = stats?.jobCount || 0
  const accentColor = getCleanerColor(cleaner.name)

  return (
    <div
      className="rounded-[18px] p-4 flex items-center gap-3.5 transition-all cursor-pointer active:scale-[0.98] relative overflow-hidden"
      style={{ background: 'var(--card)', boxShadow: 'var(--shadow)' }}
      onClick={onClick}
    >
      {/* Accent bar */}
      <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-[18px]" style={{ background: accentColor }} />

      <CleanerAvatar src={cleaner.avatar_url} name={cleaner.name} size={44} />

      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-bold tracking-[-0.2px] truncate" style={{ color: 'var(--t1)' }}>
          {cleaner.name}
        </div>
        <div className="text-[11px] mt-0.5" style={{ color: 'var(--t3)' }}>
          {cleaner.hourly_rate ? `${formatCurrency(cleaner.hourly_rate)}/u` : ''}{cleaner.hourly_rate && jobCount > 0 ? ' · ' : ''}{jobCount > 0 ? `${jobCount} ${t('jobs').toLowerCase()}` : ''}
        </div>
      </div>

      <div className="text-right shrink-0">
        {outstanding > 0 ? (
          <>
            <div className="text-[14px] font-bold tabular-nums" style={{ color: '#FF9900' }}>
              {formatCurrency(outstanding)}
            </div>
            <div className="text-[9px] font-semibold uppercase tracking-[.05em] mt-0.5" style={{ color: '#FF9900' }}>
              {t('outstanding')}
            </div>
          </>
        ) : (
          <>
            <div className="text-[14px] font-bold tabular-nums" style={{ color: earned > 0 ? '#00A651' : 'var(--t3)' }}>
              {formatCurrency(earned)}
            </div>
            <div className="text-[9px] font-semibold uppercase tracking-[.05em] mt-0.5" style={{ color: 'var(--t3)' }}>
              {t('earned')}
            </div>
          </>
        )}
      </div>

      {/* Chevron */}
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0" style={{ color: 'var(--t4)' }}>
        <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}
