import { z } from 'zod'

// Same stable-key convention as Prompt.key — code (well, template authors)
// refer to this by {{key}}, so keep it deliberate and code-safe.
const KEY_PATTERN = /^[a-z][a-z0-9_]*$/

export const emailVariableSchema = z.object({
  key: z
    .string()
    .trim()
    .min(1, 'A key is required')
    .regex(KEY_PATTERN, 'Use lowercase letters, numbers, and underscores only'),
  label: z.string().trim().min(1, 'Label is required'),
  value: z.string().trim().min(1, 'Value is required'),
})

export type EmailVariableFormValues = z.infer<typeof emailVariableSchema>
