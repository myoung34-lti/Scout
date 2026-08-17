import type { GreenhouseCandidate, GreenhouseJob, GreenhouseApplication } from './types'
import type { JobStatus, PipelineStage, CandidateSource } from '@prisma/client'
import { htmlToPlainText } from './html-to-text'

export function mapJobStatus(status: string): JobStatus | null {
  if (status === 'open') return 'OPEN'
  if (status === 'closed') return 'CLOSED'
  return null // unmapped — caller logs and skips rather than guessing
}

export type StageMappingResult =
  | { kind: 'stage'; stage: PipelineStage }
  | { kind: 'holding_pattern'; proxyStage: PipelineStage; originalJobName: string }
  | { kind: 'unmapped'; stageName: string | null; status: string }

const IN_PROCESS_STAGE_MAP: Record<string, PipelineStage> = {
  'Application Review': 'APPLIED',
  'Under Review': 'SCREENING',
  'Introductory Call': 'INTRODUCTORY_CALL',
  'LTI Mindset': 'BEHAVIORAL_INTERVIEW',
  'Technical Interview': 'TECHNICAL_INTERVIEW',
  'Client Interview': 'CLIENT_INTERVIEW',
  'Executive Interview': 'EXECUTIVE_INTERVIEW',
  Offer: 'OFFER',
}

// Approved mapping (see conversation): Holding Pattern preserves the
// Application (proxy stage = Introductory Call) and separately drives
// Candidate.inTalentPool — never silently dropped, never guessed beyond
// this one documented proxy.
export function mapApplicationStage(
  application: Pick<GreenhouseApplication, 'status' | 'stage_name'>,
  jobName: string
): StageMappingResult {
  if (application.status === 'rejected') return { kind: 'stage', stage: 'REJECTED' }
  if (application.status === 'hired') return { kind: 'stage', stage: 'HIRED' }

  if (application.stage_name === 'Holding Pattern') {
    return { kind: 'holding_pattern', proxyStage: 'INTRODUCTORY_CALL', originalJobName: jobName }
  }

  const mapped = application.stage_name ? IN_PROCESS_STAGE_MAP[application.stage_name] : undefined
  if (mapped) return { kind: 'stage', stage: mapped }

  return { kind: 'unmapped', stageName: application.stage_name, status: application.status }
}

export type MappedJob = {
  greenhouseJobId: bigint
  internalName: string
  externalName: string
  status: JobStatus
  description: string | null
  createdAt: Date
  updatedAt: Date
}

// jobPostContent is the raw HTML `content` field from GET /v3/job_posts,
// pre-fetched by the caller (job_posts has its own scope/endpoint, not
// nested on the job object). Optional — a job with no live post just gets
// no description rather than a failed import.
export function mapJob(
  job: GreenhouseJob,
  jobPostContent?: string | null
): MappedJob | { unmapped: true; reason: string } {
  const status = mapJobStatus(job.status)
  if (!status) return { unmapped: true, reason: `Unknown job status "${job.status}"` }

  return {
    greenhouseJobId: job.id,
    internalName: job.name,
    externalName: job.name,
    status,
    description: jobPostContent ? htmlToPlainText(jobPostContent) : null,
    createdAt: new Date(job.created_at),
    updatedAt: new Date(job.updated_at),
  }
}

function pickEmail(addresses: GreenhouseCandidate['email_addresses']): string | null {
  if (addresses.length === 0) return null
  return (
    addresses.find((a) => a.type === 'personal')?.value ??
    addresses.find((a) => a.type === 'work')?.value ??
    addresses[0].value
  )
}

function pickPhone(numbers: GreenhouseCandidate['phone_numbers']): string | null {
  if (numbers.length === 0) return null
  return (
    numbers.find((p) => p.type === 'mobile')?.value ??
    numbers.find((p) => p.type === 'home' || p.type === 'work')?.value ??
    numbers[0].value
  )
}

function pickLinkedin(addresses: GreenhouseCandidate['social_media_addresses']): string | null {
  return addresses.find((s) => s.value.toLowerCase().includes('linkedin.com'))?.value ?? null
}

export type MappedCandidate = {
  greenhouseCandidateId: bigint
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  linkedinUrl: string | null
  currentCompany: string | null
  currentTitle: string | null
  location: string | null
  source: CandidateSource
  createdAt: Date
}

// `source` is resolved by the caller from the candidate's earliest LTI
// application (see sources.ts) — a candidate has no source of their own in
// Greenhouse, only their applications do.
export function mapCandidate(candidate: GreenhouseCandidate, source: CandidateSource): MappedCandidate {
  const locationField = candidate.custom_fields?.location?.value
  return {
    greenhouseCandidateId: candidate.id,
    firstName: candidate.first_name,
    lastName: candidate.last_name,
    email: pickEmail(candidate.email_addresses ?? []),
    phone: pickPhone(candidate.phone_numbers ?? []),
    linkedinUrl: pickLinkedin(candidate.social_media_addresses ?? []),
    currentCompany: candidate.company,
    currentTitle: candidate.title,
    location: typeof locationField === 'string' ? locationField : null,
    source,
    createdAt: new Date(candidate.created_at),
  }
}
