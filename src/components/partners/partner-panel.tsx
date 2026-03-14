'use client'

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useLocale } from '@/lib/i18n'
import { useProperties } from '@/lib/hooks/use-properties'
import { Phone, Mail, Building2, Camera } from 'lucide-react'
import { CleanerAvatar } from '@/components/cleaners/cleaner-avatar'
import { createClient } from '@/lib/supabase/client'
import { useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import type { Partner } from '@/lib/types'

interface Props {
  partner: Partner | null
  open: boolean
  onClose: () => void
}

export function PartnerPanel({ partner, open, onClose }: Props) {
  const { t } = useLocale()
  const { data: properties = [] } = useProperties()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  if (!partner) return null

  const partnerProperties = properties.filter(p => p.partner_id === partner.id)

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !partner) return

    setUploading(true)
    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `partners/${partner.id}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true })

      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(path)

        const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`

        await supabase
          .from('partners')
          .update({ avatar_url: avatarUrl })
          .eq('id', partner.id)

        queryClient.invalidateQueries({ queryKey: ['partners'] })
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
        <SheetHeader className="px-5 pt-5 pb-0">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="relative group"
              disabled={uploading}
            >
              <CleanerAvatar
                src={partner.avatar_url}
                name={partner.name}
                size={52}
              />
              <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera size={18} className="text-white" />
              </div>
              {uploading && (
                <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
            />
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-[20px] font-bold tracking-[-0.5px] text-left" style={{ color: 'var(--t1)' }}>
                {partner.name}
              </SheetTitle>
              <div className="text-[13px] mt-0.5" style={{ color: 'var(--t3)' }}>
                {partnerProperties.length} {partnerProperties.length === 1 ? 'property' : 'properties'}
              </div>
            </div>
          </div>
        </SheetHeader>

        <div className="px-5 pb-5 mt-4 flex flex-col gap-3">
          {/* Contact */}
          {partner.phone && (
            <a
              href={`tel:${partner.phone}`}
              className="flex items-center gap-2.5 rounded-[14px] p-3 text-left w-full transition-colors"
              style={{ background: 'var(--fill)' }}
            >
              <Phone size={16} style={{ color: 'var(--green)' }} />
              <span className="flex-1 text-[13px] font-medium" style={{ color: 'var(--t1)' }}>
                {partner.phone}
              </span>
            </a>
          )}
          {partner.email && (
            <a
              href={`mailto:${partner.email}`}
              className="flex items-center gap-2.5 rounded-[14px] p-3 text-left w-full transition-colors"
              style={{ background: 'var(--fill)' }}
            >
              <Mail size={16} style={{ color: 'var(--blue)' }} />
              <span className="flex-1 text-[13px] font-medium truncate" style={{ color: 'var(--t1)' }}>
                {partner.email}
              </span>
            </a>
          )}

          {/* Properties */}
          {partnerProperties.length > 0 && (
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[.08em] mb-2" style={{ color: 'var(--t3)' }}>
                Properties
              </div>
              <div className="flex flex-col gap-1.5">
                {partnerProperties.map(prop => (
                  <div
                    key={prop.id}
                    className="flex items-center gap-2.5 rounded-[14px] p-3"
                    style={{ background: 'var(--fill)' }}
                  >
                    <Building2 size={16} style={{ color: 'var(--t3)' }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium truncate" style={{ color: 'var(--t1)' }}>
                        {prop.name}
                      </div>
                      {prop.address && (
                        <div className="text-[11px] truncate" style={{ color: 'var(--t3)' }}>
                          {prop.address}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {partner.notes && (
            <div className="rounded-[14px] p-3" style={{ background: 'var(--fill)' }}>
              <div className="text-[11px] font-semibold uppercase tracking-[.08em] mb-1.5" style={{ color: 'var(--t3)' }}>
                {t('notes')}
              </div>
              <div className="text-[13px] leading-relaxed" style={{ color: 'var(--t2)' }}>
                {partner.notes}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
