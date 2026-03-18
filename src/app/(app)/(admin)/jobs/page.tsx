'use client'

import { useState } from 'react'
import { useJobs } from '@/lib/hooks/use-jobs'
import { usePartners } from '@/lib/hooks/use-partners'
import { useInvoices, useInvoiceJobs, useCreateInvoice } from '@/lib/hooks/use-invoices'
import { useLocale } from '@/lib/i18n'
import { STATUS_COLORS } from '@/lib/constants'
import { formatCurrency, formatDate, getJobTotalRevenue, getJobPayout, getJobHours, getJobKm } from '@/lib/utils'
import { Plus, Check, FileText, Download } from 'lucide-react'
import { JobPanel } from '@/components/jobs/job-panel'
import { JobForm } from '@/components/jobs/job-form'
import type { Job, JobStatus } from '@/lib/types'

const STATUSES: JobStatus[] = ['planned', 'progress', 'delivered', 'done', 'invoiced']

export default function JobsPage() {
  const { data: jobs = [], isLoading } = useJobs()
  const { data: partners = [] } = usePartners()
  const { data: invoices = [] } = useInvoices()
  const { data: invoiceJobs = [] } = useInvoiceJobs()
  const createInvoice = useCreateInvoice()
  const { t } = useLocale()
  const [filter, setFilter] = useState<JobStatus>('planned')
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [partnerFilter, setPartnerFilter] = useState<string | null>(null)
  const [selectedJobIds, setSelectedJobIds] = useState<Set<number>>(new Set())

  if (isLoading) {
    return <div className="flex items-center justify-center py-20" style={{ color: 'var(--t3)' }}>{t('loading')}</div>
  }

  let filtered = jobs.filter(j => j.status === filter)

  // Sub-filter by partner when on "done" or "invoiced"
  if ((filter === 'done' || filter === 'invoiced') && partnerFilter) {
    filtered = filtered.filter(j => j.property?.partner_id === partnerFilter)
  }

  // Get unique partners for done/invoiced jobs (for sub-filter and invoice creation)
  const doneJobs = jobs.filter(j => j.status === 'done')
  const invoicedJobs = jobs.filter(j => j.status === 'invoiced')
  const filterJobs = filter === 'invoiced' ? invoicedJobs : doneJobs
  const filterPartnerIds = [...new Set(filterJobs.map(j => j.property?.partner_id).filter(Boolean))] as string[]
  const filterPartners = partners.filter(p => filterPartnerIds.includes(p.id))

  // Selection mode: only when on "done" tab with a partner selected (for invoice creation)
  const isSelectionMode = filter === 'done' && !!partnerFilter

  const toggleJobSelection = (jobId: number) => {
    setSelectedJobIds(prev => {
      const next = new Set(prev)
      if (next.has(jobId)) next.delete(jobId)
      else next.add(jobId)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedJobIds.size === filtered.length) {
      setSelectedJobIds(new Set())
    } else {
      setSelectedJobIds(new Set(filtered.map(j => j.id)))
    }
  }

  const selectedTotal = filtered
    .filter(j => selectedJobIds.has(j.id))
    .reduce((sum, j) => sum + getJobTotalRevenue(j), 0)

  const handleCreateInvoice = () => {
    if (!partnerFilter || selectedJobIds.size === 0) return
    createInvoice.mutate(
      { partner_id: partnerFilter, job_ids: Array.from(selectedJobIds) },
      {
        onSuccess: () => {
          setSelectedJobIds(new Set())
          setPartnerFilter(null)
        },
      }
    )
  }

  // Group invoiced jobs by invoice for "Factuur verstuurd" tab
  const getInvoiceForJob = (jobId: number) => {
    const link = invoiceJobs.find(ij => ij.job_id === jobId)
    if (!link) return null
    return invoices.find(inv => inv.id === link.invoice_id) || null
  }

  // Group invoiced filtered jobs by invoice
  const invoiceGroups: { invoiceId: number | null; invoiceNumber: string | null; pdfUrl: string | null; totalAmount: number; createdAt: string | null; jobs: Job[] }[] = []
  if (filter === 'invoiced') {
    const grouped = new Map<number | null, Job[]>()
    for (const job of filtered) {
      const inv = getInvoiceForJob(job.id)
      const key = inv?.id ?? null
      if (!grouped.has(key)) grouped.set(key, [])
      grouped.get(key)!.push(job)
    }
    for (const [invId, groupJobs] of grouped) {
      const inv = invId ? invoices.find(i => i.id === invId) : null
      invoiceGroups.push({
        invoiceId: invId,
        invoiceNumber: inv?.invoice_number ?? null,
        pdfUrl: inv?.pdf_url ?? null,
        totalAmount: inv?.total_amount ?? groupJobs.reduce((s, j) => s + getJobTotalRevenue(j), 0),
        createdAt: inv?.created_at ?? null,
        jobs: groupJobs,
      })
    }
  }

  const renderJobCard = (job: Job, showCheckbox: boolean) => (
    <div
      key={job.id}
      className="rounded-[18px] p-4 transition-all cursor-pointer active:scale-[0.98]"
      style={{ background: 'var(--card)', boxShadow: 'var(--shadow)' }}
      onClick={() => {
        if (showCheckbox) {
          toggleJobSelection(job.id)
        } else {
          setSelectedJob(job)
        }
      }}
    >
      {/* Header: checkbox/property + status */}
      <div className="flex items-start justify-between mb-2.5">
        <div className="flex items-start gap-2.5 flex-1 min-w-0">
          {showCheckbox && (
            <button
              onClick={(e) => { e.stopPropagation(); toggleJobSelection(job.id) }}
              className="w-6 h-6 rounded-[8px] border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all"
              style={{
                borderColor: selectedJobIds.has(job.id) ? 'var(--t1)' : 'var(--t3)',
                background: selectedJobIds.has(job.id) ? 'var(--t1)' : 'transparent',
              }}
            >
              {selectedJobIds.has(job.id) && <Check size={14} style={{ color: 'var(--bg)' }} strokeWidth={3} />}
            </button>
          )}
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
        </div>
        {!showCheckbox && (
          <div
            className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-[.05em] shrink-0 ml-2"
            style={{ background: STATUS_COLORS[job.status] + '18', color: STATUS_COLORS[job.status] }}
          >
            {t(job.status === 'progress' ? 'inprog' : job.status)}
          </div>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-2">
        <div className="rounded-[12px] p-2 text-center" style={{ background: 'var(--fill)' }}>
          <div className="text-[9px] font-semibold uppercase tracking-[.08em] mb-0.5" style={{ color: 'var(--t3)' }}>{t('price')}</div>
          <div className="text-[14px] font-bold tracking-[-0.3px]" style={{ color: 'var(--t1)' }}>{formatCurrency(getJobTotalRevenue(job))}</div>
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
  )

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
            onClick={() => { setFilter(s); setPartnerFilter(null); setSelectedJobIds(new Set()) }}
          >
            {t(s === 'progress' ? 'inprog' : s)}
            {s === 'done' && doneJobs.length > 0 && (
              <span className="ml-1 opacity-70">({doneJobs.length})</span>
            )}
            {s === 'invoiced' && invoicedJobs.length > 0 && (
              <span className="ml-1 opacity-70">({invoicedJobs.length})</span>
            )}
          </button>
        ))}
      </div>

      {/* Partner sub-filter for "Afgerond" / "Gefactureerd" */}
      {(filter === 'done' || filter === 'invoiced') && filterPartners.length > 0 && (
        <div className="flex gap-1 mb-4 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          <button
            className="px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all shrink-0"
            style={{
              background: !partnerFilter ? 'var(--t1)' : 'var(--fill)',
              color: !partnerFilter ? 'var(--bg)' : 'var(--t3)',
            }}
            onClick={() => { setPartnerFilter(null); setSelectedJobIds(new Set()) }}
          >
            Alle partners
          </button>
          {filterPartners.map(p => {
            const count = filterJobs.filter(j => j.property?.partner_id === p.id).length
            return (
              <button
                key={p.id}
                className="px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all shrink-0"
                style={{
                  background: partnerFilter === p.id ? 'var(--t1)' : 'var(--fill)',
                  color: partnerFilter === p.id ? 'var(--bg)' : 'var(--t3)',
                }}
                onClick={() => { setPartnerFilter(p.id); setSelectedJobIds(new Set()) }}
              >
                {p.name} ({count})
              </button>
            )
          })}
        </div>
      )}

      {/* Select all toggle for delivered + partner filter */}
      {isSelectionMode && filtered.length > 0 && (
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={toggleSelectAll}
            className="flex items-center gap-2 text-[12px] font-semibold"
            style={{ color: 'var(--t2)' }}
          >
            <div
              className="w-5 h-5 rounded-[6px] border-2 flex items-center justify-center transition-all"
              style={{
                borderColor: selectedJobIds.size === filtered.length ? 'var(--t1)' : 'var(--t3)',
                background: selectedJobIds.size === filtered.length ? 'var(--t1)' : 'transparent',
              }}
            >
              {selectedJobIds.size === filtered.length && <Check size={12} style={{ color: 'var(--bg)' }} strokeWidth={3} />}
            </div>
            Alles selecteren ({filtered.length})
          </button>
        </div>
      )}

      {/* Job cards */}
      {filter === 'invoiced' && invoiceGroups.length > 0 ? (
        // Invoiced view: grouped by invoice
        <div className="flex flex-col gap-4 pb-4">
          {invoiceGroups.map((group) => (
            <div key={group.invoiceId ?? 'ungrouped'}>
              {/* Invoice header */}
              {group.invoiceNumber && (
                <div
                  className="rounded-[14px] p-3 mb-2 flex items-center justify-between"
                  style={{ background: 'var(--fill)' }}
                >
                  <div className="flex items-center gap-2">
                    <FileText size={16} style={{ color: STATUS_COLORS.invoiced }} />
                    <div>
                      <div className="text-[13px] font-bold" style={{ color: 'var(--t1)' }}>
                        {group.invoiceNumber}
                      </div>
                      <div className="text-[11px]" style={{ color: 'var(--t3)' }}>
                        {group.createdAt ? formatDate(group.createdAt.split('T')[0]) : ''} · {formatCurrency(group.totalAmount)}
                      </div>
                    </div>
                  </div>
                  {group.pdfUrl && (
                    <a
                      href={group.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
                      style={{ background: STATUS_COLORS.invoiced + '18' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Download size={16} style={{ color: STATUS_COLORS.invoiced }} />
                    </a>
                  )}
                </div>
              )}
              {/* Jobs in this invoice */}
              <div className="flex flex-col gap-2.5">
                {group.jobs.map(job => renderJobCard(job, false))}
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12" style={{ color: 'var(--t3)' }}>
          <div className="text-sm font-semibold" style={{ color: 'var(--t2)' }}>{t('noJobs')}</div>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5" style={{ paddingBottom: isSelectionMode && selectedJobIds.size > 0 ? '90px' : '0' }}>
          {filtered.map(job => renderJobCard(job, isSelectionMode))}
        </div>
      )}

      {/* Floating "Maak factuur" bar */}
      {isSelectionMode && selectedJobIds.size > 0 && (
        <div
          className="fixed bottom-6 left-4 right-4 z-50 rounded-[18px] p-4 flex items-center justify-between"
          style={{
            background: 'var(--t1)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
          }}
        >
          <div>
            <div className="text-[14px] font-bold" style={{ color: 'var(--bg)' }}>
              {selectedJobIds.size} geselecteerd
            </div>
            <div className="text-[12px] opacity-70" style={{ color: 'var(--bg)' }}>
              Totaal: {formatCurrency(selectedTotal)}
            </div>
          </div>
          <button
            onClick={handleCreateInvoice}
            disabled={createInvoice.isPending}
            className="px-5 py-2.5 rounded-[14px] text-[14px] font-bold transition-all flex items-center gap-2"
            style={{
              background: 'var(--bg)',
              color: 'var(--t1)',
              opacity: createInvoice.isPending ? 0.6 : 1,
            }}
          >
            <FileText size={16} />
            {createInvoice.isPending ? 'Bezig...' : 'Maak factuur'}
          </button>
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
