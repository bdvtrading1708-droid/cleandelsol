'use client'

import { useState, useEffect, useCallback } from 'react'
import nl from '@/messages/nl.json'
import en from '@/messages/en.json'
import es from '@/messages/es.json'
import uk from '@/messages/uk.json'
import ru from '@/messages/ru.json'

const messages: Record<string, Record<string, unknown>> = { nl, en, es, uk, ru }

export type Locale = 'nl' | 'en' | 'es' | 'uk' | 'ru'

export const LOCALES: { code: Locale; flag: string; label: string; short: string }[] = [
  { code: 'nl', flag: '🇳🇱', label: 'Nederlands', short: 'NL' },
  { code: 'en', flag: '🇬🇧', label: 'English', short: 'EN' },
  { code: 'es', flag: '🇪🇸', label: 'Español', short: 'ES' },
  { code: 'uk', flag: '🇺🇦', label: 'Українська', short: 'UA' },
  { code: 'ru', flag: '🇷🇺', label: 'Русский', short: 'RU' },
]

export function getLocale(): Locale {
  if (typeof window === 'undefined') return 'nl'
  return (localStorage.getItem('cds-lang') as Locale) || 'nl'
}

export function setLocale(locale: Locale) {
  localStorage.setItem('cds-lang', locale)
  window.dispatchEvent(new Event('locale-change'))
}

export function t(key: string, locale?: Locale): string {
  const l = locale || getLocale()
  const msg = messages[l] || messages.nl
  return (msg[key] as string) || (messages.nl[key] as string) || key
}

export function tArray(key: string, locale?: Locale): string[] {
  const l = locale || getLocale()
  const msg = messages[l] || messages.nl
  return (msg[key] as string[]) || (messages.nl[key] as string[]) || []
}

export function useLocale() {
  const [locale, setLocaleState] = useState<Locale>('nl')

  useEffect(() => {
    setLocaleState(getLocale())
    const handler = () => setLocaleState(getLocale())
    window.addEventListener('locale-change', handler)
    window.addEventListener('storage', handler)
    return () => {
      window.removeEventListener('locale-change', handler)
      window.removeEventListener('storage', handler)
    }
  }, [])

  const changeLocale = useCallback((l: Locale) => {
    setLocale(l)
    setLocaleState(l)
  }, [])

  return {
    locale,
    setLocale: changeLocale,
    t: (key: string) => t(key, locale),
    tArray: (key: string) => tArray(key, locale),
  }
}
