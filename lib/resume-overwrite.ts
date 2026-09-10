import type { ParsedResumeFields, WorkHistoryEntry } from '@/lib/actions/resume-parser'

// Which candidate fields a resume scan is allowed to overwrite, and which of
// them a scan is allowed to *clear*. firstName/lastName are NOT NULL in the
// schema, so a resume that yields no name leaves the existing one alone —
// there is no null to write. Everything else is a true replace: if the new
// resume doesn't mention it, it goes away.
//
// Deliberately absent: rating, owner, source, talent-pool state, stage. None
// of those come from a resume, so a scan has no business touching them.
export type ResumeTextFieldKey =
  | 'firstName'
  | 'lastName'
  | 'email'
  | 'phone'
  | 'linkedinUrl'
  | 'currentCompany'
  | 'currentTitle'
  | 'location'

export const RESUME_TEXT_FIELDS: {
  key: ResumeTextFieldKey
  label: string
  clearable: boolean
}[] = [
  { key: 'firstName', label: 'First name', clearable: false },
  { key: 'lastName', label: 'Last name', clearable: false },
  { key: 'email', label: 'Email', clearable: true },
  { key: 'phone', label: 'Phone', clearable: true },
  { key: 'linkedinUrl', label: 'LinkedIn', clearable: true },
  { key: 'currentCompany', label: 'Current company', clearable: true },
  { key: 'currentTitle', label: 'Current title', clearable: true },
  { key: 'location', label: 'Location', clearable: true },
]

export type ResumeFieldChange = {
  label: string
  before: string | null
  after: string | null
}

export type ResumeOverwritePreview = {
  resumeId: string
  fileName: string
  /** Null when the scan succeeded; the reason when it didn't. */
  parseError: string | null
  fields: ResumeFieldChange[]
  tagsAdded: string[]
  tagsRemoved: string[]
  tagsKept: string[]
  hasChanges: boolean
}

/** Trims, and treats whitespace-only as absent. */
export function normalizeText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null
}

function normalizeYears(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

export type CandidateOverwriteState = {
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  linkedinUrl: string | null
  currentCompany: string | null
  currentTitle: string | null
  location: string | null
  yearsExperience: number | null
  workHistory: unknown
  tagLabels: string[]
}

/**
 * The values a candidate record would hold after applying this scan. Shared
 * by the preview and the apply step so the dialog can never promise
 * something different from what gets written.
 */
export function resolveOverwrite(
  current: CandidateOverwriteState,
  parsed: ParsedResumeFields
) {
  const text = {} as Record<ResumeTextFieldKey, string | null>
  for (const field of RESUME_TEXT_FIELDS) {
    const next = normalizeText(parsed[field.key])
    text[field.key] = next ?? (field.clearable ? null : current[field.key])
  }

  const parsedWork = Array.isArray(parsed.workHistory) ? parsed.workHistory : null

  return {
    ...text,
    // The type-level half of `clearable: false`. The loop above already
    // falls back to the current value for these two, so this narrows
    // string | null to string rather than changing any behaviour — the
    // columns are NOT NULL and a scan must never be able to empty them.
    firstName: text.firstName ?? current.firstName,
    lastName: text.lastName ?? current.lastName,
    yearsExperience: normalizeYears(parsed.yearsExperience),
    workHistory: parsedWork ?? [],
    tagLabels: (parsed.skills ?? []).map((s) => s.trim()).filter((s) => s !== ''),
  }
}

function workHistorySummary(value: unknown): string | null {
  if (!Array.isArray(value) || value.length === 0) return null
  const roles = value as WorkHistoryEntry[]
  const count = `${roles.length} role${roles.length === 1 ? '' : 's'}`
  const top = normalizeText(roles[0]?.title)
  return top ? `${count} — most recent: ${top}` : count
}

/** Case-insensitive set difference, preserving the incoming display casing. */
function diffLabels(from: string[], to: string[]) {
  const fromKeys = new Set(from.map((l) => l.toLowerCase()))
  const toKeys = new Set(to.map((l) => l.toLowerCase()))
  return {
    added: to.filter((l) => !fromKeys.has(l.toLowerCase())),
    removed: from.filter((l) => !toKeys.has(l.toLowerCase())),
    kept: to.filter((l) => fromKeys.has(l.toLowerCase())),
  }
}

/**
 * Only genuinely-changing fields are listed. A dialog that shows eight rows
 * of "no change" trains people to click through it without reading.
 */
export function buildOverwritePreview(
  resumeId: string,
  fileName: string,
  current: CandidateOverwriteState,
  parsed: ParsedResumeFields
): ResumeOverwritePreview {
  const next = resolveOverwrite(current, parsed)

  const fields: ResumeFieldChange[] = []
  for (const field of RESUME_TEXT_FIELDS) {
    const before = normalizeText(current[field.key])
    const after = next[field.key]
    if (before !== after) fields.push({ label: field.label, before, after })
  }

  if (current.yearsExperience !== next.yearsExperience) {
    fields.push({
      label: 'Years of experience',
      before: current.yearsExperience?.toString() ?? null,
      after: next.yearsExperience?.toString() ?? null,
    })
  }

  const beforeWork = workHistorySummary(current.workHistory)
  const afterWork = workHistorySummary(next.workHistory)
  if (JSON.stringify(current.workHistory ?? []) !== JSON.stringify(next.workHistory)) {
    fields.push({ label: 'Work history', before: beforeWork, after: afterWork })
  }

  const tags = diffLabels(current.tagLabels, next.tagLabels)

  return {
    resumeId,
    fileName,
    parseError: null,
    fields,
    tagsAdded: tags.added,
    tagsRemoved: tags.removed,
    tagsKept: tags.kept,
    hasChanges: fields.length > 0 || tags.added.length > 0 || tags.removed.length > 0,
  }
}
