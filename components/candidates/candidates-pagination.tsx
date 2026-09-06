'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useFilterParams } from '@/lib/use-filter-params'

export function CandidatesPagination({
  page,
  totalPages,
}: {
  page: number
  totalPages: number
}) {
  const { setSingle } = useFilterParams()

  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-between border-t px-4 py-3">
      <Button
        variant="outline"
        size="sm"
        disabled={page <= 1}
        onClick={() => setSingle('page', page > 2 ? String(page - 1) : undefined)}
      >
        <ChevronLeft />
        Previous
      </Button>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        Page
        <Select
          value={String(page)}
          onValueChange={(v) => setSingle('page', v === '1' ? undefined : v)}
        >
          <SelectTrigger className="w-[70px]" size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        of {totalPages}
      </div>

      <Button
        variant="outline"
        size="sm"
        disabled={page >= totalPages}
        onClick={() => setSingle('page', String(page + 1))}
      >
        Next
        <ChevronRight />
      </Button>
    </div>
  )
}
