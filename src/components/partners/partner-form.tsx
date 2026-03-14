'use client'

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useLocale } from '@/lib/i18n'
import { useCreatePartner } from '@/lib/hooks/use-partners'
import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useQueryClient } from '@tanstack/react-query'
import { Camera } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
}

export function PartnerForm({ open, onClose }: Props) {
  const { t } = useLocale()
  const createPartner = useCreatePartner()
  const queryClient = useQueryClient()

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const reset = () => {
    setName('')
    setPhone('')
    setEmail('')
    setNotes('')
    setAvatarFile(null)
    setAvatarPreview(null)
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    const reader = new FileReader()
    reader.onloadend = () => setAvatarPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleSubmit = () => {
    if (!name) return

    createPartner.mutate({
      name,
      phone: phone || undefined,
      email: email || undefined,
      notes: notes || undefined,
    }, {
      onSuccess: async (data) => {
        // Upload avatar if selected
        if (avatarFile && data?.id) {
          const supabase = createClient()
          const ext = avatarFile.name.split('.').pop() || 'jpg'
          const path = `partners/${data.id}.${ext}`

          const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(path, avatarFile, { upsert: true })

          if (!uploadError) {
            const { data: urlData } = supabase.storage
              .from('avatars')
              .getPublicUrl(path)

            await supabase
              .from('partners')
              .update({ avatar_url: urlData.publicUrl })
              .eq('id', data.id)

            queryClient.invalidateQueries({ queryKey: ['partners'] })
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
            {t('create')} partner
          </SheetTitle>
        </SheetHeader>

        <div className="px-5 pb-5 mt-4 flex flex-col gap-3">
          {/* Avatar upload */}
          <div className="flex justify-center mb-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="relative w-[80px] h-[80px] rounded-full overflow-hidden group transition-all"
              style={{ background: 'var(--fill)' }}
            >
              {avatarPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                  <Camera size={24} style={{ color: 'var(--t3)' }} />
                  <span className="text-[10px] font-semibold" style={{ color: 'var(--t3)' }}>Foto</span>
                </div>
              )}
              {avatarPreview && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera size={20} className="text-white" />
                </div>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
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
              placeholder="Naam partner"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[.08em] mb-1 block" style={{ color: 'var(--t3)' }}>
              Telefoon
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full h-[46px] rounded-[14px] px-3.5 text-[15px] font-medium border-0 outline-none"
              style={inputStyle}
              placeholder="+34 600 000 000"
            />
          </div>

          {/* Email */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[.08em] mb-1 block" style={{ color: 'var(--t3)' }}>
              E-mail
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-[46px] rounded-[14px] px-3.5 text-[15px] font-medium border-0 outline-none"
              style={inputStyle}
              placeholder="email@voorbeeld.com"
            />
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
              placeholder="Opmerkingen over deze partner"
            />
          </div>

          {createPartner.isError && (
            <div className="text-[13px] font-medium px-1" style={{ color: 'var(--red, #ef4444)' }}>
              {createPartner.error.message}
            </div>
          )}

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
              disabled={!name || createPartner.isPending}
              className="flex-1 h-[50px] rounded-[16px] text-[15px] font-bold transition-all"
              style={{
                background: 'var(--t1)',
                color: 'var(--bg)',
                opacity: (!name || createPartner.isPending) ? 0.4 : 1,
              }}
            >
              {createPartner.isPending ? t('loading') : t('create')}
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
