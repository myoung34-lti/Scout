'use client'

import { useEffect, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useFilterParams } from '@/lib/use-filter-params'

export function EmailTemplateSearchFilters() {
  const { searchParams, setSingle } = useFilterParams()

  const [query, setQuery] = useState(searchParams.get('q') ?? '')
  const lastPushedQuery = useRef(searchParams.get('q') ?? '')

  useEffect(() => {
    const handle = setTimeout(() => {
      lastPushedQuery.current = query
      setSingle('q', query || undefined)
    }, 350)
    return () => clearTimeout(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  useEffect(() => {
    const urlQuery = searchParams.get('q') ?? ''
    if (urlQuery !== lastPushedQuery.current) {
      lastPushedQuery.current = urlQuery
      setQuery(urlQuery)
    }
  }, [searchParams])

  const status = searchParams.get('status') ?? 'ALL'

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search email templates…"
        className="sm:max-w-xs"
      />
      <Select value={status} onValueChange={(v) => setSingle('status', v)}>
        <SelectTrigger className="w-full sm:w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All statuses</SelectItem>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="inactive">Inactive</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
