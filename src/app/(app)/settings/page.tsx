'use client'

import { useLocale, LOCALES } from '@/lib/i18n'
import { useAuth } from '@/providers/auth-provider'
import { useEffect, useState } from 'react'

export default function SettingsPage() {
  const { locale, setLocale, t } = useLocale()
  const { user, logout } = useAuth()
  const [theme, setThemeState] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    const saved = localStorage.getItem('cds-theme') as 'light' | 'dark' | null
    if (saved) setThemeState(saved)
    else if (window.matchMedia('(prefers-color-scheme: dark)').matches) setThemeState('dark')
  }, [])

  const toggleTheme = (next: 'light' | 'dark') => {
    setThemeState(next)
    localStorage.setItem('cds-theme', next)
    document.documentElement.setAttribute('data-theme', next)
  }

  return (
    <>
      <div className="flex items-center justify-between mt-3.5 mb-4">
        <div className="text-xl font-bold tracking-[-0.5px]" style={{ color: 'var(--t1)' }}>
          {t('settings')}
        </div>
      </div>

      {/* User info */}
      {user && (
        <div
          className="rounded-[18px] p-4 mb-3 flex items-center gap-3"
          style={{ background: 'var(--card)', boxShadow: 'var(--shadow)' }}
        >
          <div
            className="w-[44px] h-[44px] rounded-full flex items-center justify-center text-lg font-bold text-white shrink-0"
            style={{ background: 'var(--hero-bg)' }}
          >
            {(user.name || '?')[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[15px] font-bold tracking-[-0.2px] truncate" style={{ color: 'var(--t1)' }}>{user.name}</div>
            <div className="text-[12px] truncate" style={{ color: 'var(--t3)' }}>{user.email}</div>
            <div
              className="text-[10px] font-bold uppercase tracking-[.06em] mt-0.5"
              style={{ color: 'var(--t3)' }}
            >
              {user.role}
            </div>
          </div>
        </div>
      )}

      {/* Theme toggle */}
      <div
        className="rounded-[18px] p-4 mb-3"
        style={{ background: 'var(--card)', boxShadow: 'var(--shadow)' }}
      >
        <div className="text-[12px] font-bold uppercase tracking-[.08em] mb-3" style={{ color: 'var(--t3)' }}>
          Thema
        </div>
        <div className="flex gap-2">
          <button
            className="flex-1 rounded-[14px] p-3 text-center transition-all"
            style={{
              background: theme === 'light' ? 'var(--t1)' : 'var(--fill)',
              color: theme === 'light' ? 'var(--bg)' : 'var(--t3)',
            }}
            onClick={() => toggleTheme('light')}
          >
            <div className="text-[20px] mb-1">☀️</div>
            <div className="text-[11px] font-semibold">Light</div>
          </button>
          <button
            className="flex-1 rounded-[14px] p-3 text-center transition-all"
            style={{
              background: theme === 'dark' ? 'var(--t1)' : 'var(--fill)',
              color: theme === 'dark' ? 'var(--bg)' : 'var(--t3)',
            }}
            onClick={() => toggleTheme('dark')}
          >
            <div className="text-[20px] mb-1">🌙</div>
            <div className="text-[11px] font-semibold">Dark</div>
          </button>
        </div>
      </div>

      {/* Language selection */}
      <div
        className="rounded-[18px] p-4 mb-3"
        style={{ background: 'var(--card)', boxShadow: 'var(--shadow)' }}
      >
        <div className="text-[12px] font-bold uppercase tracking-[.08em] mb-3" style={{ color: 'var(--t3)' }}>
          Taal
        </div>
        <div className="flex flex-col gap-1">
          {LOCALES.map(loc => (
            <button
              key={loc.code}
              className="flex items-center gap-3 w-full rounded-[14px] px-4 py-3 text-left transition-all"
              style={{
                background: locale === loc.code ? 'var(--t1)' : 'var(--fill)',
                color: locale === loc.code ? 'var(--bg)' : 'var(--t1)',
              }}
              onClick={() => setLocale(loc.code)}
            >
              <span className="text-[18px]">{loc.flag}</span>
              <span className="text-[13px] font-semibold flex-1">{loc.label}</span>
              {locale === loc.code && (
                <span className="text-[13px] font-bold">✓</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Logout */}
      <button
        className="w-full rounded-[18px] p-4 text-center text-[14px] font-bold transition-all"
        style={{ background: '#FF3B30', color: '#fff' }}
        onClick={logout}
      >
        {t('logout')}
      </button>
    </>
  )
}
