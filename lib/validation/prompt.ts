import { z } from 'zod'
import { ALL_PROMPT_CATEGORIES } from '@/lib/prompt-category'

// Stable, code-referenceable keys: lowercase snake_case, must start with a
// letter. Mirrors the style of the examples the key is meant to replace
// (e.g. "behavioral_interview_summary").
const KEY_PATTERN = /^[a-z][a-z0-9_]*$/

export const promptSchema = z.object({
  key: z
    .string()
    .trim()
    .min(1, 'A key is required')
    .regex(KEY_PATTERN, 'Use lowercase letters, numbers, and underscores only'),
  name: z.string().trim().min(1, 'Name is required'),
  description: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === '' ? undefined : v)),
  category: z.enum(ALL_PROMPT_CATEGORIES, { error: 'Select a category' }),
  content: z.string().trim().min(1, 'Prompt content is required'),
})

export type PromptFormValues = z.infer<typeof promptSchema>

export const promptMetaSchema = promptSchema.omit({ key: true, content: true })

export type PromptMetaFormValues = z.infer<typeof promptMetaSchema>
