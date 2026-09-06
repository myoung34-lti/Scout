import { z } from 'zod'

export const emailTemplateSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  description: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === '' ? undefined : v)),
  subject: z.string().trim().min(1, 'Subject is required'),
  bodyHtml: z.string().trim().min(1, 'Body is required'),
})

export type EmailTemplateFormValues = z.infer<typeof emailTemplateSchema>
