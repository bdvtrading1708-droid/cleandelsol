'use client'

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useLocale } from '@/lib/i18n'
import { useCreateJob } from '@/lib/hooks/use-jobs'
import { useProperties } from '@/lib/hooks/use-properties'
import { useCleaners } from '@/lib/hooks/use-cleaners'
import { useState, useEffect } from 'react'
import { addDays, format } from 'date-fns'
import { Copy } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  defaultDate?: string
}

export function JobForm({ open, onClose, defaultDate }: Props) {
  const { t } = useLocale()
  const createJob = useCreateJob()
  const { data: properties = [] } = useProperties()
  const { data: cleaners = [] } = useCleaners()

  const [propertyId, setPropertyId] = useState('')
  const [cleanerId, setCleanerId] = useState('')
  const [date, setDate] = useState(defaultDate ?? '')
  useEffect(() => { if (open && defaultDate) setDate(defaultDate) }, [open, defaultDate])
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [clientPrice, setClientPrice] = useState('')
  const [cleanerPayout, setCleanerPayout] = useState('')
  const [kmDriven, setKmDriven] = useState('')
  const [notes, setNotes] = useState('')
  const [repeatDays, setRepeatDays] = useState(1)

  // Calculate hours from start/end time
  const calcHours = (start: string, end: string): number => {
    if (!start || !end) return 0
    const [sh, sm] = start.split(':').map(Number)
    const [eh, em] = end.split(':').map(Number)
    const diff = (eh * 60 + em) - (sh * 60 + sm)
    return diff > 0 ? diff / 60 : 0
  }

  const hours = calcHours(startTime, endTime)

  // Check if the selected property uses fixed pricing
  const selectedProp = properties.find(p => p.id === propertyId)
  const isFixedPrice = selectedProp?.pricing_type === 'fixed' || (selectedProp?.fixed_price && !selectedProp?.default_price)

  // Calculate totals: fixed price stays as-is, hourly rate × hours
  const priceNum = parseFloat(clientPrice) || 0
  const payoutNum = parseFloat(cleanerPayout) || 0
  const totalPrice = isFixedPrice ? priceNum : (hours > 0 ? priceNum * hours : priceNum)
  const totalPayout = hours > 0 ? payoutNum * hours : payoutNum

  const reset = () => {
    setPropertyId('')
    setCleanerId('')
    setDate(defaultDate ?? '')
    setStartTime('')
    setEndTime('')
    setClientPrice('')
    setCleanerPayout('')
    setKmDriven('')
    setNotes('')
    setRepeatDays(1)
  }

  const handleSubmit = () => {
    if (!propertyId || !cleanerId || !date) return

    // Store the hourly RATE — display pages calculate total (rate × hours)
    const baseJob = {
      property_id: propertyId,
      cleaner_id: cleanerId,
      date,
      start_time: startTime || undefined,
      end_time: endTime || undefined,
      client_price: clientPrice ? parseFloat(clientPrice) : undefined,
      cleaner_payout: cleanerPayout ? parseFloat(cleanerPayout) : undefined,
      hours_worked: hours > 0 ? hours : undefined,
      km_driven: kmDriven ? parseFloat(kmDriven) : undefined,
      notes: notes || undefined,
    }

    if (repeatDays <= 1) {
      createJob.mutate(baseJob, {
        onSuccess: () => { reset(); onClose() },
      })
    } else {
      const baseDate = new Date(date + 'T00:00:00')
      const jobs = Array.from({ length: repeatDays }, (_, i) => ({
        ...baseJob,
        date: format(addDays(baseDate, i), 'yyyy-MM-dd'),
      }))
      createJob.mutate(jobs, {
        onSuccess: () => { reset(); onClose() },
      })
    }
  }

  // Auto-fill rate when property selected
  const handlePropertyChange = (id: string) => {
    setPropertyId(id)
    const prop = properties.find(p => p.id === id)
    if (prop?.fixed_price) {
      setClientPrice(prop.fixed_price.toString())
    } else if (prop?.default_price) {
      setClientPrice(prop.default_price.toString())
    }
  }

  // Auto-fill rate when cleaner selected
  const handleCleanerChange = (id: string) => {
    setCleanerId(id)
    const cl = cleaners.find(c => c.id === id)
    setCleanerPayout(cl?.hourly_rate ? cl.hourly_rate.toString() : '')
  }

  const inputStyle = { background: 'var(--inp)', color: 'var(--t1)' }

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) { reset(); onClose() } }}>
      <SheetContent
        side="bottom"
        className="rounded-t-[24px] p-0 max-h-[85vh] overflow-y-auto border-0"
        style={{ background: 'var(--bg2)' }}
      >
        <SheetHeader className="px-5 pt-5 pb-0">
          <SheetTitle className="text-[20px] font-bold tracking-[-0.5px] text-left" style={{ color: 'var(--t1)' }}>
            {t('create')} {t('jobs').toLowerCase()}
          </SheetTitle>
        </SheetHeader>

        <div className="px-5 pb-5 mt-4 flex flex-col gap-3">
          {/* Property */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[.08em] mb-1 block" style={{ color: 'var(--t3)' }}>
              {t('props')}
            </label>
            <select
              value={propertyId}
              onChange={(e) => handlePropertyChange(e.target.value)}
              className="w-full h-[46px] rounded-[14px] px-3.5 text-[15px] font-medium border-0 outline-none appearance-none"
              style={inputStyle}
            >
              <option value="">—</option>
              {properties.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Cleaner */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[.08em] mb-1 block" style={{ color: 'var(--t3)' }}>
              {t('cleaners')}
            </label>
            <select
              value={cleanerId}
              onChange={(e) => handleCleanerChange(e.target.value)}
              className="w-full h-[46px] rounded-[14px] px-3.5 text-[15px] font-medium border-0 outline-none appearance-none"
              style={inputStyle}
            >
              <option value="">—</option>
              {cleaners.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[.08em] mb-1 block" style={{ color: 'var(--t3)' }}>
              Datum
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full h-[46px] rounded-[14px] px-3.5 text-[15px] font-medium border-0 outline-none"
              style={inputStyle}
            />
          </div>

          {/* Start + End time row */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[.08em] mb-1 block" style={{ color: 'var(--t3)' }}>
                {t('startT')}
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full h-[46px] rounded-[14px] px-3.5 text-[15px] font-medium border-0 outline-none"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[.08em] mb-1 block" style={{ color: 'var(--t3)' }}>
                {t('endT')}
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full h-[46px] rounded-[14px] px-3.5 text-[15px] font-medium border-0 outline-none"
                style={inputStyle}
              />
            </div>
          </div>

          {/* Price + Payout row */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[.08em] mb-1 block" style={{ color: 'var(--t3)' }}>
                {isFixedPrice ? `${t('price')} (€)` : `${t('price')}/uur (€)`}
              </label>
              <input
                type="number"
                step="0.01"
                value={clientPrice}
                onChange={(e) => setClientPrice(e.target.value)}
                className="w-full h-[46px] rounded-[14px] px-3.5 text-[15px] font-medium border-0 outline-none"
                style={inputStyle}
                placeholder="0"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[.08em] mb-1 block" style={{ color: 'var(--t3)' }}>
                {t('payout')}/uur (€)
              </label>
              <input
                type="number"
                step="0.01"
                value={cleanerPayout}
                onChange={(e) => setCleanerPayout(e.target.value)}
                className="w-full h-[46px] rounded-[14px] px-3.5 text-[15px] font-medium border-0 outline-none"
                style={inputStyle}
                placeholder="0"
              />
            </div>
          </div>

          {/* Totaal overview - shown when hours are calculated */}
          {hours > 0 && (priceNum > 0 || payoutNum > 0) && (
            <div className="rounded-[14px] p-3 flex flex-col gap-1" style={{ background: 'var(--inp)' }}>
              <div className="flex justify-between items-center">
                <span className="text-[12px] font-medium" style={{ color: 'var(--t3)' }}>
                  {isFixedPrice ? `Vast tarief` : `${hours}u × €${priceNum}`}
                </span>
                <span className="text-[15px] font-bold" style={{ color: 'var(--t1)' }}>
                  Totaal: €{totalPrice.toFixed(2).replace(/\.00$/, '')}
                </span>
              </div>
              {payoutNum > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-[12px] font-medium" style={{ color: 'var(--t3)' }}>
                    {hours}u × €{payoutNum}
                  </span>
                  <span className="text-[13px] font-semibold" style={{ color: 'var(--t2)' }}>
                    Uitbetaling: €{totalPayout.toFixed(2).replace(/\.00$/, '')}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* KM driven */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[.08em] mb-1 block" style={{ color: 'var(--t3)' }}>
              {t('kmD')} (€0,10/km)
            </label>
            <input
              type="number"
              step="1"
              value={kmDriven}
              onChange={(e) => setKmDriven(e.target.value)}
              className="w-full h-[46px] rounded-[14px] px-3.5 text-[15px] font-medium border-0 outline-none"
              style={inputStyle}
              placeholder="0"
            />
          </div>

          {/* Repeat days */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[.08em] mb-1 block" style={{ color: 'var(--t3)' }}>
              <Copy size={11} className="inline mr-1" style={{ verticalAlign: 'middle' }} />
              {t('repeatJob')}
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setRepeatDays(Math.max(1, repeatDays - 1))}
                className="w-[46px] h-[46px] rounded-[14px] text-[18px] font-bold flex items-center justify-center"
                style={{ background: 'var(--inp)', color: 'var(--t2)' }}
              >
                −
              </button>
              <div
                className="flex-1 h-[46px] rounded-[14px] flex items-center justify-center text-[15px] font-bold"
                style={{ background: 'var(--inp)', color: 'var(--t1)' }}
              >
                {repeatDays} {repeatDays === 1 ? t('dag').toLowerCase() : t('repeatDays')}
              </div>
              <button
                type="button"
                onClick={() => setRepeatDays(Math.min(30, repeatDays + 1))}
                className="w-[46px] h-[46px] rounded-[14px] text-[18px] font-bold flex items-center justify-center"
                style={{ background: 'var(--inp)', color: 'var(--t2)' }}
              >
                +
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
              rows={2}
              className="w-full rounded-[14px] px-3.5 py-3 text-[15px] font-medium border-0 outline-none resize-none"
              style={inputStyle}
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-2 mt-1">
            <button
              onClick={() => { reset(); onClose() }}
              className="flex-1 h-[50px] rounded-[16px] text-[15px] font-bold"
              style={{ background: 'var(--fill)', color: 'var(--t2)' }}
            >
              {t('cancel')}
            </button>
            <button
              onClick={handleSubmit}
              disabled={!propertyId || !cleanerId || !date || createJob.isPending}
              className="flex-1 h-[50px] rounded-[16px] text-[15px] font-bold transition-all"
              style={{
                background: 'var(--t1)',
                color: 'var(--bg)',
                opacity: (!propertyId || !cleanerId || !date || createJob.isPending) ? 0.4 : 1,
              }}
            >
              {createJob.isPending ? t('loading') : t('create')}
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
