'use client'

import { useLocale } from '@/lib/i18n'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Send, Check, KeyRound } from 'lucide-react'
import type { User } from '@/lib/types'

interface Props {
  cleaner: User
  onPasswordReset?: (creds: { name: string; email: string; password: string }) => void
}

export function CleanerAccount({ cleaner, onPasswordReset }: Props) {
  const { t } = useLocale()
  const queryClient = useQueryClient()

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
    onError: (err: Error) => { toast.error(err.message) },
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
      if (onPasswordReset) {
        onPasswordReset({ name: cleaner.name, email: cleaner.email, password: data.password })
      }
    },
    onError: (err: Error) => { toast.error(err.message) },
  })

  return (
    <div>
      <div className="text-[15px] font-bold tracking-[-0.3px] mb-3" style={{ color: 'var(--t1)' }}>
        Account
      </div>

      <div className="rounded-[18px] overflow-hidden" style={{ background: 'var(--card)', boxShadow: 'var(--shadow)' }}>
        {/* Payment notes */}
        {cleaner.payment_notes && (
          <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="text-[10px] font-semibold uppercase tracking-[.08em] mb-1" style={{ color: 'var(--t3)' }}>
              Betaalinfo
            </div>
            <div className="text-[13px] leading-relaxed" style={{ color: 'var(--t2)' }}>
              {cleaner.payment_notes}
            </div>
          </div>
        )}

        {/* Send welcome email */}
        <button
          onClick={() => sendWelcome.mutate(cleaner.id)}
          disabled={sendWelcome.isPending}
          className="flex items-center gap-3 px-4 py-3.5 text-left w-full transition-colors"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          {cleaner.welcome_email_sent ? (
            <Check size={18} style={{ color: 'var(--green)' }} />
          ) : (
            <Send size={18} style={{ color: 'var(--t2)' }} />
          )}
          <span className="flex-1 text-[13px] font-medium" style={{ color: cleaner.welcome_email_sent ? 'var(--t3)' : 'var(--t1)' }}>
            {sendWelcome.isPending
              ? t('loading')
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
          className="flex items-center gap-3 px-4 py-3.5 text-left w-full transition-colors"
        >
          <KeyRound size={18} style={{ color: 'var(--t2)' }} />
          <span className="flex-1 text-[13px] font-medium" style={{ color: 'var(--t1)' }}>
            {resetPassword.isPending ? t('loading') : (t('resetPass') || 'Wachtwoord resetten')}
          </span>
        </button>
      </div>
    </div>
  )
}
