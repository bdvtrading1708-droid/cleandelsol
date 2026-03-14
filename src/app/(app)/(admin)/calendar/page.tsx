'use client'

import { useLocale } from '@/lib/i18n'

export default function CalendarPage() {
  const { t } = useLocale()

  return (
    <>
      <div className="flex items-center justify-between mt-3.5 mb-4">
        <div className="text-xl font-bold tracking-[-0.5px]" style={{ color: 'var(--t1)' }}>
          {t('planning')}
        </div>
      </div>

      <div
        className="rounded-[22px] p-8 flex flex-col items-center justify-center text-center"
        style={{ background: 'var(--card)', boxShadow: 'var(--shadow)', minHeight: 320 }}
      >
        <div className="text-[48px] mb-4">📅</div>
        <div className="text-lg font-bold tracking-[-0.3px] mb-1" style={{ color: 'var(--t1)' }}>
          Coming soon
        </div>
        <div className="text-sm" style={{ color: 'var(--t3)' }}>
          {t('planning')} — drag & drop kalender wordt binnenkort toegevoegd.
        </div>
      </div>
    </>
  )
}
