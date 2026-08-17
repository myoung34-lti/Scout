import { fetchAll } from './client'
import type { GreenhouseUser } from './types'

const cache = new Map<string, string>()

// Resolves numeric Greenhouse user IDs (interviewer_id, note user_id) to a
// display name for attribution text — we never create Scout Users for
// these, see the authorship note in the conversation/proposal.
export async function resolveUserNames(ids: bigint[]): Promise<Map<string, string>> {
  const uncached = [...new Set(ids.map((id) => id.toString()))].filter((id) => !cache.has(id))
  if (uncached.length > 0) {
    for (const batch of chunk(uncached, 50)) {
      const users = (await fetchAll(`users?ids=${batch.join(',')}`)) as GreenhouseUser[]
      for (const user of users) cache.set(user.id.toString(), user.name)
    }
  }
  const result = new Map<string, string>()
  for (const id of ids) {
    const key = id.toString()
    result.set(key, cache.get(key) ?? `Greenhouse user #${key}`)
  }
  return result
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}
