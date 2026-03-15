'use client'

import { useState } from 'react'
import { useCleaners } from '@/lib/hooks/use-cleaners'
import { useJobs } from '@/lib/hooks/use-jobs'
import { useLocale } from '@/lib/i18n'
import { formatCurrency } from '@/lib/utils'
import { Plus } from 'lucide-react'
import { CleanerPanel } from '@/components/cleaners/cleaner-panel'
import { CleanerForm } from '@/components/cleaners/cleaner-form'
import { CleanerAvatar } from '@/components/cleaners/cleaner-avatar'
import { filterByPeriod, aggregateByCleaners, type Period } from '@/lib/financial'
import type { User } from '@/lib/types'

export default function CleanersPage() {
  const { data: cleaners = [], isLoading } = useCleaners()
  const { data: jobs = [] } = useJobs()
  const { t } = useLocale()
  const [selectedCleaner, setSelectedCleaner] = useState<User | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editCleaner, setEditCleaner] = useState<User | null>(null)
  const [period, setPeriod] = useState<Period>('alles')

  if (isLoading) {
    return <div className="flex items-center justify-center py-20" style={{ color: 'var(--t3)' }}>{t('loading')}</div>
  }

  const filtered = filterByPeriod(jobs, period)
  const cleanerStats = aggregateByCleaners(filtered, cleaners.map(c => c.id))

  const periods: Period[] = ['dag', 'week', 'maand', 'jaar', 'alles']

  return (
    <>
      <div className="flex items-center justify-between mt-3.5 mb-4">
        <div className="text-xl font-bold tracking-[-0.5px]" style={{ color: 'var(--t1)' }}>
          {t('cleaners')}
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
          style={{ background: 'var(--t1)', color: 'var(--bg)' }}
        >
          <Plus size={18} strokeWidth={2.5} />
        </button>
      </div>

      {/* Period filter */}
      <div className="flex gap-0.5 mb-4 rounded-full p-0.5 w-fit" style={{ background: 'var(--fill)' }}>
        {periods.map(p => (
          <button
            key={p}
            className="px-3 py-1 rounded-full text-[11px] font-semibold transition-all"
            style={{
              background: period === p ? 'var(--card)' : 'transparent',
              color: period === p ? 'var(--t1)' : 'var(--t3)',
              boxShadow: period === p ? 'var(--shadow)' : 'none',
            }}
            onClick={() => setPeriod(p)}
          >
            {t(p)}
          </button>
        ))}
      </div>

      {cleaners.length === 0 ? (
        <div className="text-center py-12" style={{ color: 'var(--t3)' }}>
          <div className="text-sm font-semibold" style={{ color: 'var(--t2)' }}>Geen schoonmaaksters</div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5">
          {cleaners.map(cleaner => {
            const stats = cleanerStats.find(s => s.cleanerId === cleaner.id)
            const totalEarned = stats?.earned || 0
            const outstanding = stats?.outstanding || 0
            const jobCount = stats?.jobCount || 0
            const revenue = stats?.revenue || 0
            const earnedPct = revenue > 0 ? Math.round((totalEarned / (totalEarned + outstanding)) * 100) : 0

            return (
              <div
                key={cleaner.id}
                className="rounded-[18px] p-4 flex flex-col transition-all cursor-pointer active:scale-[0.98]"
                style={{ background: 'var(--card)', boxShadow: 'var(--shadow)' }}
                onClick={() => setSelectedCleaner(cleaner)}
              >
                <CleanerAvatar
                  src={cleaner.avatar_url}
                  name={cleaner.name}
                  size={44}
                  className="mb-3"
                />
                <div className="text-[14px] font-bold tracking-[-0.2px] truncate mb-0.5" style={{ color: 'var(--t1)' }}>
                  {cleaner.name}
                </div>
                {cleaner.phone && (
                  <div className="text-[11px] mb-3 truncate" style={{ color: 'var(--t3)' }}>
                    {cleaner.phone}
                  </div>
                )}
                <div className="mb-2">
                  <div className="flex justify-between items-baseline mb-1">
                    <div className="text-[10px] font-semibold" style={{ color: 'var(--t3)' }}>{t('earned')}</div>
                    <div className="text-[12px] font-bold" style={{ color: 'var(--t1)' }}>{formatCurrency(totalEarned)}</div>
                  </div>
                  <div className="h-[6px] rounded-full overflow-hidden" style={{ background: 'var(--fill)' }}>
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${earnedPct}%`, background: '#00A651' }} />
                  </div>
                </div>
                <div className="flex justify-between items-baseline">
                  <div className="text-[10px] font-semibold" style={{ color: 'var(--t3)' }}>{t('outstanding')}</div>
                  <div className="text-[12px] font-bold" style={{ color: outstanding > 0 ? '#FF9900' : 'var(--t3)' }}>
                    {formatCurrency(outstanding)}
                  </div>
                </div>
                <div className="flex justify-between items-baseline mt-1">
                  <div className="text-[10px] font-semibold" style={{ color: 'var(--t3)' }}>{t('revenue')}</div>
                  <div className="text-[12px] font-bold" style={{ color: 'var(--t1)' }}>{formatCurrency(revenue)}</div>
                </div>
                <div className="flex justify-between items-baseline mt-1">
                  <div className="text-[10px] font-semibold" style={{ color: 'var(--t3)' }}>{t('jobs')}</div>
                  <div className="text-[12px] font-bold" style={{ color: 'var(--t1)' }}>{jobCount}</div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <CleanerPanel
        cleaner={selectedCleaner}
        open={!!selectedCleaner}
        onClose={() => setSelectedCleaner(null)}
        onEdit={(c) => {
          setSelectedCleaner(null)
          setTimeout(() => setEditCleaner(c), 300)
        }}
      />

      <CleanerForm
        open={showForm || !!editCleaner}
        onClose={() => { setShowForm(false); setEditCleaner(null) }}
        editCleaner={editCleaner}
      />
    </>
  )
}
