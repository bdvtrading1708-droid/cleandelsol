'use client'

import { useState } from 'react'
import { formatCurrency, getCleanerHours, getCleanerTotalPayout } from '@/lib/utils'
import { useLocale } from '@/lib/i18n'
import { useUpdateJobStatus } from '@/lib/hooks/use-jobs'
import { useCleanerPayments, useCreateCleanerPayment } from '@/lib/hooks/use-cleaner-payments'
import { STATUS_COLORS } from '@/lib/constants'
import { CheckCircle2, Banknote } from 'lucide-react'
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
  const { data: cashPayments = [] } = useCleanerPayments(cleanerId)
  const createPayment = useCreateCleanerPayment()
  const [paidMonthFilter, setPaidMonthFilter] = useState<string>('all')
  const [showCashForm, setShowCashForm] = useState(false)
  const [cashAmount, setCashAmount] = useState('')
  const [cashNote, setCashNote] = useState('')

  const cleanerJobs = jobs.filter(j =>
    (j.cleaners || []).some(jc => jc.cleaner_id === cleanerId) || j.cleaner_id === cleanerId
  )

  const getAssignment = (job: Job): JobCleaner | undefined =>
    (job.cleaners || []).find(jc => jc.cleaner_id === cleanerId)

  // Te betalen
  const unpaidJobs = cleanerJobs
    .filter(j => j.status === 'delivered' || j.status === 'progress')
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  const payableJobs = unpaidJobs.filter(j => j.status === 'delivered')

  // Betaald
  const paidJobs = cleanerJobs
    .filter(j => j.status === 'done' || j.status === 'invoiced')
    .sort((a, b) => ((b.paid_at || b.date || '')).localeCompare(a.paid_at || a.date || ''))

  const monthOptions = Array.from(new Set(
    paidJobs.map(j => {
      const d = j.paid_at || j.date || ''
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
    : paidJobs.filter(j => (j.paid_at || j.date || '').startsWith(paidMonthFilter))

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
              {t('toPay') || 'Te betalen'} ({unpaidJobs.length})
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
                  {isPayable && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        updateStatus.mutate({ id: job.id, status: 'done' })
                      }}
                      disabled={updateStatus.isPending}
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
                  updateStatus.mutate({ id: job.id, status: 'done' })
                })
              }}
              disabled={updateStatus.isPending}
              className="w-full h-[46px] rounded-[16px] text-[14px] font-bold mt-2.5 transition-all active:scale-[0.98]"
              style={{ background: '#00A651', color: '#fff' }}
            >
              {updateStatus.isPending ? t('loading') : (t('allPaid') || 'Alles betaald')}
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
                  onClick={() => {
                    const amount = parseFloat(cashAmount)
                    if (!amount || amount <= 0) return
                    createPayment.mutate({
                      cleaner_id: cleanerId,
                      amount,
                      note: cashNote || 'Cash betaling',
                    }, {
                      onSuccess: () => {
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
                  <div className="text-right shrink-0">
                    <div className="text-[13px] font-bold tracking-[-0.3px]" style={{ color: '#FF9900' }}>
                      {formatCurrency(p.amount)}
                    </div>
                    <div className="text-[8px] font-bold uppercase tracking-[.05em] mt-0.5" style={{ color: '#FF9900' }}>
                      Cash
                    </div>
                  </div>
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
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[13px] font-bold tracking-[-0.3px]" style={{ color: '#00A651' }}>
                      {formatCurrency(payout)}
                    </div>
                    <div className="text-[8px] font-bold uppercase tracking-[.05em] mt-0.5" style={{ color: '#00A651' }}>
                      ✓ {t('markPaid') || 'Betaald'}
                    </div>
                  </div>
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
