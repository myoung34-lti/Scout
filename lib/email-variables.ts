import { prisma } from '@/lib/db'

// Fixed, code-backed substitution values — always available from candidate/
// application/recruiter context, unlike EmailVariable rows (DB-editable,
// company-wide constants). Adding one here requires wiring real data at each
// call site, so this list only grows when a feature actually supports it.
export const EMAIL_TEMPLATE_DYNAMIC_VARIABLES = [
  { key: 'candidateFirstName', label: 'Candidate First Name' },
  { key: 'candidateLastName', label: 'Candidate Last Name' },
  { key: 'candidateCurrentCompany', label: "Candidate's Current Company" },
  { key: 'candidateCurrentTitle', label: "Candidate's Current Title" },
  { key: 'jobTitle', label: 'Job Title' },
  { key: 'jobLocation', label: 'Job Location' },
  { key: 'recruiterName', label: 'Recruiter Name' },
  { key: 'recruiterEmail', label: 'Recruiter Email' },
  { key: 'recruiterSignature', label: 'Recruiter Signature' },
] as const

export type EmailTemplateDynamicVariableKey =
  (typeof EMAIL_TEMPLATE_DYNAMIC_VARIABLES)[number]['key']

// The small library of static, company-wide substitution values (Company
// Name, Company Name Short, etc.) — admin-managed from /admin, distinct from
// the fixed dynamic set above.
export async function listEmailVariables() {
  return prisma.emailVariable.findMany({ orderBy: { key: 'asc' } })
}

export async function getEmailVariablesMap(): Promise<Record<string, string>> {
  const variables = await listEmailVariables()
  return Object.fromEntries(variables.map((v) => [v.key, v.value]))
}
