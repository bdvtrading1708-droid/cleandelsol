'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLocale, LOCALES, type Locale } from '@/lib/i18n'

export default function LoginPage() {
  const router = useRouter()
  const { locale, setLocale, t } = useLocale()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const supabase = createClient()

      const { data: signInData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        console.error('Sign in error:', authError.message)
        setError(t('loginErr'))
        setLoading(false)
        return
      }

      // Use the user from signInWithPassword response directly
      const authUser = signInData.user

      if (!authUser) {
        console.error('No user in sign in response')
        setError(t('loginErr'))
        setLoading(false)
        return
      }

      const { data: dbUser } = await supabase
        .from('users')
        .select('role, language')
        .eq('id', authUser.id)
        .single()

      if (dbUser?.language) {
        setLocale(dbUser.language as Locale)
      }

      if (dbUser?.role === 'admin') {
        router.push('/dashboard')
      } else {
        router.push('/my-jobs')
      }
    } catch (err) {
      console.error('Login catch error:', err)
      setError(t('loginErr'))
      setLoading(false)
    }
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
        {/* Logo */}
        <h1
          style={{
            textAlign: 'center',
            fontSize: 22,
            fontWeight: 300,
            letterSpacing: '0.25em',
            color: 'var(--t1)',
            marginBottom: 28,
          }}
        >
          CLEAN DEL SOL
        </h1>

        {/* Language selector */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 6,
            marginBottom: 24,
          }}
        >
          {LOCALES.map((loc) => (
            <button
              key={loc.code}
              onClick={() => setLocale(loc.code)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '6px 10px',
                borderRadius: 100,
                border: locale === loc.code ? '1.5px solid var(--t1)' : '1.5px solid var(--border)',
                background: locale === loc.code ? 'var(--t1)' : 'transparent',
                color: locale === loc.code ? 'var(--bg)' : 'var(--t2)',
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <span>{loc.flag}</span>
              <span>{loc.short}</span>
            </button>
          ))}
        </div>

        {/* Login form */}
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="email"
            placeholder={t('email')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '14px 16px',
              background: 'var(--inp)',
              border: '1.5px solid var(--border)',
              borderRadius: 14,
              fontSize: 15,
              color: 'var(--t1)',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />

          <input
            type="password"
            placeholder={t('pass')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '14px 16px',
              background: 'var(--inp)',
              border: '1.5px solid var(--border)',
              borderRadius: 14,
              fontSize: 15,
              color: 'var(--t1)',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />

          {error && (
            <p
              style={{
                color: '#e74c3c',
                fontSize: 13,
                textAlign: 'center',
                margin: 0,
              }}
            >
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
            {loading ? t('loading') : t('login')}
          </button>
        </form>

        {/* Demo hint */}
        <p
          style={{
            textAlign: 'center',
            fontSize: 12,
            color: 'var(--t3)',
            marginTop: 20,
            lineHeight: 1.5,
          }}
        >
          Demo: admin@cleandelsol.com / demo1234
        </p>
      </div>
    </div>
  )
}
