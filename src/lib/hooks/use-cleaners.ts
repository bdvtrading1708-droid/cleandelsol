'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@/lib/types'

export function useCleaners() {
  const supabase = createClient()

  return useQuery({
    queryKey: ['cleaners'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email, phone, role, language, hourly_rate, payment_notes, avatar_url, welcome_email_sent')
        .eq('role', 'cleaner')
        .order('name')
      if (error) throw error
      return (data || []) as User[]
    },
  })
}
