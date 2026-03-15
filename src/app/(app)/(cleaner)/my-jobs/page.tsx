'use client'

import { useState } from 'react'
import { useJobs } from '@/lib/hooks/use-jobs'
import { useAuth } from '@/providers/auth-provider'
import { useLocale } from '@/lib/i18n'
import { STATUS_COLORS } from '@/lib/constants'
import { formatCurrency, formatDate, getCleanerPayout, getCleanerHours } from '@/lib/utils'
import { JobPanel } from '@/components/jobs/job-panel'
import type { Job } from '@/lib/types'

export default function MyJobsPage() {
  const { user } = useAuth()
  const { data: jobs = [], isLoading } = useJobs(user?.id)
  const { t } = useLocale()
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)

  if (isLoading) {
    return <div className="flex items-center justify-center py-20" style={{ color: 'var(--t3)' }}>{t('loading')}</div>
  }

  // Get this cleaner's specific data from each job
  const getMyAssignment = (job: typeof jobs[0]) =>
    (job.cleaners || []).find(jc => jc.cleaner_id === user?.id)

  const totalEarned = jobs.filter(j => j.status === 'done').reduce((s, j) => {
    const my = getMyAssignment(j)
    return s + (my ? getCleanerPayout(my) : 0)
  }, 0)
  const totalHours = jobs.reduce((s, j) => {
    const my = getMyAssignment(j)
    return s + (my ? getCleanerHours(my) : 0)
  }, 0)
  const totalKm = jobs.reduce((s, j) => {
    const my = getMyAssignment(j)
    return s + (my?.km_driven || 0)
  }, 0)

  const upcoming = jobs.filter(j => j.status === 'planned' || j.status === 'progress')
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''))

  return (
    <>
      {/* Hero */}
      <div className="rounded-[22px] p-[22px] mt-3.5 relative overflow-hidden" style={{ background: 'var(--hero-bg)', boxShadow: 'var(--shadow-md)' }}>
        <div className="text-[11px] font-medium mb-1" style={{ color: 'rgba(255,255,255,0.45)' }}>
          {t('myJobs')}
        </div>
        <div className="text-[44px] font-bold tracking-[-2px] leading-none mb-0.5 text-white">
          {formatCurrency(totalEarned)}
        </div>
        <div className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.40)' }}>{t('earned').toLowerCase()}</div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-[18px] p-3" style={{ background: 'rgba(255,255,255,0.09)' }}>
            <div className="text-[9px] font-semibold tracking-[.1em] uppercase mb-1" style={{ color: 'rgba(255,255,255,0.40)' }}>{t('hours')}</div>
            <div className="text-[20px] font-bold tracking-[-0.5px] leading-none text-white">{totalHours}</div>
          </div>
          <div className="rounded-[18px] p-3" style={{ background: 'rgba(255,255,255,0.09)' }}>
            <div className="text-[9px] font-semibold tracking-[.1em] uppercase mb-1" style={{ color: 'rgba(255,255,255,0.40)' }}>{t('km')}</div>
            <div className="text-[20px] font-bold tracking-[-0.5px] leading-none text-white">{totalKm}</div>
          </div>
        </div>
      </div>

      {/* Upcoming jobs */}
      <div className="flex items-center justify-between mt-5 mb-3">
        <div className="text-xl font-bold tracking-[-0.5px]" style={{ color: 'var(--t1)' }}>{t('upcoming')}</div>
        <div className="text-sm font-semibold" style={{ color: 'var(--t3)' }}>{upcoming.length}</div>
      </div>

      {upcoming.length === 0 ? (
        <div className="text-center py-9" style={{ color: 'var(--t3)' }}>
          <div className="text-sm font-semibold" style={{ color: 'var(--t2)' }}>{t('noJobs')}</div>
        </div>
      ) : (
        <div className="rounded-[22px] overflow-hidden" style={{ background: 'var(--card)', boxShadow: 'var(--shadow)' }}>
          {upcoming.map((job, i) => (
            <div
              key={job.id}
              className="flex items-center gap-3 px-4 py-3.5 cursor-pointer active:scale-[0.99] transition-transform"
              style={{ borderBottom: i < upcoming.length - 1 ? '1px solid var(--border)' : 'none' }}
              onClick={() => setSelectedJob(job)}
            >
              {/* Status bar */}
              <div className="w-[3px] h-10 rounded-[2px] shrink-0" style={{ background: STATUS_COLORS[job.status] || '#0064D2' }} />

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-bold tracking-[-0.2px] truncate" style={{ color: 'var(--t1)' }}>
                  {job.property?.name || '—'}
                </div>
                <div className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--t3)' }}>
                  {formatDate(job.date)} · {job.start_time || '—'}
                </div>
                {job.property?.address && (
                  <div className="text-[10px] mt-0.5 truncate" style={{ color: 'var(--t3)' }}>
                    {job.property.address}
                  </div>
                )}
              </div>

              {/* Payout + status */}
              <div className="text-right shrink-0">
                <div className="text-[15px] font-bold tracking-[-0.3px]" style={{ color: 'var(--t1)' }}>
                  {formatCurrency(getMyAssignment(job) ? getCleanerPayout(getMyAssignment(job)!) : 0)}
                </div>
                <div
                  className="text-[9px] font-bold uppercase tracking-[.05em] mt-0.5"
                  style={{ color: STATUS_COLORS[job.status] }}
                >
                  {t(job.status === 'progress' ? 'inprog' : job.status)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail panel */}
      <JobPanel
        job={selectedJob}
        open={!!selectedJob}
        onClose={() => setSelectedJob(null)}
      />
    </>
  )
}
