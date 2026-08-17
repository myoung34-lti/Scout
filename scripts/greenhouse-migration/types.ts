// Minimal Greenhouse Harvest v3 shapes — only the fields this migration
// actually reads. All numeric IDs are bigint (see big-json.ts).

export type GreenhouseJob = {
  id: bigint
  name: string
  status: 'open' | 'closed' | string
  created_at: string
  updated_at: string
  office_ids: bigint[]
}

export type GreenhouseCandidate = {
  id: bigint
  first_name: string
  last_name: string
  company: string | null
  title: string | null
  created_at: string
  email_addresses: { value: string; type: string }[]
  phone_numbers: { value: string; type: string }[]
  social_media_addresses: { value: string }[]
  custom_fields: Record<string, { name: string; type: string; value: unknown }>
}

export type GreenhouseApplication = {
  id: bigint
  candidate_id: bigint
  job_id: bigint
  source_id: bigint | null
  status: 'in_process' | 'rejected' | 'hired' | string
  stage_name: string | null
  rejected_at: string | null
  last_activity_at: string
  created_at: string
  updated_at: string
}

export type GreenhouseAttachment = {
  id: bigint
  candidate_id: bigint
  application_id: bigint
  type: string
  filename: string
  url: string
}

// Confirmed against live data once harvest:notes:list / harvest:scorecards:list
// were granted.
export type GreenhouseNote = {
  id: bigint
  candidate_id: bigint
  application_id: bigint | null
  type: 'ACTIVITY' | 'EMAIL' | 'INTERVIEW' | 'FORM' | string
  subject: string | null
  body: string | null
  user_id: bigint | null
  created_at: string
}

export type GreenhouseScorecard = {
  id: bigint
  application_id: bigint
  interviewer_id: bigint
  notes: string | null
  status: string
  interviewed_at: string | null
  submitted_at: string | null
  candidate_rating: string | null
}

export type GreenhouseUser = {
  id: bigint
  name: string
}

export type GreenhouseSource = {
  id: bigint
  name: string
  type: { id: bigint; name: string }
}
