'use server'

import { revalidatePath } from 'next/cache'
import { requireSession } from '@/lib/session'
import { prisma } from '@/lib/db'
import { getAnthropicClient, CLAUDE_MODEL } from '@/lib/anthropic'
import { getActivePromptContent } from '@/lib/prompts'
import {
  buildCandidateContext,
  formatCandidateContextForPrompt,
  wrapUntrustedContext,
} from '@/lib/ai/candidate-context'
import { INSIGHT_FIELDS, type InsightFieldKey } from '@/lib/ai/candidate-insight-fields'

export type GenerateInsightsResult = { error: string } | { ok: true }

// Handles both Generate and Regenerate — regenerating always replaces the
// saved snapshot wholesale (never merges prior AI output into the new
// version) and is only ever triggered by an explicit recruiter click, never
// automatically.
export async function generateCandidateInsights(
  candidateId: string
): Promise<GenerateInsightsResult> {
  const user = await requireSession()

  let systemPrompt: string
  try {
    systemPrompt = await getActivePromptContent('candidate_insights')
  } catch {
    return {
      error:
        'Candidate Insights is not configured yet — add the candidate_insights prompt in the Prompt Library.',
    }
  }

  try {
    const context = await buildCandidateContext(candidateId)
    const formatted = formatCandidateContextForPrompt(context)

    // No `required` here, deliberately — a field the model can't support
    // from the context should be omittable, not forced to a guessed value.
    const properties: Record<string, { type: string; description: string }> = {}
    for (const field of INSIGHT_FIELDS) {
      properties[field.key] = { type: 'string', description: field.description }
    }

    const anthropic = getAnthropicClient()
    const message = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 1536,
      system: systemPrompt,
      tools: [
        {
          name: 'save_candidate_insights',
          description:
            'Save the extracted candidate insight fields. Omit any field not clearly supported by the context.',
          input_schema: { type: 'object', properties },
        },
      ],
      tool_choice: { type: 'tool', name: 'save_candidate_insights' },
      messages: [{ role: 'user', content: wrapUntrustedContext(formatted) }],
    })

    const toolUse = message.content.find((block) => block.type === 'tool_use')
    if (!toolUse || toolUse.type !== 'tool_use') {
      return { error: "Scout couldn't generate insights. Please try again." }
    }

    const input = toolUse.input as Partial<Record<InsightFieldKey, string | null>>
    const data: Record<string, string | null> = {}
    for (const field of INSIGHT_FIELDS) {
      const value = input[field.key]
      data[field.key] = value && value.trim() ? value.trim() : null
    }

    await prisma.candidateInsight.upsert({
      where: { candidateId },
      create: { candidateId, generatedById: user.id, ...data },
      update: { generatedById: user.id, generatedAt: new Date(), ...data },
    })

    revalidatePath(`/candidates/${candidateId}`)
    return { ok: true }
  } catch (err) {
    console.error(
      'generateCandidateInsights failed for candidate',
      candidateId,
      err instanceof Error ? err.message : err
    )
    return { error: "Scout couldn't generate insights. Please try again." }
  }
}
