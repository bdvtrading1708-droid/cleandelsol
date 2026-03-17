'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCleaners } from '@/lib/hooks/use-cleaners'
import { useJobs } from '@/lib/hooks/use-jobs'
import { useLocale } from '@/lib/i18n'
import { Plus, Copy, Check, Search } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { toast } from 'sonner'
import { CleanerForm } from '@/components/cleaners/cleaner-form'
import { CleanersHero } from '@/components/cleaners/cleaners-hero'
import { CleanerListCard } from '@/components/cleaners/cleaner-list-card'
import { filterByPeriod, aggregateByCleaners, type Period } from '@/lib/financial'
import type { User } from '@/lib/types'

type SortKey = 'name' | 'outstanding' | 'earned' | 'jobs'

export default function CleanersPage() {
  const router = useRouter()
  const { data: cleaners = [], isLoading } = useCleaners()
  const { data: jobs = [] } = useJobs()
  const { t } = useLocale()
  const [showForm, setShowForm] = useState(false)
  const [editCleaner, setEditCleaner] = useState<User | null>(null)
  const [period, setPeriod] = useState<Period>('alles')
  const [createdCreds, setCreatedCreds] = useState<{ name: string; email: string; password: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortKey>('name')

  if (isLoading) {
    return <div className="flex items-center justify-center py-20" style={{ color: 'var(--t3)' }}>{t('loading')}</div>
  }

  const filtered = filterByPeriod(jobs, period)
  const cleanerStats = aggregateByCleaners(filtered, cleaners.map(c => c.id))

  // Filter by search
  const searchFiltered = search
    ? cleaners.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
    : cleaners

  // Sort
  const sorted = [...searchFiltered].sort((a, b) => {
    const sa = cleanerStats.find(s => s.cleanerId === a.id)
    const sb = cleanerStats.find(s => s.cleanerId === b.id)
    if (sortBy === 'outstanding') return (sb?.outstanding || 0) - (sa?.outstanding || 0)
    if (sortBy === 'earned') return (sb?.earned || 0) - (sa?.earned || 0)
    if (sortBy === 'jobs') return (sb?.jobCount || 0) - (sa?.jobCount || 0)
    return a.name.localeCompare(b.name)
  })

  const sortOptions: { key: SortKey; label: string }[] = [
    { key: 'name', label: 'Naam' },
    { key: 'outstanding', label: t('outstanding') || 'Openstaand' },
    { key: 'earned', label: t('earned') || 'Verdiend' },
    { key: 'jobs', label: t('jobs') || 'Opdrachten' },
  ]

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mt-3.5 mb-0">
        <div className="text-xl font-bold tracking-[-0.5px]" style={{ color: 'var(--t1)' }}>
          {t('cleaners')}
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-95"
          style={{ background: 'var(--t1)', color: 'var(--bg)' }}
        >
          <Plus size={18} strokeWidth={2.5} />
        </button>
      </div>

      {/* Hero */}
      <CleanersHero
        cleanerStats={cleanerStats}
        period={period}
        setPeriod={setPeriod}
        cleanerCount={cleaners.length}
      />

      {/* Search & Sort */}
      <div className="flex gap-2 mt-4 mb-3">
        <div className="flex-1 relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--t3)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Zoek..."
            className="w-full h-[38px] rounded-[12px] pl-9 pr-3 text-[13px] font-medium border-0 outline-none"
            style={{ background: 'var(--fill)', color: 'var(--t1)' }}
          />
        </div>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as SortKey)}
          className="h-[38px] rounded-[12px] px-3 text-[11px] font-semibold border-0 outline-none appearance-none"
          style={{ background: 'var(--fill)', color: 'var(--t2)' }}
        >
          {sortOptions.map(o => (
            <option key={o.key} value={o.key}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Cleaner list */}
      {sorted.length === 0 ? (
        <div className="text-center py-12" style={{ color: 'var(--t3)' }}>
          <div className="text-sm font-semibold" style={{ color: 'var(--t2)' }}>
            {search ? 'Geen resultaten' : 'Geen schoonmaaksters'}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {sorted.map(cleaner => {
            const stats = cleanerStats.find(s => s.cleanerId === cleaner.id)
            return (
              <CleanerListCard
                key={cleaner.id}
                cleaner={cleaner}
                stats={stats}
                onClick={() => router.push(`/cleaners/${cleaner.id}`)}
              />
            )
          })}
        </div>
      )}

      <CleanerForm
        open={showForm || !!editCleaner}
        onClose={() => { setShowForm(false); setEditCleaner(null) }}
        editCleaner={editCleaner}
        onCreated={(creds) => setCreatedCreds(creds)}
      />

      {/* Credentials dialog */}
      <Sheet open={!!createdCreds} onOpenChange={(o) => { if (!o) { setCreatedCreds(null); setCopied(false) } }}>
        <SheetContent
          side="bottom"
          className="rounded-t-[24px] p-0 border-0"
          style={{ background: 'var(--bg2)' }}
        >
          <SheetHeader className="px-5 pt-5 pb-0">
            <SheetTitle className="text-[20px] font-bold tracking-[-0.5px] text-left" style={{ color: 'var(--t1)' }}>
              {t('accCreated')}
            </SheetTitle>
          </SheetHeader>
          {createdCreds && (
            <div className="px-5 pb-5 mt-4 flex flex-col gap-3">
              <div className="rounded-[14px] p-4" style={{ background: 'var(--fill)' }}>
                <div className="text-[11px] font-semibold uppercase tracking-[.08em] mb-1" style={{ color: 'var(--t3)' }}>Naam</div>
                <div className="text-[15px] font-medium" style={{ color: 'var(--t1)' }}>{createdCreds.name}</div>
              </div>
              <div className="rounded-[14px] p-4" style={{ background: 'var(--fill)' }}>
                <div className="text-[11px] font-semibold uppercase tracking-[.08em] mb-1" style={{ color: 'var(--t3)' }}>E-mail</div>
                <div className="text-[15px] font-medium" style={{ color: 'var(--t1)' }}>{createdCreds.email}</div>
              </div>
              <div className="rounded-[14px] p-4" style={{ background: 'var(--fill)' }}>
                <div className="text-[11px] font-semibold uppercase tracking-[.08em] mb-1" style={{ color: 'var(--t3)' }}>{t('pass')}</div>
                <div className="flex items-center gap-2">
                  <div className="text-[15px] font-mono font-medium flex-1" style={{ color: 'var(--t1)' }}>{createdCreds.password}</div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(createdCreds.password)
                      setCopied(true)
                      toast.success(t('copied') || 'Gekopieerd!')
                      setTimeout(() => setCopied(false), 2000)
                    }}
                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: 'var(--card)' }}
                  >
                    {copied ? <Check size={14} style={{ color: 'var(--green)' }} /> : <Copy size={14} style={{ color: 'var(--t2)' }} />}
                  </button>
                </div>
              </div>
              <button
                onClick={() => { setCreatedCreds(null); setCopied(false) }}
                className="w-full h-[50px] rounded-[16px] text-[15px] font-bold mt-1"
                style={{ background: 'var(--t1)', color: 'var(--bg)' }}
              >
                {t('close')}
              </button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
