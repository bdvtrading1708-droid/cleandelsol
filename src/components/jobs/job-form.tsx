'use client'

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useLocale } from '@/lib/i18n'
import { useCreateJob } from '@/lib/hooks/use-jobs'
import { useProperties } from '@/lib/hooks/use-properties'
import { useCleaners } from '@/lib/hooks/use-cleaners'
import { useState } from 'react'
import { addDays, format } from 'date-fns'
import { Copy } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
}

export function JobForm({ open, onClose }: Props) {
  const { t } = useLocale()
  const createJob = useCreateJob()
  const { data: properties = [] } = useProperties()
  const { data: cleaners = [] } = useCleaners()

  const [propertyId, setPropertyId] = useState('')
  const [cleanerId, setCleanerId] = useState('')
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [clientPrice, setClientPrice] = useState('')
  const [cleanerPayout, setCleanerPayout] = useState('')
  const [kmDriven, setKmDriven] = useState('')
  const [notes, setNotes] = useState('')
  const [repeatDays, setRepeatDays] = useState(1)

  const reset = () => {
    setPropertyId('')
    setCleanerId('')
    setDate('')
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

    const baseJob = {
      property_id: propertyId,
      cleaner_id: cleanerId,
      date,
      start_time: startTime || undefined,
      end_time: endTime || undefined,
      client_price: clientPrice ? parseFloat(clientPrice) : undefined,
      cleaner_payout: cleanerPayout ? parseFloat(cleanerPayout) : undefined,
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

  // Auto-fill price when property selected
  const handlePropertyChange = (id: string) => {
    setPropertyId(id)
    const prop = properties.find(p => p.id === id)
    if (prop?.default_price && !clientPrice) {
      setClientPrice(prop.default_price.toString())
    }
    if (prop?.fixed_price && !clientPrice) {
      setClientPrice(prop.fixed_price.toString())
    }
  }

  // Auto-fill payout when cleaner selected
  const handleCleanerChange = (id: string) => {
    setCleanerId(id)
    const cl = cleaners.find(c => c.id === id)
    if (cl?.hourly_rate && !cleanerPayout) {
      setCleanerPayout(cl.hourly_rate.toString())
    }
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
                {t('price')} (€)
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
                {t('payout')} (€)
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
