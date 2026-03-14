'use client'

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useLocale } from '@/lib/i18n'
import { useCreateProperty } from '@/lib/hooks/use-properties'
import { usePartners } from '@/lib/hooks/use-partners'
import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useQueryClient } from '@tanstack/react-query'
import { Camera, MapPin } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
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

export function PropertyForm({ open, onClose }: Props) {
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
  const [notes, setNotes] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const reset = () => {
    setName('')
    setType('house')
    setAddress('')
    setMapsUrl('')
    setPartnerId('')
    setOwnerName('')
    setDefaultPrice('')
    setPricingType('hourly')
    setNotes('')
    setImageFile(null)
    setImagePreview(null)
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    const reader = new FileReader()
    reader.onloadend = () => setImagePreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleSubmit = () => {
    if (!name) return

    createProperty.mutate({
      name,
      type,
      address: address || undefined,
      maps_url: mapsUrl || undefined,
      partner_id: partnerId || undefined,
      owner_name: ownerName || undefined,
      default_price: defaultPrice ? parseFloat(defaultPrice) : undefined,
      pricing_type: pricingType,
      notes: notes || undefined,
      icon: TYPE_ICONS[type] || '🏠',
    } as Parameters<typeof createProperty.mutate>[0], {
      onSuccess: async () => {
        // Upload image if selected
        if (imageFile) {
          const supabase = createClient()
          // Get the newly created property
          const { data: props } = await supabase
            .from('properties')
            .select('id')
            .eq('name', name)
            .order('created_at', { ascending: false })
            .limit(1)

          if (props && props[0]) {
            const propId = props[0].id
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
                .update({ image_url: urlData.publicUrl })
                .eq('id', propId)

              queryClient.invalidateQueries({ queryKey: ['properties'] })
            }
          }
        }
        reset()
        onClose()
      },
    })
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
            {t('create')} property
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
              {PROPERTY_TYPES.map(t => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className="px-3 py-2 rounded-[12px] text-[13px] font-medium transition-all"
                  style={{
                    background: type === t ? 'var(--t1)' : 'var(--fill)',
                    color: type === t ? 'var(--bg)' : 'var(--t3)',
                  }}
                >
                  {TYPE_ICONS[t]} {t}
                </button>
              ))}
            </div>
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
                // Auto-fill owner name from partner
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

          {/* Owner (manual override) */}
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
              disabled={!name || createProperty.isPending}
              className="flex-1 h-[50px] rounded-[16px] text-[15px] font-bold transition-all"
              style={{
                background: 'var(--t1)',
                color: 'var(--bg)',
                opacity: (!name || createProperty.isPending) ? 0.4 : 1,
              }}
            >
              {createProperty.isPending ? t('loading') : t('create')}
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
