'use client'

import { useAuth } from '@/providers/auth-provider'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user && user.role !== 'admin') {
      router.push('/my-jobs')
    }
  }, [user, loading, router])

  if (loading || !user || user.role !== 'admin') return null

  return <>{children}</>
}
