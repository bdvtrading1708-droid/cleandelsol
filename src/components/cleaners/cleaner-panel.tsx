'use client'

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useLocale } from '@/lib/i18n'
import { useJobs } from '@/lib/hooks/use-jobs'
import { formatCurrency } from '@/lib/utils'
import { Phone, Mail } from 'lucide-react'
import type { User } from '@/lib/types'

interface Props {
  cleaner: User | null
  open: boolean
  onClose: () => void
}

export function CleanerPanel({ cleaner, open, onClose }: Props) {
  const { t } = useLocale()
  const { data: jobs = [] } = useJobs()

  if (!cleaner) return null

  const cleanerJobs = jobs.filter(j => j.cleaner_id === cleaner.id)
  const totalEarned = cleanerJobs
    .filter(j => j.status === 'done')
    .reduce((s, j) => s + (j.cleaner_payout || 0), 0)
  const outstanding = cleanerJobs
    .filter(j => j.status === 'delivered')
    .reduce((s, j) => s + (j.cleaner_payout || 0), 0)
  const totalHours = cleanerJobs.reduce((s, j) => s + (j.hours_worked || 0), 0)
  const totalKm = cleanerJobs.reduce((s, j) => s + (j.km_driven || 0), 0)

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="bottom"
        className="rounded-t-[24px] p-0 max-h-[85vh] overflow-y-auto border-0"
        style={{ background: 'var(--bg2)' }}
      >
        <SheetHeader className="px-5 pt-5 pb-0">
          <div className="flex items-center gap-3">
            <div
              className="w-[52px] h-[52px] rounded-full flex items-center justify-center text-xl font-bold text-white shrink-0"
              style={{ background: 'var(--hero-bg)' }}
            >
              {(cleaner.name || '?')[0].toUpperCase()}
            </div>
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
