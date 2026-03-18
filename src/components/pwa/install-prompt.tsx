'use client'

import { useState, useEffect } from 'react'
import { useLocale } from '@/lib/i18n'
import { X, Download, Share } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const PWA_TRANSLATIONS: Record<string, { title: string; msg: string; btn: string; ios: string; later: string }> = {
  nl: {
    title: 'Installeer de app',
    msg: 'Voeg Clean Del Sol toe aan je startscherm voor snelle toegang.',
    btn: 'Installeren',
    ios: 'Tik op Delen en dan \'Zet op beginscherm\'',
    later: 'Later',
  },
  en: {
    title: 'Install the app',
    msg: 'Add Clean Del Sol to your home screen for quick access.',
    btn: 'Install',
    ios: 'Tap Share then \'Add to Home Screen\'',
    later: 'Later',
  },
  es: {
    title: 'Instalar la app',
    msg: 'Agrega Clean Del Sol a tu pantalla de inicio.',
    btn: 'Instalar',
    ios: 'Toca Compartir y luego \'Agregar a inicio\'',
    later: 'Luego',
  },
  uk: {
    title: 'Встановити додаток',
    msg: 'Додайте Clean Del Sol на головний екран.',
    btn: 'Встановити',
    ios: 'Натисніть Поділитися, потім \'На початковий екран\'',
    later: 'Пізніше',
  },
  ru: {
    title: 'Установить приложение',
    msg: 'Добавьте Clean Del Sol на главный экран.',
    btn: 'Установить',
    ios: 'Нажмите Поделиться, затем \'На экран Домой\'',
    later: 'Позже',
  },
}

export function InstallPrompt() {
  const { locale } = useLocale()
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showBanner, setShowBanner] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  const texts = PWA_TRANSLATIONS[locale] || PWA_TRANSLATIONS.nl

  useEffect(() => {
    // Check if already running as PWA
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as { standalone?: boolean }).standalone === true
    setIsStandalone(standalone)
    if (standalone) return

    // Check if already dismissed
    const dismissed = localStorage.getItem('cds-pwa-dismissed')
    if (dismissed) return

    // Android / Chrome install prompt
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowBanner(true)
    }
    window.addEventListener('beforeinstallprompt', handler)

    // iOS detection — show manual instructions after delay
    const isiOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    if (isiOS && !standalone) {
      setIsIOS(true)
      const timer = setTimeout(() => setShowBanner(true), 5000)
      return () => {
        clearTimeout(timer)
        window.removeEventListener('beforeinstallprompt', handler)
      }
    }

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  // Register service worker (production only)
  useEffect(() => {
    if ('serviceWorker' in navigator && window.location.hostname !== 'localhost') {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const result = await deferredPrompt.userChoice
    if (result.outcome === 'accepted') {
      setShowBanner(false)
    }
    setDeferredPrompt(null)
  }

  const handleDismiss = () => {
    setShowBanner(false)
    localStorage.setItem('cds-pwa-dismissed', '1')
  }

  if (isStandalone || !showBanner) return null

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[9999] p-4 pb-[calc(env(safe-area-inset-bottom)+16px)]"
      style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.5), transparent)' }}
    >
      <div
        className="rounded-[20px] p-4 flex flex-col gap-3 max-w-[420px] mx-auto"
        style={{ background: 'var(--card)', boxShadow: '0 -4px 30px rgba(0,0,0,0.15)' }}
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0" style={{ background: '#000' }}>
            <Download size={18} color="#fff" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[14px] font-bold" style={{ color: 'var(--t1)' }}>{texts.title}</div>
            <div className="text-[12px] mt-0.5" style={{ color: 'var(--t3)' }}>{texts.msg}</div>
          </div>
          <button onClick={handleDismiss} className="shrink-0 mt-0.5" style={{ color: 'var(--t3)' }}>
            <X size={18} />
          </button>
        </div>

        {isIOS ? (
          <div className="flex items-center gap-2 rounded-[12px] px-3 py-2.5" style={{ background: 'var(--fill)' }}>
            <Share size={16} style={{ color: 'var(--blue)' }} />
            <span className="text-[12px] font-medium" style={{ color: 'var(--t2)' }}>{texts.ios}</span>
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={handleDismiss}
              className="flex-1 h-[42px] rounded-[12px] text-[13px] font-semibold"
              style={{ background: 'var(--fill)', color: 'var(--t3)' }}
            >
              {texts.later}
            </button>
            <button
              onClick={handleInstall}
              className="flex-1 h-[42px] rounded-[12px] text-[13px] font-bold"
              style={{ background: '#000', color: '#fff' }}
            >
              {texts.btn}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
