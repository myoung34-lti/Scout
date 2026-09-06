'use server'

import { requireSession } from '@/lib/session'
import { prisma } from '@/lib/db'
import { getAnthropicClient, CLAUDE_MODEL } from '@/lib/anthropic'
import { getActivePromptContent } from '@/lib/prompts'
import {
  buildCandidateContext,
  formatCandidateContextForPrompt,
  wrapUntrustedContext,
} from '@/lib/ai/candidate-context'
import { formatInsightForPrompt } from '@/lib/ai/candidate-insight-fields'

// Applies to both actions below — a generous cap for a recruiter's typed
// question/instruction, checked server-side (not just client-side) so a
// crafted oversized request can't inflate token cost.
const MAX_INPUT_CHARS = 2000

export type AskScoutResult = { answer: string } | { error: string }

// Each question/answer pair is saved (AskScoutMessage) so a recruiter never
// has to re-ask the same thing and the answer survives a page reload —
// shared across recruiters, same model as ActivityNote. Not a multi-turn
// chat: each request still only answers from CandidateContext, with no
// memory of earlier questions in the log.
export async function askScout(candidateId: string, question: string): Promise<AskScoutResult> {
  const authUser = await requireSession()

  const trimmedQuestion = question.trim().slice(0, MAX_INPUT_CHARS)
  if (!trimmedQuestion) {
    return { error: 'Ask a question first.' }
  }

  let systemPrompt: string
  try {
    systemPrompt = await getActivePromptContent('candidate_ask_scout')
  } catch {
    return { error: 'Ask Scout is not configured yet — add the candidate_ask_scout prompt in the Prompt Library.' }
  }

  try {
    const context = await buildCandidateContext(candidateId)
    const formatted = formatCandidateContextForPrompt(context)

    const anthropic = getAnthropicClient()
    const message = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `${wrapUntrustedContext(formatted)}\n\nRecruiter's question: ${trimmedQuestion}`,
        },
      ],
    })

    const textBlock = message.content.find((block) => block.type === 'text')
    if (!textBlock || textBlock.type !== 'text' || !textBlock.text.trim()) {
      return { error: "Scout couldn't answer that. Please try again." }
    }
    const answer = textBlock.text.trim()

    // The answer already succeeded at this point — a logging failure
    // shouldn't be reported to the recruiter as an answer failure, but it's
    // worth knowing about, so it isn't silently swallowed either.
    try {
      await prisma.askScoutMessage.create({
        data: { candidateId, askedById: authUser.id, question: trimmedQuestion, answer },
      })
    } catch (err) {
      console.error(
        'askScout: answer succeeded but saving failed:',
        err instanceof Error ? err.message : err
      )
    }

    return { answer }
  } catch (err) {
    console.error(
      'askScout failed for candidate',
      candidateId,
      err instanceof Error ? err.message : err
    )
    return { error: "Scout couldn't answer that. Please try again." }
  }
}

export type DraftPersonalizedEmailResult = { subject: string; body: string } | { error: string }

// Drafts only — never sends, never touches sendCandidateEmail/
// scheduleCandidateEmail. Uses saved CandidateInsight (if any) PLUS full
// CandidateContext, never insights alone, and works fine if no insights
// have been generated yet.
export async function draftPersonalizedEmail(
  candidateId: string,
  instruction: string
): Promise<DraftPersonalizedEmailResult> {
  await requireSession()

  const trimmedInstruction = instruction.trim().slice(0, MAX_INPUT_CHARS)
  if (!trimmedInstruction) {
    return { error: 'Enter what this email should do first.' }
  }

  let systemPrompt: string
  try {
    systemPrompt = await getActivePromptContent('candidate_personalized_email')
  } catch {
    return {
      error:
        'Personalize with Scout is not configured yet — add the candidate_personalized_email prompt in the Prompt Library.',
    }
  }

  try {
    const [insight, context] = await Promise.all([
      prisma.candidateInsight.findUnique({ where: { candidateId } }),
      buildCandidateContext(candidateId),
    ])
    const formatted = formatCandidateContextForPrompt(context)
    const insightBlock = insight ? formatInsightForPrompt(insight) : null

    const userContent = [
      wrapUntrustedContext(formatted),
      insightBlock ? `\n<saved_insights>\n${insightBlock}\n</saved_insights>` : '',
      `\n\nRecruiter's instruction for this email: ${trimmedInstruction}`,
    ].join('')

    const anthropic = getAnthropicClient()
    const message = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      tools: [
        {
          name: 'draft_email',
          description: 'Draft a short, personalized recruiting email.',
          input_schema: {
            type: 'object',
            properties: {
              subject: { type: 'string' },
              body: {
                type: 'string',
                description:
                  'Plain text, paragraphs separated by a blank line. No greeting sign-off name at the end — the signature is appended separately.',
              },
            },
            required: ['subject', 'body'],
          },
        },
      ],
      tool_choice: { type: 'tool', name: 'draft_email' },
      messages: [{ role: 'user', content: userContent }],
    })

    const toolUse = message.content.find((block) => block.type === 'tool_use')
    if (!toolUse || toolUse.type !== 'tool_use') {
      return { error: "Scout couldn't draft that email. Please try again." }
    }
    const input = toolUse.input as { subject?: string; body?: string }
    if (!input.subject?.trim() || !input.body?.trim()) {
      return { error: "Scout couldn't draft that email. Please try again." }
    }
    return { subject: input.subject, body: input.body }
  } catch (err) {
    console.error(
      'draftPersonalizedEmail failed for candidate',
      candidateId,
      err instanceof Error ? err.message : err
    )
    return { error: "Scout couldn't draft that email. Please try again." }
  }
}
