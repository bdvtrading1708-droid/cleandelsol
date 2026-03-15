'use client'

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useLocale } from '@/lib/i18n'
import { useAuth } from '@/providers/auth-provider'
import { useUpdateJobStatus, useUpdateJobCleaner, useDeleteJob } from '@/lib/hooks/use-jobs'
import { STATUS_COLORS, getCleanerColor } from '@/lib/constants'
import { formatCurrency, formatDate, getJobRevenue, getJobPayout, getCleanerPayout, getCleanerTotalPayout, getCleanerHours, getJobKm } from '@/lib/utils'
import { MapPin, Clock, Car, FileText, Camera, ChevronRight, Trash2, Pencil, Users } from 'lucide-react'
import { CleanerAvatar } from '@/components/cleaners/cleaner-avatar'
import type { Job, JobStatus } from '@/lib/types'
import { useState, useEffect } from 'react'
import { JobDeliveryForm } from './job-delivery-form'
import { JobPhotos } from './job-photos'

interface JobPanelProps {
  job: Job | null
  open: boolean
  onClose: () => void
}

const ALL_STATUSES: JobStatus[] = ['planned', 'progress', 'delivered', 'done']

const STATUS_FLOW: Record<JobStatus, JobStatus | null> = {
  planned: 'progress',
  progress: 'delivered',
  delivered: 'done',
  done: null,
}

