import { z } from 'zod'

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === '' ? undefined : v))

const bulletList = z
  .string()
  .optional()
  .transform((v) =>
    (v ?? '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
  )

const checkbox = z
  .union([z.literal('on'), z.undefined(), z.null()])
  .transform((v) => v === 'on')

export const jobSchema = z.object({
  internalName: z.string().trim().min(1, 'Internal name is required'),
  externalName: z.string().trim().min(1, 'External name is required'),
  location: z.string().trim().min(1, 'Location is required'),
  isRemote: checkbox,
  isHybrid: checkbox,
  whoWereLookingFor: optionalText,
  primaryResponsibilities: bulletList,
  mustHaves: bulletList,
  otherInformation: optionalText,
  status: z.enum(['OPEN', 'CLOSED', 'ON_HOLD']),
})

export type JobFormValues = z.infer<typeof jobSchema>
