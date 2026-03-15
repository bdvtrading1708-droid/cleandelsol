'use client'

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useLocale } from '@/lib/i18n'
import { useJobs, useUpdateJobStatus } from '@/lib/hooks/use-jobs'
import { formatCurrency, formatDate, getCleanerPayout, getCleanerHours, getCleanerTotalPayout } from '@/lib/utils'
import { Phone, Mail, Camera, Pencil, Send, Check, KeyRound, CheckCircle2 } from 'lucide-react'
import { STATUS_COLORS } from '@/lib/constants'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { CleanerAvatar } from '@/components/cleaners/cleaner-avatar'
import { createClient } from '@/lib/supabase/client'
import { useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import type { User } from '@/lib/types'

interface Props {
  cleaner: User | null
  open: boolean
  onClose: () => void
  onEdit?: (cleaner: User) => void
  onPasswordReset?: (creds: { name: string; email: string; password: string }) => void
}

export function CleanerPanel({ cleaner, open, onClose, onEdit, onPasswordReset }: Props) {
  const { t } = useLocale()
  const { data: jobs = [] } = useJobs()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const updateStatus = useUpdateJobStatus()

  const sendWelcome = useMutation({
    mutationFn: async (cleanerId: string) => {
      const res = await fetch('/api/cleaners/send-welcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cleanerId }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to send email')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cleaners'] })
      toast.success(t('welcomeSent') || 'Welkomstmail verstuurd!')
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })

  const resetPassword = useMutation({
    mutationFn: async (cleanerId: string) => {
      const res = await fetch('/api/cleaners/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cleanerId }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to reset password')
      }
      return res.json() as Promise<{ password: string }>
    },
    onSuccess: (data) => {
      if (cleaner && onPasswordReset) {
        onPasswordReset({ name: cleaner.name, email: cleaner.email, password: data.password })
      }
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })

  if (!cleaner) return null

  const cleanerJobs = jobs.filter(j =>
    (j.cleaners || []).some(jc => jc.cleaner_id === cleaner.id) || j.cleaner_id === cleaner.id
  )
  const getMyAssignment = (job: typeof jobs[0]) =>
    (job.cleaners || []).find(jc => jc.cleaner_id === cleaner.id)

  const totalEarned = cleanerJobs
    .filter(j => j.status === 'done')
    .reduce((s, j) => { const my = getMyAssignment(j); return s + (my ? getCleanerPayout(my) : 0) }, 0)
  const outstanding = cleanerJobs
    .filter(j => j.status === 'delivered' || j.status === 'progress')
    .reduce((s, j) => { const my = getMyAssignment(j); return s + (my ? getCleanerPayout(my) : 0) }, 0)
  const totalHours = cleanerJobs.reduce((s, j) => { const my = getMyAssignment(j); return s + (my ? getCleanerHours(my) : 0) }, 0)

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !cleaner) return

    setUploading(true)
    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `avatars/${cleaner.id}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true })

      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(path)

        // Add cache-buster to force refresh
        const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`

        await supabase
          .from('users')
          .update({ avatar_url: avatarUrl })
          .eq('id', cleaner.id)

        queryClient.invalidateQueries({ queryKey: ['cleaners'] })
      }
    } finally {
      setUploading(false)
      // Reset input so same file can be re-selected
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
                src={cleaner.avatar_url}
                name={cleaner.name}
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
                {cleaner.name}
              </SheetTitle>
              {cleaner.hourly_rate && (
                <div className="text-[13px] mt-0.5" style={{ color: 'var(--t3)' }}>
                  {formatCurrency(cleaner.hourly_rate)}/uur
                </div>
              )}
            </div>
            {onEdit && (
              <button
                onClick={() => onEdit(cleaner)}
                className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                style={{ background: 'var(--fill)' }}
              >
                <Pencil size={16} style={{ color: 'var(--t2)' }} />
              </button>
            )}
          </div>
        </SheetHeader>

        <div className="px-5 pb-5 mt-4 flex flex-col gap-3">
          {/* Contact */}
          {cleaner.phone && (
            <a
              href={`tel:${cleaner.phone}`}
              className="flex items-center gap-2.5 rounded-[14px] p-3 text-left w-full transition-colors"
              style={{ background: 'var(--fill)' }}
            >
              <Phone size={16} style={{ color: 'var(--green)' }} />
              <span className="flex-1 text-[13px] font-medium" style={{ color: 'var(--t1)' }}>
                {cleaner.phone}
              </span>
            </a>
          )}
          {cleaner.email && (
            <a
              href={`mailto:${cleaner.email}`}
              className="flex items-center gap-2.5 rounded-[14px] p-3 text-left w-full transition-colors"
              style={{ background: 'var(--fill)' }}
            >
              <Mail size={16} style={{ color: 'var(--blue)' }} />
              <span className="flex-1 text-[13px] font-medium truncate" style={{ color: 'var(--t1)' }}>
                {cleaner.email}
              </span>
            </a>
          )}

          {/* Send welcome email */}
          <button
            onClick={() => sendWelcome.mutate(cleaner.id)}
            disabled={sendWelcome.isPending}
            className="flex items-center gap-2.5 rounded-[14px] p-3 text-left w-full transition-colors"
            style={{ background: cleaner.welcome_email_sent ? 'var(--fill)' : 'var(--fill)' }}
          >
            {cleaner.welcome_email_sent ? (
              <Check size={16} style={{ color: 'var(--green)' }} />
            ) : (
              <Send size={16} style={{ color: 'var(--t2)' }} />
            )}
            <span className="flex-1 text-[13px] font-medium" style={{ color: cleaner.welcome_email_sent ? 'var(--t3)' : 'var(--t1)' }}>
              {sendWelcome.isPending
                ? (t('loading'))
                : cleaner.welcome_email_sent
                  ? (t('resendWelcome') || 'Opnieuw versturen')
                  : (t('sendWelcome') || 'Stuur welkomstmail')
              }
            </span>
          </button>

          {/* Reset password */}
          <button
            onClick={() => resetPassword.mutate(cleaner.id)}
            disabled={resetPassword.isPending}
            className="flex items-center gap-2.5 rounded-[14px] p-3 text-left w-full transition-colors"
            style={{ background: 'var(--fill)' }}
          >
            <KeyRound size={16} style={{ color: 'var(--t2)' }} />
            <span className="flex-1 text-[13px] font-medium" style={{ color: 'var(--t1)' }}>
              {resetPassword.isPending ? t('loading') : (t('resetPass') || 'Wachtwoord resetten')}
            </span>
          </button>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-[14px] p-3 text-center" style={{ background: 'var(--fill)' }}>
              <div className="text-[10px] font-semibold uppercase tracking-[.08em] mb-0.5" style={{ color: 'var(--t3)' }}>{t('earned')}</div>
              <div className="text-[16px] font-bold tracking-[-0.3px]" style={{ color: 'var(--green)' }}>
                {formatCurrency(totalEarned)}
              </div>
            </div>
            <div className="rounded-[14px] p-3 text-center" style={{ background: 'var(--fill)' }}>
              <div className="text-[10px] font-semibold uppercase tracking-[.08em] mb-0.5" style={{ color: 'var(--t3)' }}>{t('outstanding')}</div>
              <div className="text-[16px] font-bold tracking-[-0.3px]" style={{ color: outstanding > 0 ? '#FF9900' : 'var(--t3)' }}>
                {formatCurrency(outstanding)}
              </div>
            </div>
            <div className="rounded-[14px] p-3 text-center" style={{ background: 'var(--fill)' }}>
              <div className="text-[10px] font-semibold uppercase tracking-[.08em] mb-0.5" style={{ color: 'var(--t3)' }}>{t('hours')}</div>
              <div className="text-[16px] font-bold tracking-[-0.3px]" style={{ color: 'var(--t1)' }}>
                {totalHours}h
              </div>
            </div>
            <div className="rounded-[14px] p-3 text-center" style={{ background: 'var(--fill)' }}>
              <div className="text-[10px] font-semibold uppercase tracking-[.08em] mb-0.5" style={{ color: 'var(--t3)' }}>{t('jobs')}</div>
              <div className="text-[16px] font-bold tracking-[-0.3px]" style={{ color: 'var(--t1)' }}>
                {cleanerJobs.length}
              </div>
            </div>
          </div>

          {/* Te betalen - payment overview */}
          {(() => {
            const unpaidJobs = cleanerJobs
              .filter(j => j.status === 'delivered' || j.status === 'progress')
              .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
            const deliveredJobs = unpaidJobs.filter(j => j.status === 'delivered')

            if (unpaidJobs.length === 0) return null

            return (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[11px] font-semibold uppercase tracking-[.08em]" style={{ color: 'var(--t3)' }}>
                    {t('toPay') || 'Te betalen'} ({unpaidJobs.length})
                  </div>
                </div>
                <div className="rounded-[14px] overflow-hidden" style={{ background: 'var(--fill)' }}>
                  {unpaidJobs.map((job, i) => {
                    const my = getMyAssignment(job)
                    if (!my) return null
                    const payout = getCleanerTotalPayout(my)
                    const hours = getCleanerHours(my)
                    const isDelivered = job.status === 'delivered'

                    return (
                      <div
                        key={job.id}
                        className="flex items-center gap-2.5 px-3 py-2.5"
                        style={{ borderBottom: i < unpaidJobs.length - 1 ? '1px solid var(--border)' : 'none' }}
                      >
                        <div className="w-[3px] h-8 rounded-[2px] shrink-0" style={{ background: STATUS_COLORS[job.status] || 'var(--t3)' }} />
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-bold tracking-[-0.2px] truncate" style={{ color: 'var(--t1)' }}>
                            {job.property?.name || job.custom_property_name || '—'}
                          </div>
                          <div className="text-[10px] mt-0.5" style={{ color: 'var(--t3)' }}>
                            {job.date ? formatDate(job.date) : '—'} · {hours}u · {my.km_driven || 0}km
                          </div>
                        </div>
                        <div className="text-right shrink-0 mr-1">
                          <div className="text-[13px] font-bold tracking-[-0.3px]" style={{ color: isDelivered ? 'var(--t1)' : '#FF9900' }}>
                            {formatCurrency(payout)}
                          </div>
                          <div className="text-[8px] font-bold uppercase tracking-[.05em] mt-0.5" style={{ color: isDelivered ? 'var(--t3)' : '#FF9900' }}>
                            {isDelivered ? (t('delivered') || 'Opgeleverd') : (t('inprog') || 'Bezig')}
                          </div>
                        </div>
                        {isDelivered && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              updateStatus.mutate({ id: job.id, status: 'done' })
                            }}
                            disabled={updateStatus.isPending}
                            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all active:scale-95"
                            style={{ background: '#00A651' }}
                          >
                            <CheckCircle2 size={16} className="text-white" />
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
                {deliveredJobs.length > 1 && (
                  <button
                    onClick={() => {
                      deliveredJobs.forEach(job => {
                        updateStatus.mutate({ id: job.id, status: 'done' })
                      })
                    }}
                    disabled={updateStatus.isPending}
                    className="w-full h-[44px] rounded-[14px] text-[13px] font-bold mt-2 transition-all active:scale-[0.98]"
                    style={{ background: '#00A651', color: '#fff' }}
                  >
                    {updateStatus.isPending ? t('loading') : (t('allPaid') || 'Alles betaald')}
                  </button>
                )}
              </div>
            )
          })()}

          {/* Payment notes */}
          {cleaner.payment_notes && (
            <div className="rounded-[14px] p-3" style={{ background: 'var(--fill)' }}>
              <div className="text-[11px] font-semibold uppercase tracking-[.08em] mb-1.5" style={{ color: 'var(--t3)' }}>
                Betaalinfo
              </div>
              <div className="text-[13px] leading-relaxed" style={{ color: 'var(--t2)' }}>
                {cleaner.payment_notes}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
