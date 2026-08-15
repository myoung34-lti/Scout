import { z } from 'zod'

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === '' ? undefined : v))

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
  linkedinUrl: optionalText,
  currentCompany: optionalText,
  currentTitle: optionalText,
  location: optionalText,
  jobId: z.string().trim().min(1, 'A job is required'),
  ownerId: optionalText,
})

export type CandidateFormValues = z.infer<typeof candidateSchema>
