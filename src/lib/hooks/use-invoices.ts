'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Invoice } from '@/lib/types'

export function useInvoices() {
  const supabase = createClient()

  return useQuery({
    queryKey: ['invoices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('*, partner:partners(*)')
        .order('id', { ascending: false })
      if (error) throw error
      return (data || []) as Invoice[]
    },
  })
}

export function useInvoiceJobs() {
  const supabase = createClient()

  return useQuery({
    queryKey: ['invoice_jobs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoice_jobs')
        .select('invoice_id, job_id')
      if (error) throw error
      return (data || []) as { invoice_id: number; job_id: number }[]
    },
  })
}

export function useCreateInvoice() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ partner_id, job_ids }: { partner_id: string; job_ids: number[] }) => {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partner_id, job_ids }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to create invoice')
      }

      // Download the PDF
      const blob = await res.blob()
      const invoiceNumber = res.headers.get('X-Invoice-Number') || 'factuur'
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${invoiceNumber}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      return {
        invoiceNumber,
        invoiceId: res.headers.get('X-Invoice-Id'),
        pdfUrl: res.headers.get('X-Pdf-Url'),
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['invoice_jobs'] })
    },
  })
}
