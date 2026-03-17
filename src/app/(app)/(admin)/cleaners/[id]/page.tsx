'use client'

import { useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useCleaners } from '@/lib/hooks/use-cleaners'
import { useJobs } from '@/lib/hooks/use-jobs'
import { useLocale } from '@/lib/i18n'
import { useQueryClient } from '@tanstack/react-query'
import { formatCurrency } from '@/lib/utils'
import { aggregateByCleaners } from '@/lib/financial'
import type { Period } from '@/lib/financial'
import { ArrowLeft, Pencil, Phone, Mail, Camera } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { CleanerAvatar } from '@/components/cleaners/cleaner-avatar'
import { CleanerForm } from '@/components/cleaners/cleaner-form'
import { CleanerDetailHero } from '@/components/cleaners/cleaner-detail-hero'
import { CleanerProfitBreakdown } from '@/components/cleaners/cleaner-profit-breakdown'
import { CleanerJobsList } from '@/components/cleaners/cleaner-jobs-list'
import { CleanerPayments } from '@/components/cleaners/cleaner-payments'
import { CleanerAccount } from '@/components/cleaners/cleaner-account'
import { Copy, Check } from 'lucide-react'

export default function CleanerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: cleaners = [], isLoading: loadingCleaners } = useCleaners()
  const { data: jobs = [], isLoading: loadingJobs } = useJobs()
  const { t } = useLocale()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [period, setPeriod] = useState<Period>('maand')
  const [chartMonth, setChartMonth] = useState(new Date().getMonth())
  const [chartYear, setChartYear] = useState(new Date().getFullYear())
  const [createdCreds, setCreatedCreds] = useState<{ name: string; email: string; password: string } | null>(null)
  const [copied, setCopied] = useState(false)

  const cleaner = cleaners.find(c => c.id === id)

  if (loadingCleaners || loadingJobs) {
    return <div className="flex items-center justify-center py-20" style={{ color: 'var(--t3)' }}>{t('loading')}</div>
  }

  if (!cleaner) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="text-[14px] font-medium" style={{ color: 'var(--t3)' }}>Schoonmaakster niet gevonden</div>
        <button
          onClick={() => router.push('/cleaners')}
          className="text-[13px] font-semibold px-4 py-2 rounded-full"
          style={{ background: 'var(--fill)', color: 'var(--t2)' }}
        >
          Terug
        </button>
      </div>
    )
  }

  // Stats for profit breakdown
  const allStats = aggregateByCleaners(jobs, [cleaner.id])
  const stats = allStats[0]

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `avatars/${cleaner.id}.${ext}`
      const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
        const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`
        await supabase.from('users').update({ avatar_url: avatarUrl }).eq('id', cleaner.id)
        queryClient.invalidateQueries({ queryKey: ['cleaners'] })
      }
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-3 mt-3.5 mb-4">
        <button
          onClick={() => router.push('/cleaners')}
          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all active:scale-95"
          style={{ background: 'var(--fill)' }}
        >
          <ArrowLeft size={18} style={{ color: 'var(--t2)' }} />
        </button>
        <div className="text-xl font-bold tracking-[-0.5px] flex-1 truncate" style={{ color: 'var(--t1)' }}>
          {cleaner.name}
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
          style={{ background: 'var(--fill)' }}
        >
          <Pencil size={16} style={{ color: 'var(--t2)' }} />
        </button>
      </div>

      {/* Profile card */}
      <div className="rounded-[18px] p-4 mb-3 flex items-center gap-4" style={{ background: 'var(--card)', boxShadow: 'var(--shadow)' }}>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="relative group shrink-0"
          disabled={uploading}
        >
          <CleanerAvatar src={cleaner.avatar_url} name={cleaner.name} size={72} />
          <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Camera size={22} className="text-white" />
          </div>
          {uploading && (
            <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />

        <div className="flex-1 min-w-0">
          <div className="text-[18px] font-bold tracking-[-0.3px] truncate" style={{ color: 'var(--t1)' }}>
            {cleaner.name}
          </div>
          {cleaner.hourly_rate && (
            <div className="text-[13px] mt-0.5" style={{ color: 'var(--t3)' }}>
              {formatCurrency(cleaner.hourly_rate)}/uur
            </div>
          )}
          {/* Contact pills */}
          <div className="flex gap-2 mt-2.5">
            {cleaner.phone && (
              <a
                href={`tel:${cleaner.phone}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all active:scale-95"
                style={{ background: 'var(--fill)', color: 'var(--t2)' }}
              >
                <Phone size={13} style={{ color: 'var(--green)' }} />
                Bel
              </a>
            )}
            {cleaner.email && (
              <a
                href={`mailto:${cleaner.email}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all active:scale-95"
                style={{ background: 'var(--fill)', color: 'var(--t2)' }}
              >
                <Mail size={13} style={{ color: 'var(--blue)' }} />
                Mail
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Hero with chart */}
      <div className="mb-3">
        <CleanerDetailHero
          cleanerId={cleaner.id}
          jobs={jobs}
          period={period}
          setPeriod={setPeriod}
          chartMonth={chartMonth}
          chartYear={chartYear}
          setChartMonth={setChartMonth}
          setChartYear={setChartYear}
        />
      </div>

      {/* Profit breakdown */}
      <div className="mb-3">
        <CleanerProfitBreakdown stats={stats} />
      </div>

      {/* Payments */}
      <div className="mb-3">
        <CleanerPayments cleanerId={cleaner.id} jobs={jobs} />
      </div>

      {/* Jobs list */}
      <div className="mb-3">
        <CleanerJobsList cleanerId={cleaner.id} jobs={jobs} />
      </div>

      {/* Account */}
      <div className="mb-6">
        <CleanerAccount
          cleaner={cleaner}
          onPasswordReset={(creds) => setCreatedCreds(creds)}
        />
      </div>

      {/* Edit form */}
      <CleanerForm
        open={showForm}
        onClose={() => setShowForm(false)}
        editCleaner={cleaner}
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
