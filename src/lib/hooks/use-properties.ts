'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Property } from '@/lib/types'

export function useProperties() {
  const supabase = createClient()

  return useQuery({
    queryKey: ['properties'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .order('name')
      if (error) throw error
      return (data || []) as Property[]
    },
  })
}

export function useCreateProperty() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (property: Omit<Property, 'id'>) => {
      const { error } = await supabase.from('properties').insert(property)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] })
    },
  })
}
