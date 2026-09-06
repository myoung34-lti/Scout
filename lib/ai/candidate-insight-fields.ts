// The ten fixed fields Candidate Insights always generates — shared between
// the generation action (builds the tool schema from this list), the
// display card (renders labels in this order), and email drafting (reads
// saved values to feed alongside full CandidateContext).
export type InsightFieldKey =
  | 'currentRoleCompany'
  | 'desiredCompensation'
  | 'whatTheyWantNext'
  | 'motivationForChange'
  | 'onsiteRemotePreference'
  | 'locationRelocation'
  | 'technicalInterests'
  | 'personalInterests'
  | 'personalDetails'
  | 'concernsOpenQuestions'

export const INSIGHT_FIELDS: { key: InsightFieldKey; label: string; description: string }[] = [
  {
    key: 'currentRoleCompany',
    label: 'Current Role / Company',
    description: "The candidate's current job title and employer.",
  },
  {
    key: 'desiredCompensation',
    label: 'Desired Compensation',
    description: 'Any compensation expectation the candidate has stated (a number, range, or note).',
  },
  {
    key: 'whatTheyWantNext',
    label: 'What They Want Next',
    description: 'What the candidate is looking for in their next role.',
  },
  {
    key: 'motivationForChange',
    label: 'Motivation for Change',
    description: 'Why the candidate is open to or looking for a new role.',
  },
  {
    key: 'onsiteRemotePreference',
    label: 'Onsite / Remote Preference',
    description: 'Any stated preference for onsite, hybrid, or remote work.',
  },
  {
    key: 'locationRelocation',
    label: 'Location / Relocation',
    description: 'Where the candidate is located and any stated openness to relocating.',
  },
  {
    key: 'technicalInterests',
    label: 'Technical Interests',
    description: 'Technologies, domains, or types of work the candidate has expressed interest in.',
  },
  {
    key: 'personalInterests',
    label: 'Personal Interests',
    description: 'Hobbies or personal interests the candidate has mentioned in conversation.',
  },
  {
    key: 'personalDetails',
    label: 'Personal Details to Remember',
    description: 'Specific personal details worth remembering before the next conversation (e.g. an event, milestone, or plan they mentioned).',
  },
  {
    key: 'concernsOpenQuestions',
    label: 'Potential Concerns / Open Questions',
    description: 'Concerns the candidate has raised, or open questions from the recruiting team about them.',
  },
]

export function formatInsightField(value: string | null | undefined): string {
  return value?.trim() ? value : 'Not recorded'
}

// Used by email drafting — omits unsupported fields entirely rather than
// telling Claude "Desired Compensation: Not recorded" as if that were real
// signal.
export function formatInsightForPrompt(
  insight: Partial<Record<InsightFieldKey, string | null>>
): string | null {
  const lines = INSIGHT_FIELDS.filter((f) => insight[f.key]?.trim()).map(
    (f) => `${f.label}: ${insight[f.key]}`
  )
  return lines.length ? lines.join('\n') : null
}
