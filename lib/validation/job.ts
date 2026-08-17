import { z } from 'zod'

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === '' ? undefined : v))

const checkbox = z
  .union([z.literal('on'), z.undefined(), z.null()])
  .transform((v) => v === 'on')

export const jobSchema = z.object({
  internalName: z.string().trim().min(1, 'Internal name is required'),
  externalName: z.string().trim().min(1, 'External name is required'),
  location: z.string().trim().min(1, 'Location is required'),
  isRemote: checkbox,
  isHybrid: checkbox,
  description: optionalText,
  status: z.enum(['OPEN', 'CLOSED', 'ON_HOLD']),
})

export type JobFormValues = z.infer<typeof jobSchema>
