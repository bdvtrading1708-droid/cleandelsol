'use client'

import { useAuth } from '@/providers/auth-provider'
import { useLocale } from '@/lib/i18n'
import { usePathname, useRouter } from 'next/navigation'
import { NAV_ADMIN, NAV_CLEANER, isNavItem } from '@/lib/constants'
import { Home, Calendar, ClipboardList, Building2, Users, BarChart3, Settings, LogOut } from 'lucide-react'
import { useState, useEffect } from 'react'

const iconMap: Record<string, React.ElementType> = {
  Home, Calendar, ClipboardList, Building2, Users, BarChart3, Settings,
}

const routeMap: Record<string, string> = {
  dashboard: '/dashboard',
  calendar: '/calendar',
  jobs: '/jobs',
  properties: '/properties',
  cleaners: '/cleaners',
  financial: '/financial',
  'my-jobs': '/my-jobs',
  'my-earnings': '/my-earnings',
  settings: '/settings',
}

export function Sidebar() {
  const { user, logout } = useAuth()
  const { t } = useLocale()
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  // Listen for toggle event from topbar hamburger
  useEffect(() => {
    const handler = () => setOpen(o => !o)
    window.addEventListener('toggle-sidebar', handler)
    return () => window.removeEventListener('toggle-sidebar', handler)
  }, [])

  if (!user) return null

  const nav = user.role === 'admin' ? NAV_ADMIN : NAV_CLEANER
  const initials = (user.name || '?')[0].toUpperCase()

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-[299] bg-black/38 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-[300] flex flex-col border-r transition-transform duration-300 ease-[cubic-bezier(.4,0,.2,1)] md:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{
          width: 'var(--sb-w)',
          background: 'var(--sidebar)',
          borderColor: 'var(--border)',
        }}
      >
        {/* Logo */}
        <div className="px-4 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="text-sm font-light tracking-[5px] uppercase" style={{ color: 'var(--t1)', fontFamily: "'Gill Sans', 'Century Gothic', Futura, sans-serif" }}>
            CLEAN DEL SOL
          </div>
        </div>

        {/* User */}
        <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <div
            className="w-[34px] h-[34px] rounded-full flex items-center justify-center text-[13px] font-bold shrink-0"
            style={{ background: 'var(--t1)', color: 'var(--bg)' }}
          >
            {initials}
          </div>
          <div>
            <div className="text-[13px] font-semibold" style={{ color: 'var(--t1)' }}>{user.name || user.email}</div>
            <div className="text-[10px] uppercase tracking-[.05em]" style={{ color: 'var(--t3)' }}>
              {t(user.role === 'admin' ? 'admin' : 'cleaner')}
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-2" style={{ scrollbarWidth: 'none' }}>
          {nav.map((item, i) => {
            if ('section' in item && item.section) {
              return (
                <div
                  key={`sec-${i}`}
                  className="text-[9px] font-bold tracking-[.14em] uppercase px-2 pt-3.5 pb-1"
                  style={{ color: 'var(--t4)' }}
                >
                  {t(item.section)}
                </div>
              )
            }
            if (!isNavItem(item)) return null
            const Icon = iconMap[item.icon] || Home
            const route = routeMap[item.id] || '/'
            const isActive = pathname === route

            return (
              <div
                key={item.id}
                className="flex items-center gap-2.5 px-2.5 py-2.5 rounded-[14px] cursor-pointer text-[13px] font-medium mb-0.5 transition-all duration-100"
                style={{
                  background: isActive ? 'var(--t1)' : 'transparent',
                  color: isActive ? 'var(--bg)' : 'var(--t2)',
                }}
                onClick={() => {
                  router.push(route)
                  setOpen(false)
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.background = 'var(--fill)'
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.background = 'transparent'
                }}
              >
                <div className="w-[22px] h-[22px] flex items-center justify-center shrink-0">
                  <Icon size={16} />
                </div>
                <span>{t(item.translationKey)}</span>
              </div>
            )
          })}
        </nav>

        {/* Logout */}
        <div className="p-2.5 border-t" style={{ borderColor: 'var(--border)' }}>
          <button
            className="flex items-center gap-2.5 px-2.5 py-2.5 rounded-[14px] cursor-pointer text-[13px] font-medium w-full transition-all duration-100 hover:bg-red-50"
            style={{ color: 'var(--t3)' }}
            onClick={logout}
          >
            <LogOut size={16} />
            <span>{t('logout')}</span>
          </button>
        </div>
      </aside>
    </>
  )
}
