'use client'

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useLocale } from '@/lib/i18n'
import { useJobs } from '@/lib/hooks/use-jobs'
import { formatCurrency, getJobRevenue } from '@/lib/utils'
import { MapPin, ChevronRight, FileText, Camera, Trash2, Pencil } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useQueryClient } from '@tanstack/react-query'
import { useDeleteProperty } from '@/lib/hooks/use-properties'
import { useRef, useState } from 'react'
import type { Property } from '@/lib/types'

interface Props {
  property: Property | null
  open: boolean
  onClose: () => void
  onEdit?: (property: Property) => void
}

export function PropertyPanel({ property, open, onClose, onEdit }: Props) {
  const { t } = useLocale()
  const { data: jobs = [] } = useJobs()
  const queryClient = useQueryClient()
  const deleteProperty = useDeleteProperty()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  if (!property) return null

  const propJobs = jobs.filter(j => j.property_id === property.id)
  const totalRevenue = propJobs.reduce((s, j) => s + getJobRevenue(j), 0)
  const completedJobs = propJobs.filter(j => j.status === 'done').length

  const openMaps = () => {
    // Use explicit maps URL if available, otherwise search by address
    if (property.maps_url) {
      window.open(property.maps_url, '_blank')
      return
    }
    if (!property.address) return
    const q = encodeURIComponent(property.address)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    window.open(isIOS ? `maps://maps.apple.com/?q=${q}` : `https://www.google.com/maps/search/?api=1&query=${q}`, '_blank')
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !property) return

    setUploading(true)
    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `properties/${property.id}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true })

      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(path)

        const imageUrl = `${urlData.publicUrl}?t=${Date.now()}`

        await supabase
          .from('properties')
          .update({ image_url: imageUrl })
          .eq('id', property.id)

        queryClient.invalidateQueries({ queryKey: ['properties'] })
      }
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="bottom"
        className="rounded-t-[24px] p-0 max-h-[85vh] overflow-y-auto border-0"
        style={{ background: 'var(--bg2)' }}
      >
        {/* Header image or icon */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="relative w-full group"
          disabled={uploading}
        >
          {property.image_url ? (
            <div className="w-full h-[160px] overflow-hidden rounded-t-[24px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={property.image_url} alt={property.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-t-[24px]">
                <Camera size={24} className="text-white" />
              </div>
            </div>
          ) : (
            <div
              className="w-full h-[120px] rounded-t-[24px] flex flex-col items-center justify-center gap-1.5"
              style={{ background: 'var(--fill)' }}
            >
              <Camera size={28} style={{ color: 'var(--t3)' }} />
              <span className="text-[12px] font-semibold" style={{ color: 'var(--t3)' }}>Foto toevoegen</span>
            </div>
          )}
          {uploading && (
            <div className="absolute inset-0 bg-black/50 rounded-t-[24px] flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />

        <SheetHeader className="px-5 pt-4 pb-0">
          <div className="flex items-start gap-3">
            <div className="text-[32px]">{property.icon || '🏠'}</div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-[20px] font-bold tracking-[-0.5px] text-left" style={{ color: 'var(--t1)' }}>
                {property.name}
              </SheetTitle>
              {property.type && (
                <div className="text-[12px] mt-0.5" style={{ color: 'var(--t3)' }}>
                  {property.type} {property.partner?.name ? `· ${property.partner.name}` : property.owner_name ? `· ${property.owner_name}` : ''}
                </div>
              )}
            </div>
          </div>
        </SheetHeader>

        <div className="px-5 pb-5 mt-4 flex flex-col gap-3">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-[14px] p-3 text-center" style={{ background: 'var(--fill)' }}>
              <div className="text-[10px] font-semibold uppercase tracking-[.08em] mb-0.5" style={{ color: 'var(--t3)' }}>{t('price')}</div>
              <div className="text-[16px] font-bold tracking-[-0.3px]" style={{ color: 'var(--t1)' }}>
                {formatCurrency(property.default_price || property.fixed_price || 0)}
              </div>
            </div>
            <div className="rounded-[14px] p-3 text-center" style={{ background: 'var(--fill)' }}>
              <div className="text-[10px] font-semibold uppercase tracking-[.08em] mb-0.5" style={{ color: 'var(--t3)' }}>{t('revenue')}</div>
              <div className="text-[16px] font-bold tracking-[-0.3px]" style={{ color: 'var(--t1)' }}>
                {formatCurrency(totalRevenue)}
              </div>
            </div>
            <div className="rounded-[14px] p-3 text-center" style={{ background: 'var(--fill)' }}>
              <div className="text-[10px] font-semibold uppercase tracking-[.08em] mb-0.5" style={{ color: 'var(--t3)' }}>{t('jobs')}</div>
              <div className="text-[16px] font-bold tracking-[-0.3px]" style={{ color: 'var(--t1)' }}>
                {completedJobs}/{propJobs.length}
              </div>
            </div>
          </div>

          {/* Address */}
          {property.address && (
            <button
              onClick={openMaps}
              className="flex items-center gap-2.5 rounded-[14px] p-3 text-left w-full transition-colors"
              style={{ background: 'var(--fill)' }}
            >
              <MapPin size={16} style={{ color: 'var(--blue)' }} />
              <span className="flex-1 text-[13px] font-medium truncate" style={{ color: 'var(--t1)' }}>
                {property.address}
              </span>
              <ChevronRight size={14} style={{ color: 'var(--t3)' }} />
            </button>
          )}

          {/* Notes */}
          {property.notes && (
            <div className="rounded-[14px] p-3" style={{ background: 'var(--fill)' }}>
              <div className="flex items-center gap-2 mb-1.5">
                <FileText size={14} style={{ color: 'var(--t3)' }} />
                <span className="text-[11px] font-semibold uppercase tracking-[.08em]" style={{ color: 'var(--t3)' }}>{t('notes')}</span>
              </div>
              <div className="text-[13px] leading-relaxed" style={{ color: 'var(--t2)' }}>
                {property.notes}
              </div>
            </div>
          )}

          {/* Pricing info */}
          <div className="rounded-[14px] p-3" style={{ background: 'var(--fill)' }}>
            <div className="text-[11px] font-semibold uppercase tracking-[.08em] mb-2" style={{ color: 'var(--t3)' }}>
              Pricing
            </div>
            <div className="flex justify-between text-[13px]">
              <span style={{ color: 'var(--t3)' }}>Type</span>
              <span className="font-semibold" style={{ color: 'var(--t1)' }}>
                {property.pricing_type === 'fixed' ? 'Vast bedrag' : 'Per uur'}
              </span>
            </div>
          </div>

          {/* Bedrooms / Bathrooms / Terraces */}
          {(property.bedrooms || property.bathrooms || property.terraces) ? (
            <div className="grid grid-cols-3 gap-2">
              {[
                { icon: '🛏️', label: 'Slaapkamers', value: property.bedrooms },
                { icon: '🚿', label: 'Badkamers', value: property.bathrooms },
                { icon: '☀️', label: 'Terrassen', value: property.terraces },
              ].filter(item => item.value).map(item => (
                <div key={item.label} className="rounded-[14px] p-3 text-center" style={{ background: 'var(--fill)' }}>
                  <div className="text-[10px] font-semibold uppercase tracking-[.08em] mb-0.5" style={{ color: 'var(--t3)' }}>{item.icon} {item.label}</div>
                  <div className="text-[16px] font-bold" style={{ color: 'var(--t1)' }}>{item.value}</div>
                </div>
              ))}
            </div>
          ) : null}

          {/* Edit button */}
          {onEdit && (
            <button
              onClick={() => { onEdit(property); onClose() }}
              className="flex items-center justify-center gap-2 rounded-[14px] p-3 w-full transition-colors mt-1"
              style={{ background: 'var(--fill)' }}
            >
              <Pencil size={16} style={{ color: 'var(--t1)' }} />
              <span className="text-[13px] font-semibold" style={{ color: 'var(--t1)' }}>Property wijzigen</span>
            </button>
          )}

          {/* Delete button */}
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center justify-center gap-2 rounded-[14px] p-3 w-full transition-colors mt-2"
              style={{ background: 'rgba(239,68,68,0.1)' }}
            >
              <Trash2 size={16} className="text-red-500" />
              <span className="text-[13px] font-semibold text-red-500">Property verwijderen</span>
            </button>
          ) : (
            <div className="rounded-[14px] p-4 mt-2" style={{ background: 'rgba(239,68,68,0.1)' }}>
              <p className="text-[13px] font-semibold text-red-500 text-center mb-3">
                Weet je zeker dat je &quot;{property.name}&quot; wilt verwijderen?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 rounded-[12px] p-2.5 text-[13px] font-semibold"
                  style={{ background: 'var(--fill)', color: 'var(--t1)' }}
                >
                  Annuleren
                </button>
                <button
                  onClick={() => {
                    deleteProperty.mutate(property.id, {
                      onSuccess: () => {
                        setShowDeleteConfirm(false)
                        onClose()
                      },
                    })
                  }}
                  disabled={deleteProperty.isPending}
                  className="flex-1 rounded-[12px] p-2.5 text-[13px] font-semibold bg-red-500 text-white"
                >
                  {deleteProperty.isPending ? 'Verwijderen...' : 'Ja, verwijderen'}
                </button>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
