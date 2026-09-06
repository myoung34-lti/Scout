'use client'

import { useRef, useState } from 'react'
import { Search, SlidersHorizontal, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useFilterParams } from '@/lib/use-filter-params'
import { STAGE_LABELS, ALL_STAGES } from '@/lib/pipeline'
import type { PipelineStage } from '@prisma/client'

const SEARCH_DEBOUNCE_MS = 350

type Option = { id: string; label: string }

export function CandidateFilterBar({
  jobs,
  jobLocations,
  recruiters,
  tags,
}: {
  jobs: Option[]
  jobLocations: string[]
  recruiters: Option[]
  tags: Option[]
}) {
  const { searchParams, setSingle, setMulti, clearAll } = useFilterParams()

  const [queryValue, setQueryValue] = useState(searchParams.get('q') ?? '')
  const [locationValue, setLocationValue] = useState(searchParams.get('location') ?? '')
  // Debounced in the change handler rather than an effect — writing the URL
  // from an effect would fire on every keystroke and trip set-state-in-effect.
  const queryTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const locationTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const selectedStages = searchParams.getAll('stage')
  const selectedTags = searchParams.getAll('tagIds')
  const activeCount = [...searchParams.keys()].filter(
    (k) => !['page', 'sort', 'status'].includes(k)
  ).length

  function debounce(
    timer: React.MutableRefObject<ReturnType<typeof setTimeout> | null>,
    key: string,
    value: string
  ) {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setSingle(key, value.trim() || undefined), SEARCH_DEBOUNCE_MS)
  }

  function toggleInList(key: string, current: string[], value: string) {
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value]
    setMulti(key, next)
  }

  function handleClear() {
    setQueryValue('')
    setLocationValue('')
    clearAll()
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-56 flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={queryValue}
          onChange={(e) => {
            setQueryValue(e.target.value)
            debounce(queryTimer, 'q', e.target.value)
          }}
          placeholder="Search candidates…"
          aria-label="Search candidates"
          className="pl-9"
        />
      </div>

      <MultiSelect
        label="Stage"
        selected={selectedStages}
        options={ALL_STAGES.map((s) => ({ id: s, label: STAGE_LABELS[s as PipelineStage] }))}
        onToggle={(v) => toggleInList('stage', selectedStages, v)}
        onClear={() => setMulti('stage', [])}
      />

      <FilterSelect
        label="Job"
        value={searchParams.get('jobId') ?? 'ALL'}
        placeholder="Any job"
        options={jobs}
        onChange={(v) => setSingle('jobId', v)}
      />

      <FilterSelect
        label="Recruiter"
        value={searchParams.get('recruiterId') ?? 'ALL'}
        placeholder="Any recruiter"
        options={recruiters}
        onChange={(v) => setSingle('recruiterId', v)}
      />

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline">
            <SlidersHorizontal />
            More filters
            {activeCount > 0 && (
              <Badge variant="neutral" className="ml-1">
                {activeCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 space-y-4">
          <fieldset className="space-y-2">
            <legend className="section-label">Quick filters</legend>
            {[
              { key: 'pooled', label: 'In talent pool' },
              { key: 'rated', label: 'Has a rating' },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={searchParams.get(key) === '1'}
                  onCheckedChange={(c) => setSingle(key, c ? '1' : undefined)}
                />
                {label}
              </label>
            ))}
          </fieldset>

          <div className="space-y-1.5">
            <Label htmlFor="min-rating">Minimum rating</Label>
            <Select
              value={searchParams.get('minRating') ?? 'ALL'}
              onValueChange={(v) => setSingle('minRating', v)}
            >
              <SelectTrigger id="min-rating" className="w-full">
                <SelectValue placeholder="Any rating" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Any rating</SelectItem>
                {[5, 4, 3, 2, 1].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}+ stars
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="candidate-location">Candidate location</Label>
            <Input
              id="candidate-location"
              value={locationValue}
              onChange={(e) => {
                setLocationValue(e.target.value)
                debounce(locationTimer, 'location', e.target.value)
              }}
              placeholder="City, state…"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="job-location">Job location</Label>
            <Select
              value={searchParams.get('jobLocation') ?? 'ALL'}
              onValueChange={(v) => setSingle('jobLocation', v)}
            >
              <SelectTrigger id="job-location" className="w-full">
                <SelectValue placeholder="Any location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Any location</SelectItem>
                {jobLocations.map((l) => (
                  <SelectItem key={l} value={l}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="added-preset">Added</Label>
            <Select
              value={searchParams.get('addedPreset') ?? 'ALL'}
              onValueChange={(v) => setSingle('addedPreset', v)}
            >
              <SelectTrigger id="added-preset" className="w-full">
                <SelectValue placeholder="Any time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Any time</SelectItem>
                <SelectItem value="week">Last week</SelectItem>
                <SelectItem value="month">Last month</SelectItem>
                <SelectItem value="custom">Custom range</SelectItem>
              </SelectContent>
            </Select>
            {searchParams.get('addedPreset') === 'custom' && (
              <div className="flex gap-2 pt-1">
                <Input
                  type="date"
                  aria-label="Added from"
                  value={searchParams.get('addedFrom') ?? ''}
                  onChange={(e) => setSingle('addedFrom', e.target.value || undefined)}
                />
                <Input
                  type="date"
                  aria-label="Added to"
                  value={searchParams.get('addedTo') ?? ''}
                  onChange={(e) => setSingle('addedTo', e.target.value || undefined)}
                />
              </div>
            )}
          </div>

          {tags.length > 0 && (
            <fieldset className="space-y-2">
              <legend className="section-label">Tags</legend>
              <div className="max-h-44 space-y-2 overflow-y-auto pr-1">
                {tags.map((t) => (
                  <label key={t.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={selectedTags.includes(t.id)}
                      onCheckedChange={() => toggleInList('tagIds', selectedTags, t.id)}
                    />
                    {t.label}
                  </label>
                ))}
              </div>
            </fieldset>
          )}
        </PopoverContent>
      </Popover>

      {activeCount > 0 && (
        <Button variant="ghost" onClick={handleClear}>
          <RotateCcw />
          Clear
        </Button>
      )}
    </div>
  )
}

function FilterSelect({
  label,
  value,
  placeholder,
  options,
  onChange,
}: {
  label: string
  value: string
  placeholder: string
  options: Option[]
  onChange: (value: string) => void
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={label} className="w-auto min-w-32">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="ALL">{placeholder}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.id} value={o.id}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function MultiSelect({
  label,
  selected,
  options,
  onToggle,
  onClear,
}: {
  label: string
  selected: string[]
  options: Option[]
  onToggle: (value: string) => void
  onClear: () => void
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">
          {label}
          {selected.length > 0 && (
            <Badge variant="neutral" className="ml-1">
              {selected.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-60 space-y-2">
        <div className="flex items-center justify-between">
          <span className="section-label">{label}</span>
          {selected.length > 0 && (
            <Button variant="link" size="xs" onClick={onClear}>
              Clear
            </Button>
          )}
        </div>
        <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
          {options.map((o) => (
            <label key={o.id} className="flex items-center gap-2 text-sm">
              <Checkbox checked={selected.includes(o.id)} onCheckedChange={() => onToggle(o.id)} />
              {o.label}
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
