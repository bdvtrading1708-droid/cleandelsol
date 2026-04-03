'use client'

import { useState } from 'react'
import { useJobs } from '@/lib/hooks/use-jobs'
import { useAuth } from '@/providers/auth-provider'
import { useLocale } from '@/lib/i18n'
import { STATUS_COLORS } from '@/lib/constants'
import { formatCurrency, formatDate, getCleanerTotalPayout } from '@/lib/utils'
import { JobPanel } from '@/components/jobs/job-panel'
import { MapPin } from 'lucide-react'
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

  // Show job as upcoming if this cleaner hasn't filled in hours yet (even if status is 'delivered' by another cleaner)
  const upcoming = jobs.filter(j => {
    if (j.status === 'planned' || j.status === 'progress') return true
    if (j.status === 'delivered') {
      const my = getMyAssignment(j)
      return my && !my.hours_worked
    }
    return false
  }).sort((a, b) => (a.date || '').localeCompare(b.date || ''))

  return (
    <>
      {/* Upcoming jobs */}
      <div className="flex items-center justify-between mt-3.5 mb-3">
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
                  {job.property?.name || job.custom_property_name || '—'}
                </div>
                <div className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--t3)' }}>
                  {formatDate(job.date)} · {job.start_time || '—'}
                </div>
                {(job.property?.maps_url || job.property?.address) && (
                  <div
                    className="flex items-center gap-1 mt-1 text-[10px] font-medium"
                    style={{ color: 'var(--blue)' }}
                    onClick={(e) => {
                      e.stopPropagation()
                      const url = job.property?.maps_url
                        || (() => {
                          const q = encodeURIComponent(job.property?.address || job.property?.name || '')
                          const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
                          return isIOS ? `maps://maps.apple.com/?q=${q}` : `https://www.google.com/maps/search/?api=1&query=${q}`
                        })()
                      window.open(url, '_blank')
                    }}
                  >
                    <MapPin size={10} />
                    <span className="truncate">{job.property?.address || t('openRoute')}</span>
                  </div>
                )}
              </div>

              {/* Payout + status */}
              <div className="text-right shrink-0">
                <div className="text-[15px] font-bold tracking-[-0.3px]" style={{ color: 'var(--t1)' }}>
                  {formatCurrency(getMyAssignment(job) ? getCleanerTotalPayout(getMyAssignment(job)!) : 0)}
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
