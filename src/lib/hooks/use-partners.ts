'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Partner } from '@/lib/types'

export function usePartners() {
  const supabase = createClient()

  return useQuery({
    queryKey: ['partners'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('partners')
        .select('*')
        .order('name')
      if (error) throw error
      return (data || []) as Partner[]
    },
  })
}

export function useCreatePartner() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (partner: Omit<Partner, 'id'>) => {
      const { data, error } = await supabase
        .from('partners')
        .insert(partner)
        .select('id')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners'] })
    },
  })
}
