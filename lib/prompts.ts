import { prisma } from '@/lib/db'
import type { InterviewType } from '@prisma/client'

// The ONLY sanctioned way to read a prompt's live state. Every AI feature
// (resume parsing today, Ask Scout later) should call this or
// getActivePromptContent instead of querying Prompt/PromptVersion directly —
// that's what keeps prompt text out of application code and lets it be
// edited without a deploy. Returns null rather than throwing so callers can
// decide for themselves whether an unconfigured/inactive prompt is fatal.
export async function getActivePrompt(key: string) {
  const prompt = await prisma.prompt.findUnique({
    where: { key },
    include: { currentVersion: true },
  })

  if (!prompt || !prompt.isActive || !prompt.currentVersion) return null

  return prompt
}

export async function getActivePromptContent(key: string): Promise<string> {
  const prompt = await getActivePrompt(key)
  if (!prompt) throw new Error(`Prompt "${key}" is not available`)
  return prompt.currentVersion!.content
}

// Which prompt (if any) is configured, via the Prompt Library UI, as the
// Fireflies-summary prompt for a given interview type. If more than one
// active prompt somehow claims the same type, the most recently updated one
// wins — not DB-enforced, see the note on Prompt.interviewType.
export async function getActivePromptForInterviewType(type: InterviewType) {
  const prompt = await prisma.prompt.findFirst({
    where: { interviewType: type, isActive: true },
    include: { currentVersion: true },
    orderBy: { updatedAt: 'desc' },
  })

  if (!prompt || !prompt.currentVersion) return null

  return prompt
}
