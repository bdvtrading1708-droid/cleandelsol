'use client'

import { useAuth } from '@/providers/auth-provider'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Sidebar } from '@/components/layout/sidebar'
import { Topbar } from '@/components/layout/topbar'
import { Tabbar } from '@/components/layout/tabbar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div style={{ color: 'var(--t3)', fontSize: 14, fontWeight: 500 }}>Laden...</div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="fixed inset-0 flex">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden md:ml-[var(--sb-w)]">
        <Topbar />
        <main className="flex-1 overflow-y-auto overflow-x-hidden" style={{ background: 'var(--bg)' }}>
          <div className="px-3.5 pb-3.5 md:pb-3.5 pb-[calc(var(--tab-h)+14px)]">
            {children}
          </div>
        </main>
      </div>
      <Tabbar />
    </div>
  )
}
