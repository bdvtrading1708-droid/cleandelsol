'use client'

import { useState, useMemo } from 'react'
import { useJobs } from '@/lib/hooks/use-jobs'
import { useLocale } from '@/lib/i18n'
import { STATUS_COLORS, getCleanerColor } from '@/lib/constants'
import { formatCurrency, getJobRevenue } from '@/lib/utils'
import { CleanerAvatar } from '@/components/cleaners/cleaner-avatar'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { JobPanel } from '@/components/jobs/job-panel'
import { JobForm } from '@/components/jobs/job-form'
import type { Job } from '@/lib/types'

function getWeekDates(date: Date): Date[] {
  const d = new Date(date)
  const week: Date[] = []
  for (let i = 0; i < 7; i++) {
    week.push(new Date(d))
    d.setDate(d.getDate() + 1)
  }
  return week
}

function toDateStr(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function isSameDay(d1: Date, d2: Date): boolean {
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate()
}

export default function CalendarPage() {
  const { data: jobs = [], isLoading } = useJobs()
  const { t, tArray } = useLocale()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<'week' | 'month'>('week')
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [showForm, setShowForm] = useState(false)

  const dayNames = tArray('days')
  const monthNames = tArray('months')

  const weekDates = useMemo(() => getWeekDates(currentDate), [currentDate])

  const monthDates = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const first = new Date(year, month, 1)
    const last = new Date(year, month + 1, 0)
    const startDay = first.getDay() === 0 ? 6 : first.getDay() - 1 // Monday = 0
    const days: (Date | null)[] = []
    for (let i = 0; i < startDay; i++) days.push(null)
    for (let i = 1; i <= last.getDate(); i++) days.push(new Date(year, month, i))
    return days
  }, [currentDate])

  const jobsByDate = useMemo(() => {
    const map: Record<string, Job[]> = {}
    jobs.forEach(j => {
      // Normalize date: take only YYYY-MM-DD portion in case Supabase returns timestamp
      const dateKey = j.date ? j.date.slice(0, 10) : ''
      if (!dateKey) return
      if (!map[dateKey]) map[dateKey] = []
      map[dateKey].push(j)
    })
    return map
  }, [jobs])

  const today = new Date()

  const navigateWeek = (dir: number) => {
    const d = new Date(currentDate)
    d.setDate(d.getDate() + dir * 7)
    setCurrentDate(d)
  }

  const navigateMonth = (dir: number) => {
    const d = new Date(currentDate)
    d.setMonth(d.getMonth() + dir)
    setCurrentDate(d)
  }

  const navigate = (dir: number) => view === 'week' ? navigateWeek(dir) : navigateMonth(dir)

  const goToday = () => setCurrentDate(new Date())

  const headerLabel = view === 'week'
    ? (() => {
        const start = weekDates[0]
        const end = weekDates[6]
        const startDayName = dayNames[start.getDay() === 0 ? 6 : start.getDay() - 1]
        if (start.getMonth() === end.getMonth()) {
          return `${startDayName} ${start.getDate()} - ${end.getDate()} ${monthNames[start.getMonth()]} ${start.getFullYear()}`
        }
        return `${startDayName} ${start.getDate()} ${monthNames[start.getMonth()]} - ${end.getDate()} ${monthNames[end.getMonth()]} ${end.getFullYear()}`
      })()
    : `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`

  if (isLoading) {
    return <div className="flex items-center justify-center py-20" style={{ color: 'var(--t3)' }}>{t('loading')}</div>
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mt-3.5 mb-4">
        <div className="text-xl font-bold tracking-[-0.5px]" style={{ color: 'var(--t1)' }}>
          {t('planning')}
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
          style={{ background: 'var(--t1)', color: 'var(--bg)' }}
        >
          <Plus size={18} strokeWidth={2.5} />
        </button>
      </div>

      {/* Navigation bar */}
      <div
        className="rounded-[18px] p-3 mb-3"
        style={{ background: 'var(--card)', boxShadow: 'var(--shadow)' }}
      >
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: 'var(--fill)' }}
          >
            <ChevronLeft size={16} style={{ color: 'var(--t1)' }} />
          </button>
          <button
            onClick={goToday}
            className="text-[14px] font-bold tracking-[-0.3px]"
            style={{ color: 'var(--t1)' }}
          >
            {headerLabel}
          </button>
          <button
            onClick={() => navigate(1)}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: 'var(--fill)' }}
          >
            <ChevronRight size={16} style={{ color: 'var(--t1)' }} />
          </button>
        </div>

        {/* View toggle */}
        <div className="flex gap-1">
          <button
            onClick={() => setView('week')}
            className="flex-1 py-1.5 rounded-full text-[11px] font-semibold transition-all"
            style={{
              background: view === 'week' ? 'var(--t1)' : 'var(--fill)',
              color: view === 'week' ? 'var(--bg)' : 'var(--t3)',
            }}
          >
            Week
          </button>
          <button
            onClick={() => setView('month')}
            className="flex-1 py-1.5 rounded-full text-[11px] font-semibold transition-all"
            style={{
              background: view === 'month' ? 'var(--t1)' : 'var(--fill)',
              color: view === 'month' ? 'var(--bg)' : 'var(--t3)',
            }}
          >
            Maand
          </button>
        </div>
      </div>

      {/* WEEK VIEW */}
      {view === 'week' && (
        <div className="flex flex-col gap-2">
          {weekDates.map((date, i) => {
            const dateStr = toDateStr(date)
            const dayJobs = jobsByDate[dateStr] || []
            const isToday = isSameDay(date, today)

            return (
              <div
                key={dateStr}
                className="rounded-[18px] overflow-hidden"
                style={{ background: 'var(--card)', boxShadow: 'var(--shadow)' }}
              >
                {/* Day header */}
                <div
                  className="flex items-center justify-between px-4 py-2.5"
                  style={{
                    background: isToday ? 'var(--t1)' : 'var(--fill)',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="text-[13px] font-bold"
                      style={{ color: isToday ? 'var(--bg)' : 'var(--t1)' }}
                    >
                      {dayNames[date.getDay() === 0 ? 6 : date.getDay() - 1]}
                    </span>
                    <span
                      className="text-[13px]"
                      style={{ color: isToday ? 'var(--bg)' : 'var(--t3)' }}
                    >
                      {date.getDate()} {monthNames[date.getMonth()]}
                    </span>
                  </div>
                  {dayJobs.length > 0 && (
                    <span
                      className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                      style={{
                        background: isToday ? 'rgba(255,255,255,0.2)' : 'var(--card)',
                        color: isToday ? 'var(--bg)' : 'var(--t3)',
                      }}
                    >
                      {dayJobs.length}
                    </span>
                  )}
                </div>

                {/* Jobs for this day */}
                {dayJobs.length > 0 ? (
                  <div className="p-2 flex flex-col gap-1.5">
                    {dayJobs.map(job => (
                      <button
                        key={job.id}
                        onClick={() => setSelectedJob(job)}
                        className="flex items-center gap-3 rounded-[12px] p-2.5 w-full text-left transition-all active:scale-[0.98]"
                        style={{ background: 'var(--fill)' }}
                      >
                        {/* Cleaner color dot(s) */}
                        <div className="flex flex-col gap-0.5 shrink-0">
                          {(job.cleaners || []).slice(0, 3).map(jc => (
                            <div key={jc.id} className="w-2.5 h-2.5 rounded-full" style={{ background: getCleanerColor(jc.cleaner?.name) }} />
                          ))}
                          {(!job.cleaners || job.cleaners.length === 0) && job.cleaner && (
                            <div className="w-2.5 h-2.5 rounded-full" style={{ background: getCleanerColor(job.cleaner?.name) }} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-semibold truncate" style={{ color: 'var(--t1)' }}>
                            {job.property?.name || job.custom_property_name || '—'}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            {(job.cleaners || []).map(jc => jc.cleaner && (
                              <div
                                key={jc.id}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full"
                                style={{ background: getCleanerColor(jc.cleaner.name) + '18' }}
                              >
                                <CleanerAvatar src={jc.cleaner.avatar_url} name={jc.cleaner.name} size={16} />
                                <span className="text-[10px] font-medium pr-0.5" style={{ color: getCleanerColor(jc.cleaner.name) }}>
                                  {jc.cleaner.name.split(' ')[0]}
                                </span>
                              </div>
                            ))}
                            {(!job.cleaners || job.cleaners.length === 0) && job.cleaner && (
                              <div
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full"
                                style={{ background: getCleanerColor(job.cleaner.name) + '18' }}
                              >
                                <CleanerAvatar src={job.cleaner.avatar_url} name={job.cleaner.name} size={16} />
                                <span className="text-[10px] font-medium pr-0.5" style={{ color: getCleanerColor(job.cleaner.name) }}>
                                  {job.cleaner.name.split(' ')[0]}
                                </span>
                              </div>
                            )}
                            {job.start_time && (
                              <span className="text-[10px]" style={{ color: 'var(--t3)' }}>{job.start_time.slice(0, 5)}</span>
                            )}
                          </div>
                        </div>
                        <div className="text-[13px] font-bold shrink-0" style={{ color: 'var(--t1)' }}>
                          {formatCurrency(getJobRevenue(job))}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="px-4 py-3 text-[12px]" style={{ color: 'var(--t3)' }}>
                    Geen opdrachten
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* MONTH VIEW */}
      {view === 'month' && (
        <div
          className="rounded-[18px] p-3"
          style={{ background: 'var(--card)', boxShadow: 'var(--shadow)' }}
        >
          {/* Day name headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {dayNames.map(d => (
              <div key={d} className="text-[10px] font-semibold uppercase tracking-[.05em] text-center py-1" style={{ color: 'var(--t3)' }}>
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {monthDates.map((date, i) => {
              if (!date) return <div key={`empty-${i}`} />

              const dateStr = toDateStr(date)
              const dayJobs = jobsByDate[dateStr] || []
              const isToday = isSameDay(date, today)

              return (
                <button
                  key={dateStr}
                  onClick={() => {
                    setCurrentDate(date)
                    setView('week')
                  }}
                  className="aspect-square rounded-[10px] flex flex-col items-center justify-center gap-0.5 transition-all relative"
                  style={{
                    background: isToday ? 'var(--t1)' : dayJobs.length > 0 ? 'var(--fill)' : 'transparent',
                  }}
                >
                  <span
                    className="text-[13px] font-semibold"
                    style={{ color: isToday ? 'var(--bg)' : 'var(--t1)' }}
                  >
                    {date.getDate()}
                  </span>
                  {dayJobs.length > 0 && (
                    <div className="flex gap-0.5">
                      {dayJobs.slice(0, 3).map(j => {
                        const firstCleaner = j.cleaners?.[0]?.cleaner || j.cleaner
                        return (
                          <div
                            key={j.id}
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ background: isToday ? 'var(--bg)' : getCleanerColor(firstCleaner?.name) }}
                          />
                        )
                      })}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Detail panel */}
      <JobPanel
        job={selectedJob}
        open={!!selectedJob}
        onClose={() => setSelectedJob(null)}
      />

      {/* Create form */}
      <JobForm
        open={showForm}
        onClose={() => setShowForm(false)}
        defaultDate={view === 'week' ? toDateStr(weekDates[0]) : toDateStr(currentDate)}
      />
    </>
  )
}
