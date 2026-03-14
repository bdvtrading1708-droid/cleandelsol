'use client'

import { useState } from 'react'
import { useJobs } from '@/lib/hooks/use-jobs'
import { useLocale } from '@/lib/i18n'
import { STATUS_COLORS } from '@/lib/constants'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Plus } from 'lucide-react'
import { JobPanel } from '@/components/jobs/job-panel'
import { JobForm } from '@/components/jobs/job-form'
import type { Job, JobStatus } from '@/lib/types'

const STATUSES: (JobStatus | 'all')[] = ['all', 'planned', 'progress', 'delivered', 'done']

export default function JobsPage() {
  const { data: jobs = [], isLoading } = useJobs()
  const { t } = useLocale()
  const [filter, setFilter] = useState<JobStatus | 'all'>('all')
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [showForm, setShowForm] = useState(false)

  if (isLoading) {
    return <div className="flex items-center justify-center py-20" style={{ color: 'var(--t3)' }}>{t('loading')}</div>
  }

  const filtered = filter === 'all' ? jobs : jobs.filter(j => j.status === filter)

  return (
    <>
      <div className="flex items-center justify-between mt-3.5 mb-4">
        <div className="text-xl font-bold tracking-[-0.5px]" style={{ color: 'var(--t1)' }}>
          {t('jobs')}
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
          style={{ background: 'var(--t1)', color: 'var(--bg)' }}
        >
          <Plus size={18} strokeWidth={2.5} />
        </button>
      </div>

      {/* Status filter */}
      <div className="flex gap-1 mb-4 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {STATUSES.map(s => (
          <button
            key={s}
            className="px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all shrink-0"
            style={{
              background: filter === s ? (s === 'all' ? 'var(--t1)' : STATUS_COLORS[s]) : 'var(--fill)',
              color: filter === s ? (s === 'all' ? 'var(--bg)' : '#fff') : 'var(--t3)',
            }}
            onClick={() => setFilter(s)}
          >
            {s === 'all' ? t('alles') : t(s === 'progress' ? 'inprog' : s)}
          </button>
        ))}
      </div>

      {/* Job cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-12" style={{ color: 'var(--t3)' }}>
          <div className="text-sm font-semibold" style={{ color: 'var(--t2)' }}>{t('noJobs')}</div>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {filtered.map(job => (
            <div
              key={job.id}
              className="rounded-[18px] p-4 transition-all cursor-pointer active:scale-[0.98]"
              style={{ background: 'var(--card)', boxShadow: 'var(--shadow)' }}
              onClick={() => setSelectedJob(job)}
            >
              {/* Header: property + status */}
              <div className="flex items-start justify-between mb-2.5">
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-bold tracking-[-0.2px] truncate" style={{ color: 'var(--t1)' }}>
                    {job.property?.name || '—'}
                  </div>
                  <div className="text-[12px] mt-0.5 truncate" style={{ color: 'var(--t3)' }}>
                    {job.cleaner?.name || '—'} · {formatDate(job.date)} · {job.start_time || '—'}
                  </div>
                </div>
                <div
                  className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-[.05em] shrink-0 ml-2"
                  style={{ background: STATUS_COLORS[job.status] + '18', color: STATUS_COLORS[job.status] }}
                >
                  {t(job.status === 'progress' ? 'inprog' : job.status)}
                </div>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-4 gap-2">
                <div className="rounded-[12px] p-2 text-center" style={{ background: 'var(--fill)' }}>
                  <div className="text-[9px] font-semibold uppercase tracking-[.08em] mb-0.5" style={{ color: 'var(--t3)' }}>{t('price')}</div>
                  <div className="text-[14px] font-bold tracking-[-0.3px]" style={{ color: 'var(--t1)' }}>{formatCurrency(job.client_price || 0)}</div>
                </div>
                <div className="rounded-[12px] p-2 text-center" style={{ background: 'var(--fill)' }}>
                  <div className="text-[9px] font-semibold uppercase tracking-[.08em] mb-0.5" style={{ color: 'var(--t3)' }}>{t('payout')}</div>
                  <div className="text-[14px] font-bold tracking-[-0.3px]" style={{ color: 'var(--t1)' }}>{formatCurrency(job.cleaner_payout || 0)}</div>
                </div>
                <div className="rounded-[12px] p-2 text-center" style={{ background: 'var(--fill)' }}>
                  <div className="text-[9px] font-semibold uppercase tracking-[.08em] mb-0.5" style={{ color: 'var(--t3)' }}>{t('hours')}</div>
                  <div className="text-[14px] font-bold tracking-[-0.3px]" style={{ color: 'var(--t1)' }}>{job.hours_worked ?? '—'}</div>
                </div>
                <div className="rounded-[12px] p-2 text-center" style={{ background: 'var(--fill)' }}>
                  <div className="text-[9px] font-semibold uppercase tracking-[.08em] mb-0.5" style={{ color: 'var(--t3)' }}>{t('km')}</div>
                  <div className="text-[14px] font-bold tracking-[-0.3px]" style={{ color: 'var(--t1)' }}>{job.km_driven ?? '—'}</div>
                </div>
              </div>

              {/* Notes */}
              {job.notes && (
                <div className="mt-2.5 text-[12px] leading-relaxed truncate" style={{ color: 'var(--t3)' }}>
                  {job.notes}
                </div>
              )}
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

      {/* Create form */}
      <JobForm
        open={showForm}
        onClose={() => setShowForm(false)}
      />
    </>
  )
}
