'use client'

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useLocale } from '@/lib/i18n'
import { useJobs } from '@/lib/hooks/use-jobs'
import { formatCurrency } from '@/lib/utils'
import { Phone, Mail, Camera, Pencil, Banknote } from 'lucide-react'
import { CleanerAvatar } from '@/components/cleaners/cleaner-avatar'
import { createClient } from '@/lib/supabase/client'
import { useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { useCleanerPayments, useCreateCleanerPayment } from '@/lib/hooks/use-cleaner-payments'
import type { User } from '@/lib/types'

interface Props {
  cleaner: User | null
  open: boolean
  onClose: () => void
  onEdit?: (cleaner: User) => void
}

export function CleanerPanel({ cleaner, open, onClose, onEdit }: Props) {
  const { t } = useLocale()
  const { data: jobs = [] } = useJobs()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [showCashForm, setShowCashForm] = useState(false)
  const [cashAmount, setCashAmount] = useState('')
  const [cashNote, setCashNote] = useState('')
  const { data: payments = [] } = useCleanerPayments(cleaner?.id)
  const createPayment = useCreateCleanerPayment()

  if (!cleaner) return null

  const cleanerJobs = jobs.filter(j => j.cleaner_id === cleaner.id)
  const totalEarned = cleanerJobs
    .filter(j => j.status === 'done')
    .reduce((s, j) => s + (j.cleaner_payout || 0), 0)
  const outstandingJobs = cleanerJobs
    .filter(j => j.status === 'delivered')
    .reduce((s, j) => s + (j.cleaner_payout || 0), 0)
  const totalCashPaid = payments.reduce((s, p) => s + p.amount, 0)
  const outstanding = Math.max(0, outstandingJobs - totalCashPaid)
  const totalHours = cleanerJobs.reduce((s, j) => s + (j.hours_worked || 0), 0)

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

          {/* Cash payment button & form */}
          {outstanding > 0 && (
            <div>
              {!showCashForm ? (
                <button
                  onClick={() => setShowCashForm(true)}
                  className="w-full h-[44px] rounded-[14px] text-[13px] font-semibold flex items-center justify-center gap-2 transition-all"
                  style={{ background: '#FF990015', color: '#FF9900', border: '1px solid #FF990030' }}
                >
                  <Banknote size={16} />
                  Cash betalen
                </button>
              ) : (
                <div className="rounded-[14px] p-3.5 flex flex-col gap-2.5" style={{ background: 'var(--fill)' }}>
                  <div className="text-[11px] font-semibold uppercase tracking-[.08em]" style={{ color: 'var(--t3)' }}>
                    Cash betaling
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={cashAmount}
                    onChange={(e) => setCashAmount(e.target.value)}
                    placeholder={`Max ${formatCurrency(outstanding)}`}
                    className="w-full h-[42px] rounded-[12px] px-3 text-[14px] font-medium border-0 outline-none"
                    style={{ background: 'var(--inp)', color: 'var(--t1)' }}
                  />
                  <input
                    type="text"
                    value={cashNote}
                    onChange={(e) => setCashNote(e.target.value)}
                    placeholder="Notitie (optioneel)"
                    className="w-full h-[42px] rounded-[12px] px-3 text-[14px] font-medium border-0 outline-none"
                    style={{ background: 'var(--inp)', color: 'var(--t1)' }}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setShowCashForm(false); setCashAmount(''); setCashNote('') }}
                      className="flex-1 h-[42px] rounded-[12px] text-[13px] font-semibold"
                      style={{ background: 'var(--inp)', color: 'var(--t2)' }}
                    >
                      Annuleren
                    </button>
                    <button
                      onClick={() => {
                        const amount = parseFloat(cashAmount)
                        if (!amount || amount <= 0) return
                        createPayment.mutate({
                          cleaner_id: cleaner.id,
                          amount,
                          note: cashNote || 'Cash betaling',
                        }, {
                          onSuccess: () => {
                            setShowCashForm(false)
                            setCashAmount('')
                            setCashNote('')
                          },
                        })
                      }}
                      disabled={!cashAmount || parseFloat(cashAmount) <= 0 || createPayment.isPending}
                      className="flex-1 h-[42px] rounded-[12px] text-[13px] font-bold"
                      style={{
                        background: '#FF9900',
                        color: '#fff',
                        opacity: (!cashAmount || parseFloat(cashAmount) <= 0 || createPayment.isPending) ? 0.5 : 1,
                      }}
                    >
                      {createPayment.isPending ? 'Bezig...' : 'Betalen'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Cash payment history */}
          {payments.length > 0 && (
            <div className="rounded-[14px] p-3" style={{ background: 'var(--fill)' }}>
              <div className="text-[11px] font-semibold uppercase tracking-[.08em] mb-2" style={{ color: 'var(--t3)' }}>
                Betalingen cash
              </div>
              <div className="flex flex-col gap-1.5">
                {payments.map(p => (
                  <div key={p.id} className="flex items-center justify-between text-[13px]">
                    <div className="flex items-center gap-2">
                      <span style={{ color: 'var(--t2)' }}>
                        {new Date(p.created_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}
                      </span>
                      {p.note && <span style={{ color: 'var(--t3)' }}>· {p.note}</span>}
                    </div>
                    <span className="font-semibold" style={{ color: 'var(--green)' }}>
                      {formatCurrency(p.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

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
