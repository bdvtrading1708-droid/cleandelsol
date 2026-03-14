'use client'

import { useState } from 'react'
import { usePartners } from '@/lib/hooks/use-partners'
import { useProperties } from '@/lib/hooks/use-properties'
import { useLocale } from '@/lib/i18n'
import { Plus } from 'lucide-react'
import { PartnerPanel } from '@/components/partners/partner-panel'
import { PartnerForm } from '@/components/partners/partner-form'
import { CleanerAvatar } from '@/components/cleaners/cleaner-avatar'
import type { Partner } from '@/lib/types'

export default function PartnersPage() {
  const { data: partners = [], isLoading } = usePartners()
  const { data: properties = [] } = useProperties()
  const { t } = useLocale()
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null)
  const [showForm, setShowForm] = useState(false)

  if (isLoading) {
    return <div className="flex items-center justify-center py-20" style={{ color: 'var(--t3)' }}>{t('loading')}</div>
  }

  return (
    <>
      <div className="flex items-center justify-between mt-3.5 mb-4">
        <div className="text-xl font-bold tracking-[-0.5px]" style={{ color: 'var(--t1)' }}>
          {t('partners')}
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
          style={{ background: 'var(--t1)', color: 'var(--bg)' }}
        >
          <Plus size={18} strokeWidth={2.5} />
        </button>
      </div>

      {partners.length === 0 ? (
        <div className="text-center py-12" style={{ color: 'var(--t3)' }}>
          <div className="text-sm font-semibold" style={{ color: 'var(--t2)' }}>Geen partners</div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5">
          {partners.map(partner => {
            const partnerProps = properties.filter(p => p.partner_id === partner.id)

            return (
              <div
                key={partner.id}
                className="rounded-[18px] p-4 flex flex-col transition-all cursor-pointer active:scale-[0.98]"
                style={{ background: 'var(--card)', boxShadow: 'var(--shadow)' }}
                onClick={() => setSelectedPartner(partner)}
              >
                <CleanerAvatar
                  src={partner.avatar_url}
                  name={partner.name}
                  size={44}
                  className="mb-3"
                />
                <div className="text-[14px] font-bold tracking-[-0.2px] truncate mb-0.5" style={{ color: 'var(--t1)' }}>
                  {partner.name}
                </div>
                {partner.phone && (
                  <div className="text-[11px] mb-2 truncate" style={{ color: 'var(--t3)' }}>
                    {partner.phone}
                  </div>
                )}
                <div className="flex justify-between items-baseline mt-auto">
                  <div className="text-[10px] font-semibold" style={{ color: 'var(--t3)' }}>Properties</div>
                  <div className="text-[12px] font-bold" style={{ color: 'var(--t1)' }}>{partnerProps.length}</div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <PartnerPanel
        partner={selectedPartner}
        open={!!selectedPartner}
        onClose={() => setSelectedPartner(null)}
      />

      <PartnerForm
        open={showForm}
        onClose={() => setShowForm(false)}
      />
    </>
  )
}
