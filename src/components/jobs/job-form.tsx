'use client'

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useLocale } from '@/lib/i18n'
import { useCreateJob } from '@/lib/hooks/use-jobs'
import { useProperties } from '@/lib/hooks/use-properties'
import { useCleaners } from '@/lib/hooks/use-cleaners'
import { useState, useEffect, useRef } from 'react'
import { addDays, format } from 'date-fns'
import { Copy, X, ChevronDown, ChevronUp, Search } from 'lucide-react'
import { CleanerAvatar } from '@/components/cleaners/cleaner-avatar'
import { getCleanerColor } from '@/lib/constants'

interface SelectedCleaner {
  cleaner_id: string
  name: string
  avatar_url?: string
  payout: string
  start_time: string
  end_time: string
}

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
  const [customPropertyName, setCustomPropertyName] = useState('')
  const [propertySearch, setPropertySearch] = useState('')
  const [showPropertyDropdown, setShowPropertyDropdown] = useState(false)
  const [pricingType, setPricingType] = useState<'hourly' | 'fixed'>('hourly')
  const propertyInputRef = useRef<HTMLInputElement>(null)
  const propertyDropdownRef = useRef<HTMLDivElement>(null)

  const [selectedCleaners, setSelectedCleaners] = useState<SelectedCleaner[]>([])
  const [date, setDate] = useState(defaultDate ?? '')
  useEffect(() => { if (open && defaultDate) setDate(defaultDate) }, [open, defaultDate])
  const [startTime, setStartTimeRaw] = useState('')
  const [endTime, setEndTimeRaw] = useState('')

  // Sync cleaner times when main times change
  const setStartTime = (val: string) => {
    const old = startTime
    setStartTimeRaw(val)
    setSelectedCleaners(prev => prev.map(sc =>
      (!sc.start_time || sc.start_time === old) ? { ...sc, start_time: val } : sc
    ))
  }
  const setEndTime = (val: string) => {
    const old = endTime
    setEndTimeRaw(val)
    setSelectedCleaners(prev => prev.map(sc =>
      (!sc.end_time || sc.end_time === old) ? { ...sc, end_time: val } : sc
    ))
  }
  const [clientPrice, setClientPrice] = useState('')
  const [kmDriven, setKmDriven] = useState('')
  const [notes, setNotes] = useState('')
  const [repeatDays, setRepeatDays] = useState(1)
  const [showCleanerPicker, setShowCleanerPicker] = useState(false)
  const [expandedCleaner, setExpandedCleaner] = useState<string | null>(null)

  // Calculate hours from start/end time
  const calcHours = (start: string, end: string): number => {
    if (!start || !end) return 0
    const [sh, sm] = start.split(':').map(Number)
    const [eh, em] = end.split(':').map(Number)
    const diff = (eh * 60 + em) - (sh * 60 + sm)
    return diff > 0 ? diff / 60 : 0
  }

  const hours = calcHours(startTime, endTime)

  const isFixedPrice = pricingType === 'fixed'

  // Calculate totals
  const priceNum = parseFloat(clientPrice) || 0
  const totalCleanerHours = selectedCleaners.length > 0
    ? selectedCleaners.reduce((sum, sc) => sum + calcHours(sc.start_time || startTime, sc.end_time || endTime), 0)
    : hours
  const totalPrice = isFixedPrice ? priceNum : (totalCleanerHours > 0 ? priceNum * totalCleanerHours : priceNum)
  const totalPayout = selectedCleaners.reduce((sum, sc) => {
    const payoutNum = parseFloat(sc.payout) || 0
    const cleanerHours = calcHours(sc.start_time || startTime, sc.end_time || endTime)
    return sum + (cleanerHours > 0 ? payoutNum * cleanerHours : payoutNum)
  }, 0)

  // Filter properties based on search
  const filteredProperties = properties.filter(p =>
    p.name.toLowerCase().includes(propertySearch.toLowerCase())
  )
  const hasExactMatch = properties.some(p => p.name.toLowerCase() === propertySearch.toLowerCase())

  // The display name for the selected property
  const selectedPropertyName = propertyId
    ? properties.find(p => p.id === propertyId)?.name || ''
    : customPropertyName

  const hasProperty = !!propertyId || !!customPropertyName

  const reset = () => {
    setPropertyId('')
    setCustomPropertyName('')
    setPropertySearch('')
    setShowPropertyDropdown(false)
    setPricingType('hourly')
    setSelectedCleaners([])
    setDate(defaultDate ?? '')
    setStartTime('')
    setEndTime('')
    setClientPrice('')
    setKmDriven('')
    setNotes('')
    setRepeatDays(1)
    setShowCleanerPicker(false)
    setExpandedCleaner(null)
  }

  const handleSubmit = () => {
    if ((!propertyId && !customPropertyName) || selectedCleaners.length === 0 || !date) return

    const baseJob = {
      property_id: propertyId || undefined,
      custom_property_name: !propertyId ? customPropertyName : undefined,
      pricing_type: pricingType,
      date,
      start_time: startTime || undefined,
      end_time: endTime || undefined,
      client_price: clientPrice ? parseFloat(clientPrice) : undefined,
      notes: notes || undefined,
      cleaners: selectedCleaners.map(sc => {
        const cStart = sc.start_time || startTime
        const cEnd = sc.end_time || endTime
        const cHours = calcHours(cStart, cEnd)
        return {
          cleaner_id: sc.cleaner_id,
          cleaner_payout: sc.payout ? parseFloat(sc.payout) : undefined,
          start_time: cStart || undefined,
          end_time: cEnd || undefined,
          hours_worked: cHours > 0 ? cHours : undefined,
          km_driven: kmDriven ? parseFloat(kmDriven) : undefined,
        }
      }),
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

  // Select a property from the dropdown
  const handlePropertySelect = (id: string) => {
    setPropertyId(id)
    setCustomPropertyName('')
    const prop = properties.find(p => p.id === id)
    if (prop) {
      setPropertySearch(prop.name)
      // Set pricing type from property
      if (prop.pricing_type === 'fixed' || (prop.fixed_price && !prop.default_price)) {
        setPricingType('fixed')
      } else {
        setPricingType('hourly')
      }
      // Auto-fill price
      if (prop.fixed_price) {
        setClientPrice(prop.fixed_price.toString())
      } else if (prop.default_price) {
        setClientPrice(prop.default_price.toString())
      }
    }
    setShowPropertyDropdown(false)
  }

  // Use custom property name (not in database)
  const handleCustomProperty = (name: string) => {
    setPropertyId('')
    setCustomPropertyName(name)
    setPropertySearch(name)
    setShowPropertyDropdown(false)
    // Default to hourly pricing for custom properties
    setPricingType('hourly')
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        propertyDropdownRef.current &&
        !propertyDropdownRef.current.contains(e.target as Node) &&
        propertyInputRef.current &&
        !propertyInputRef.current.contains(e.target as Node)
      ) {
        setShowPropertyDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Toggle cleaner selection
  const toggleCleaner = (cleanerId: string) => {
    const existing = selectedCleaners.find(sc => sc.cleaner_id === cleanerId)
    if (existing) {
      setSelectedCleaners(prev => prev.filter(sc => sc.cleaner_id !== cleanerId))
    } else {
      const cl = cleaners.find(c => c.id === cleanerId)
      if (cl) {
        setSelectedCleaners(prev => [...prev, {
          cleaner_id: cl.id,
          name: cl.name,
          avatar_url: cl.avatar_url,
          payout: cl.hourly_rate?.toString() || '',
          start_time: startTime,
          end_time: endTime,
        }])
      }
    }
  }

  // Update cleaner-specific payout
  const updateCleanerPayout = (cleanerId: string, payout: string) => {
    setSelectedCleaners(prev => prev.map(sc =>
      sc.cleaner_id === cleanerId ? { ...sc, payout } : sc
    ))
  }

  // Update cleaner-specific times
  const updateCleanerTime = (cleanerId: string, field: 'start_time' | 'end_time', value: string) => {
    setSelectedCleaners(prev => prev.map(sc =>
      sc.cleaner_id === cleanerId ? { ...sc, [field]: value } : sc
    ))
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
          {/* Property - Searchable */}
          <div className="relative">
            <label className="text-[11px] font-semibold uppercase tracking-[.08em] mb-1 block" style={{ color: 'var(--t3)' }}>
              {t('props')}
            </label>
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--t3)' }} />
              <input
                ref={propertyInputRef}
                type="text"
                value={showPropertyDropdown ? propertySearch : selectedPropertyName}
                onChange={(e) => {
                  setPropertySearch(e.target.value)
                  if (!showPropertyDropdown) setShowPropertyDropdown(true)
                  // If the user clears or changes text, clear the selected property
                  if (propertyId) {
                    const prop = properties.find(p => p.id === propertyId)
                    if (prop && e.target.value !== prop.name) {
                      setPropertyId('')
                      setCustomPropertyName('')
                    }
                  }
                }}
                onFocus={() => {
                  setShowPropertyDropdown(true)
                  setPropertySearch(selectedPropertyName)
                }}
                className="w-full h-[46px] rounded-[14px] pl-10 pr-3.5 text-[15px] font-medium border-0 outline-none"
                style={inputStyle}
                placeholder="Zoek of typ property naam..."
              />
              {(propertyId || customPropertyName) && (
                <button
                  type="button"
                  onClick={() => {
                    setPropertyId('')
                    setCustomPropertyName('')
                    setPropertySearch('')
                    setClientPrice('')
                    setPricingType('hourly')
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ background: 'var(--fill)', color: 'var(--t3)' }}
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Property dropdown */}
            {showPropertyDropdown && (
              <div
                ref={propertyDropdownRef}
                className="absolute left-0 right-0 mt-1.5 rounded-[14px] overflow-hidden max-h-[240px] overflow-y-auto z-50"
                style={{ background: 'var(--bg2)', border: '1px solid var(--border)', boxShadow: '0 8px 30px rgba(0,0,0,0.25)' }}
              >
                {filteredProperties.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handlePropertySelect(p.id)}
                    className="w-full flex items-center gap-3 px-3.5 py-3 text-left transition-colors"
                    style={{ borderBottom: '1px solid var(--border)' }}
                  >
                    <span className="flex-1 text-[14px] font-medium" style={{ color: 'var(--t1)' }}>{p.name}</span>
                    <span className="text-[11px] font-medium" style={{ color: 'var(--t3)' }}>
                      {p.pricing_type === 'fixed' ? `€${p.fixed_price || 0} vast` : `€${p.default_price || 0}/u`}
                    </span>
                  </button>
                ))}
                {/* Option to use custom name */}
                {propertySearch.trim() && !hasExactMatch && (
                  <button
                    type="button"
                    onClick={() => handleCustomProperty(propertySearch.trim())}
                    className="w-full flex items-center gap-3 px-3.5 py-3 text-left"
                    style={{ borderBottom: '1px solid var(--border)', background: 'var(--fill)' }}
                  >
                    <span className="text-[14px] font-medium" style={{ color: 'var(--acc)' }}>
                      + &ldquo;{propertySearch.trim()}&rdquo; als eenmalige klant
                    </span>
                  </button>
                )}
                {filteredProperties.length === 0 && !propertySearch.trim() && (
                  <div className="px-3.5 py-3 text-[13px]" style={{ color: 'var(--t3)' }}>Geen properties gevonden</div>
                )}
              </div>
            )}
          </div>

          {/* Pricing type toggle */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[.08em] mb-1 block" style={{ color: 'var(--t3)' }}>
              Tarief type
            </label>
            <div className="flex rounded-[14px] overflow-hidden" style={{ background: 'var(--inp)' }}>
              <button
                type="button"
                onClick={() => setPricingType('hourly')}
                className="flex-1 h-[42px] text-[14px] font-semibold transition-all"
                style={{
                  background: pricingType === 'hourly' ? 'var(--t1)' : 'transparent',
                  color: pricingType === 'hourly' ? 'var(--bg)' : 'var(--t3)',
                  borderRadius: '14px',
                }}
              >
                Per uur
              </button>
              <button
                type="button"
                onClick={() => setPricingType('fixed')}
                className="flex-1 h-[42px] text-[14px] font-semibold transition-all"
                style={{
                  background: pricingType === 'fixed' ? 'var(--t1)' : 'transparent',
                  color: pricingType === 'fixed' ? 'var(--bg)' : 'var(--t3)',
                  borderRadius: '14px',
                }}
              >
                Vast tarief
              </button>
            </div>
          </div>

          {/* Cleaners - Multi-select */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[.08em] mb-1 block" style={{ color: 'var(--t3)' }}>
              {t('cleaners')}
            </label>

            {/* Selected cleaners chips */}
            {selectedCleaners.length > 0 && (
              <div className="flex flex-col gap-1.5 mb-2">
                {selectedCleaners.map(sc => {
                  const color = getCleanerColor(sc.name)
                  const isExpanded = expandedCleaner === sc.cleaner_id
                  const cleanerHours = calcHours(sc.start_time || startTime, sc.end_time || endTime)
                  const payoutNum = parseFloat(sc.payout) || 0

                  return (
                    <div key={sc.cleaner_id} className="rounded-[14px] overflow-hidden" style={{ background: color + '12', border: `1px solid ${color}30` }}>
                      {/* Chip header */}
                      <div className="flex items-center gap-2 px-3 py-2">
                        <CleanerAvatar src={sc.avatar_url} name={sc.name} size={24} />
                        <span className="text-[13px] font-semibold flex-1" style={{ color: 'var(--t1)' }}>
                          {sc.name.split(' ')[0]}
                        </span>
                        <span className="text-[11px] font-medium" style={{ color: 'var(--t3)' }}>
                          €{sc.payout || '0'}/u
                          {cleanerHours > 0 && payoutNum > 0 && ` = €${(payoutNum * cleanerHours).toFixed(2).replace(/\.00$/, '')}`}
                        </span>
                        <button
                          type="button"
                          onClick={() => setExpandedCleaner(isExpanded ? null : sc.cleaner_id)}
                          className="w-6 h-6 rounded-full flex items-center justify-center"
                          style={{ color: 'var(--t3)' }}
                        >
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleCleaner(sc.cleaner_id)}
                          className="w-6 h-6 rounded-full flex items-center justify-center"
                          style={{ background: color + '20', color }}
                        >
                          <X size={12} />
                        </button>
                      </div>

                      {/* Expanded: per-cleaner settings */}
                      {isExpanded && (
                        <div className="px-3 pb-3 flex flex-col gap-2">
                          <div>
                            <label className="text-[10px] font-semibold uppercase tracking-[.08em] mb-0.5 block" style={{ color: 'var(--t3)' }}>
                              {t('payout')}/uur (€)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={sc.payout}
                              onChange={(e) => updateCleanerPayout(sc.cleaner_id, e.target.value)}
                              className="w-full h-[38px] rounded-[10px] px-3 text-[14px] font-medium border-0 outline-none"
                              style={inputStyle}
                              placeholder="0"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] font-semibold uppercase tracking-[.08em] mb-0.5 block" style={{ color: 'var(--t3)' }}>
                                {t('startT')}
                              </label>
                              <input
                                type="time"
                                value={sc.start_time}
                                onChange={(e) => updateCleanerTime(sc.cleaner_id, 'start_time', e.target.value)}
                                className="w-full h-[38px] rounded-[10px] px-3 text-[14px] font-medium border-0 outline-none"
                                style={inputStyle}
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-semibold uppercase tracking-[.08em] mb-0.5 block" style={{ color: 'var(--t3)' }}>
                                {t('endT')}
                              </label>
                              <div className="relative">
                                <input
                                  type="time"
                                  value={sc.end_time}
                                  onChange={(e) => updateCleanerTime(sc.cleaner_id, 'end_time', e.target.value)}
                                  className="w-full h-[38px] rounded-[10px] px-3 text-[14px] font-medium border-0 outline-none"
                                  style={{ ...inputStyle, ...(sc.end_time ? {} : { color: 'transparent' }) }}
                                />
                                {!sc.end_time && (
                                  <span
                                    className="absolute inset-0 flex items-center px-3 text-[12px] font-medium pointer-events-none"
                                    style={{ color: 'var(--t3)' }}
                                  >
                                    Kies eindtijd
                                  </span>
                                )}
                                {sc.end_time && (
                                  <button
                                    type="button"
                                    onClick={() => updateCleanerTime(sc.cleaner_id, 'end_time', '')}
                                    className="absolute right-1.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center"
                                    style={{ background: 'var(--fill)', color: 'var(--t3)' }}
                                  >
                                    <X size={10} />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Add cleaner button / picker */}
            <button
              type="button"
              onClick={() => setShowCleanerPicker(!showCleanerPicker)}
              className="w-full h-[46px] rounded-[14px] px-3.5 text-[15px] font-medium border-0 outline-none text-left"
              style={inputStyle}
            >
              <span style={{ color: selectedCleaners.length > 0 ? 'var(--t3)' : 'var(--t2)' }}>
                {selectedCleaners.length > 0 ? '+ Schoonmaakster toevoegen' : '— Selecteer schoonmaaksters'}
              </span>
            </button>

            {/* Cleaner picker dropdown */}
            {showCleanerPicker && (
              <div className="mt-1.5 rounded-[14px] overflow-hidden" style={{ background: 'var(--inp)', border: '1px solid var(--border)' }}>
                {cleaners
                  .filter(c => !selectedCleaners.some(sc => sc.cleaner_id === c.id))
                  .map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => { toggleCleaner(c.id); setShowCleanerPicker(false) }}
                      className="w-full flex items-center gap-3 px-3.5 py-3 text-left transition-colors"
                      style={{ borderBottom: '1px solid var(--border)' }}
                    >
                      <CleanerAvatar src={c.avatar_url} name={c.name} size={28} />
                      <span className="flex-1 text-[14px] font-medium" style={{ color: 'var(--t1)' }}>{c.name}</span>
                      <span className="text-[12px]" style={{ color: 'var(--t3)' }}>€{c.hourly_rate || 0}/u</span>
                    </button>
                  ))}
                {cleaners.filter(c => !selectedCleaners.some(sc => sc.cleaner_id === c.id)).length === 0 && (
                  <div className="px-3.5 py-3 text-[13px]" style={{ color: 'var(--t3)' }}>Alle schoonmaaksters zijn al geselecteerd</div>
                )}
              </div>
            )}
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
              <div className="relative">
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full h-[46px] rounded-[14px] px-3.5 text-[15px] font-medium border-0 outline-none"
                  style={{ ...inputStyle, ...(endTime ? {} : { color: 'transparent' }) }}
                />
                {!endTime && (
                  <span
                    className="absolute inset-0 flex items-center px-3.5 text-[14px] font-medium pointer-events-none"
                    style={{ color: 'var(--t3)' }}
                  >
                    Kies eindtijd
                  </span>
                )}
                {endTime && (
                  <button
                    type="button"
                    onClick={() => setEndTime('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ background: 'var(--fill)', color: 'var(--t3)' }}
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Price */}
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

          {/* Totaal overview - shown when hours are calculated */}
          {hours > 0 && (priceNum > 0 || totalPayout > 0) && (
            <div className="rounded-[14px] p-3 flex flex-col gap-1" style={{ background: 'var(--inp)' }}>
              <div className="flex justify-between items-center">
                <span className="text-[12px] font-medium" style={{ color: 'var(--t3)' }}>
                  {isFixedPrice ? `Vast tarief` : `${totalCleanerHours}u × €${priceNum}`}
                </span>
                <span className="text-[15px] font-bold" style={{ color: 'var(--t1)' }}>
                  Omzet: €{totalPrice.toFixed(2).replace(/\.00$/, '')}
                </span>
              </div>
              {totalPayout > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-[12px] font-medium" style={{ color: 'var(--t3)' }}>
                    {selectedCleaners.length} schoonmaakster{selectedCleaners.length > 1 ? 's' : ''}
                  </span>
                  <span className="text-[13px] font-semibold" style={{ color: 'var(--t2)' }}>
                    Uitbetaling: €{totalPayout.toFixed(2).replace(/\.00$/, '')}
                  </span>
                </div>
              )}
              {totalPrice > 0 && totalPayout > 0 && (
                <div className="flex justify-between items-center pt-1 mt-1" style={{ borderTop: '1px solid var(--border)' }}>
                  <span className="text-[12px] font-medium" style={{ color: 'var(--t3)' }}>Winst</span>
                  <span className="text-[13px] font-bold" style={{ color: totalPrice - totalPayout > 0 ? '#00A651' : '#ef4444' }}>
                    €{(totalPrice - totalPayout).toFixed(2).replace(/\.00$/, '')}
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
              disabled={!hasProperty || selectedCleaners.length === 0 || !date || createJob.isPending}
              className="flex-1 h-[50px] rounded-[16px] text-[15px] font-bold transition-all"
              style={{
                background: 'var(--t1)',
                color: 'var(--bg)',
                opacity: (!hasProperty || selectedCleaners.length === 0 || !date || createJob.isPending) ? 0.4 : 1,
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
