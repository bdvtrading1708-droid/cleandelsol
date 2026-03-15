'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Job, JobStatus, JobCleaner } from '@/lib/types'

export function useJobs(cleanerId?: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['jobs', cleanerId],
    queryFn: async () => {
      let query = supabase
        .from('jobs')
        .select('*, property:properties(*), job_cleaners(*, cleaner:users!job_cleaners_cleaner_id_fkey(id, name, email, phone, avatar_url))')
        .order('date', { ascending: false })

      if (cleanerId) {
        // Filter jobs that have this cleaner assigned
        query = query.filter('job_cleaners.cleaner_id', 'eq', cleanerId)
      }

      const { data, error } = await query
      if (error) throw error

      // Map job_cleaners to cleaners field
      const jobs = (data || []).map((row: Record<string, unknown>) => {
        const jobCleaners = (row.job_cleaners as JobCleaner[]) || []
        // For backward compat: set first cleaner as legacy cleaner fields
        const firstCleaner = jobCleaners[0]
        return {
          ...row,
          cleaners: jobCleaners,
          // Legacy compat
          cleaner_id: firstCleaner?.cleaner_id,
          cleaner: firstCleaner?.cleaner,
          cleaner_payout: firstCleaner?.cleaner_payout,
          km_driven: jobCleaners.reduce((s: number, jc: JobCleaner) => s + (jc.km_driven || 0), 0),
          hours_worked: firstCleaner?.hours_worked,
        } as Job
      })

      // If filtering by cleanerId, only return jobs that actually have that cleaner
      if (cleanerId) {
        return jobs.filter(j => j.cleaners.some(jc => jc.cleaner_id === cleanerId))
      }

      return jobs
    },
  })
}

export function useUpdateJobStatus() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, status, notes, extra_costs, laundry_cost, payment_method }: { id: number; status: JobStatus; notes?: string; extra_costs?: number; laundry_cost?: number; payment_method?: string }) => {
      const update: Record<string, unknown> = { status }
      if (notes !== undefined) update.notes = notes
      if (extra_costs !== undefined) update.extra_costs = extra_costs
      if (laundry_cost !== undefined) update.laundry_cost = laundry_cost
      if (payment_method !== undefined) update.payment_method = payment_method

      const { error } = await supabase.from('jobs').update(update).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
    },
  })
}

export function useUpdateJobCleaner() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, end_time, hours_worked, km_driven, cleaner_payout, extra_costs }: { id: number; end_time?: string; hours_worked?: number; km_driven?: number; cleaner_payout?: number; extra_costs?: number }) => {
      const update: Record<string, unknown> = {}
      if (end_time !== undefined) update.end_time = end_time
      if (hours_worked !== undefined) update.hours_worked = hours_worked
      if (km_driven !== undefined) update.km_driven = km_driven
      if (cleaner_payout !== undefined) update.cleaner_payout = cleaner_payout
      if (extra_costs !== undefined) update.extra_costs = extra_costs

      const { error } = await supabase.from('job_cleaners').update(update).eq('id', id)
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

interface CreateJobInput {
  property_id?: string
  custom_property_name?: string
  pricing_type?: 'hourly' | 'fixed'
  date: string
  start_time?: string
  end_time?: string
  client_price?: number
  laundry_cost?: number
  notes?: string
  cleaners: {
    cleaner_id: string
    cleaner_payout?: number
    start_time?: string
    end_time?: string
    hours_worked?: number
    km_driven?: number
  }[]
}

export function useCreateJob() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateJobInput | CreateJobInput[]) => {
      const inputs = Array.isArray(input) ? input : [input]

      for (const job of inputs) {
        // Insert the job first
        const { data: newJob, error: jobError } = await supabase
          .from('jobs')
          .insert({
            property_id: job.property_id || null,
            custom_property_name: job.custom_property_name || null,
            pricing_type: job.pricing_type || null,
            date: job.date,
            start_time: job.start_time,
            end_time: job.end_time,
            client_price: job.client_price,
            laundry_cost: job.laundry_cost || 0,
            notes: job.notes,
            status: 'planned' as const,
          })
          .select('id')
          .single()

        if (jobError) throw jobError

        // Insert job_cleaners
        const cleanerRows = job.cleaners.map(c => ({
          job_id: newJob.id,
          cleaner_id: c.cleaner_id,
          cleaner_payout: c.cleaner_payout,
          start_time: c.start_time || job.start_time,
          end_time: c.end_time || job.end_time,
          hours_worked: c.hours_worked,
          km_driven: c.km_driven,
        }))

        const { error: cleanerError } = await supabase.from('job_cleaners').insert(cleanerRows)
        if (cleanerError) throw cleanerError
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
    },
  })
}
