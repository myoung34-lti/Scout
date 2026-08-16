import { prisma } from '@/lib/db'

// The ONLY sanctioned way to read a prompt's live content. Every AI feature
// (resume parsing today, Ask Scout later) should call this instead of
// querying Prompt/PromptVersion directly — that's what keeps prompt text
// out of application code and lets it be edited without a deploy.
export async function getActivePromptContent(key: string): Promise<string> {
  const prompt = await prisma.prompt.findUnique({
    where: { key },
    include: { currentVersion: true },
  })

  if (!prompt || !prompt.isActive || !prompt.currentVersion) {
    throw new Error(`Prompt "${key}" is not available`)
  }

  return prompt.currentVersion.content
}
