'use client'

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useLocale } from '@/lib/i18n'
import { useUpdateJobStatus } from '@/lib/hooks/use-jobs'
import { useState, useRef } from 'react'
import { Camera, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Job } from '@/lib/types'

interface Props {
  job: Job
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function JobDeliveryForm({ job, open, onClose, onSuccess }: Props) {
  const { t } = useLocale()
  const updateStatus = useUpdateJobStatus()
  const fileRef = useRef<HTMLInputElement>(null)

  const [endTime, setEndTime] = useState(job.end_time?.slice(0, 5) || '')
  const [km, setKm] = useState(job.km_driven?.toString() || '')
  const [extraCosts, setExtraCosts] = useState(job.extra_costs?.toString() || '')
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank'>(job.payment_method || 'bank')
  const [notes, setNotes] = useState(job.notes || '')
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [tried, setTried] = useState(false)

  const endTimeInvalid = !endTime
  const kmInvalid = !km || parseFloat(km) < 0

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(prev => [...prev, ...Array.from(e.target.files!)])
    }
  }

  const removeFile = (idx: number) => {
    setFiles(prev => prev.filter((_, i) => i !== idx))
  }

  const handleSubmit = async () => {
    setTried(true)
    if (endTimeInvalid || kmInvalid) return

    setUploading(true)
    try {
      const supabase = createClient()

      // Upload photos
      for (const file of files) {
        const ext = file.name.split('.').pop()
        const path = `jobs/${job.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { error: uploadErr } = await supabase.storage.from('job-photos').upload(path, file)
        if (uploadErr) throw uploadErr

        const { data: { publicUrl } } = supabase.storage.from('job-photos').getPublicUrl(path)
        await supabase.from('job_photos').insert({ job_id: job.id, url: publicUrl })
      }

      // Calculate hours from start_time and end_time
      let hours_worked: number | undefined
      if (job.start_time && endTime) {
        const [sh, sm] = job.start_time.split(':').map(Number)
        const [eh, em] = endTime.split(':').map(Number)
        const diff = (eh * 60 + em) - (sh * 60 + sm)
        hours_worked = diff > 0 ? diff / 60 : undefined
      }

      // Update status to delivered
      updateStatus.mutate({
        id: job.id,
        status: 'delivered',
        end_time: endTime,
        hours_worked,
        km_driven: parseFloat(km),
        extra_costs: extraCosts ? parseFloat(extraCosts) : 0,
        payment_method: paymentMethod,
        notes: notes || undefined,
      }, {
        onSuccess,
      })
    } catch {
      setUploading(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="bottom"
        className="rounded-t-[24px] p-0 max-h-[85vh] overflow-y-auto border-0"
        style={{ background: 'var(--bg2)' }}
      >
        <SheetHeader className="px-5 pt-5 pb-0">
          <SheetTitle className="text-[20px] font-bold tracking-[-0.5px] text-left" style={{ color: 'var(--t1)' }}>
            {t('delivery')}
          </SheetTitle>
          {job.start_time && (
            <div className="text-[13px] mt-1" style={{ color: 'var(--t3)' }}>
              {t('start')}: {job.start_time.slice(0, 5)}
            </div>
          )}
        </SheetHeader>

        <div className="px-5 pb-5 mt-4 flex flex-col gap-3">
          {/* End Time - REQUIRED */}
          <div>
            <label
              className="text-[11px] font-semibold uppercase tracking-[.08em] mb-1 block"
              style={{ color: tried && endTimeInvalid ? '#ef4444' : 'var(--t3)' }}
            >
              {t('endTime') || 'Eindtijd'} *
            </label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full h-[46px] rounded-[14px] px-3.5 text-[15px] font-medium border-0 outline-none"
              style={{
                background: 'var(--inp)',
                color: 'var(--t1)',
                border: tried && endTimeInvalid ? '2px solid #ef4444' : 'none',
              }}
            />
            {tried && endTimeInvalid && (
              <div className="text-[11px] mt-1 font-medium" style={{ color: '#ef4444' }}>
                Vul de eindtijd in
              </div>
            )}
          </div>

          {/* KM - REQUIRED */}
          <div>
            <label
              className="text-[11px] font-semibold uppercase tracking-[.08em] mb-1 block"
              style={{ color: tried && kmInvalid ? '#ef4444' : 'var(--t3)' }}
            >
              {t('kmD')} *
            </label>
            <input
              type="number"
              step="1"
              value={km}
              onChange={(e) => setKm(e.target.value)}
              className="w-full h-[46px] rounded-[14px] px-3.5 text-[15px] font-medium border-0 outline-none"
              style={{
                background: 'var(--inp)',
                color: 'var(--t1)',
                border: tried && kmInvalid ? '2px solid #ef4444' : 'none',
              }}
              placeholder="0"
            />
            {tried && kmInvalid && (
              <div className="text-[11px] mt-1 font-medium" style={{ color: '#ef4444' }}>
                Vul het aantal km in
              </div>
            )}
          </div>

          {/* Extra costs */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[.08em] mb-1 block" style={{ color: 'var(--t3)' }}>
              Extra kosten (€)
            </label>
            <input
              type="number"
              step="0.01"
              value={extraCosts}
              onChange={(e) => setExtraCosts(e.target.value)}
              className="w-full h-[46px] rounded-[14px] px-3.5 text-[15px] font-medium border-0 outline-none"
              style={{ background: 'var(--inp)', color: 'var(--t1)' }}
              placeholder="Bv. parkeerkosten, schoonmaakmiddel..."
            />
          </div>

          {/* Payment method */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[.08em] mb-1.5 block" style={{ color: 'var(--t3)' }}>
              Betaalwijze
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('bank')}
                className="flex-1 h-[46px] rounded-[14px] text-[14px] font-semibold transition-all"
                style={{
                  background: paymentMethod === 'bank' ? 'var(--t1)' : 'var(--inp)',
                  color: paymentMethod === 'bank' ? 'var(--bg)' : 'var(--t3)',
                }}
              >
                Bank
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className="flex-1 h-[46px] rounded-[14px] text-[14px] font-semibold transition-all"
                style={{
                  background: paymentMethod === 'cash' ? 'var(--t1)' : 'var(--inp)',
                  color: paymentMethod === 'cash' ? 'var(--bg)' : 'var(--t3)',
                }}
              >
                Cash
              </button>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[.08em] mb-1 block" style={{ color: 'var(--t3)' }}>
              {t('notes')}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full rounded-[14px] px-3.5 py-3 text-[15px] font-medium border-0 outline-none resize-none"
              style={{ background: 'var(--inp)', color: 'var(--t1)' }}
            />
          </div>

          {/* Photo upload */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[.08em] mb-1 block" style={{ color: 'var(--t3)' }}>
              {t('photos')}
            </label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFiles}
            />
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full h-[80px] rounded-[14px] border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-colors"
              style={{ borderColor: 'var(--border2)', color: 'var(--t3)' }}
            >
              <Camera size={20} />
              <span className="text-[11px] font-semibold">{t('uploadS')}</span>
            </button>

            {/* Preview files */}
            {files.length > 0 && (
              <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
                {files.map((f, i) => (
                  <div key={i} className="relative w-16 h-16 rounded-[10px] overflow-hidden shrink-0" style={{ background: 'var(--fill)' }}>
                    <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => removeFile(i)}
                      className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(0,0,0,0.6)' }}
                    >
                      <X size={10} color="#fff" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={uploading}
            className="w-full h-[50px] rounded-[16px] text-[15px] font-bold tracking-[-0.2px] transition-all mt-1"
            style={{
              background: 'var(--green)',
              color: '#fff',
              opacity: uploading ? 0.6 : 1,
            }}
          >
            {uploading ? t('loading') : t('deliver')}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
