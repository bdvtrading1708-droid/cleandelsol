'use client'

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useLocale } from '@/lib/i18n'
import { useAuth } from '@/providers/auth-provider'
import { useUpdateJobStatus, useDeleteJob } from '@/lib/hooks/use-jobs'
import { STATUS_COLORS } from '@/lib/constants'
import { formatCurrency, formatDate, getJobRevenue, getJobPayout } from '@/lib/utils'
import { MapPin, Clock, Car, FileText, Camera, ChevronRight, Trash2, Pencil, Banknote, CreditCard } from 'lucide-react'
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
  const deleteJob = useDeleteJob()
  const [showDelivery, setShowDelivery] = useState(false)
  const [showPhotos, setShowPhotos] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editPrice, setEditPrice] = useState('')
  const [editPayout, setEditPayout] = useState('')
  const [editKm, setEditKm] = useState('')
  const [editEndTime, setEditEndTime] = useState('')
  const [editExtraCosts, setEditExtraCosts] = useState('')
  const [editPaymentMethod, setEditPaymentMethod] = useState<'cash' | 'bank'>('bank')

  // Reset edit state when job changes
  useEffect(() => {
    if (job) {
      setEditPrice(job.client_price?.toString() || '')
      setEditPayout(job.cleaner_payout?.toString() || '')
      setEditKm(job.km_driven?.toString() || '')
      setEditEndTime(job.end_time?.slice(0, 5) || '')
      setEditExtraCosts(job.extra_costs?.toString() || '')
      setEditPaymentMethod(job.payment_method || 'bank')
      setEditing(false)
    }
  }, [job?.id])

  if (!job) return null

  const isAdmin = user?.role === 'admin'
  const isCleaner = user?.role === 'cleaner'
  const nextStatus = STATUS_FLOW[job.status]

  const getActionLabel = (): string | null => {
    if (job.status === 'planned' && (isAdmin || isCleaner)) return t('start')
    if (job.status === 'progress' && (isAdmin || isCleaner)) return t('deliver')
    if (job.status === 'delivered' && isAdmin) return t('approve')
    return null
  }

  const handleAction = () => {
    // Cleaner: "Starten" bij planned → open direct delivery form (skip progress)
    if (job.status === 'planned' && isCleaner) {
      setShowDelivery(true)
      return
    }
    // Cleaner: "Leveren" bij progress → open delivery form
    if (job.status === 'progress' && isCleaner) {
      setShowDelivery(true)
      return
    }
    // Admin: directe status overgang
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

  const handleSaveEdit = () => {
    // Calculate hours_worked from start_time and editEndTime
    let hours_worked: number | undefined
    if (job.start_time && editEndTime) {
      const [sh, sm] = job.start_time.split(':').map(Number)
      const [eh, em] = editEndTime.split(':').map(Number)
      const diff = (eh * 60 + em) - (sh * 60 + sm)
      hours_worked = diff > 0 ? diff / 60 : undefined
    }

    updateStatus.mutate({
      id: job.id,
      status: job.status,
      client_price: editPrice ? parseFloat(editPrice) : undefined,
      cleaner_payout: editPayout ? parseFloat(editPayout) : undefined,
      km_driven: editKm ? parseFloat(editKm) : undefined,
      end_time: editEndTime || undefined,
      hours_worked,
      extra_costs: editExtraCosts ? parseFloat(editExtraCosts) : 0,
      payment_method: editPaymentMethod,
    }, {
      onSuccess: () => { setEditing(false); onClose() },
    })
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
                  {job.property?.name || '—'}
                </SheetTitle>
                <div className="text-[13px] mt-0.5" style={{ color: 'var(--t3)' }}>
                  {job.cleaner?.name || '—'} · {formatDate(job.date)} · {job.start_time || '—'}{job.end_time ? ` – ${job.end_time}` : ''}
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
            {/* Admin: Status selector - can change to any status */}
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
                <div className="grid grid-cols-2 gap-2">
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
                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-[.08em] mb-1 block" style={{ color: 'var(--t3)' }}>
                      {t('payout')}/uur (€)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={editPayout}
                      onChange={(e) => setEditPayout(e.target.value)}
                      className="w-full h-[42px] rounded-[12px] px-3 text-[14px] font-medium border-0 outline-none"
                      style={{ background: 'var(--inp)', color: 'var(--t1)' }}
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-[.08em] mb-1 block" style={{ color: 'var(--t3)' }}>
                      {t('endTime') || 'Eindtijd'}
                    </label>
                    <input
                      type="time"
                      value={editEndTime}
                      onChange={(e) => setEditEndTime(e.target.value)}
                      className="w-full h-[42px] rounded-[12px] px-3 text-[14px] font-medium border-0 outline-none"
                      style={{ background: 'var(--inp)', color: 'var(--t1)' }}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-[.08em] mb-1 block" style={{ color: 'var(--t3)' }}>
                      {t('km')}
                    </label>
                    <input
                      type="number"
                      step="1"
                      value={editKm}
                      onChange={(e) => setEditKm(e.target.value)}
                      className="w-full h-[42px] rounded-[12px] px-3 text-[14px] font-medium border-0 outline-none"
                      style={{ background: 'var(--inp)', color: 'var(--t1)' }}
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-[.08em] mb-1 block" style={{ color: 'var(--t3)' }}>
                      Extra kosten (€)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={editExtraCosts}
                      onChange={(e) => setEditExtraCosts(e.target.value)}
                      className="w-full h-[42px] rounded-[12px] px-3 text-[14px] font-medium border-0 outline-none"
                      style={{ background: 'var(--inp)', color: 'var(--t1)' }}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-[.08em] mb-1 block" style={{ color: 'var(--t3)' }}>
                      Betaalwijze
                    </label>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => setEditPaymentMethod('bank')}
                        className="flex-1 h-[42px] rounded-[12px] text-[12px] font-semibold transition-all"
                        style={{
                          background: editPaymentMethod === 'bank' ? 'var(--t1)' : 'var(--inp)',
                          color: editPaymentMethod === 'bank' ? 'var(--bg)' : 'var(--t3)',
                        }}
                      >
                        Bank
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditPaymentMethod('cash')}
                        className="flex-1 h-[42px] rounded-[12px] text-[12px] font-semibold transition-all"
                        style={{
                          background: editPaymentMethod === 'cash' ? 'var(--t1)' : 'var(--inp)',
                          color: editPaymentMethod === 'cash' ? 'var(--bg)' : 'var(--t3)',
                        }}
                      >
                        Cash
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditing(false)}
                    className="flex-1 h-[42px] rounded-[12px] text-[13px] font-semibold"
                    style={{ background: 'var(--fill)', color: 'var(--t2)' }}
                  >
                    {t('cancel')}
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    disabled={updateStatus.isPending}
                    className="flex-1 h-[42px] rounded-[12px] text-[13px] font-bold"
                    style={{ background: 'var(--green)', color: '#fff', opacity: updateStatus.isPending ? 0.6 : 1 }}
                  >
                    {updateStatus.isPending ? t('loading') : 'Opslaan'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative">
                {isAdmin && (
                  <button
                    onClick={() => setEditing(true)}
                    className="absolute top-1 right-1 w-7 h-7 rounded-[8px] flex items-center justify-center z-10"
                    style={{ background: 'var(--fill2)', color: 'var(--t3)' }}
                  >
                    <Pencil size={12} />
                  </button>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <StatBox icon={<span className="text-[13px] font-bold" style={{ color: 'var(--green)' }}>€</span>} label={t('price')} value={formatCurrency(getJobRevenue(job))} />
                  <StatBox icon={<span className="text-[13px] font-bold" style={{ color: 'var(--blue)' }}>€</span>} label={t('payout')} value={formatCurrency(getJobPayout(job))} />
                  <StatBox icon={<Clock size={14} style={{ color: 'var(--amber)' }} />} label={t('hours')} value={job.hours_worked != null ? `${job.hours_worked}h` : '—'} />
                  <StatBox icon={<Car size={14} style={{ color: 'var(--t2)' }} />} label={t('km')} value={job.km_driven != null ? `${job.km_driven}` : '—'} />
                </div>
              </div>
            )}

            {/* Extra kosten - always editable */}
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-[.08em] mb-1 block" style={{ color: 'var(--t3)' }}>
                Extra kosten (€)
              </label>
              <input
                type="number"
                step="0.01"
                value={editExtraCosts}
                onChange={(e) => setEditExtraCosts(e.target.value)}
                className="w-full h-[42px] rounded-[14px] px-3.5 text-[14px] font-medium border-0 outline-none"
                style={{ background: 'var(--fill)', color: 'var(--t1)' }}
                placeholder="Bv. parkeerkosten, schoonmaakmiddel..."
              />
            </div>

            {/* Betaalwijze - always editable */}
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-[.08em] mb-1.5 block" style={{ color: 'var(--t3)' }}>
                Betaalwijze
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditPaymentMethod('bank')
                    updateStatus.mutate({ id: job.id, status: job.status, payment_method: 'bank' })
                  }}
                  className="flex-1 h-[42px] rounded-[14px] text-[13px] font-semibold transition-all"
                  style={{
                    background: editPaymentMethod === 'bank' ? 'var(--t1)' : 'var(--fill)',
                    color: editPaymentMethod === 'bank' ? 'var(--bg)' : 'var(--t3)',
                  }}
                >
                  Bank
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditPaymentMethod('cash')
                    updateStatus.mutate({ id: job.id, status: job.status, payment_method: 'cash' })
                  }}
                  className="flex-1 h-[42px] rounded-[14px] text-[13px] font-semibold transition-all"
                  style={{
                    background: editPaymentMethod === 'cash' ? 'var(--t1)' : 'var(--fill)',
                    color: editPaymentMethod === 'cash' ? 'var(--bg)' : 'var(--t3)',
                  }}
                >
                  Cash
                </button>
              </div>
            </div>

            {/* Save extra costs when changed */}
            {editExtraCosts !== (job.extra_costs?.toString() || '') && (
              <button
                onClick={() => {
                  updateStatus.mutate({
                    id: job.id,
                    status: job.status,
                    extra_costs: editExtraCosts ? parseFloat(editExtraCosts) : 0,
                  })
                }}
                disabled={updateStatus.isPending}
                className="w-full h-[38px] rounded-[12px] text-[12px] font-bold transition-all"
                style={{ background: 'var(--green)', color: '#fff', opacity: updateStatus.isPending ? 0.6 : 1 }}
              >
                {updateStatus.isPending ? t('loading') : 'Extra kosten opslaan'}
              </button>
            )}

            {/* Address */}
            {job.property?.address && (
              <button
                onClick={openMaps}
                className="flex items-center gap-2.5 rounded-[14px] p-3 text-left w-full transition-colors"
                style={{ background: 'var(--fill)' }}
              >
                <MapPin size={16} style={{ color: 'var(--blue)' }} />
                <span className="flex-1 text-[13px] font-medium truncate" style={{ color: 'var(--t1)' }}>
                  {job.property.address}
                </span>
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
                <div className="text-[13px] leading-relaxed" style={{ color: 'var(--t2)' }}>
                  {job.notes}
                </div>
              </div>
            )}

            {/* Photos button */}
            <button
              onClick={() => setShowPhotos(true)}
              className="flex items-center gap-2.5 rounded-[14px] p-3 text-left w-full transition-colors"
              style={{ background: 'var(--fill)' }}
            >
              <Camera size={16} style={{ color: 'var(--t2)' }} />
              <span className="flex-1 text-[13px] font-medium" style={{ color: 'var(--t1)' }}>
                {t('photos')}
              </span>
              <span className="text-[12px] font-semibold" style={{ color: 'var(--t3)' }}>
                {job.photos?.length || 0}
              </span>
              <ChevronRight size={14} style={{ color: 'var(--t3)' }} />
            </button>

            {/* Action button (next step) */}
            {actionLabel && (
              <button
                onClick={handleAction}
                disabled={updateStatus.isPending}
                className="w-full h-[50px] rounded-[16px] text-[15px] font-bold tracking-[-0.2px] transition-all"
                style={{
                  background: job.status === 'delivered' ? 'var(--green)' : 'var(--t1)',
                  color: job.status === 'delivered' ? '#fff' : 'var(--bg)',
                  opacity: updateStatus.isPending ? 0.6 : 1,
                }}
              >
                {updateStatus.isPending ? t('loading') : actionLabel}
              </button>
            )}

            {/* Delete button (admin only) */}
            {isAdmin && (
              confirmDelete ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      deleteJob.mutate(job.id, { onSuccess: () => { setConfirmDelete(false); onClose() } })
                    }}
                    disabled={deleteJob.isPending}
                    className="flex-1 h-[44px] rounded-[14px] text-[13px] font-bold transition-all"
                    style={{ background: '#ef4444', color: '#fff', opacity: deleteJob.isPending ? 0.6 : 1 }}
                  >
                    {deleteJob.isPending ? 'Verwijderen...' : 'Ja, verwijderen'}
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="flex-1 h-[44px] rounded-[14px] text-[13px] font-semibold transition-all"
                    style={{ background: 'var(--fill)', color: 'var(--t2)' }}
                  >
                    {t('cancel')}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="w-full h-[44px] rounded-[14px] text-[13px] font-semibold flex items-center justify-center gap-2 transition-all"
                  style={{ background: 'var(--fill)', color: '#ef4444' }}
                >
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
        onSuccess={() => {
          setShowDelivery(false)
          onClose()
        }}
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
