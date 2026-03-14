'use client'

import { useState, useMemo } from 'react'
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
  const [editProperty, setEditProperty] = useState<Property | null>(null)
  const [filter, setFilter] = useState<string>('all')

  // Group properties by partner, sorted by count (most properties first)
  const partnerGroups = useMemo(() => {
    const groups: Record<string, { name: string; properties: Property[] }> = {}
    const noPartner: Property[] = []

    properties.forEach(prop => {
      if (prop.partner?.id) {
        if (!groups[prop.partner.id]) {
          groups[prop.partner.id] = { name: prop.partner.name, properties: [] }
        }
        groups[prop.partner.id].properties.push(prop)
      } else {
        noPartner.push(prop)
      }
    })

    // Sort by property count descending
    const sorted = Object.entries(groups)
      .sort((a, b) => b[1].properties.length - a[1].properties.length)
      .map(([id, group]) => ({ id, ...group }))

    if (noPartner.length > 0) {
      sorted.push({ id: 'none', name: 'Zonder partner', properties: noPartner })
    }

    return sorted
  }, [properties])

  // Get unique partner names for filter
  const partnerFilters = useMemo(() => {
    return partnerGroups
      .filter(g => g.id !== 'none')
      .map(g => ({ id: g.id, name: g.name, count: g.properties.length }))
  }, [partnerGroups])

  // Filter properties
  const filteredGroups = useMemo(() => {
    if (filter === 'all') return partnerGroups
    return partnerGroups.filter(g => g.id === filter)
  }, [partnerGroups, filter])

  if (isLoading) {
    return <div className="flex items-center justify-center py-20" style={{ color: 'var(--t3)' }}>{t('loading')}</div>
  }

  return (
    <>
      <div className="flex items-center justify-between mt-3.5 mb-4">
        <div className="text-xl font-bold tracking-[-0.5px]" style={{ color: 'var(--t1)' }}>
          {t('props')}
          <span className="text-[13px] font-normal ml-2" style={{ color: 'var(--t3)' }}>
            {properties.length}
          </span>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
          style={{ background: 'var(--t1)', color: 'var(--bg)' }}
        >
          <Plus size={18} strokeWidth={2.5} />
        </button>
      </div>

      {/* Partner filter */}
      {partnerFilters.length > 0 && (
        <div className="flex gap-1 mb-4 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          <button
            className="px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all shrink-0"
            style={{
              background: filter === 'all' ? 'var(--t1)' : 'var(--fill)',
              color: filter === 'all' ? 'var(--bg)' : 'var(--t3)',
            }}
            onClick={() => setFilter('all')}
          >
            Alles ({properties.length})
          </button>
          {partnerFilters.map(p => (
            <button
              key={p.id}
              className="px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all shrink-0"
              style={{
                background: filter === p.id ? 'var(--t1)' : 'var(--fill)',
                color: filter === p.id ? 'var(--bg)' : 'var(--t3)',
              }}
              onClick={() => setFilter(p.id)}
            >
              {p.name} ({p.count})
            </button>
          ))}
        </div>
      )}

      {properties.length === 0 ? (
        <div className="text-center py-12" style={{ color: 'var(--t3)' }}>
          <div className="text-sm font-semibold" style={{ color: 'var(--t2)' }}>Geen properties</div>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {filteredGroups.map(group => (
            <div key={group.id}>
              {/* Partner section header */}
              {filter === 'all' && (
                <div className="flex items-center gap-2 mb-2.5">
                  <div
                    className="text-[13px] font-bold tracking-[-0.2px]"
                    style={{ color: 'var(--t1)' }}
                  >
                    {group.name}
                  </div>
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                    style={{ background: 'var(--fill)', color: 'var(--t3)' }}
                  >
                    {group.properties.length}
                  </span>
                  <div className="flex-1 h-[1px]" style={{ background: 'var(--border)' }} />
                </div>
              )}

              {/* Property cards grid */}
              <div className="grid grid-cols-4 gap-1.5">
                {group.properties.map(prop => (
                  <div
                    key={prop.id}
                    className="rounded-[10px] overflow-hidden flex flex-col transition-all cursor-pointer active:scale-[0.97]"
                    style={{ background: 'var(--card)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
                    onClick={() => setSelectedProperty(prop)}
                  >
                    {prop.image_url ? (
                      <div className="w-full aspect-[4/3] overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={prop.image_url} alt={prop.name} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-full aspect-[4/3] flex items-center justify-center text-[22px]" style={{ background: 'var(--fill)' }}>
                        {prop.icon || PROPERTY_ICONS[prop.type] || '🏠'}
                      </div>
                    )}
                    <div className="px-1.5 py-1 flex flex-col flex-1">
                      <div className="text-[10px] font-semibold tracking-[-0.2px] line-clamp-1 leading-tight" style={{ color: 'var(--t1)' }}>
                        {prop.name}
                      </div>
                      {prop.default_price != null && (
                        <div className="text-[9px] font-medium mt-0.5" style={{ color: 'var(--t3)' }}>
                          {formatCurrency(prop.default_price)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <PropertyPanel
        property={selectedProperty}
        open={!!selectedProperty}
        onClose={() => setSelectedProperty(null)}
        onEdit={(prop) => {
          setSelectedProperty(null)
          setTimeout(() => setEditProperty(prop), 300)
        }}
      />

      <PropertyForm
        open={showForm || !!editProperty}
        onClose={() => { setShowForm(false); setEditProperty(null) }}
        editProperty={editProperty}
      />
    </>
  )
}
