'use client'

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useLocale } from '@/lib/i18n'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { X } from 'lucide-react'
import { useState } from 'react'
import type { Job, JobPhoto } from '@/lib/types'

interface Props {
  job: Job
  open: boolean
  onClose: () => void
}

export function JobPhotos({ job, open, onClose }: Props) {
  const { t } = useLocale()
  const [selected, setSelected] = useState<string | null>(null)

  const { data: photos = [] } = useQuery({
    queryKey: ['job-photos', job.id],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('job_photos')
        .select('*')
        .eq('job_id', job.id)
        .order('id', { ascending: true })
      if (error) throw error
      return (data || []) as JobPhoto[]
    },
    enabled: open,
  })

  return (
    <>
      <Sheet open={open && !selected} onOpenChange={(o) => !o && onClose()}>
        <SheetContent
          side="bottom"
          className="rounded-t-[24px] p-0 max-h-[85vh] overflow-y-auto border-0"
          style={{ background: 'var(--bg2)' }}
        >
          <SheetHeader className="px-5 pt-5 pb-0">
            <SheetTitle className="text-[20px] font-bold tracking-[-0.5px] text-left" style={{ color: 'var(--t1)' }}>
              {t('photos')} ({photos.length})
            </SheetTitle>
          </SheetHeader>

          <div className="px-5 pb-5 mt-4">
            {photos.length === 0 ? (
              <div className="text-center py-8 text-[13px] font-medium" style={{ color: 'var(--t3)' }}>
                {t('noJobs')}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {photos.map((photo) => (
                  <button
                    key={photo.id}
                    onClick={() => setSelected(photo.url)}
                    className="aspect-square rounded-[12px] overflow-hidden"
                    style={{ background: 'var(--fill)' }}
                  >
                    <img src={photo.url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Fullscreen viewer */}
      {selected && (
        <div
          className="fixed inset-0 z-[999] flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.9)' }}
          onClick={() => setSelected(null)}
        >
          <button
            className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.15)' }}
            onClick={() => setSelected(null)}
          >
            <X size={20} color="#fff" />
          </button>
          <img src={selected} alt="" className="max-w-[90vw] max-h-[90vh] rounded-[12px] object-contain" />
        </div>
      )}
    </>
  )
}
