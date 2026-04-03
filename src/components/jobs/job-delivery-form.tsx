'use client'

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useLocale } from '@/lib/i18n'
import { useUpdateJobCleaner } from '@/lib/hooks/use-jobs'
import { useAuth } from '@/providers/auth-provider'
import { useState, useRef } from 'react'
import { Camera, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { Job } from '@/lib/types'

interface Props {
  job: Job
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function JobDeliveryForm({ job, open, onClose, onSuccess }: Props) {
  const { t } = useLocale()
  const { user } = useAuth()
  const updateCleaner = useUpdateJobCleaner()
  const fileRef = useRef<HTMLInputElement>(null)

  // Find this cleaner's assignment
  const myAssignment = (job.cleaners || []).find(jc => jc.cleaner_id === user?.id)
  const myStartTime = myAssignment?.start_time || job.start_time

  const [hoursWorked, setHoursWorked] = useState(myAssignment?.hours_worked?.toString() || '')
  const [endTime, setEndTime] = useState(myAssignment?.end_time?.slice(0, 5) || job.end_time?.slice(0, 5) || '')
  const [km, setKm] = useState(myAssignment?.km_driven?.toString() || '')
  const [extraCosts, setExtraCosts] = useState(myAssignment?.extra_costs?.toString() || '')
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank'>(job.payment_method || 'bank')
  const [notes, setNotes] = useState(job.notes || '')
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [tried, setTried] = useState(false)

  const hoursInvalid = !hoursWorked || parseFloat(hoursWorked) <= 0
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
    if (hoursInvalid || endTimeInvalid || kmInvalid) return

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

      // Update the cleaner's assignment (including per-cleaner extra costs)
      if (myAssignment) {
        await new Promise<void>((resolve, reject) => {
          updateCleaner.mutate({
            id: myAssignment.id,
            end_time: endTime,
            hours_worked: parseFloat(hoursWorked),
            km_driven: parseFloat(km),
            extra_costs: extraCosts ? parseFloat(extraCosts) : 0,
          }, {
            onSuccess: () => resolve(),
            onError: (err) => reject(err),
          })
        })
      }

      // Status transition (planned→progress→delivered) is handled by database trigger
      // Only update payment_method and notes here
      const { error: jobError } = await supabase
        .from('jobs')
        .update({
          payment_method: paymentMethod,
          notes: notes || undefined,
        })
        .eq('id', job.id)
      if (jobError) throw jobError

      onSuccess()
    } catch (err) {
      toast.error('Er ging iets mis bij het opleveren. Probeer opnieuw.')
      console.error('Delivery error:', err)
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
          {myStartTime && (
            <div className="text-[13px] mt-1" style={{ color: 'var(--t3)' }}>
              {t('start')}: {myStartTime.slice(0, 5)}
            </div>
          )}
        </SheetHeader>

        <div className="px-5 pb-5 mt-4 flex flex-col gap-3">
          {/* Hours Worked - REQUIRED */}
          <div>
            <label
              className="text-[11px] font-semibold uppercase tracking-[.08em] mb-1 block"
              style={{ color: tried && hoursInvalid ? '#ef4444' : 'var(--t3)' }}
            >
              Uren gewerkt *
            </label>
            <input
              type="number"
              step="0.5"
              min="0"
              value={hoursWorked}
              onChange={(e) => setHoursWorked(e.target.value)}
              className="w-full h-[46px] rounded-[14px] px-3.5 text-[15px] font-medium border-0 outline-none"
              style={{
                background: 'var(--inp)',
                color: 'var(--t1)',
                border: tried && hoursInvalid ? '2px solid #ef4444' : 'none',
              }}
              placeholder="Bv. 4.5"
            />
            {tried && hoursInvalid && (
              <div className="text-[11px] mt-1 font-medium" style={{ color: '#ef4444' }}>
                Vul het aantal uren in
              </div>
            )}
          </div>

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

          {/* Live calculation summary */}
          {hoursWorked && km && (() => {
            const uurtarief = myAssignment?.cleaner_payout || 0
            const calcHours = parseFloat(hoursWorked) || 0
            const basePayout = uurtarief * (calcHours > 0 ? calcHours : 1)
            const kmVal = parseFloat(km) || 0
            const kmCost = kmVal * 0.10
            const extra = parseFloat(extraCosts) || 0
            const total = basePayout + kmCost + extra
            return (
              <div className="rounded-[14px] p-3.5" style={{ background: 'var(--fill)' }}>
                <div className="text-[10px] font-bold uppercase tracking-[.08em] mb-2" style={{ color: 'var(--t3)' }}>
                  Samenvatting
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[13px]" style={{ color: 'var(--t2)' }}>
                    <span>{calcHours > 0 ? `${Math.round(calcHours * 100) / 100}u` : '1u'} × €{uurtarief}/uur</span>
                    <span className="font-semibold" style={{ color: 'var(--t1)' }}>€{basePayout.toFixed(2)}</span>
                  </div>
                  {kmVal > 0 && (
                    <div className="flex justify-between text-[13px]" style={{ color: 'var(--t2)' }}>
                      <span>{kmVal}km × €0,10/km</span>
                      <span className="font-semibold" style={{ color: 'var(--t1)' }}>€{kmCost.toFixed(2)}</span>
                    </div>
                  )}
                  {extra > 0 && (
                    <div className="flex justify-between text-[13px]" style={{ color: 'var(--t2)' }}>
                      <span>Extra kosten</span>
                      <span className="font-semibold" style={{ color: 'var(--t1)' }}>€{extra.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="border-t mt-1 pt-1.5" style={{ borderColor: 'var(--border)' }}>
                    <div className="flex justify-between text-[14px] font-bold" style={{ color: 'var(--t1)' }}>
                      <span>Totaal uitbetaling</span>
                      <span style={{ color: 'var(--green)' }}>€{total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })()}

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
