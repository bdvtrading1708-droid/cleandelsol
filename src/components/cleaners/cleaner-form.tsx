'use client'

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useLocale } from '@/lib/i18n'
import { useState, useRef, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Camera } from 'lucide-react'
import type { User } from '@/lib/types'

interface Props {
  open: boolean
  onClose: () => void
  editCleaner?: User | null
  onCreated?: (creds: { name: string; email: string; password: string }) => void
}

export function CleanerForm({ open, onClose, editCleaner, onCreated }: Props) {
  const { t } = useLocale()
  const queryClient = useQueryClient()

  const isEdit = !!editCleaner

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [hourlyRate, setHourlyRate] = useState('')
  const [paymentNotes, setPaymentNotes] = useState('')
  const [customPassword, setCustomPassword] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Populate fields when editing
  useEffect(() => {
    if (editCleaner) {
      setName(editCleaner.name || '')
      setEmail(editCleaner.email || '')
      setPhone(editCleaner.phone || '')
      setHourlyRate(editCleaner.hourly_rate?.toString() || '')
      setPaymentNotes(editCleaner.payment_notes || '')
      setAvatarPreview(editCleaner.avatar_url || null)
      setAvatarFile(null)
    }
  }, [editCleaner])

  const reset = () => {
    setName('')
    setEmail('')
    setPhone('')
    setHourlyRate('')
    setPaymentNotes('')
    setCustomPassword('')
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

  const saveCleaner = useMutation({
    mutationFn: async (): Promise<{ password?: string } | void> => {
      const supabase = createClient()

      if (isEdit && editCleaner) {
        // UPDATE existing cleaner
        const { error } = await supabase
          .from('users')
          .update({
            name,
            phone: phone || null,
            hourly_rate: hourlyRate ? parseFloat(hourlyRate) : null,
            payment_notes: paymentNotes || null,
          })
          .eq('id', editCleaner.id)

        if (error) throw new Error(error.message)

        // Upload avatar if new file selected
        if (avatarFile) {
          const ext = avatarFile.name.split('.').pop() || 'jpg'
          const path = `avatars/${editCleaner.id}.${ext}`

          // Try to remove old file first (ignore errors)
          await supabase.storage.from('avatars').remove([path])

          const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(path, avatarFile, { upsert: true })

          if (uploadError) {
            throw new Error(`Upload mislukt: ${uploadError.message}`)
          }

          const { data: urlData } = supabase.storage
            .from('avatars')
            .getPublicUrl(path)

          const { error: updateError } = await supabase
            .from('users')
            .update({ avatar_url: `${urlData.publicUrl}?t=${Date.now()}` })
            .eq('id', editCleaner.id)

          if (updateError) {
            throw new Error(`Avatar URL opslaan mislukt: ${updateError.message}`)
          }
        }
      } else {
        // CREATE new cleaner via API route (needs service role key)
        const res = await fetch('/api/cleaners', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            email,
            phone: phone || undefined,
            hourly_rate: hourlyRate ? parseFloat(hourlyRate) : undefined,
            payment_notes: paymentNotes || undefined,
            password: customPassword || undefined,
          }),
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Failed to create cleaner')
        }
        const data = await res.json() as { id: string; password: string }

        // Upload avatar if selected
        if (avatarFile && data.id) {
          const ext = avatarFile.name.split('.').pop() || 'jpg'
          const path = `avatars/${data.id}.${ext}`

          const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(path, avatarFile, { upsert: true })

          if (!uploadError) {
            const { data: urlData } = supabase.storage
              .from('avatars')
              .getPublicUrl(path)

            await supabase
              .from('users')
              .update({ avatar_url: urlData.publicUrl })
              .eq('id', data.id)
          }
        }

        return { password: data.password }
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['cleaners'] })
      const createdName = name
      const createdEmail = email
      reset()
      onClose()
      if (!isEdit && result?.password && onCreated) {
        onCreated({ name: createdName, email: createdEmail, password: result.password })
      }
    },
  })

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
            {isEdit ? 'Wijzig schoonmaakster' : `${t('create')} schoonmaakster`}
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
              placeholder="Volledige naam"
            />
          </div>

          {/* Email (only for new cleaners) */}
          {!isEdit && (
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
          )}

          {/* Password (only for new cleaners) */}
          {!isEdit && (
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[.08em] mb-1 block" style={{ color: 'var(--t3)' }}>
                {t('pass')}
              </label>
              <input
                type="text"
                value={customPassword}
                onChange={(e) => setCustomPassword(e.target.value)}
                className="w-full h-[46px] rounded-[14px] px-3.5 text-[15px] font-medium border-0 outline-none"
                style={inputStyle}
                placeholder="Laat leeg voor willekeurig"
              />
            </div>
          )}

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

          {/* Hourly rate */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[.08em] mb-1 block" style={{ color: 'var(--t3)' }}>
              Uurtarief (€)
            </label>
            <input
              type="number"
              step="0.50"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value)}
              className="w-full h-[46px] rounded-[14px] px-3.5 text-[15px] font-medium border-0 outline-none"
              style={inputStyle}
              placeholder="0"
            />
          </div>

          {/* Payment notes */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[.08em] mb-1 block" style={{ color: 'var(--t3)' }}>
              Betaalinfo
            </label>
            <textarea
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
              rows={2}
              className="w-full rounded-[14px] px-3.5 py-3 text-[15px] font-medium border-0 outline-none resize-none"
              style={inputStyle}
              placeholder="IBAN, Bizum, etc."
            />
          </div>

          {/* Email (read-only when editing) */}
          {isEdit && (
            <div className="text-[11px] font-medium px-1" style={{ color: 'var(--t3)' }}>
              E-mail: {editCleaner?.email}
            </div>
          )}

          {saveCleaner.isError && (
            <div className="text-[13px] font-medium px-1" style={{ color: 'var(--red, #ef4444)' }}>
              {saveCleaner.error.message}
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
              onClick={() => saveCleaner.mutate()}
              disabled={!name || (!isEdit && !email) || saveCleaner.isPending}
              className="flex-1 h-[50px] rounded-[16px] text-[15px] font-bold transition-all"
              style={{
                background: 'var(--t1)',
                color: 'var(--bg)',
                opacity: (!name || (!isEdit && !email) || saveCleaner.isPending) ? 0.4 : 1,
              }}
            >
              {saveCleaner.isPending ? t('loading') : isEdit ? 'Opslaan' : t('create')}
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
