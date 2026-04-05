'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export interface CleanerPayment {
  id: number
  cleaner_id: string
  amount: number
  note?: string
  created_at: string
}

export function useCleanerPayments(cleanerId?: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['cleaner-payments', cleanerId],
    enabled: !!cleanerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cleaner_payments')
        .select('*')
        .eq('cleaner_id', cleanerId!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data || []) as CleanerPayment[]
    },
  })
}

export function useAllCleanerPayments() {
  const supabase = createClient()

  return useQuery({
    queryKey: ['cleaner-payments', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cleaner_payments')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data || []) as CleanerPayment[]
    },
  })
}

export function useCreateCleanerPayment() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ cleaner_id, amount, note }: { cleaner_id: string; amount: number; note?: string }) => {
      const { error } = await supabase.from('cleaner_payments').insert({ cleaner_id, amount, note })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cleaner-payments'] })
    },
  })
}

export function useDeleteCleanerPayment() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (paymentId: number) => {
      const { error } = await supabase.from('cleaner_payments').delete().eq('id', paymentId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cleaner-payments'] })
    },
  })
}
