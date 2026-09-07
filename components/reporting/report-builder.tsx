'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Save } from 'lucide-react'
import { runReportPreview, saveReport, updateSavedReport } from '@/lib/actions/reports'
import {
  SUBJECTS,
  METRICS,
  DATE_RANGE_PRESETS,
  FILTER_FIELDS,
  VISUALIZATIONS,
} from '@/lib/reporting/report-schema'
import type {
  Subject,
  Metric,
  GroupBy,
  DateRangePreset,
  TimeGrouping,
  FilterField,
  ReportFilter,
  ReportDefinition,
  ReportResult,
  Visualization,
} from '@/lib/reporting/report-schema'
import {
  SUBJECT_LABELS,
  METRIC_LABELS,
  METRIC_SUBJECTS,
  METRIC_GROUP_BYS,
  GROUP_BY_LABELS,
  FILTER_FIELD_LABELS,
  DATE_RANGE_PRESET_LABELS,
  TIME_GROUPING_LABELS,
  JOB_STATUS_LABELS,
  ALL_JOB_STATUSES,
} from '@/lib/reporting/report-catalog'
import { STAGE_LABELS, ALL_STAGES, REJECTION_REASON_LABELS, ALL_REJECTION_REASONS } from '@/lib/pipeline'
import { INTERVIEW_TYPE_LABELS, ALL_INTERVIEW_TYPES, RECOMMENDATION_LABELS, ALL_RECOMMENDATIONS } from '@/lib/interview'
import { CANDIDATE_SOURCE_LABELS, ALL_CANDIDATE_SOURCES } from '@/lib/candidate-source'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ReportResults } from '@/components/reporting/report-results'
import { DrillDownDialog } from '@/components/reporting/drill-down-dialog'

// A field's value is always a single choice in the builder UI (schema
// still supports arrays/other operators for future use) — this keeps the
// filter row simple: pick a field, pick one value, done.
const FILTER_OPERATOR_FOR_FIELD: Record<FilterField, ReportFilter['operator']> = {
  RECRUITER: 'eq',
  JOB: 'eq',
  JOB_STATUS: 'eq',
  CANDIDATE_STAGE: 'eq',
  RATING: 'eq',
  LOCATION: 'contains',
  TAG: 'eq',
  TALENT_POOL: 'is',
  INTERVIEW_TYPE: 'eq',
  INTERVIEW_RECOMMENDATION: 'eq',
  REJECTION_REASON: 'eq',
  SOURCE: 'eq',
}

function visualizationForGroupBy(groupBy: GroupBy): Visualization {
  if (groupBy === 'TIME') return 'LINE'
  if (groupBy === 'NONE') return 'TABLE'
  return 'BAR'
}

export type SavedReportOption = {
  id: string
  name: string
  description: string | null
  visualization: string
  definition: unknown
}

export type Lookups = {
  recruiters: { id: string; name: string }[]
  jobs: { id: string; internalName: string }[]
  tags: { id: string; displayLabel: string }[]
}

