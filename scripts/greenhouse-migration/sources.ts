import { fetchAll } from './client'
import type { GreenhouseSource } from './types'
import type { CandidateSource } from '@prisma/client'

let cache: Map<string, GreenhouseSource> | null = null

async function loadSources(): Promise<Map<string, GreenhouseSource>> {
  if (!cache) {
    const sources = (await fetchAll('sources?per_page=500')) as GreenhouseSource[]
    cache = new Map(sources.map((s) => [s.id.toString(), s]))
  }
  return cache
}

// Greenhouse's 377 real sources collapse onto Scout's intentionally coarse
// 4-value enum by category, not by exact tool name — approved mapping (see
// conversation). Anything that isn't clearly LinkedIn / a referral / an
// in-person career fair falls back to APPLIED, the generic catch-all.
export async function mapGreenhouseSource(sourceId: bigint | null): Promise<CandidateSource> {
  if (sourceId === null) return 'APPLIED'

  const sources = await loadSources()
  const source = sources.get(sourceId.toString())
  if (!source) return 'APPLIED'

  const typeName = source.type.name
  const name = source.name.toLowerCase()

  if (typeName === 'Referral') return 'REFERRAL'
  if (typeName === 'Social media' && name.includes('linkedin')) return 'LINKEDIN'
  if (typeName === 'In person event' && name.includes('job fair')) return 'CAREER_FAIR'

  return 'APPLIED'
}
