'use client'

import { useEffect, useRef, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ALL_STAGES, STAGE_LABELS } from '@/lib/pipeline'
import { MultiSelectChips } from '@/components/candidates/multi-select-chips'
import { useFilterParams } from '@/lib/use-filter-params'

const RATING_OPTIONS = [5, 4, 3, 2, 1]

export function CandidateSearchFilters({
  jobs,
  jobLocations,
  tags,
}: {
  jobs: { id: string; internalName: string }[]
  jobLocations: string[]
  tags: { id: string; displayLabel: string }[]
}) {
  const { searchParams, setSingle, setMulti, clearAll } = useFilterParams()

  const [query, setQuery] = useState(searchParams.get('q') ?? '')
  const [location, setLocation] = useState(searchParams.get('location') ?? '')

  // Tracks the value WE last pushed to the URL for each field, so the
  // resync effect below can tell "the URL changed because our own debounce
  // fired" apart from "the URL changed some other way (Reset Filters, a
  // pill removed)". Without this, a debounced push that resolves while the
  // user keeps typing snaps local state back and eats their latest input.
  const lastPushedQuery = useRef(searchParams.get('q') ?? '')
  const lastPushedLocation = useRef(searchParams.get('location') ?? '')

  // Debounce free-text fields so we don't navigate on every keystroke.
  useEffect(() => {
    const handle = setTimeout(() => {
      lastPushedQuery.current = query
      setSingle('q', query || undefined)
    }, 350)
    return () => clearTimeout(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  useEffect(() => {
    const handle = setTimeout(() => {
      lastPushedLocation.current = location
      setSingle('location', location || undefined)
    }, 350)
    return () => clearTimeout(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location])

  // Re-sync local text state when the URL changes from elsewhere (Clear
  // all filters, or removing a pill above the results) — but skip it when
  // the change is just the URL catching up to our own debounced push.
  useEffect(() => {
    const urlQuery = searchParams.get('q') ?? ''
    if (urlQuery !== lastPushedQuery.current) {
      lastPushedQuery.current = urlQuery
      setQuery(urlQuery)
    }

    const urlLocation = searchParams.get('location') ?? ''
    if (urlLocation !== lastPushedLocation.current) {
      lastPushedLocation.current = urlLocation
      setLocation(urlLocation)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const stages = searchParams.getAll('stage')
  const tagIds = searchParams.getAll('tagIds')
  const jobId = searchParams.get('jobId') ?? 'ALL'
  const jobLocation = searchParams.get('jobLocation') ?? 'ALL'
  const minRating = searchParams.get('minRating') ?? 'ALL'

  return (
    <div className="space-y-4">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search candidates…"
      />

      <Accordion
        type="multiple"
        defaultValue={['stage', 'jobs', 'candidate']}
        className="rounded-lg border bg-background px-4"
      >
        <AccordionItem value="stage">
          <AccordionTrigger>Stage</AccordionTrigger>
          <AccordionContent>
            <MultiSelectChips
              options={ALL_STAGES.map((s) => ({
                value: s,
                label: STAGE_LABELS[s],
              }))}
              values={stages}
              onChange={(v) => setMulti('stage', v)}
              placeholder="Add stage…"
              showSelected={false}
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="jobs">
          <AccordionTrigger>Jobs</AccordionTrigger>
          <AccordionContent className="space-y-3">
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">
                Title
              </Label>
              <Select
                value={jobId}
                onValueChange={(v) => setSingle('jobId', v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Any job</SelectItem>
                  {jobs.map((j) => (
                    <SelectItem key={j.id} value={j.id}>
                      {j.internalName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">
                Location
              </Label>
              <Select
                value={jobLocation}
                onValueChange={(v) => setSingle('jobLocation', v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Any location</SelectItem>
                  {jobLocations.map((loc) => (
                    <SelectItem key={loc} value={loc}>
                      {loc}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="candidate">
          <AccordionTrigger>Candidate</AccordionTrigger>
          <AccordionContent className="space-y-3">
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">
                Star Rating
              </Label>
              <Select
                value={minRating}
                onValueChange={(v) => setSingle('minRating', v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Any rating</SelectItem>
                  {RATING_OPTIONS.map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}+ stars
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label
                htmlFor="location"
                className="mb-1.5 block text-xs text-muted-foreground"
              >
                Location
              </Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="City, state…"
              />
            </div>
            {tags.length > 0 && (
              <div>
                <Label className="mb-1.5 block text-xs text-muted-foreground">
                  Tags
                </Label>
                <div className="flex flex-col gap-2">
                  {tags.map((t) => (
                    <label
                      key={t.id}
                      className="flex items-center gap-1.5 text-sm"
                    >
                      <Checkbox
                        checked={tagIds.includes(t.id)}
                        onCheckedChange={(checked) =>
                          setMulti(
                            'tagIds',
                            checked
                              ? [...tagIds, t.id]
                              : tagIds.filter((id) => id !== t.id)
                          )
                        }
                      />
                      {t.displayLabel}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Button variant="link" size="sm" onClick={clearAll} className="px-0">
        <RotateCcw />
        Reset Filters
      </Button>
    </div>
  )
}
