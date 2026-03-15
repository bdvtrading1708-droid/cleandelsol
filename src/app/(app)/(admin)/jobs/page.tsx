'use client'

import { useState } from 'react'
import { useJobs } from '@/lib/hooks/use-jobs'
import { usePartners } from '@/lib/hooks/use-partners'
import { useLocale } from '@/lib/i18n'
import { STATUS_COLORS } from '@/lib/constants'
import { formatCurrency, formatDate, getJobRevenue, getJobPayout, getJobHours, getJobKm } from '@/lib/utils'
import { Plus } from 'lucide-react'
import { JobPanel } from '@/components/jobs/job-panel'
import { JobForm } from '@/components/jobs/job-form'
import type { Job, JobStatus } from '@/lib/types'

const STATUSES: JobStatus[] = ['planned', 'progress', 'delivered', 'done']

export default function JobsPage() {
  const { data: jobs = [], isLoading } = useJobs()
  const { data: partners = [] } = usePartners()
  const { t } = useLocale()
  const [filter, setFilter] = useState<JobStatus>('planned')
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [partnerFilter, setPartnerFilter] = useState<string | null>(null)

  if (isLoading) {
    return <div className="flex items-center justify-center py-20" style={{ color: 'var(--t3)' }}>{t('loading')}</div>
  }

  let filtered = jobs.filter(j => j.status === filter)

  // Sub-filter by partner when on "delivered" (wacht op betaling)
  if (filter === 'delivered' && partnerFilter) {
    filtered = filtered.filter(j => j.property?.partner_id === partnerFilter)
  }

  // Get unique partners for delivered jobs (for sub-filter)
  const deliveredJobs = jobs.filter(j => j.status === 'delivered')
  const deliveredPartnerIds = [...new Set(deliveredJobs.map(j => j.property?.partner_id).filter(Boolean))] as string[]
  const deliveredPartners = partners.filter(p => deliveredPartnerIds.includes(p.id))

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
      <div className="flex gap-1 mb-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {STATUSES.map(s => (
          <button
            key={s}
            className="px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all shrink-0"
            style={{
              background: filter === s ? STATUS_COLORS[s] : 'var(--fill)',
              color: filter === s ? '#fff' : 'var(--t3)',
            }}
            onClick={() => { setFilter(s); setPartnerFilter(null) }}
          >
            {t(s === 'progress' ? 'inprog' : s)}
            {s === 'delivered' && deliveredJobs.length > 0 && (
              <span className="ml-1 opacity-70">({deliveredJobs.length})</span>
            )}
          </button>
        ))}
      </div>

      {/* Partner sub-filter for "Wacht op betaling" */}
      {filter === 'delivered' && deliveredPartners.length > 0 && (
        <div className="flex gap-1 mb-4 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          <button
            className="px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all shrink-0"
            style={{
              background: !partnerFilter ? 'var(--t1)' : 'var(--fill)',
              color: !partnerFilter ? 'var(--bg)' : 'var(--t3)',
            }}
            onClick={() => setPartnerFilter(null)}
          >
            Alle partners
          </button>
          {deliveredPartners.map(p => {
            const count = deliveredJobs.filter(j => j.property?.partner_id === p.id).length
            return (
              <button
                key={p.id}
                className="px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all shrink-0"
                style={{
                  background: partnerFilter === p.id ? 'var(--t1)' : 'var(--fill)',
                  color: partnerFilter === p.id ? 'var(--bg)' : 'var(--t3)',
                }}
                onClick={() => setPartnerFilter(p.id)}
              >
                {p.name} ({count})
              </button>
            )
          })}
        </div>
      )}

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
                    {job.property?.name || job.custom_property_name || '—'}
                  </div>
                  <div className="text-[12px] mt-0.5 truncate" style={{ color: 'var(--t3)' }}>
                    {(job.cleaners || []).length > 0
                      ? job.cleaners.map(jc => jc.cleaner?.name?.split(' ')[0]).join(', ')
                      : (job.cleaner?.name || '—')
                    } · {formatDate(job.date)} · {job.start_time?.slice(0, 5) || '—'}{job.end_time ? ` – ${job.end_time.slice(0, 5)}` : ''}
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
                  <div className="text-[14px] font-bold tracking-[-0.3px]" style={{ color: 'var(--t1)' }}>{formatCurrency(getJobRevenue(job))}</div>
                </div>
                <div className="rounded-[12px] p-2 text-center" style={{ background: 'var(--fill)' }}>
                  <div className="text-[9px] font-semibold uppercase tracking-[.08em] mb-0.5" style={{ color: 'var(--t3)' }}>{t('payout')}</div>
                  <div className="text-[14px] font-bold tracking-[-0.3px]" style={{ color: 'var(--t1)' }}>{formatCurrency(getJobPayout(job))}</div>
                </div>
                <div className="rounded-[12px] p-2 text-center" style={{ background: 'var(--fill)' }}>
                  <div className="text-[9px] font-semibold uppercase tracking-[.08em] mb-0.5" style={{ color: 'var(--t3)' }}>{t('hours')}</div>
                  <div className="text-[14px] font-bold tracking-[-0.3px]" style={{ color: 'var(--t1)' }}>{getJobHours(job) > 0 ? getJobHours(job) : '—'}</div>
                </div>
                <div className="rounded-[12px] p-2 text-center" style={{ background: 'var(--fill)' }}>
                  <div className="text-[9px] font-semibold uppercase tracking-[.08em] mb-0.5" style={{ color: 'var(--t3)' }}>{t('km')}</div>
                  <div className="text-[14px] font-bold tracking-[-0.3px]" style={{ color: 'var(--t1)' }}>{getJobKm(job) || '—'}</div>
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
