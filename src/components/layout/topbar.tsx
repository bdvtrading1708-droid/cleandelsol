'use client'

import { useLocale, LOCALES, type Locale } from '@/lib/i18n'
import { useTheme } from '@/providers/theme-provider'
import { usePathname } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import { Menu, Moon, Sun } from 'lucide-react'

export function Topbar() {
  const { t, locale, setLocale } = useLocale()
  const { theme, toggleTheme } = useTheme()
  const pathname = usePathname()
  const [langOpen, setLangOpen] = useState(false)
  const langRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Determine current page title
  const getTitle = () => {
    if (pathname.includes('dashboard')) return t('home')
    if (pathname.includes('calendar')) return t('planning')
    if (pathname.includes('jobs')) return t('jobs')
    if (pathname.includes('properties')) return t('props')
    if (pathname.includes('cleaners')) return t('cleaners')
    if (pathname.includes('financial')) return t('fin')
    if (pathname.includes('my-jobs')) return t('myJobs')
    if (pathname.includes('my-earnings')) return t('myEarn')
    if (pathname.includes('settings')) return t('settings')
    return t('home')
  }

  const currentLocale = LOCALES.find(l => l.code === locale) || LOCALES[0]

  return (
    <div
      className="sticky top-0 z-[100] flex items-center gap-2.5 px-3.5 shrink-0 backdrop-blur-[20px] border-b"
      style={{
        height: 'calc(50px + var(--safe-t))',
        paddingTop: 'var(--safe-t)',
        background: 'var(--topbar)',
        borderColor: 'var(--border)',
      }}
    >
      {/* Hamburger (mobile only) */}
      <button
        className="w-[30px] h-[30px] rounded-[10px] flex items-center justify-center cursor-pointer md:hidden"
        style={{ background: 'var(--fill)', color: 'var(--t1)' }}
        onClick={() => window.dispatchEvent(new Event('toggle-sidebar'))}
      >
        <Menu size={16} />
      </button>

      {/* Logo (desktop only) */}
      <div className="hidden md:block text-[11px] font-light tracking-[3px] uppercase" style={{ color: 'var(--t1)', fontFamily: "'Gill Sans', 'Century Gothic', Futura, sans-serif" }}>
        CLEAN DEL SOL
      </div>

      {/* Title */}
      <div
        className="text-[15px] font-bold flex-1 truncate"
        style={{ color: 'var(--t1)', letterSpacing: '-0.2px' }}
      >
        {getTitle()}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Language */}
        <div className="relative" ref={langRef}>
          <button
            className="h-7 px-2.5 rounded-full flex items-center gap-1 text-[11px] font-semibold cursor-pointer border"
            style={{ background: 'var(--fill)', borderColor: 'var(--border)', color: 'var(--t2)' }}
            onClick={() => setLangOpen(!langOpen)}
          >
            <span>{currentLocale.flag}</span>
            <span>{currentLocale.short}</span>
          </button>
          {langOpen && (
            <div
              className="absolute top-[calc(100%+6px)] right-0 min-w-[150px] rounded-[18px] border overflow-hidden z-[500]"
              style={{ background: 'var(--modal)', borderColor: 'var(--border2)', boxShadow: 'var(--shadow-lg)' }}
            >
              {LOCALES.map(l => (
                <div
                  key={l.code}
                  className="flex items-center gap-2 px-3 py-2.5 cursor-pointer text-[13px] font-medium transition-colors"
                  style={{
                    color: locale === l.code ? 'var(--t1)' : 'var(--t2)',
                    fontWeight: locale === l.code ? 700 : 500,
                  }}
                  onClick={() => {
                    setLocale(l.code)
                    setLangOpen(false)
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--fill)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <span>{l.flag}</span>
                  <span>{l.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Theme toggle */}
        <button
          className="w-7 h-7 rounded-full flex items-center justify-center cursor-pointer border"
          style={{ background: 'var(--fill)', borderColor: 'var(--border)', color: 'var(--t2)' }}
          onClick={toggleTheme}
        >
          {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
        </button>
      </div>
    </div>
  )
}
