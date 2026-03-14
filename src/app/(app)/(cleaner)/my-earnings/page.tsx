'use client'

import { useJobs } from '@/lib/hooks/use-jobs'
import { useAuth } from '@/providers/auth-provider'
import { useLocale } from '@/lib/i18n'
import { STATUS_COLORS } from '@/lib/constants'
import { formatCurrency, formatDate } from '@/lib/utils'

export default function MyEarningsPage() {
  const { user } = useAuth()
  const { data: jobs = [], isLoading } = useJobs(user?.id)
  const { t } = useLocale()

  if (isLoading) {
    return <div className="flex items-center justify-center py-20" style={{ color: 'var(--t3)' }}>{t('loading')}</div>
  }

  const doneJobs = jobs.filter(j => j.status === 'done')
  const deliveredJobs = jobs.filter(j => j.status === 'delivered')
  const totalEarned = doneJobs.reduce((s, j) => s + (j.cleaner_payout || 0), 0)
  const outstanding = deliveredJobs.reduce((s, j) => s + (j.cleaner_payout || 0), 0)

  const recentDone = [...doneJobs].sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 20)

  return (
    <>
      {/* Hero */}
      <div className="rounded-[22px] p-[22px] mt-3.5 relative overflow-hidden" style={{ background: 'var(--hero-bg)', boxShadow: 'var(--shadow-md)' }}>
        <div className="text-[11px] font-medium mb-1" style={{ color: 'rgba(255,255,255,0.45)' }}>
          {t('myEarn')}
        </div>
        <div className="text-[44px] font-bold tracking-[-2px] leading-none mb-0.5 text-white">
          {formatCurrency(totalEarned)}
        </div>
        <div className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.40)' }}>{t('totalEarned').toLowerCase()}</div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-[18px] p-3" style={{ background: 'rgba(255,255,255,0.09)' }}>
            <div className="text-[9px] font-semibold tracking-[.1em] uppercase mb-1" style={{ color: 'rgba(255,255,255,0.40)' }}>{t('outstanding')}</div>
            <div className="text-[20px] font-bold tracking-[-0.5px] leading-none text-white">{formatCurrency(outstanding)}</div>
            <div className="text-[10px] font-semibold mt-0.5" style={{ color: outstanding > 0 ? '#FF9900' : 'rgba(255,255,255,0.30)' }}>
              {deliveredJobs.length} {t('jobs').toLowerCase()}
            </div>
          </div>
          <div className="rounded-[18px] p-3" style={{ background: 'rgba(255,255,255,0.09)' }}>
            <div className="text-[9px] font-semibold tracking-[.1em] uppercase mb-1" style={{ color: 'rgba(255,255,255,0.40)' }}>{t('done')}</div>
            <div className="text-[20px] font-bold tracking-[-0.5px] leading-none text-white">{doneJobs.length}</div>
            <div className="text-[10px] font-semibold mt-0.5" style={{ color: 'rgba(255,255,255,0.30)' }}>
              {t('jobs').toLowerCase()}
            </div>
          </div>
        </div>
      </div>

      {/* Recent done jobs */}
      <div className="flex items-center justify-between mt-5 mb-3">
        <div className="text-xl font-bold tracking-[-0.5px]" style={{ color: 'var(--t1)' }}>{t('recentJobs')}</div>
      </div>

      {recentDone.length === 0 ? (
        <div className="text-center py-9" style={{ color: 'var(--t3)' }}>
          <div className="text-sm font-semibold" style={{ color: 'var(--t2)' }}>{t('noJobs')}</div>
        </div>
      ) : (
        <div className="rounded-[22px] overflow-hidden" style={{ background: 'var(--card)', boxShadow: 'var(--shadow)' }}>
          {recentDone.map((job, i) => (
            <div
              key={job.id}
              className="flex items-center gap-3 px-4 py-3.5"
              style={{ borderBottom: i < recentDone.length - 1 ? '1px solid var(--border)' : 'none' }}
            >
              {/* Status bar */}
              <div className="w-[3px] h-10 rounded-[2px] shrink-0" style={{ background: STATUS_COLORS[job.status] || '#00A651' }} />

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-bold tracking-[-0.2px] truncate" style={{ color: 'var(--t1)' }}>
                  {job.property?.name || '—'}
                </div>
                <div className="text-[11px] mt-0.5" style={{ color: 'var(--t3)' }}>
                  {formatDate(job.date)} · {job.hours_worked ? `${job.hours_worked}u` : '—'} · {job.km_driven ? `${job.km_driven}km` : '—'}
                </div>
              </div>

              {/* Payout */}
              <div className="text-right shrink-0">
                <div className="text-[15px] font-bold tracking-[-0.3px]" style={{ color: '#00A651' }}>
                  {formatCurrency(job.cleaner_payout || 0)}
                </div>
                <div className="text-[9px] font-bold uppercase tracking-[.05em] mt-0.5" style={{ color: 'var(--t3)' }}>
                  {t('done')}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
