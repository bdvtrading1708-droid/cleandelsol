'use client'

import { useState } from 'react'
import { useProperties } from '@/lib/hooks/use-properties'
import { useLocale } from '@/lib/i18n'
import { formatCurrency } from '@/lib/utils'
import { Plus } from 'lucide-react'
import { PropertyPanel } from '@/components/properties/property-panel'
import { PropertyForm } from '@/components/properties/property-form'
import type { Property } from '@/lib/types'

const PROPERTY_ICONS: Record<string, string> = {
  apartment: '🏢',
  house: '🏠',
  villa: '🏡',
  office: '🏬',
  hotel: '🏨',
  airbnb: '🛏️',
}

export default function PropertiesPage() {
  const { data: properties = [], isLoading } = useProperties()
  const { t } = useLocale()
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)
  const [showForm, setShowForm] = useState(false)

  if (isLoading) {
    return <div className="flex items-center justify-center py-20" style={{ color: 'var(--t3)' }}>{t('loading')}</div>
  }

  return (
    <>
      <div className="flex items-center justify-between mt-3.5 mb-4">
        <div className="text-xl font-bold tracking-[-0.5px]" style={{ color: 'var(--t1)' }}>
          {t('props')}
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
          style={{ background: 'var(--t1)', color: 'var(--bg)' }}
        >
          <Plus size={18} strokeWidth={2.5} />
        </button>
      </div>

      {properties.length === 0 ? (
        <div className="text-center py-12" style={{ color: 'var(--t3)' }}>
          <div className="text-sm font-semibold" style={{ color: 'var(--t2)' }}>Geen properties</div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5">
          {properties.map(prop => (
            <div
              key={prop.id}
              className="rounded-[18px] p-4 flex flex-col transition-all cursor-pointer active:scale-[0.98]"
              style={{ background: 'var(--card)', boxShadow: 'var(--shadow)' }}
              onClick={() => setSelectedProperty(prop)}
            >
              <div className="text-[28px] mb-2.5">
                {prop.icon || PROPERTY_ICONS[prop.type] || '🏠'}
              </div>
              <div className="text-[14px] font-bold tracking-[-0.2px] truncate mb-0.5" style={{ color: 'var(--t1)' }}>
                {prop.name}
              </div>
              {prop.address && (
                <div className="text-[11px] leading-snug mb-2.5 line-clamp-2" style={{ color: 'var(--t3)' }}>
                  {prop.address}
                </div>
              )}
              <div className="flex flex-wrap gap-1 mt-auto">
                <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-[.05em]" style={{ background: 'var(--fill)', color: 'var(--t3)' }}>
                  {prop.type || '—'}
                </span>
                {prop.default_price != null && (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold" style={{ background: 'var(--fill)', color: 'var(--t1)' }}>
                    {formatCurrency(prop.default_price)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <PropertyPanel
        property={selectedProperty}
        open={!!selectedProperty}
        onClose={() => setSelectedProperty(null)}
      />

      <PropertyForm
        open={showForm}
        onClose={() => setShowForm(false)}
      />
    </>
  )
}
