'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLocale } from '@/lib/i18n'
import { toast } from 'sonner'

export default function ResetPasswordPage() {
  const router = useRouter()
  const { t } = useLocale()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (newPassword.length < 6) {
      setError('Wachtwoord moet minimaal 6 tekens zijn')
      return
    }

    if (newPassword !== confirmPassword) {
      setError(t('passNoMatch') || 'Wachtwoorden komen niet overeen')
      return
    }

    setLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password: newPassword })

      if (error) {
        setError(error.message)
      } else {
        toast.success(t('resetSuccess') || 'Wachtwoord gewijzigd!')
        await supabase.auth.signOut()
        router.push('/login')
      }
    } catch {
      setError('Er ging iets mis')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    width: '100%',
    padding: '14px 16px',
    background: 'var(--inp)',
    border: '1.5px solid var(--border)',
    borderRadius: 14,
    fontSize: 15,
    color: 'var(--t1)',
    outline: 'none',
    boxSizing: 'border-box' as const,
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg)',
        padding: '24px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 340,
          background: 'var(--card)',
          borderRadius: 28,
          padding: '32px 24px',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <h1
          style={{
            textAlign: 'center',
            fontSize: 22,
            fontWeight: 300,
            letterSpacing: '0.25em',
            color: 'var(--t1)',
            marginBottom: 8,
          }}
        >
          CLEAN DEL SOL
        </h1>

        <h2
          style={{
            textAlign: 'center',
            fontSize: 16,
            fontWeight: 600,
            color: 'var(--t2)',
            marginBottom: 24,
          }}
        >
          {t('resetPass') || 'Nieuw wachtwoord instellen'}
        </h2>

        <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="password"
            placeholder={t('newPass') || 'Nieuw wachtwoord'}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            style={inputStyle}
          />

          <input
            type="password"
            placeholder={t('confirmPass') || 'Bevestig wachtwoord'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            style={inputStyle}
          />

          {error && (
            <p style={{ color: '#e74c3c', fontSize: 13, textAlign: 'center', margin: 0 }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              background: 'var(--t1)',
              color: 'var(--bg)',
              border: 'none',
              borderRadius: 100,
              fontSize: 15,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              transition: 'opacity 0.2s',
              marginTop: 4,
            }}
          >
            {loading ? t('loading') : (t('resetPass') || 'Wachtwoord instellen')}
          </button>
        </form>
      </div>
    </div>
  )
}