function FilterValueControl({
  filter,
  lookups,
  onChange,
}: {
  filter: ReportFilter
  lookups: Lookups
  onChange: (value: string) => void
}) {
  const value = Array.isArray(filter.value) ? (filter.value[0] ?? '') : filter.value

  switch (filter.field) {
    case 'RECRUITER':
      return (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Choose a recruiter…" /></SelectTrigger>
          <SelectContent>
            {lookups.recruiters.map((r) => (
              <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    case 'JOB':
      return (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Choose a job…" /></SelectTrigger>
          <SelectContent>
            {lookups.jobs.map((j) => (
              <SelectItem key={j.id} value={j.id}>{j.internalName}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    case 'JOB_STATUS':
      return (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Choose a status…" /></SelectTrigger>
          <SelectContent>
            {ALL_JOB_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{JOB_STATUS_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    case 'CANDIDATE_STAGE':
      return (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Choose a stage…" /></SelectTrigger>
          <SelectContent>
            {ALL_STAGES.map((s) => (
              <SelectItem key={s} value={s}>{STAGE_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    case 'RATING':
      return (
        <Input
          type="number"
          min={1}
          max={5}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Rating"
        />
      )
    case 'LOCATION':
      return (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Contains…"
        />
      )
    case 'TAG':
      return (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Choose a tag…" /></SelectTrigger>
          <SelectContent>
            {lookups.tags.map((t) => (
              <SelectItem key={t.id} value={t.displayLabel}>{t.displayLabel}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    case 'TALENT_POOL':
      return (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Choose…" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="true">Yes</SelectItem>
            <SelectItem value="false">No</SelectItem>
          </SelectContent>
        </Select>
      )
    case 'INTERVIEW_TYPE':
      return (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Choose a type…" /></SelectTrigger>
          <SelectContent>
            {ALL_INTERVIEW_TYPES.map((t) => (
              <SelectItem key={t} value={t}>{INTERVIEW_TYPE_LABELS[t]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    case 'INTERVIEW_RECOMMENDATION':
      return (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Choose a recommendation…" /></SelectTrigger>
          <SelectContent>
            {ALL_RECOMMENDATIONS.map((r) => (
              <SelectItem key={r} value={r}>{RECOMMENDATION_LABELS[r]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    case 'REJECTION_REASON':
      return (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Choose a reason…" /></SelectTrigger>
          <SelectContent>
            {ALL_REJECTION_REASONS.map((r) => (
              <SelectItem key={r} value={r}>{REJECTION_REASON_LABELS[r]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    case 'SOURCE':
      return (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Choose a source…" /></SelectTrigger>
          <SelectContent>
            {ALL_CANDIDATE_SOURCES.map((s) => (
              <SelectItem key={s} value={s}>{CANDIDATE_SOURCE_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
  }
}

export function ReportBuilder({
  lookups,
  initialReport,
}: {
  lookups: Lookups
  initialReport?: SavedReportOption | null
}) {
  const router = useRouter()
  const initialDef = initialReport?.definition as ReportDefinition | undefined

  const [savedReportId, setSavedReportId] = useState<string | null>(initialReport?.id ?? null)
  const [name, setName] = useState(initialReport?.name ?? '')
  const [description, setDescription] = useState(initialReport?.description ?? '')
  const [subject, setSubject] = useState<Subject>(initialDef?.subject ?? 'CANDIDATES')
  const [metric, setMetric] = useState<Metric>(initialDef?.metric ?? 'CANDIDATES_ADDED')
  const [groupBy, setGroupBy] = useState<GroupBy>(initialDef?.groupBy ?? 'TIME')
  const [filters, setFilters] = useState<ReportFilter[]>(initialDef?.filters ?? [])
  const [datePreset, setDatePreset] = useState<DateRangePreset>(initialDef?.dateRange.preset ?? 'LAST_90')
  const [customStart, setCustomStart] = useState(initialDef?.dateRange.start ?? '')
  const [customEnd, setCustomEnd] = useState(initialDef?.dateRange.end ?? '')
  const [timeGrouping, setTimeGrouping] = useState<TimeGrouping | undefined>(initialDef?.timeGrouping)
  const [visualization, setVisualization] = useState<Visualization>(
    (initialReport?.visualization as Visualization) ?? 'LINE'
  )

  const [result, setResult] = useState<ReportResult | null>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [saveOpen, setSaveOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [drillDownLabel, setDrillDownLabel] = useState<string | null>(null)
  const requestIdRef = useRef(0)

  function applyGroupBy(next: GroupBy) {
    setGroupBy(next)
    setVisualization(visualizationForGroupBy(next))
  }

  function handleSubjectChange(next: Subject) {
    setSubject(next)
    const validMetrics = METRICS.filter((m) => METRIC_SUBJECTS[m].includes(next))
    const nextMetric = validMetrics.includes(metric) ? metric : validMetrics[0]
    setMetric(nextMetric)
    const validGroupBys = METRIC_GROUP_BYS[nextMetric]
    if (!validGroupBys.includes(groupBy)) applyGroupBy(validGroupBys[0])
  }

  function handleMetricChange(next: Metric) {
    setMetric(next)
    const validGroupBys = METRIC_GROUP_BYS[next]
    if (!validGroupBys.includes(groupBy)) applyGroupBy(validGroupBys[0])
  }

  function addFilter() {
    setFilters((prev) => [...prev, { field: 'RECRUITER', operator: 'eq', value: '' }])
  }

  function updateFilter(index: number, next: Partial<ReportFilter>) {
    setFilters((prev) => prev.map((f, i) => (i === index ? { ...f, ...next } : f)))
  }

  function removeFilter(index: number) {
    setFilters((prev) => prev.filter((_, i) => i !== index))
  }

  function currentDefinition(): ReportDefinition {
    return {
      subject,
      metric,
      groupBy,
      filters: filters.filter((f) => (Array.isArray(f.value) ? f.value.length > 0 : f.value.trim())),
      dateRange: {
        preset: datePreset,
        start: datePreset === 'CUSTOM' ? customStart : undefined,
        end: datePreset === 'CUSTOM' ? customEnd : undefined,
      },
      timeGrouping: groupBy === 'TIME' ? timeGrouping : undefined,
    }
  }

  // Dynamic, debounced re-run on any config change — no manual "Run Report"
  // click required.
  useEffect(() => {
    if (datePreset === 'CUSTOM' && (!customStart || !customEnd)) return

    const requestId = ++requestIdRef.current
    const definition = currentDefinition()
    const handle = setTimeout(() => {
      startTransition(async () => {
        const res = await runReportPreview(definition)
        if (requestId !== requestIdRef.current) return // a newer request superseded this one
        if ('error' in res) {
          setError(res.error)
          setResult(null)
        } else {
          setError(null)
          setResult(res.result)
        }
      })
    }, 400)
    return () => clearTimeout(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject, metric, groupBy, filters, datePreset, customStart, customEnd, timeGrouping])

  async function handleSave() {
    setSaveError(null)
    if (!name.trim()) {
      setSaveError('Name is required.')
      return
    }
    setSaving(true)
    const input = { name, description, visualization, definition: currentDefinition() }
    const res = savedReportId
      ? await updateSavedReport(savedReportId, input)
      : await saveReport(input)
    setSaving(false)
    if ('error' in res) {
      setSaveError(res.error)
      return
    }
    setSavedReportId(res.id)
    setSaveOpen(false)
    router.refresh()
  }

  const validMetrics = METRICS.filter((m) => METRIC_SUBJECTS[m].includes(subject))
  const validGroupBys = METRIC_GROUP_BYS[metric]

  return (
    <div className="space-y-6">
      <div className="grid gap-4 rounded-xl border border-border bg-card shadow-xs p-5 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-2 lg:col-span-3">
          <Label htmlFor="report-name">Report Name</Label>
          <Input
            id="report-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Candidates Added by Recruiter"
          />
        </div>

        <div className="space-y-2">
          <Label>Data</Label>
          <Select value={subject} onValueChange={(v) => handleSubjectChange(v as Subject)}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {SUBJECTS.map((s) => (
                <SelectItem key={s} value={s}>{SUBJECT_LABELS[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Metric</Label>
          <Select value={metric} onValueChange={(v) => handleMetricChange(v as Metric)}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {validMetrics.map((m) => (
                <SelectItem key={m} value={m}>{METRIC_LABELS[m]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Group By</Label>
          <Select value={groupBy} onValueChange={(v) => applyGroupBy(v as GroupBy)}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {validGroupBys.map((g) => (
                <SelectItem key={g} value={g}>{GROUP_BY_LABELS[g]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Date Range</Label>
          <Select value={datePreset} onValueChange={(v) => setDatePreset(v as DateRangePreset)}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {DATE_RANGE_PRESETS.map((p) => (
                <SelectItem key={p} value={p}>{DATE_RANGE_PRESET_LABELS[p]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {datePreset === 'CUSTOM' && (
          <div className="flex gap-2 sm:col-span-2">
            <div className="flex-1 space-y-2">
              <Label htmlFor="custom-start">Start Date</Label>
              <Input id="custom-start" type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
            </div>
            <div className="flex-1 space-y-2">
              <Label htmlFor="custom-end">End Date</Label>
              <Input id="custom-end" type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
            </div>
          </div>
        )}

        {groupBy === 'TIME' && (
          <div className="space-y-2">
            <Label>Group Time By</Label>
            <Select
              value={timeGrouping ?? 'AUTO'}
              onValueChange={(v) => setTimeGrouping(v === 'AUTO' ? undefined : (v as TimeGrouping))}
            >
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="AUTO">Auto</SelectItem>
                {(['DAY', 'WEEK', 'MONTH', 'QUARTER'] as const).map((t) => (
                  <SelectItem key={t} value={t}>{TIME_GROUPING_LABELS[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2 lg:col-span-3">
          <div className="flex items-center justify-between">
            <Label>Filters</Label>
            <Button type="button" variant="outline" size="sm" onClick={addFilter}>
              <Plus />
              Add Filter
            </Button>
          </div>
          {filters.length === 0 ? (
            <p className="text-xs text-muted-foreground">No filters — showing all data in range.</p>
          ) : (
            <div className="space-y-2">
              {filters.map((filter, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Select
                    value={filter.field}
                    onValueChange={(v) =>
                      updateFilter(i, {
                        field: v as FilterField,
                        operator: FILTER_OPERATOR_FOR_FIELD[v as FilterField],
                        value: '',
                      })
                    }
                  >
                    <SelectTrigger className="w-44 shrink-0"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FILTER_FIELDS.map((f) => (
                        <SelectItem key={f} value={f}>{FILTER_FIELD_LABELS[f]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex-1">
                    <FilterValueControl
                      filter={filter}
                      lookups={lookups}
                      onChange={(value) => updateFilter(i, { value })}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFilter(i)}
                    aria-label="Remove filter"
                  >
                    <X />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-xs p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-medium">{name.trim() || METRIC_LABELS[metric]}</h2>
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              {VISUALIZATIONS.map((v) => (
                <Button
                  key={v}
                  type="button"
                  size="sm"
                  variant={visualization === v ? 'default' : 'outline'}
                  onClick={() => setVisualization(v)}
                >
                  {v.charAt(0) + v.slice(1).toLowerCase()}
                </Button>
              ))}
            </div>
            <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
              <DialogTrigger asChild>
                <Button type="button" variant="outline" size="sm">
                  <Save />
                  Save Report
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{savedReportId ? 'Update Report' : 'Save Report'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="save-name">Name</Label>
                    <Input id="save-name" value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="save-description">Description</Label>
                    <Textarea
                      id="save-description"
                      rows={2}
                      className="field-sizing-fixed resize-none"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>
                  {saveError && <p className="text-sm text-destructive">{saveError}</p>}
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setSaveOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="button" onClick={handleSave} disabled={saving}>
                    {saving ? 'Saving…' : savedReportId ? 'Update' : 'Save'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <ReportResults
          result={result}
          visualization={visualization}
          loading={isPending}
          error={error}
          onDrillDown={setDrillDownLabel}
        />
      </div>

      <DrillDownDialog
        open={drillDownLabel !== null}
        onOpenChange={(open) => {
          if (!open) setDrillDownLabel(null)
        }}
        definition={result ? currentDefinition() : null}
        groupLabel={drillDownLabel ?? ''}
      />
    </div>
  )
}
