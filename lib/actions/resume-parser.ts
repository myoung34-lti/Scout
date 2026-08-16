'use server'

import Anthropic from '@anthropic-ai/sdk'
import { requireSession } from '@/lib/session'

export type ParsedResumeFields = {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  linkedinUrl?: string
  currentCompany?: string
  location?: string
  skills?: string[]
}

export type ParseResumeResult =
  | { data: ParsedResumeFields }
  | { error: string }

const MAX_TEXT_CHARS = 15000

async function extractText(file: File): Promise<string | null> {
  const name = file.name.toLowerCase()
  const bytes = Buffer.from(await file.arrayBuffer())

  if (name.endsWith('.pdf')) {
    const { PDFParse } = await import('pdf-parse')
    const parser = new PDFParse({ data: bytes })
    try {
      const result = await parser.getText()
      return result.text
    } finally {
      await parser.destroy()
    }
  }

  if (name.endsWith('.docx')) {
    const mammoth = (await import('mammoth')).default
    const result = await mammoth.extractRawText({ buffer: bytes })
    return result.value
  }

  // Legacy .doc (old binary Word format) isn't practical to parse without a
  // dedicated library — skip auto-fill for it, the form still works manually.
  return null
}

export async function parseResume(file: File): Promise<ParseResumeResult> {
  await requireSession()

  if (!process.env.ANTHROPIC_API_KEY) {
    return { error: 'Resume parsing is not configured.' }
  }

  let text: string | null
  try {
    text = await extractText(file)
  } catch {
    return { error: "Couldn't read this file." }
  }

  if (!text || !text.trim()) {
    return { error: 'No text found in this file.' }
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      tools: [
        {
          name: 'extract_candidate_info',
          description:
            "Extract a job candidate's contact and background info from their resume text.",
          input_schema: {
            type: 'object',
            properties: {
              firstName: { type: 'string' },
              lastName: { type: 'string' },
              email: { type: 'string' },
              phone: { type: 'string' },
              linkedinUrl: { type: 'string' },
              currentCompany: {
                type: 'string',
                description: 'Their current or most recent employer.',
              },
              location: {
                type: 'string',
                description: 'City and state/region, if present.',
              },
              skills: {
                type: 'array',
                items: { type: 'string' },
                description:
                  'Technical skills, tools, languages, and technologies mentioned (e.g. "Python", "AWS", "Salesforce"). Keep each entry short — a single skill or tool name, not a phrase.',
              },
            },
          },
        },
      ],
      tool_choice: { type: 'tool', name: 'extract_candidate_info' },
      messages: [
        {
          role: 'user',
          content: `Extract the candidate's info from this resume text. Leave a field out entirely if it isn't present in the resume — don't guess.\n\n${text.slice(0, MAX_TEXT_CHARS)}`,
        },
      ],
    })

    const toolUse = message.content.find((block) => block.type === 'tool_use')
    if (!toolUse || toolUse.type !== 'tool_use') {
      return { error: "Couldn't parse this resume." }
    }

    return { data: toolUse.input as ParsedResumeFields }
  } catch {
    return { error: "Couldn't parse this resume." }
  }
}
