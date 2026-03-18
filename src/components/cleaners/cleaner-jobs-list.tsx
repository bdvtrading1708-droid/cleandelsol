'use client'

import { useState } from 'react'
import { formatCurrency, formatDate, getCleanerHours, getCleanerTotalPayout } from '@/lib/utils'
import { useLocale } from '@/lib/i18n'
import { STATUS_COLORS } from '@/lib/constants'
import type { Job, JobCleaner } from '@/lib/types'

interface Props {
  cleanerId: string
  jobs: Job[]
}

type Filter = 'alle' | 'openstaand' | 'betaald'

export function CleanerJobsList({ cleanerId, jobs }: Props) {
  const { t } = useLocale()
  const [filter, setFilter] = useState<Filter>('alle')
  const [showAll, setShowAll] = useState(false)

  const cleanerJobs = jobs
    .filter(j => (j.cleaners || []).some(jc => jc.cleaner_id === cleanerId) || j.cleaner_id === cleanerId)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))

  const getAssignment = (job: Job): JobCleaner | undefined =>
    (job.cleaners || []).find(jc => jc.cleaner_id === cleanerId)

  const filtered = cleanerJobs.filter(j => {
    if (filter === 'openstaand') return j.status === 'delivered' || j.status === 'progress'
    if (filter === 'betaald') return j.status === 'done' || j.status === 'invoiced'
    return true
  })

  const displayed = showAll ? filtered : filtered.slice(0, 10)

  const filters: { key: Filter; label: string }[] = [
    { key: 'alle', label: t('alles') || 'Alle' },
    { key: 'openstaand', label: t('outstanding') || 'Openstaand' },
    { key: 'betaald', label: t('markPaid') || 'Betaald' },
  ]

  const statusLabel = (status: string) => {
    if (status === 'done') return t('markPaid') || 'Betaald'
    if (status === 'delivered') return 'Opgeleverd'
    if (status === 'invoiced') return 'Gefactureerd'
    if (status === 'progress') return t('inprog') || 'Bezig'
    if (status === 'planned') return t('planned') || 'Gepland'
    return status
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="text-[15px] font-bold tracking-[-0.3px]" style={{ color: 'var(--t1)' }}>
          {t('jobs') || 'Opdrachten'} ({filtered.length})
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-0.5 mb-3 rounded-full p-0.5 w-fit" style={{ background: 'var(--fill)' }}>
        {filters.map(f => (
          <button
            key={f.key}
            className="px-3 py-1 rounded-full text-[11px] font-semibold transition-all"
            style={{
              background: filter === f.key ? 'var(--card)' : 'transparent',
              color: filter === f.key ? 'var(--t1)' : 'var(--t3)',
              boxShadow: filter === f.key ? 'var(--shadow)' : 'none',
            }}
            onClick={() => { setFilter(f.key); setShowAll(false) }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {displayed.length === 0 ? (
        <div className="text-center py-8" style={{ color: 'var(--t3)' }}>
          <div className="text-[13px] font-medium">Geen opdrachten</div>
        </div>
      ) : (
        <div className="rounded-[18px] overflow-hidden" style={{ background: 'var(--card)', boxShadow: 'var(--shadow)' }}>
          {displayed.map((job, i) => {
            const my = getAssignment(job)
            if (!my) return null
            const payout = getCleanerTotalPayout(my)
            const hours = getCleanerHours(my)
            const isPaid = job.status === 'done' || job.status === 'invoiced'

            return (
              <div
                key={job.id}
                className="flex items-center gap-2.5 px-3.5 py-3"
                style={{ borderBottom: i < displayed.length - 1 ? '1px solid var(--border)' : 'none' }}
              >
                <div className="w-[3px] h-9 rounded-[2px] shrink-0" style={{ background: STATUS_COLORS[job.status] || 'var(--t3)' }} />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-bold tracking-[-0.2px] truncate" style={{ color: 'var(--t1)' }}>
                    {job.property?.name || job.custom_property_name || '—'}
                  </div>
                  <div className="text-[10px] mt-0.5" style={{ color: 'var(--t3)' }}>
                    {job.date ? formatDate(job.date) : '—'} · {hours}u · {my.km_driven || 0}km
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[13px] font-bold tracking-[-0.3px]" style={{ color: isPaid ? '#00A651' : 'var(--t1)' }}>
                    {formatCurrency(payout)}
                  </div>
                  <div className="text-[8px] font-bold uppercase tracking-[.05em] mt-0.5" style={{ color: STATUS_COLORS[job.status] || 'var(--t3)' }}>
                    {isPaid && '✓ '}{statusLabel(job.status)}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {filtered.length > 10 && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="w-full h-[40px] rounded-[14px] text-[13px] font-semibold mt-2 transition-all active:scale-[0.98]"
          style={{ background: 'var(--fill)', color: 'var(--t2)' }}
        >
          Toon meer ({filtered.length - 10})
        </button>
      )}
    </div>
  )
}
