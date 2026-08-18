import { z } from 'zod'
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

// "NONE" is the edit form's explicit "unset this" option — distinct from
// simply not touching the field — for anything backed by a nullable column.
const NONE = 'NONE'

// Unlike optionalText (used for creation, where an empty field just means
// "never collected"), the edit form always resubmits every field's full
// current state — so an emptied value here means "clear it", and must
// become an explicit null rather than undefined. Prisma's update() treats
// `undefined` as "field not provided" and silently leaves the old value in
// place, which would make clearing a field in this form a no-op.
const nullableText = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : null))

const nullableUrl = z
  .string()
  .trim()
  .optional()
  .transform((v) => {
    if (!v) return null
    return /^https?:\/\//i.test(v) ? v : `https://${v}`
  })

export const candidateEditSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required'),
  lastName: z.string().trim().min(1, 'Last name is required'),
  email: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : null))
    .refine((v) => v === null || z.string().email().safeParse(v).success, {
      message: 'Enter a valid email',
    }),
  phone: nullableText,
  linkedinUrl: nullableUrl,
  currentCompany: nullableText,
  currentTitle: nullableText,
  location: nullableText,
  source: z
    .union([z.enum(ALL_CANDIDATE_SOURCES), z.literal(NONE)])
    .optional()
    .transform((v) => (!v || v === NONE ? null : v)),
  ownerId: z
    .string()
    .trim()
    .optional()
    .transform((v) => (!v || v === NONE ? null : v)),
})

export type CandidateEditFormValues = z.infer<typeof candidateEditSchema>
