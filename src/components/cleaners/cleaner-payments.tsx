'use client'

import { useState } from 'react'
import { formatCurrency, getCleanerHours, getCleanerTotalPayout } from '@/lib/utils'
import { useLocale } from '@/lib/i18n'
import { useUpdateJobStatus, useMarkJobCleanerPaid, useUnmarkJobCleanerPaid } from '@/lib/hooks/use-jobs'
import { useCleanerPayments, useCreateCleanerPayment, useDeleteCleanerPayment } from '@/lib/hooks/use-cleaner-payments'
import { STATUS_COLORS } from '@/lib/constants'
import { CheckCircle2, Banknote, Undo2 } from 'lucide-react'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'
import { nl } from 'date-fns/locale'
import type { Job, JobCleaner } from '@/lib/types'

interface Props {
  cleanerId: string
  jobs: Job[]
}

export function CleanerPayments({ cleanerId, jobs }: Props) {
  const { t, tArray } = useLocale()
  const updateStatus = useUpdateJobStatus()
  const markPaid = useMarkJobCleanerPaid()
  const unmarkPaid = useUnmarkJobCleanerPaid()
  const { data: cashPayments = [] } = useCleanerPayments(cleanerId)
  const createPayment = useCreateCleanerPayment()
  const deletePayment = useDeleteCleanerPayment()
  const [paidMonthFilter, setPaidMonthFilter] = useState<string>('all')
  const [showCashForm, setShowCashForm] = useState(false)
  const [cashAmount, setCashAmount] = useState('')
  const [cashNote, setCashNote] = useState('')

  const cleanerJobs = jobs.filter(j =>
    (j.cleaners || []).some(jc => jc.cleaner_id === cleanerId) || j.cleaner_id === cleanerId
  )

  const getAssignment = (job: Job): JobCleaner | undefined =>
    (job.cleaners || []).find(jc => jc.cleaner_id === cleanerId)

  // Te betalen: this cleaner's assignment is not yet paid
  const unpaidJobs = cleanerJobs
    .filter(j => {
      const my = getAssignment(j)
      return my && !my.paid_at && (j.status === 'delivered' || j.status === 'progress')
    })
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  const payableJobs = unpaidJobs.filter(j => j.status === 'delivered')

  // Calculate outstanding minus cash payments
  const totalUnpaidPayout = unpaidJobs.reduce((s, j) => {
    const my = getAssignment(j)
    return s + (my ? getCleanerTotalPayout(my) : 0)
  }, 0)
  const totalCashPaid = cashPayments.reduce((s, cp) => s + cp.amount, 0)
  const netOutstanding = Math.max(0, totalUnpaidPayout - totalCashPaid)

  // Betaald: this cleaner's assignment has been paid
  const paidJobs = cleanerJobs
    .filter(j => {
      const my = getAssignment(j)
      return my && my.paid_at
    })
    .sort((a, b) => {
      const myA = getAssignment(a)
      const myB = getAssignment(b)
      return ((myB?.paid_at || b.date || '')).localeCompare(myA?.paid_at || a.date || '')
    })

  const monthOptions = Array.from(new Set(
    paidJobs.map(j => {
      const my = getAssignment(j)
      const d = my?.paid_at || j.date || ''
      return d.slice(0, 7)
    }).filter(Boolean)
  )).sort((a, b) => b.localeCompare(a))

  const months = (tArray('months') || []) as string[]
  const formatMonth = (ym: string) => {
    const [y, m] = ym.split('-')
    const mi = parseInt(m, 10) - 1
    return `${months[mi] || m} ${y}`
  }

  const filteredPaid = paidMonthFilter === 'all'
    ? paidJobs
    : paidJobs.filter(j => {
        const my = getAssignment(j)
        return (my?.paid_at || j.date || '').startsWith(paidMonthFilter)
      })

  const filteredTotal = filteredPaid.reduce((s, j) => {
    const my = getAssignment(j)
    return s + (my ? getCleanerTotalPayout(my) : 0)
  }, 0)

  return (
    <div className="flex flex-col gap-4">
      {/* Te betalen */}
      {unpaidJobs.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-[15px] font-bold tracking-[-0.3px]" style={{ color: 'var(--t1)' }}>
              {t('toPay') || 'Te betalen'} — {formatCurrency(netOutstanding)}
              {totalCashPaid > 0 && (
                <span className="text-[11px] font-normal ml-1.5" style={{ color: '#FF9900' }}>
                  (cash: -{formatCurrency(totalCashPaid)})
                </span>
              )}
            </div>
          </div>
          <div className="rounded-[18px] overflow-hidden" style={{ background: 'var(--card)', boxShadow: 'var(--shadow)' }}>
            {unpaidJobs.map((job, i) => {
              const my = getAssignment(job)
              if (!my) return null
              const payout = getCleanerTotalPayout(my)
              const hours = getCleanerHours(my)
              const isPayable = job.status === 'delivered'

              const dateObj = job.date ? parseISO(job.date) : null
              const dayNum = dateObj ? format(dateObj, 'd') : '—'
              const dayName = dateObj ? format(dateObj, 'EEE', { locale: nl }) : ''
              const monthName = dateObj ? format(dateObj, 'MMM', { locale: nl }) : ''

              return (
                <div
                  key={job.id}
                  className="flex items-center gap-3 px-3.5 py-3"
                  style={{ borderBottom: i < unpaidJobs.length - 1 ? '1px solid var(--border)' : 'none' }}
                >
                  {/* Date badge */}
                  <div
                    className="w-[42px] h-[46px] rounded-[10px] flex flex-col items-center justify-center shrink-0"
                    style={{ background: 'var(--fill)' }}
                  >
                    <div className="text-[17px] font-extrabold leading-none tracking-[-0.5px]" style={{ color: 'var(--t1)' }}>
                      {dayNum}
                    </div>
                    <div className="text-[9px] font-semibold uppercase tracking-[.04em] mt-0.5" style={{ color: 'var(--t3)' }}>
                      {monthName}
                    </div>
                  </div>
                  <div className="w-[3px] h-9 rounded-[2px] shrink-0" style={{ background: STATUS_COLORS[job.status] || 'var(--t3)' }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-bold tracking-[-0.2px] truncate" style={{ color: 'var(--t1)' }}>
                      {job.property?.name || job.custom_property_name || '—'}
                    </div>
                    <div className="text-[10px] mt-0.5" style={{ color: 'var(--t3)' }}>
                      {dayName} · {hours}u · {my.km_driven || 0}km
                    </div>
                  </div>
                  <div className="text-right shrink-0 mr-1">
                    <div className="text-[13px] font-bold tracking-[-0.3px]" style={{ color: isPayable ? 'var(--t1)' : '#FF9900' }}>
                      {formatCurrency(payout)}
                    </div>
                    <div className="text-[8px] font-bold uppercase tracking-[.05em] mt-0.5" style={{ color: isPayable ? 'var(--t3)' : '#FF9900' }}>
                      {isPayable ? (t(job.status) || 'Opgeleverd') : (t('inprog') || 'Bezig')}
                    </div>
                  </div>
                  {isPayable && my && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        const note = prompt('Notitie (optioneel, bijv. restant bedrag):')
                        if (note === null) return // cancelled
                        markPaid.mutate({ jobCleanerId: my.id, jobId: job.id, paymentNote: note || undefined })
                      }}
                      disabled={markPaid.isPending}
                      className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all active:scale-95"
                      style={{ background: '#00A651' }}
                    >
                      <CheckCircle2 size={18} className="text-white" />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
          {payableJobs.length > 1 && (
            <button
              onClick={() => {
                payableJobs.forEach(job => {
                  const my = getAssignment(job)
                  if (my) markPaid.mutate({ jobCleanerId: my.id, jobId: job.id })
                })
              }}
              disabled={markPaid.isPending}
              className="w-full h-[46px] rounded-[16px] text-[14px] font-bold mt-2.5 transition-all active:scale-[0.98]"
              style={{ background: '#00A651', color: '#fff' }}
            >
              {markPaid.isPending ? t('loading') : (t('allPaid') || 'Alles betaald')}
            </button>
          )}
        </div>
      )}

      {/* Cash betaling */}
      {unpaidJobs.length > 0 && (
        <div>
          {!showCashForm ? (
            <button
              onClick={() => setShowCashForm(true)}
              className="w-full h-[46px] rounded-[16px] text-[14px] font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              style={{ background: '#FF990015', color: '#FF9900', border: '1px solid #FF990030' }}
            >
              <Banknote size={18} />
              Cash betalen
            </button>
          ) : (
            <div className="rounded-[18px] p-4 flex flex-col gap-2.5" style={{ background: 'var(--card)', boxShadow: 'var(--shadow)' }}>
              <div className="text-[11px] font-semibold uppercase tracking-[.08em]" style={{ color: 'var(--t3)' }}>
                Cash betaling
              </div>
              <input
                type="number"
                step="0.01"
                min="0"
                value={cashAmount}
                onChange={(e) => setCashAmount(e.target.value)}
                placeholder="Bedrag in €"
                className="w-full h-[44px] rounded-[12px] px-3.5 text-[15px] font-medium border-0 outline-none"
                style={{ background: 'var(--fill)', color: 'var(--t1)' }}
              />
              <input
                type="text"
                value={cashNote}
                onChange={(e) => setCashNote(e.target.value)}
                placeholder="Notitie (optioneel)"
                className="w-full h-[44px] rounded-[12px] px-3.5 text-[15px] font-medium border-0 outline-none"
                style={{ background: 'var(--fill)', color: 'var(--t1)' }}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowCashForm(false); setCashAmount(''); setCashNote('') }}
                  className="flex-1 h-[44px] rounded-[14px] text-[13px] font-semibold"
                  style={{ background: 'var(--fill)', color: 'var(--t2)' }}
                >
                  Annuleren
                </button>
                <button
                  onClick={async () => {
                    const amount = parseFloat(cashAmount)
                    if (!amount || amount <= 0) return

                    const remainingAfter = Math.max(0, netOutstanding - amount)

                    createPayment.mutate({
                      cleaner_id: cleanerId,
                      amount,
                      note: cashNote || 'Cash betaling',
                    }, {
                      onSuccess: () => {
                        const msg = remainingAfter > 0
                          ? `Cash betaling: €${amount.toFixed(2)} — Nog €${remainingAfter.toFixed(2)} openstaand`
                          : `Cash betaling: €${amount.toFixed(2)} — Volledig betaald`
                        toast.success(msg)
                        setShowCashForm(false)
                        setCashAmount('')
                        setCashNote('')
                      },
                    })
                  }}
                  disabled={!cashAmount || parseFloat(cashAmount) <= 0 || createPayment.isPending}
                  className="flex-1 h-[44px] rounded-[14px] text-[13px] font-bold"
                  style={{
                    background: '#FF9900',
                    color: '#fff',
                    opacity: (!cashAmount || parseFloat(cashAmount) <= 0 || createPayment.isPending) ? 0.5 : 1,
                  }}
                >
                  {createPayment.isPending ? 'Bezig...' : 'Betalen'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cash betalingen overzicht */}
      {cashPayments.length > 0 && (
        <div>
          <div className="text-[15px] font-bold tracking-[-0.3px] mb-2" style={{ color: 'var(--t1)' }}>
            Betalingen cash ({cashPayments.length})
          </div>
          <div className="rounded-[18px] overflow-hidden" style={{ background: 'var(--card)', boxShadow: 'var(--shadow)' }}>
            {cashPayments.map((p, i) => {
              const dateObj = new Date(p.created_at)
              return (
                <div
                  key={p.id}
                  className="flex items-center gap-3 px-3.5 py-3"
                  style={{ borderBottom: i < cashPayments.length - 1 ? '1px solid var(--border)' : 'none' }}
                >
                  <div
                    className="w-[42px] h-[46px] rounded-[10px] flex flex-col items-center justify-center shrink-0"
                    style={{ background: 'var(--fill)' }}
                  >
                    <div className="text-[17px] font-extrabold leading-none tracking-[-0.5px]" style={{ color: 'var(--t1)' }}>
                      {format(dateObj, 'd')}
                    </div>
                    <div className="text-[9px] font-semibold uppercase tracking-[.04em] mt-0.5" style={{ color: 'var(--t3)' }}>
                      {format(dateObj, 'MMM', { locale: nl })}
                    </div>
                  </div>
                  <div className="w-[3px] h-9 rounded-[2px] shrink-0" style={{ background: '#FF9900' }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-bold tracking-[-0.2px] truncate" style={{ color: 'var(--t1)' }}>
                      {p.note || 'Cash betaling'}
                    </div>
                    <div className="text-[10px] mt-0.5" style={{ color: 'var(--t3)' }}>
                      {format(dateObj, 'EEEE', { locale: nl })}
                    </div>
                  </div>
                  <div className="text-right shrink-0 mr-1">
                    <div className="text-[13px] font-bold tracking-[-0.3px]" style={{ color: '#FF9900' }}>
                      {formatCurrency(p.amount)}
                    </div>
                    <div className="text-[8px] font-bold uppercase tracking-[.05em] mt-0.5" style={{ color: '#FF9900' }}>
                      Cash
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (confirm(`Cash betaling van €${p.amount.toFixed(2)} verwijderen?`)) {
                        deletePayment.mutate(p.id, {
                          onSuccess: () => toast.success(`Cash betaling van €${p.amount.toFixed(2)} verwijderd`)
                        })
                      }
                    }}
                    disabled={deletePayment.isPending}
                    className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all active:scale-95"
                    style={{ background: '#FF3B3015' }}
                  >
                    <Undo2 size={16} style={{ color: '#FF3B30' }} />
                  </button>
                </div>
              )
            })}
          </div>
          <div className="flex items-center justify-between mt-2.5 px-1">
            <div className="text-[12px] font-semibold" style={{ color: 'var(--t3)' }}>Totaal cash</div>
            <div className="text-[15px] font-bold" style={{ color: '#FF9900' }}>
              {formatCurrency(cashPayments.reduce((s, p) => s + p.amount, 0))}
            </div>
          </div>
        </div>
      )}

      {/* Betaald */}
      {paidJobs.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-[15px] font-bold tracking-[-0.3px]" style={{ color: 'var(--t1)' }}>
              {t('markPaid') || 'Betaald'} ({filteredPaid.length})
            </div>
            <select
              value={paidMonthFilter}
              onChange={e => setPaidMonthFilter(e.target.value)}
              className="text-[11px] font-medium rounded-lg px-2 py-1 border-0 outline-none"
              style={{ background: 'var(--fill)', color: 'var(--t2)' }}
            >
              <option value="all">{t('alles') || 'Alle'}</option>
              {monthOptions.map(ym => (
                <option key={ym} value={ym}>{formatMonth(ym)}</option>
              ))}
            </select>
          </div>
          <div className="rounded-[18px] overflow-hidden" style={{ background: 'var(--card)', boxShadow: 'var(--shadow)' }}>
            {filteredPaid.map((job, i) => {
              const my = getAssignment(job)
              if (!my) return null
              const payout = getCleanerTotalPayout(my)
              const hours = getCleanerHours(my)

              const dateObj = job.date ? parseISO(job.date) : null
              const dayNum = dateObj ? format(dateObj, 'd') : '—'
              const dayName = dateObj ? format(dateObj, 'EEE', { locale: nl }) : ''
              const monthName = dateObj ? format(dateObj, 'MMM', { locale: nl }) : ''

              return (
                <div
                  key={job.id}
                  className="flex items-center gap-3 px-3.5 py-3"
                  style={{ borderBottom: i < filteredPaid.length - 1 ? '1px solid var(--border)' : 'none' }}
                >
                  {/* Date badge */}
                  <div
                    className="w-[42px] h-[46px] rounded-[10px] flex flex-col items-center justify-center shrink-0"
                    style={{ background: 'var(--fill)' }}
                  >
                    <div className="text-[17px] font-extrabold leading-none tracking-[-0.5px]" style={{ color: 'var(--t1)' }}>
                      {dayNum}
                    </div>
                    <div className="text-[9px] font-semibold uppercase tracking-[.04em] mt-0.5" style={{ color: 'var(--t3)' }}>
                      {monthName}
                    </div>
                  </div>
                  <div className="w-[3px] h-9 rounded-[2px] shrink-0" style={{ background: '#00A651' }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-bold tracking-[-0.2px] truncate" style={{ color: 'var(--t1)' }}>
                      {job.property?.name || job.custom_property_name || '—'}
                    </div>
                    <div className="text-[10px] mt-0.5" style={{ color: 'var(--t3)' }}>
                      {dayName} · {hours}u · {my.km_driven || 0}km
                    </div>
                    {my.payment_note && (
                      <div className="text-[9px] mt-0.5 italic" style={{ color: '#FF9900' }}>
                        {my.payment_note}
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0 mr-1">
                    <div className="text-[13px] font-bold tracking-[-0.3px]" style={{ color: '#00A651' }}>
                      {formatCurrency(payout)}
                    </div>
                    <div className="text-[8px] font-bold uppercase tracking-[.05em] mt-0.5" style={{ color: '#00A651' }}>
                      ✓ {t('markPaid') || 'Betaald'}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      unmarkPaid.mutate({ jobCleanerId: my.id, jobId: job.id })
                    }}
                    disabled={unmarkPaid.isPending}
                    className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all active:scale-95"
                    style={{ background: '#FF3B3015' }}
                  >
                    <Undo2 size={16} style={{ color: '#FF3B30' }} />
                  </button>
                </div>
              )
            })}
          </div>
          {/* Total */}
          <div className="flex items-center justify-between mt-2.5 px-1">
            <div className="text-[12px] font-semibold" style={{ color: 'var(--t3)' }}>
              {t('totalEarned') || 'Totaal'}
            </div>
            <div className="text-[15px] font-bold" style={{ color: '#00A651' }}>
              {formatCurrency(filteredTotal)}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
