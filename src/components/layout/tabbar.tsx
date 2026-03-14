'use client'

import { useAuth } from '@/providers/auth-provider'
import { useLocale } from '@/lib/i18n'
import { usePathname, useRouter } from 'next/navigation'
import { NAV_ADMIN, NAV_CLEANER, isNavItem } from '@/lib/constants'
import { Home, Calendar, ClipboardList, Building2, Users, BarChart3, Settings, Handshake } from 'lucide-react'

const iconMap: Record<string, React.ElementType> = {
  Home, Calendar, ClipboardList, Building2, Users, BarChart3, Settings, Handshake,
}

const routeMap: Record<string, string> = {
  dashboard: '/dashboard',
  calendar: '/calendar',
  jobs: '/jobs',
  properties: '/properties',
  cleaners: '/cleaners',
  partners: '/partners',
  financial: '/financial',
  'my-jobs': '/my-jobs',
  'my-earnings': '/my-earnings',
  settings: '/settings',
}

export function Tabbar() {
  const { user } = useAuth()
  const { t } = useLocale()
  const pathname = usePathname()
  const router = useRouter()

  if (!user) return null

  const nav = user.role === 'admin' ? NAV_ADMIN : NAV_CLEANER
  const items = nav.filter(isNavItem).filter(item => item.id !== 'settings')

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[200] flex items-start pt-2.5 md:hidden border-t backdrop-blur-[20px]"
      style={{
        height: 'var(--tab-h)',
        paddingBottom: 'var(--safe-b)',
        background: 'var(--tabbar)',
        borderColor: 'var(--border)',
        overflowX: 'auto',
        scrollbarWidth: 'none',
      }}
    >
      {items.map((item) => {
        const Icon = iconMap[item.icon] || Home
        const route = routeMap[item.id] || '/'
        const isActive = pathname === route

        return (
          <div
            key={item.id}
            className="flex flex-col items-center gap-0.5 flex-1 cursor-pointer select-none transition-colors"
            style={{ color: isActive ? 'var(--t1)' : 'var(--t3)', minWidth: 52 }}
            onClick={() => router.push(route)}
          >
            <div className="w-6 h-6 flex items-center justify-center">
              <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
            </div>
            <span className="text-[9px] font-semibold whitespace-nowrap">{t(item.translationKey)}</span>
          </div>
        )
      })}
    </nav>
  )
}
