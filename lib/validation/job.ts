import { z } from 'zod'

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === '' ? undefined : v))

const checkbox = z
  .union([z.literal('on'), z.undefined(), z.null()])
  .transform((v) => v === 'on')

// The checkbox groups submit zero or more ids under one name.
const assigneeIds = z
  .array(z.string().trim().min(1))
  .max(20)
  .optional()
  .transform((v) => v ?? [])

export const jobSchema = z.object({
  internalName: z.string().trim().min(1, 'Internal name is required'),
  externalName: z.string().trim().min(1, 'External name is required'),
  clientName: optionalText,
  teamName: optionalText,
  location: z.string().trim().min(1, 'Location is required'),
  isOnsite: checkbox,
  isRemote: checkbox,
  isHybrid: checkbox,
  description: optionalText,
  status: z.enum(['OPEN', 'CLOSED', 'ON_HOLD']),
  // '' comes from the "Unassigned" option; stored as null rather than an
  // empty string so the foreign key stays valid.
  recruiterIds: assigneeIds,
  sourcerIds: assigneeIds,
})

export type JobFormValues = z.infer<typeof jobSchema>
