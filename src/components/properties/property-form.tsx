'use client'

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useLocale } from '@/lib/i18n'
import { useCreateProperty } from '@/lib/hooks/use-properties'
import { usePartners } from '@/lib/hooks/use-partners'
import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useQueryClient } from '@tanstack/react-query'
import { Camera, MapPin, Minus, Plus } from 'lucide-react'
import type { Property } from '@/lib/types'

interface Props {
  open: boolean
  onClose: () => void
  editProperty?: Property | null
}

const PROPERTY_TYPES = ['apartment', 'house', 'villa', 'office', 'hotel', 'airbnb']
const TYPE_ICONS: Record<string, string> = {
  apartment: '🏢',
  house: '🏠',
  villa: '🏡',
  office: '🏬',
  hotel: '🏨',
  airbnb: '🛏️',
}

export function PropertyForm({ open, onClose, editProperty }: Props) {
  const { t } = useLocale()
  const createProperty = useCreateProperty()
  const { data: partners = [] } = usePartners()
  const queryClient = useQueryClient()

  const [name, setName] = useState('')
  const [type, setType] = useState('house')
  const [address, setAddress] = useState('')
  const [mapsUrl, setMapsUrl] = useState('')
  const [partnerId, setPartnerId] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [defaultPrice, setDefaultPrice] = useState('')
  const [pricingType, setPricingType] = useState<'hourly' | 'fixed'>('hourly')
  const [bedrooms, setBedrooms] = useState(0)
  const [bathrooms, setBathrooms] = useState(0)
  const [terraces, setTerraces] = useState(0)
  const [notes, setNotes] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isEdit = !!editProperty

  // Populate form when editing
  useEffect(() => {
    if (editProperty && open) {
      setName(editProperty.name || '')
      setType(editProperty.type || 'house')
      setAddress(editProperty.address || '')
      setMapsUrl(editProperty.maps_url || '')
      setPartnerId(editProperty.partner_id || '')
      setOwnerName(editProperty.owner_name || '')
      setDefaultPrice(editProperty.default_price?.toString() || '')
      setPricingType(editProperty.pricing_type || 'hourly')
      setBedrooms(editProperty.bedrooms || 0)
      setBathrooms(editProperty.bathrooms || 0)
      setTerraces(editProperty.terraces || 0)
      setNotes(editProperty.notes || '')
      setImagePreview(editProperty.image_url || null)
      setImageFile(null)
    }
  }, [editProperty, open])

  const reset = () => {
    setName('')
    setType('house')
    setAddress('')
    setMapsUrl('')
    setPartnerId('')
    setOwnerName('')
    setDefaultPrice('')
    setPricingType('hourly')
    setBedrooms(0)
    setBathrooms(0)
    setTerraces(0)
    setNotes('')
    setImageFile(null)
    setImagePreview(null)
    setSaving(false)
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    const reader = new FileReader()
    reader.onloadend = () => setImagePreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const uploadImage = async (propId: string) => {
    if (!imageFile) return
    const supabase = createClient()
    const ext = imageFile.name.split('.').pop() || 'jpg'
    const path = `properties/${propId}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, imageFile, { upsert: true })

    if (!uploadError) {
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(path)

      await supabase
        .from('properties')
        .update({ image_url: `${urlData.publicUrl}?t=${Date.now()}` })
        .eq('id', propId)
    }
  }

  const handleSubmit = async () => {
    if (!name) return
    setSaving(true)

    const propertyData = {
      name,
      type,
      address: address || undefined,
      maps_url: mapsUrl || undefined,
      partner_id: partnerId || null,
      owner_name: ownerName || undefined,
      default_price: defaultPrice ? parseFloat(defaultPrice) : undefined,
      pricing_type: pricingType,
      bedrooms: bedrooms || 0,
      bathrooms: bathrooms || 0,
      terraces: terraces || 0,
      notes: notes || undefined,
      icon: TYPE_ICONS[type] || '🏠',
    }

    try {
      const supabase = createClient()

      if (isEdit && editProperty) {
        // Update existing property
        await supabase
          .from('properties')
          .update(propertyData)
          .eq('id', editProperty.id)

        if (imageFile) await uploadImage(editProperty.id)
        queryClient.invalidateQueries({ queryKey: ['properties'] })
        reset()
        onClose()
      } else {
        // Create new property
        createProperty.mutate(propertyData as Parameters<typeof createProperty.mutate>[0], {
          onSuccess: async () => {
            if (imageFile) {
              const { data: props } = await supabase
                .from('properties')
                .select('id')
                .eq('name', name)
                .order('created_at', { ascending: false })
                .limit(1)

              if (props && props[0]) {
                await uploadImage(props[0].id)
                queryClient.invalidateQueries({ queryKey: ['properties'] })
              }
            }
            reset()
            onClose()
          },
          onError: () => setSaving(false),
        })
        return // Don't reset saving here, onSuccess/onError handles it
      }
    } catch {
      setSaving(false)
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
            {isEdit ? 'Wijzig property' : `${t('create')} property`}
          </SheetTitle>
        </SheetHeader>

        <div className="px-5 pb-5 mt-4 flex flex-col gap-3">
          {/* Photo upload */}
          <div className="flex justify-center mb-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="relative w-full h-[140px] rounded-[16px] overflow-hidden group transition-all"
              style={{ background: 'var(--fill)' }}
            >
              {imagePreview ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera size={24} className="text-white" />
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-1.5">
                  <Camera size={28} style={{ color: 'var(--t3)' }} />
                  <span className="text-[12px] font-semibold" style={{ color: 'var(--t3)' }}>Foto toevoegen</span>
                </div>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
          </div>

          {/* Name */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[.08em] mb-1 block" style={{ color: 'var(--t3)' }}>
              Naam
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-[46px] rounded-[14px] px-3.5 text-[15px] font-medium border-0 outline-none"
              style={inputStyle}
              placeholder="Naam van property"
            />
          </div>

          {/* Type */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[.08em] mb-1 block" style={{ color: 'var(--t3)' }}>
              Type
            </label>
            <div className="flex gap-1.5 flex-wrap">
              {PROPERTY_TYPES.map(pt => (
                <button
                  key={pt}
                  onClick={() => setType(pt)}
                  className="px-3 py-2 rounded-[12px] text-[13px] font-medium transition-all"
                  style={{
                    background: type === pt ? 'var(--t1)' : 'var(--fill)',
                    color: type === pt ? 'var(--bg)' : 'var(--t3)',
                  }}
                >
                  {TYPE_ICONS[pt]} {pt}
                </button>
              ))}
            </div>
          </div>

          {/* Bedrooms, Bathrooms & Terraces */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: '🛏️ Slaapkamers', value: bedrooms, set: setBedrooms },
              { label: '🚿 Badkamers', value: bathrooms, set: setBathrooms },
              { label: '☀️ Terrassen', value: terraces, set: setTerraces },
            ].map(({ label, value, set }) => (
              <div key={label}>
                <label className="text-[10px] font-semibold uppercase tracking-[.06em] mb-1 block" style={{ color: 'var(--t3)' }}>
                  {label}
                </label>
                <div className="flex items-center gap-1 h-[46px] rounded-[14px] px-1.5" style={inputStyle}>
                  <button
                    type="button"
                    onClick={() => set(Math.max(0, value - 1))}
                    className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: 'var(--fill)' }}
                  >
                    <Minus size={12} style={{ color: 'var(--t2)' }} />
                  </button>
                  <span className="flex-1 text-center text-[16px] font-bold" style={{ color: 'var(--t1)' }}>
                    {value}
                  </span>
                  <button
                    type="button"
                    onClick={() => set(value + 1)}
                    className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: 'var(--fill)' }}
                  >
                    <Plus size={12} style={{ color: 'var(--t2)' }} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Address */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[.08em] mb-1 block" style={{ color: 'var(--t3)' }}>
              Adres
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full h-[46px] rounded-[14px] px-3.5 text-[15px] font-medium border-0 outline-none"
              style={inputStyle}
              placeholder="Straat, stad"
            />
          </div>

          {/* Google Maps link */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[.08em] mb-1 block" style={{ color: 'var(--t3)' }}>
              <span className="flex items-center gap-1"><MapPin size={12} /> Google Maps Link</span>
            </label>
            <input
              type="url"
              value={mapsUrl}
              onChange={(e) => setMapsUrl(e.target.value)}
              className="w-full h-[46px] rounded-[14px] px-3.5 text-[15px] font-medium border-0 outline-none"
              style={inputStyle}
              placeholder="https://maps.google.com/..."
            />
          </div>

          {/* Partner */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[.08em] mb-1 block" style={{ color: 'var(--t3)' }}>
              Partner
            </label>
            <select
              value={partnerId}
              onChange={(e) => {
                setPartnerId(e.target.value)
                const p = partners.find(p => p.id === e.target.value)
                if (p) setOwnerName(p.name)
              }}
              className="w-full h-[46px] rounded-[14px] px-3.5 text-[15px] font-medium border-0 outline-none appearance-none"
              style={inputStyle}
            >
              <option value="">Geen partner</option>
              {partners.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Owner */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[.08em] mb-1 block" style={{ color: 'var(--t3)' }}>
              Eigenaar
            </label>
            <input
              type="text"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              className="w-full h-[46px] rounded-[14px] px-3.5 text-[15px] font-medium border-0 outline-none"
              style={inputStyle}
              placeholder="Naam eigenaar"
            />
          </div>

          {/* Pricing type + price */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[.08em] mb-1 block" style={{ color: 'var(--t3)' }}>
                Prijstype
              </label>
              <select
                value={pricingType}
                onChange={(e) => setPricingType(e.target.value as 'hourly' | 'fixed')}
                className="w-full h-[46px] rounded-[14px] px-3.5 text-[15px] font-medium border-0 outline-none appearance-none"
                style={inputStyle}
              >
                <option value="hourly">Per uur</option>
                <option value="fixed">Vast</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[.08em] mb-1 block" style={{ color: 'var(--t3)' }}>
                {t('price')} (€)
              </label>
              <input
                type="number"
                step="0.01"
                value={defaultPrice}
                onChange={(e) => setDefaultPrice(e.target.value)}
                className="w-full h-[46px] rounded-[14px] px-3.5 text-[15px] font-medium border-0 outline-none"
                style={inputStyle}
                placeholder="0"
              />
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
              disabled={!name || saving || createProperty.isPending}
              className="flex-1 h-[50px] rounded-[16px] text-[15px] font-bold transition-all"
              style={{
                background: 'var(--t1)',
                color: 'var(--bg)',
                opacity: (!name || saving || createProperty.isPending) ? 0.4 : 1,
              }}
            >
              {saving || createProperty.isPending ? t('loading') : isEdit ? 'Opslaan' : t('create')}
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
