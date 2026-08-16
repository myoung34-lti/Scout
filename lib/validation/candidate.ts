import { z } from 'zod'
import { ALL_CANDIDATE_TYPES } from '@/lib/candidate-type'
import { ALL_CANDIDATE_SOURCES } from '@/lib/candidate-source'
import { ACTIVE_STAGES } from '@/lib/pipeline'

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === '' ? undefined : v))

// Resumes and manual entry both commonly omit the scheme (e.g.
// "www.linkedin.com/in/..."), which would otherwise save as a broken
// relative link — add https:// so it's always a real, clickable URL.
const optionalUrl = optionalText.transform((v) =>
  v === undefined || /^https?:\/\//i.test(v) ? v : `https://${v}`
)

export const candidateSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required'),
  lastName: z.string().trim().min(1, 'Last name is required'),
  email: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === '' ? undefined : v))
    .refine((v) => v === undefined || z.string().email().safeParse(v).success, {
      message: 'Enter a valid email',
    }),
  phone: optionalText,
  linkedinUrl: optionalUrl,
  currentCompany: optionalText,
  candidateType: z.enum(ALL_CANDIDATE_TYPES, {
    error: 'Select a type',
  }),
  source: z.enum(ALL_CANDIDATE_SOURCES, {
    error: 'Select a source',
  }),
  location: optionalText,
  jobId: z
    .string()
    .trim()
    .nullable()
    .optional()
    .transform((v) => (v === '' || v == null ? undefined : v)),
  stage: z
    .string()
    .trim()
    .nullable()
    .optional()
    .transform((v) => (v === '' || v == null ? undefined : v))
    .refine((v) => v === undefined || (ACTIVE_STAGES as string[]).includes(v), {
      message: 'Invalid stage',
    }),
  ownerId: optionalText,
  addToTalentPool: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true'),
}).refine((data) => data.addToTalentPool || data.jobId, {
  message: 'A job is required',
  path: ['jobId'],
})

export type CandidateFormValues = z.infer<typeof candidateSchema>

export const candidateEditSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required'),
  lastName: z.string().trim().min(1, 'Last name is required'),
  email: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === '' ? undefined : v))
    .refine((v) => v === undefined || z.string().email().safeParse(v).success, {
      message: 'Enter a valid email',
    }),
  phone: optionalText,
  linkedinUrl: optionalUrl,
  currentCompany: optionalText,
  location: optionalText,
})

export type CandidateEditFormValues = z.infer<typeof candidateEditSchema>
