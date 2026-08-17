import { fetchAll } from './client'
import type { GreenhouseJob, GreenhouseApplication } from './types'

const LTI_OFFICE_NAME = 'LTI'

// Confirmed via read-only probe against live data: reaching any of these
// stages (or being hired) is what the LTI office's own "Reached Assessment"
// filter tracks. Approved scope: all 39 LTI jobs (open + closed), 892
// candidates by this definition.
const ASSESSMENT_STAGE_NAMES = new Set([
  'Introductory Call',
  'LTI Mindset',
  'Holding Pattern',
  'Technical Interview',
  'Client Interview',
  'Executive Interview',
  'Offer',
])

export function reachedAssessment(app: Pick<GreenhouseApplication, 'status' | 'stage_name'>): boolean {
  return app.status === 'hired' || (app.stage_name !== null && ASSESSMENT_STAGE_NAMES.has(app.stage_name))
}

export async function findLtiOfficeId(): Promise<bigint> {
  const offices = (await fetchAll('offices?per_page=500')) as { id: bigint; name: string }[]
  const office = offices.find((o) => o.name === LTI_OFFICE_NAME)
  if (!office) throw new Error(`No Greenhouse office named "${LTI_OFFICE_NAME}" found`)
  return office.id
}

export async function fetchLtiJobs(): Promise<GreenhouseJob[]> {
  const officeId = await findLtiOfficeId()
  return (await fetchAll(`jobs?office_id=${officeId}&per_page=500`)) as GreenhouseJob[]
}

export async function fetchLtiApplications(jobs: GreenhouseJob[]): Promise<GreenhouseApplication[]> {
  const jobIds = jobs.map((j) => j.id).join(',')
  return (await fetchAll(`applications?job_ids=${jobIds}&per_page=500`)) as GreenhouseApplication[]
}

// Distinct candidate IDs with at least one LTI application that reached
// assessment — the approved scope boundary (892 candidates).
export function qualifyingCandidateIds(applications: GreenhouseApplication[]): Set<bigint> {
  const ids = new Set<bigint>()
  for (const app of applications) {
    if (reachedAssessment(app)) ids.add(app.candidate_id)
  }
  return ids
}
