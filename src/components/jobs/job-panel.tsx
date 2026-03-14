'use client'

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useLocale } from '@/lib/i18n'
import { useAuth } from '@/providers/auth-provider'
import { useUpdateJobStatus } from '@/lib/hooks/use-jobs'
import { STATUS_COLORS } from '@/lib/constants'
import { formatCurrency, formatDate } from '@/lib/utils'
import { MapPin, Clock, Car, FileText, Camera, ChevronRight } from 'lucide-react'
import type { Job, JobStatus } from '@/lib/types'
import { useState } from 'react'
import { JobDeliveryForm } from './job-delivery-form'
import { JobPhotos } from './job-photos'

interface JobPanelProps {
  job: Job | null
  open: boolean
  onClose: () => void
}

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
  const [showDelivery, setShowDelivery] = useState(false)
  const [showPhotos, setShowPhotos] = useState(false)

  if (!job) return null

  const isAdmin = user?.role === 'admin'
  const isCleaner = user?.role === 'cleaner'
  const nextStatus = STATUS_FLOW[job.status]

  const getActionLabel = (): string | null => {
    if (job.status === 'planned' && (isAdmin || isCleaner)) return t('start')
    if (job.status === 'progress' && isCleaner) return t('deliver')
    if (job.status === 'delivered' && isAdmin) return t('approve')
    return null
  }

  const handleAction = () => {
    if (job.status === 'progress' && isCleaner) {
      setShowDelivery(true)
      return
    }
    if (!nextStatus) return
    updateStatus.mutate({ id: job.id, status: nextStatus }, {
      onSuccess: onClose,
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
                  {job.cleaner?.name || '—'} · {formatDate(job.date)} · {job.start_time || '—'}
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
            {/* Stats */}
            <div className="grid grid-cols-2 gap-2">
              <StatBox icon={<span className="text-[13px] font-bold" style={{ color: 'var(--green)' }}>€</span>} label={t('price')} value={formatCurrency(job.client_price || 0)} />
              <StatBox icon={<span className="text-[13px] font-bold" style={{ color: 'var(--blue)' }}>€</span>} label={t('payout')} value={formatCurrency(job.cleaner_payout || 0)} />
              <StatBox icon={<Clock size={14} style={{ color: 'var(--amber)' }} />} label={t('hours')} value={job.hours_worked != null ? `${job.hours_worked}h` : '—'} />
              <StatBox icon={<Car size={14} style={{ color: 'var(--t2)' }} />} label={t('km')} value={job.km_driven != null ? `${job.km_driven}` : '—'} />
            </div>

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

            {/* Action button */}
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
