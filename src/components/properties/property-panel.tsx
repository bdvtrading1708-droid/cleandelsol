'use client'

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useLocale } from '@/lib/i18n'
import { useJobs } from '@/lib/hooks/use-jobs'
import { formatCurrency } from '@/lib/utils'
import { MapPin, ChevronRight, FileText } from 'lucide-react'
import type { Property } from '@/lib/types'

interface Props {
  property: Property | null
  open: boolean
  onClose: () => void
}

export function PropertyPanel({ property, open, onClose }: Props) {
  const { t } = useLocale()
  const { data: jobs = [] } = useJobs()

  if (!property) return null

  const propJobs = jobs.filter(j => j.property_id === property.id)
  const totalRevenue = propJobs.reduce((s, j) => s + (j.client_price || 0), 0)
  const completedJobs = propJobs.filter(j => j.status === 'done').length

  const openMaps = () => {
    if (!property.address) return
    const q = encodeURIComponent(property.address)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    window.open(isIOS ? `maps://maps.apple.com/?q=${q}` : `https://www.google.com/maps/search/?api=1&query=${q}`, '_blank')
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="bottom"
        className="rounded-t-[24px] p-0 max-h-[85vh] overflow-y-auto border-0"
        style={{ background: 'var(--bg2)' }}
      >
        <SheetHeader className="px-5 pt-5 pb-0">
          <div className="flex items-start gap-3">
            <div className="text-[32px]">{property.icon || '🏠'}</div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-[20px] font-bold tracking-[-0.5px] text-left" style={{ color: 'var(--t1)' }}>
                {property.name}
              </SheetTitle>
              {property.type && (
                <div className="text-[12px] mt-0.5" style={{ color: 'var(--t3)' }}>
                  {property.type} {property.owner_name ? `· ${property.owner_name}` : ''}
                </div>
              )}
            </div>
          </div>
        </SheetHeader>

        <div className="px-5 pb-5 mt-4 flex flex-col gap-3">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-[14px] p-3 text-center" style={{ background: 'var(--fill)' }}>
              <div className="text-[10px] font-semibold uppercase tracking-[.08em] mb-0.5" style={{ color: 'var(--t3)' }}>{t('price')}</div>
              <div className="text-[16px] font-bold tracking-[-0.3px]" style={{ color: 'var(--t1)' }}>
                {formatCurrency(property.default_price || property.fixed_price || 0)}
              </div>
            </div>
            <div className="rounded-[14px] p-3 text-center" style={{ background: 'var(--fill)' }}>
              <div className="text-[10px] font-semibold uppercase tracking-[.08em] mb-0.5" style={{ color: 'var(--t3)' }}>{t('revenue')}</div>
              <div className="text-[16px] font-bold tracking-[-0.3px]" style={{ color: 'var(--t1)' }}>
                {formatCurrency(totalRevenue)}
              </div>
            </div>
            <div className="rounded-[14px] p-3 text-center" style={{ background: 'var(--fill)' }}>
              <div className="text-[10px] font-semibold uppercase tracking-[.08em] mb-0.5" style={{ color: 'var(--t3)' }}>{t('jobs')}</div>
              <div className="text-[16px] font-bold tracking-[-0.3px]" style={{ color: 'var(--t1)' }}>
                {completedJobs}/{propJobs.length}
              </div>
            </div>
          </div>

          {/* Address */}
          {property.address && (
            <button
              onClick={openMaps}
              className="flex items-center gap-2.5 rounded-[14px] p-3 text-left w-full transition-colors"
              style={{ background: 'var(--fill)' }}
            >
              <MapPin size={16} style={{ color: 'var(--blue)' }} />
              <span className="flex-1 text-[13px] font-medium truncate" style={{ color: 'var(--t1)' }}>
                {property.address}
              </span>
              <ChevronRight size={14} style={{ color: 'var(--t3)' }} />
            </button>
          )}

          {/* Notes */}
          {property.notes && (
            <div className="rounded-[14px] p-3" style={{ background: 'var(--fill)' }}>
              <div className="flex items-center gap-2 mb-1.5">
                <FileText size={14} style={{ color: 'var(--t3)' }} />
                <span className="text-[11px] font-semibold uppercase tracking-[.08em]" style={{ color: 'var(--t3)' }}>{t('notes')}</span>
              </div>
              <div className="text-[13px] leading-relaxed" style={{ color: 'var(--t2)' }}>
                {property.notes}
              </div>
            </div>
          )}

          {/* Pricing info */}
          <div className="rounded-[14px] p-3" style={{ background: 'var(--fill)' }}>
            <div className="text-[11px] font-semibold uppercase tracking-[.08em] mb-2" style={{ color: 'var(--t3)' }}>
              Pricing
            </div>
            <div className="flex justify-between text-[13px]">
              <span style={{ color: 'var(--t3)' }}>Type</span>
              <span className="font-semibold" style={{ color: 'var(--t1)' }}>
                {property.pricing_type === 'fixed' ? 'Vast bedrag' : 'Per uur'}
              </span>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
