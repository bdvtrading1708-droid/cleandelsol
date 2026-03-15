'use client'

import { useState } from 'react'
import { useJobs } from '@/lib/hooks/use-jobs'
import { useAuth } from '@/providers/auth-provider'
import { useLocale } from '@/lib/i18n'
import { STATUS_COLORS } from '@/lib/constants'
import { formatCurrency, formatDate, getCleanerTotalPayout, getCleanerHours } from '@/lib/utils'
import { filterByPeriod, type Period } from '@/lib/financial'

export default function MyEarningsPage() {
  const { user } = useAuth()
  const { data: jobs = [], isLoading } = useJobs(user?.id)
  const { t } = useLocale()
  const [period, setPeriod] = useState<Period>('alles')

  if (isLoading) {
    return <div className="flex items-center justify-center py-20" style={{ color: 'var(--t3)' }}>{t('loading')}</div>
  }

  const getMyAssignment = (job: typeof jobs[0]) =>
    (job.cleaners || []).find(jc => jc.cleaner_id === user?.id)

  const filtered = filterByPeriod(jobs, period)
  const doneJobs = filtered.filter(j => j.status === 'done')
  const deliveredJobs = filtered.filter(j => j.status === 'delivered' || j.status === 'invoiced' || j.status === 'progress')
  const totalEarned = doneJobs.reduce((s, j) => {
    const my = getMyAssignment(j)
    return s + (my ? getCleanerTotalPayout(my) : 0)
  }, 0)
  const outstanding = deliveredJobs.reduce((s, j) => {
    const my = getMyAssignment(j)
    return s + (my ? getCleanerTotalPayout(my) : 0)
  }, 0)

  const recentDone = [...doneJobs].sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 20)

  const periods: Period[] = ['dag', 'week', 'maand', 'jaar', 'alles']

  return (
    <>
      {/* Hero */}
      <div className="rounded-[22px] p-[22px] mt-3.5 relative overflow-hidden" style={{ background: 'var(--hero-bg)', boxShadow: 'var(--shadow-md)' }}>
        <div className="text-[11px] font-medium mb-1" style={{ color: 'rgba(255,255,255,0.45)' }}>
          {t('myEarn')} · {t(period)}
        </div>
        <div className="text-[44px] font-bold tracking-[-2px] leading-none mb-0.5 text-white">
          {formatCurrency(totalEarned)}
        </div>
        <div className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.40)' }}>{t('totalEarned').toLowerCase()}</div>

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
                  {job.property?.name || job.custom_property_name || '—'}
                </div>
                <div className="text-[11px] mt-0.5" style={{ color: 'var(--t3)' }}>
                  {formatDate(job.date)} · {(() => { const my = getMyAssignment(job); return my ? `${getCleanerHours(my)}u` : '—' })()} · {(() => { const my = getMyAssignment(job); return my?.km_driven ? `${my.km_driven}km` : '—' })()}
                </div>
              </div>

              {/* Payout */}
              <div className="text-right shrink-0">
                <div className="text-[15px] font-bold tracking-[-0.3px]" style={{ color: '#00A651' }}>
                  {formatCurrency(getMyAssignment(job) ? getCleanerTotalPayout(getMyAssignment(job)!) : 0)}
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