export function JobPanel({ job, open, onClose }: JobPanelProps) {
  const { t } = useLocale()
  const { user } = useAuth()
  const updateStatus = useUpdateJobStatus()
  const updateCleaner = useUpdateJobCleaner()
  const deleteJob = useDeleteJob()
  const [showDelivery, setShowDelivery] = useState(false)
  const [showPhotos, setShowPhotos] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editPrice, setEditPrice] = useState('')
  const [editExtraCosts, setEditExtraCosts] = useState('')
  const [editPaymentMethod, setEditPaymentMethod] = useState<'cash' | 'bank'>('bank')

  // Per-cleaner edit state
  const [editCleanerPayouts, setEditCleanerPayouts] = useState<Record<number, string>>({})
  const [editCleanerEndTimes, setEditCleanerEndTimes] = useState<Record<number, string>>({})
  const [editCleanerKms, setEditCleanerKms] = useState<Record<number, string>>({})
  const [editCleanerHours, setEditCleanerHours] = useState<Record<number, string>>({})

  // Reset edit state when job changes
  useEffect(() => {
    if (job) {
      setEditPrice(job.client_price?.toString() || '')
      setEditExtraCosts(job.extra_costs?.toString() || '')
      setEditPaymentMethod(job.payment_method || 'bank')
      setEditing(false)

      // Init per-cleaner edit state
      const payouts: Record<number, string> = {}
      const endTimes: Record<number, string> = {}
      const kms: Record<number, string> = {}
      const hours: Record<number, string> = {}
      for (const jc of (job.cleaners || [])) {
        payouts[jc.id] = jc.cleaner_payout?.toString() || ''
        endTimes[jc.id] = jc.end_time?.slice(0, 5) || ''
        kms[jc.id] = jc.km_driven?.toString() || ''
        hours[jc.id] = jc.hours_worked?.toString() || ''
      }
      setEditCleanerPayouts(payouts)
      setEditCleanerEndTimes(endTimes)
      setEditCleanerKms(kms)
      setEditCleanerHours(hours)
    }
  }, [job?.id])

  if (!job) return null

  const isAdmin = user?.role === 'admin'
  const isCleaner = user?.role === 'cleaner'
  const nextStatus = STATUS_FLOW[job.status]
  const cleaners = job.cleaners || []

  const getActionLabel = (): string | null => {
    if (job.status === 'planned' && (isAdmin || isCleaner)) return t('start')
    if (job.status === 'progress' && (isAdmin || isCleaner)) return t('deliver')
    if (job.status === 'delivered' && isAdmin) return t('approve')
    return null
  }

  const handleAction = () => {
    if (job.status === 'planned' && isCleaner) {
      setShowDelivery(true)
      return
    }
    if (job.status === 'progress' && isCleaner) {
      setShowDelivery(true)
      return
    }
    if (!nextStatus) return
    updateStatus.mutate({ id: job.id, status: nextStatus }, {
      onSuccess: onClose,
    })
  }

  const handleStatusChange = (newStatus: JobStatus) => {
    if (newStatus === job.status) return
    updateStatus.mutate({ id: job.id, status: newStatus }, {
      onSuccess: onClose,
    })
  }

  const handleSaveEdit = async () => {
    // Update job-level fields
    updateStatus.mutate({
      id: job.id,
      status: job.status,
      extra_costs: editExtraCosts ? parseFloat(editExtraCosts) : 0,
      payment_method: editPaymentMethod,
    })

    // Update per-cleaner fields
    for (const jc of cleaners) {
      const endTime = editCleanerEndTimes[jc.id]
      const manualHours = editCleanerHours[jc.id] ? parseFloat(editCleanerHours[jc.id]) : undefined
      let hours_worked: number | undefined = manualHours
      // If no manual hours, calculate from times
      if (!hours_worked) {
        const startTime = jc.start_time || job.start_time
        if (startTime && endTime) {
          const [sh, sm] = startTime.split(':').map(Number)
          const [eh, em] = endTime.split(':').map(Number)
          const diff = (eh * 60 + em) - (sh * 60 + sm)
          hours_worked = diff > 0 ? diff / 60 : undefined
        }
      }

      updateCleaner.mutate({
        id: jc.id,
        cleaner_payout: editCleanerPayouts[jc.id] ? parseFloat(editCleanerPayouts[jc.id]) : undefined,
        end_time: endTime || undefined,
        hours_worked,
        km_driven: editCleanerKms[jc.id] ? parseFloat(editCleanerKms[jc.id]) : undefined,
      })
    }

    setEditing(false)
    onClose()
  }

  const actionLabel = getActionLabel()

  const openMaps = () => {
    if (!job.property?.address) return
    const q = encodeURIComponent(job.property.address)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    window.open(isIOS ? `maps://maps.apple.com/?q=${q}` : `https://www.google.com/maps/search/?api=1&query=${q}`, '_blank')
  }

  return (
    <>
      <Sheet open={open && !showDelivery && !showPhotos} onOpenChange={(o) => !o && onClose()}>
        <SheetContent
          side="bottom"
          className="rounded-t-[24px] p-0 max-h-[85vh] overflow-y-auto border-0"
          style={{ background: 'var(--bg2)' }}
        >
          <SheetHeader className="px-5 pt-5 pb-0">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <SheetTitle className="text-[20px] font-bold tracking-[-0.5px] text-left" style={{ color: 'var(--t1)' }}>
                  {job.property?.name || job.custom_property_name || '—'}
                </SheetTitle>
                <div className="text-[13px] mt-0.5" style={{ color: 'var(--t3)' }}>
                  {isCleaner
                    ? (user?.name?.split(' ')[0] || '—')
                    : (cleaners.length > 0
                      ? cleaners.map(jc => jc.cleaner?.name?.split(' ')[0]).join(', ')
                      : job.cleaner?.name || '—')
                  } · {formatDate(job.date)} · {job.start_time?.slice(0, 5) || '—'}{job.end_time ? ` – ${job.end_time.slice(0, 5)}` : ''}
                </div>
              </div>
              <div
                className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-[.05em] shrink-0 ml-3"
                style={{ background: STATUS_COLORS[job.status] + '18', color: STATUS_COLORS[job.status] }}
              >
                {t(job.status === 'progress' ? 'inprog' : job.status)}
              </div>
            </div>
          </SheetHeader>

          <div className="px-5 pb-5 mt-4 flex flex-col gap-3">
            {/* Admin: Status selector */}
            {isAdmin && (
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[.08em] mb-1.5" style={{ color: 'var(--t3)' }}>
                  Status wijzigen
                </div>
                <div className="flex gap-1.5">
                  {ALL_STATUSES.map(s => (
                    <button
                      key={s}
                      onClick={() => handleStatusChange(s)}
                      disabled={updateStatus.isPending}
                      className="flex-1 py-2 rounded-[12px] text-[10px] font-bold uppercase tracking-[.04em] transition-all"
                      style={{
                        background: job.status === s ? STATUS_COLORS[s] : 'var(--fill)',
                        color: job.status === s ? '#fff' : 'var(--t3)',
                        opacity: updateStatus.isPending ? 0.6 : 1,
                      }}
                    >
                      {t(s === 'progress' ? 'inprog' : s)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Stats / Edit mode */}
            {isAdmin && editing ? (
              <div className="flex flex-col gap-2.5">
                {/* Job-level: price */}
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-[.08em] mb-1 block" style={{ color: 'var(--t3)' }}>
                    {t('price')}/uur (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    className="w-full h-[42px] rounded-[12px] px-3 text-[14px] font-medium border-0 outline-none"
                    style={{ background: 'var(--inp)', color: 'var(--t1)' }}
                    placeholder="0"
                  />
                </div>

                {/* Per-cleaner edit */}
                {cleaners.map(jc => {
                  const color = getCleanerColor(jc.cleaner?.name)
                  return (
                    <div key={jc.id} className="rounded-[14px] p-3" style={{ background: color + '08', border: `1px solid ${color}20` }}>
                      <div className="flex items-center gap-2 mb-2">
                        <CleanerAvatar src={jc.cleaner?.avatar_url} name={jc.cleaner?.name || ''} size={22} />
                        <span className="text-[12px] font-semibold" style={{ color: 'var(--t1)' }}>{jc.cleaner?.name?.split(' ')[0]}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] font-semibold uppercase tracking-[.08em] mb-0.5 block" style={{ color: 'var(--t3)' }}>€/uur</label>
                          <input
                            type="number" step="0.01"
                            value={editCleanerPayouts[jc.id] || ''}
                            onChange={(e) => setEditCleanerPayouts(prev => ({ ...prev, [jc.id]: e.target.value }))}
                            className="w-full h-[36px] rounded-[10px] px-2.5 text-[13px] font-medium border-0 outline-none"
                            style={{ background: 'var(--inp)', color: 'var(--t1)' }}
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-semibold uppercase tracking-[.08em] mb-0.5 block" style={{ color: 'var(--t3)' }}>Uren</label>
                          <input
                            type="number" step="0.5" min="0"
                            value={editCleanerHours[jc.id] || ''}
                            onChange={(e) => setEditCleanerHours(prev => ({ ...prev, [jc.id]: e.target.value }))}
                            className="w-full h-[36px] rounded-[10px] px-2.5 text-[13px] font-medium border-0 outline-none"
                            style={{ background: 'var(--inp)', color: 'var(--t1)' }}
                            placeholder="0"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] font-semibold uppercase tracking-[.08em] mb-0.5 block" style={{ color: 'var(--t3)' }}>Eindtijd</label>
                          <input
                            type="time"
                            value={editCleanerEndTimes[jc.id] || ''}
                            onChange={(e) => setEditCleanerEndTimes(prev => ({ ...prev, [jc.id]: e.target.value }))}
                            className="w-full h-[36px] rounded-[10px] px-2.5 text-[13px] font-medium border-0 outline-none"
                            style={{ background: 'var(--inp)', color: 'var(--t1)' }}
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-semibold uppercase tracking-[.08em] mb-0.5 block" style={{ color: 'var(--t3)' }}>KM</label>
                          <input
                            type="number" step="1"
                            value={editCleanerKms[jc.id] || ''}
                            onChange={(e) => setEditCleanerKms(prev => ({ ...prev, [jc.id]: e.target.value }))}
                            className="w-full h-[36px] rounded-[10px] px-2.5 text-[13px] font-medium border-0 outline-none"
                            style={{ background: 'var(--inp)', color: 'var(--t1)' }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}

                {/* Extra kosten + betaalwijze */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-[.08em] mb-1 block" style={{ color: 'var(--t3)' }}>Extra kosten (€)</label>
                    <input
                      type="number" step="0.01"
                      value={editExtraCosts}
                      onChange={(e) => setEditExtraCosts(e.target.value)}
                      className="w-full h-[42px] rounded-[12px] px-3 text-[14px] font-medium border-0 outline-none"
                      style={{ background: 'var(--inp)', color: 'var(--t1)' }}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-[.08em] mb-1 block" style={{ color: 'var(--t3)' }}>Betaalwijze</label>
                    <div className="flex gap-1.5">
                      <button type="button" onClick={() => setEditPaymentMethod('bank')}
                        className="flex-1 h-[42px] rounded-[12px] text-[12px] font-semibold transition-all"
                        style={{ background: editPaymentMethod === 'bank' ? 'var(--t1)' : 'var(--inp)', color: editPaymentMethod === 'bank' ? 'var(--bg)' : 'var(--t3)' }}>
                        Bank
                      </button>
                      <button type="button" onClick={() => setEditPaymentMethod('cash')}
                        className="flex-1 h-[42px] rounded-[12px] text-[12px] font-semibold transition-all"
                        style={{ background: editPaymentMethod === 'cash' ? 'var(--t1)' : 'var(--inp)', color: editPaymentMethod === 'cash' ? 'var(--bg)' : 'var(--t3)' }}>
                        Cash
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button onClick={() => setEditing(false)}
                    className="flex-1 h-[42px] rounded-[12px] text-[13px] font-semibold"
                    style={{ background: 'var(--fill)', color: 'var(--t2)' }}>
                    {t('cancel')}
                  </button>
                  <button onClick={handleSaveEdit} disabled={updateStatus.isPending}
                    className="flex-1 h-[42px] rounded-[12px] text-[13px] font-bold"
                    style={{ background: 'var(--green)', color: '#fff', opacity: updateStatus.isPending ? 0.6 : 1 }}>
                    {updateStatus.isPending ? t('loading') : 'Opslaan'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative">
                {isAdmin && (
                  <button onClick={() => setEditing(true)}
                    className="absolute top-1 right-1 w-7 h-7 rounded-[8px] flex items-center justify-center z-10"
                    style={{ background: 'var(--fill2)', color: 'var(--t3)' }}>
                    <Pencil size={12} />
                  </button>
                )}
                <div className={`grid ${isAdmin ? 'grid-cols-2' : 'grid-cols-1'} gap-2 mb-2`}>
                  {isAdmin && (
                    <StatBox icon={<span className="text-[13px] font-bold" style={{ color: 'var(--green)' }}>€</span>} label={t('price')} value={formatCurrency(getJobRevenue(job))} />
                  )}
                  <StatBox icon={<span className="text-[13px] font-bold" style={{ color: 'var(--blue)' }}>€</span>} label={t('payout')} value={formatCurrency(
                    isCleaner
                      ? (() => { const my = cleaners.find(jc => jc.cleaner_id === user?.id); return my ? getCleanerTotalPayout(my) : 0 })()
                      : getJobPayout(job)
                  )} />
                </div>

                {/* Per-cleaner breakdown */}
                {cleaners.length > 0 && (
                  <div className="flex flex-col gap-1.5 mb-2">
                    {(isCleaner ? cleaners.filter(jc => jc.cleaner_id === user?.id) : cleaners).map(jc => {
                      const color = getCleanerColor(jc.cleaner?.name)
                      const hours = getCleanerHours(jc)
                      return (
                        <div key={jc.id} className="rounded-[12px] px-3 py-2" style={{ background: color + '10' }}>
                          <div className="flex items-center gap-2.5">
                            <CleanerAvatar src={jc.cleaner?.avatar_url} name={jc.cleaner?.name || ''} size={22} />
                            <div className="flex-1 min-w-0">
                              <div className="text-[12px] font-semibold truncate" style={{ color: 'var(--t1)' }}>{jc.cleaner?.name?.split(' ')[0]}</div>
                              <div className="text-[10px]" style={{ color: 'var(--t3)' }}>
                                {jc.start_time?.slice(0, 5) || job.start_time?.slice(0, 5) || '—'}
                                {(jc.end_time || job.end_time) && ` – ${jc.end_time?.slice(0, 5) || job.end_time?.slice(0, 5)}`}
                                {hours > 0 && ` · ${hours}u`}
                                {hours === 0 && jc.end_time && ` – ${jc.end_time.slice(0, 5)}`}
                                {jc.km_driven ? ` · ${jc.km_driven}km` : ''}
                              </div>
                            </div>
                            <div className="text-[13px] font-bold shrink-0" style={{ color }}>
                              {formatCurrency(isCleaner ? getCleanerTotalPayout(jc) : getCleanerPayout(jc))}
                            </div>
                          </div>
                          {/* Inline end time editor for admin */}
                          {isAdmin && (
                            <div className="mt-2 flex items-center gap-2">
                              <label className="text-[9px] font-semibold uppercase tracking-[.08em] shrink-0" style={{ color: 'var(--t3)' }}>Eindtijd</label>
                              <input
                                type="time"
                                value={editCleanerEndTimes[jc.id] || ''}
                                onChange={(e) => {
                                  const newEnd = e.target.value
                                  setEditCleanerEndTimes(prev => ({ ...prev, [jc.id]: newEnd }))
                                  const startTime = jc.start_time || job.start_time
                                  let hours_worked: number | undefined
                                  if (startTime && newEnd) {
                                    const [sh, sm] = startTime.split(':').map(Number)
                                    const [eh, em] = newEnd.split(':').map(Number)
                                    const diff = (eh * 60 + em) - (sh * 60 + sm)
                                    hours_worked = diff > 0 ? diff / 60 : undefined
                                  }
                                  updateCleaner.mutate({
                                    id: jc.id,
                                    end_time: newEnd || undefined,
                                    hours_worked,
                                  })
                                }}
                                className="flex-1 h-[30px] rounded-[8px] px-2 text-[12px] font-medium border-0 outline-none"
                                style={{ background: 'var(--inp)', color: 'var(--t1)', maxWidth: '120px' }}
                              />
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <StatBox icon={<Clock size={14} style={{ color: 'var(--amber)' }} />} label={t('hours')} value={cleaners.length > 0 ? (cleaners.map(jc => getCleanerHours(jc)).filter(h => h > 0).map(h => `${h}u`).join(', ') || '—') : (job.hours_worked != null && job.hours_worked > 0 ? `${job.hours_worked}u` : '—')} />
                  <StatBox icon={<Car size={14} style={{ color: 'var(--t2)' }} />} label={t('km')} value={getJobKm(job) > 0 ? `${getJobKm(job)}` : '—'} />
                </div>
              </div>
            )}

            {/* Extra kosten - admin only (cleaners fill via delivery form) */}
            {isAdmin && (
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-[.08em] mb-1 block" style={{ color: 'var(--t3)' }}>
                  Extra kosten (€)
                </label>
                <input
                  type="number" step="0.01"
                  value={editExtraCosts}
                  onChange={(e) => setEditExtraCosts(e.target.value)}
                  className="w-full h-[42px] rounded-[14px] px-3.5 text-[14px] font-medium border-0 outline-none"
                  style={{ background: 'var(--fill)', color: 'var(--t1)' }}
                  placeholder="Bv. parkeerkosten, schoonmaakmiddel..."
                />
              </div>
            )}

            {/* Betaalwijze - admin only */}
            {isAdmin && (
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-[.08em] mb-1.5 block" style={{ color: 'var(--t3)' }}>
                  Betaalwijze
                </label>
                <div className="flex gap-2">
                  <button type="button"
                    onClick={() => {
                      setEditPaymentMethod('bank')
                      updateStatus.mutate({ id: job.id, status: job.status, payment_method: 'bank' })
                    }}
                    className="flex-1 h-[42px] rounded-[14px] text-[13px] font-semibold transition-all"
                    style={{ background: editPaymentMethod === 'bank' ? 'var(--t1)' : 'var(--fill)', color: editPaymentMethod === 'bank' ? 'var(--bg)' : 'var(--t3)' }}>
                    Bank
                  </button>
                  <button type="button"
                    onClick={() => {
                      setEditPaymentMethod('cash')
                      updateStatus.mutate({ id: job.id, status: job.status, payment_method: 'cash' })
                    }}
                    className="flex-1 h-[42px] rounded-[14px] text-[13px] font-semibold transition-all"
                    style={{ background: editPaymentMethod === 'cash' ? 'var(--t1)' : 'var(--fill)', color: editPaymentMethod === 'cash' ? 'var(--bg)' : 'var(--t3)' }}>
                    Cash
                  </button>
                </div>
              </div>
            )}

            {/* Save extra costs when changed - admin only */}
            {isAdmin && editExtraCosts !== (job.extra_costs?.toString() || '') && (
              <button
                onClick={() => {
                  updateStatus.mutate({ id: job.id, status: job.status, extra_costs: editExtraCosts ? parseFloat(editExtraCosts) : 0 })
                }}
                disabled={updateStatus.isPending}
                className="w-full h-[38px] rounded-[12px] text-[12px] font-bold transition-all"
                style={{ background: 'var(--green)', color: '#fff', opacity: updateStatus.isPending ? 0.6 : 1 }}>
                {updateStatus.isPending ? t('loading') : 'Extra kosten opslaan'}
              </button>
            )}

            {/* Address */}
            {job.property?.address && (
              <button onClick={openMaps}
                className="flex items-center gap-2.5 rounded-[14px] p-3 text-left w-full transition-colors"
                style={{ background: 'var(--fill)' }}>
                <MapPin size={16} style={{ color: 'var(--blue)' }} />
                <span className="flex-1 text-[13px] font-medium truncate" style={{ color: 'var(--t1)' }}>{job.property.address}</span>
                <ChevronRight size={14} style={{ color: 'var(--t3)' }} />
              </button>
            )}

            {/* Notes */}
            {job.notes && (
              <div className="rounded-[14px] p-3" style={{ background: 'var(--fill)' }}>
                <div className="flex items-center gap-2 mb-1.5">
                  <FileText size={14} style={{ color: 'var(--t3)' }} />
                  <span className="text-[11px] font-semibold uppercase tracking-[.08em]" style={{ color: 'var(--t3)' }}>{t('notes')}</span>
                </div>
                <div className="text-[13px] leading-relaxed" style={{ color: 'var(--t2)' }}>{job.notes}</div>
              </div>
            )}

            {/* Photos button */}
            <button onClick={() => setShowPhotos(true)}
              className="flex items-center gap-2.5 rounded-[14px] p-3 text-left w-full transition-colors"
              style={{ background: 'var(--fill)' }}>
              <Camera size={16} style={{ color: 'var(--t2)' }} />
              <span className="flex-1 text-[13px] font-medium" style={{ color: 'var(--t1)' }}>{t('photos')}</span>
              <span className="text-[12px] font-semibold" style={{ color: 'var(--t3)' }}>{job.photos?.length || 0}</span>
              <ChevronRight size={14} style={{ color: 'var(--t3)' }} />
            </button>

            {/* Action button */}
            {actionLabel && (
              <button onClick={handleAction} disabled={updateStatus.isPending}
                className="w-full h-[50px] rounded-[16px] text-[15px] font-bold tracking-[-0.2px] transition-all"
                style={{
                  background: job.status === 'delivered' ? 'var(--green)' : 'var(--t1)',
                  color: job.status === 'delivered' ? '#fff' : 'var(--bg)',
                  opacity: updateStatus.isPending ? 0.6 : 1,
                }}>
                {updateStatus.isPending ? t('loading') : actionLabel}
              </button>
            )}

            {/* Delete button (admin only) */}
            {isAdmin && (
              confirmDelete ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => { deleteJob.mutate(job.id, { onSuccess: () => { setConfirmDelete(false); onClose() } }) }}
                    disabled={deleteJob.isPending}
                    className="flex-1 h-[44px] rounded-[14px] text-[13px] font-bold transition-all"
                    style={{ background: '#ef4444', color: '#fff', opacity: deleteJob.isPending ? 0.6 : 1 }}>
                    {deleteJob.isPending ? 'Verwijderen...' : 'Ja, verwijderen'}
                  </button>
                  <button onClick={() => setConfirmDelete(false)}
                    className="flex-1 h-[44px] rounded-[14px] text-[13px] font-semibold transition-all"
                    style={{ background: 'var(--fill)', color: 'var(--t2)' }}>
                    {t('cancel')}
                  </button>
                </div>
              ) : (
                <button onClick={() => setConfirmDelete(true)}
                  className="w-full h-[44px] rounded-[14px] text-[13px] font-semibold flex items-center justify-center gap-2 transition-all"
                  style={{ background: 'var(--fill)', color: '#ef4444' }}>
                  <Trash2 size={15} />
                  Opdracht verwijderen
                </button>
              )
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Delivery sub-panel */}
      <JobDeliveryForm
        job={job}
        open={showDelivery}
        onClose={() => setShowDelivery(false)}
        onSuccess={() => { setShowDelivery(false); onClose() }}
      />

      {/* Photos sub-panel */}
      <JobPhotos
        job={job}
        open={showPhotos}
        onClose={() => setShowPhotos(false)}
      />
    </>
  )
}

function StatBox({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-[14px] p-3 flex items-center gap-2.5" style={{ background: 'var(--fill)' }}>
      <div className="w-8 h-8 rounded-[10px] flex items-center justify-center" style={{ background: 'var(--fill2)' }}>
        {icon}
      </div>
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-[.08em]" style={{ color: 'var(--t3)' }}>{label}</div>
        <div className="text-[16px] font-bold tracking-[-0.3px]" style={{ color: 'var(--t1)' }}>{value}</div>
      </div>
    </div>
  )
}
