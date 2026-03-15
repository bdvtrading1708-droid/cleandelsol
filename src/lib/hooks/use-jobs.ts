'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Job, JobStatus } from '@/lib/types'

export function useJobs(cleanerId?: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['jobs', cleanerId],
    queryFn: async () => {
      let query = supabase
        .from('jobs')
        .select('*, property:properties(*), cleaner:users!jobs_cleaner_id_fkey(id, name, email, phone, avatar_url)')
        .order('date', { ascending: false })

      if (cleanerId) {
        query = query.eq('cleaner_id', cleanerId)
      }

      const { data, error } = await query
      if (error) throw error
      return (data || []) as Job[]
    },
  })
}

export function useUpdateJobStatus() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, status, hours_worked, km_driven, notes, end_time, client_price, cleaner_payout, extra_costs, payment_method }: { id: number; status: JobStatus; hours_worked?: number; km_driven?: number; notes?: string; end_time?: string; client_price?: number; cleaner_payout?: number; extra_costs?: number; payment_method?: string }) => {
      const update: Record<string, unknown> = { status }
      if (hours_worked !== undefined) update.hours_worked = hours_worked
      if (km_driven !== undefined) update.km_driven = km_driven
      if (notes !== undefined) update.notes = notes
      if (end_time !== undefined) update.end_time = end_time
      if (client_price !== undefined) update.client_price = client_price
      if (cleaner_payout !== undefined) update.cleaner_payout = cleaner_payout
      if (extra_costs !== undefined) update.extra_costs = extra_costs
      if (payment_method !== undefined) update.payment_method = payment_method

      const { error } = await supabase.from('jobs').update(update).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
    },
  })
}

export function useDeleteJob() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from('jobs').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
    },
  })
}

export function useCreateJob() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (jobs: { property_id: string; cleaner_id: string; date: string; start_time?: string; end_time?: string; client_price?: number; cleaner_payout?: number; hours_worked?: number; km_driven?: number; notes?: string } | { property_id: string; cleaner_id: string; date: string; start_time?: string; end_time?: string; client_price?: number; cleaner_payout?: number; hours_worked?: number; km_driven?: number; notes?: string }[]) => {
      const rows = (Array.isArray(jobs) ? jobs : [jobs]).map(j => ({ ...j, status: 'planned' as const }))
      const { error } = await supabase.from('jobs').insert(rows)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
    },
  })
}
