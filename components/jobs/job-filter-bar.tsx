'use client'

import { useRef, useState } from 'react'
import { Search, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useFilterParams } from '@/lib/use-filter-params'

const SEARCH_DEBOUNCE_MS = 350

export function JobFilterBar({ locations }: { locations: string[] }) {
  const { searchParams, setSingle, clearAll } = useFilterParams()
  const [query, setQuery] = useState(searchParams.get('q') ?? '')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Status lives in its own tabs, so it isn't part of what Clear resets.
  const hasFilters = Boolean(searchParams.get('q') || searchParams.get('location'))
  const status = searchParams.get('status')

  function handleClear() {
    setQuery('')
    clearAll()
    if (status) setSingle('status', status)
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-56 flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            if (timer.current) clearTimeout(timer.current)
            const next = e.target.value
            timer.current = setTimeout(
              () => setSingle('q', next.trim() || undefined),
              SEARCH_DEBOUNCE_MS
            )
          }}
          placeholder="Search jobs…"
          aria-label="Search jobs"
          className="pl-9"
        />
      </div>

      <Select
        value={searchParams.get('location') ?? 'ALL'}
        onValueChange={(v) => setSingle('location', v)}
      >
        <SelectTrigger aria-label="Filter by location" className="w-auto min-w-36">
          <SelectValue placeholder="Any location" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">Any location</SelectItem>
          {locations.map((l) => (
            <SelectItem key={l} value={l}>
              {l}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="ghost" onClick={handleClear}>
          <RotateCcw />
          Clear
        </Button>
      )}
    </div>
  )
}
