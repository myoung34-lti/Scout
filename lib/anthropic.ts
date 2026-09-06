import Anthropic from '@anthropic-ai/sdk'

// Real instruction-following judgment matters for these features (don't
// invent facts, distinguish fact from inference, get email tone right) in
// a way resume parsing's mechanical field-extraction doesn't need — Haiku
// (used there) is more likely to get nuanced Q&A/tone subtly wrong. Call
// volume here is low (a handful of requests per candidate visit), so the
// absolute cost stays small. One constant — swap to Haiku if that changes.
export const CLAUDE_MODEL = 'claude-sonnet-5'

let client: Anthropic | null = null

export function getAnthropicClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not configured.')
  }
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  }
  return client
}
