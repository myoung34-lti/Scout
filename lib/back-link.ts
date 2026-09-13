import { jobTitle } from '@/lib/page-metadata'

// A candidate profile is reached from several places, and "back" should mean
// the one you actually came from. Links carry `?from=<path+query>`, which is
// attacker-controllable in principle (anyone can hand someone a crafted URL),
// so it is never trusted as a destination directly: it is matched against the
// routes below and REBUILT from the parts that match. Anything unrecognised
// falls back to the candidate list.
//
// Rejecting protocol-relative and absolute URLs matters — `//evil.test` is a
// valid relative-looking string that browsers treat as a different origin.

export type BackLink = { label: string; href: string }

export const CANDIDATES_BACK: BackLink = { label: 'Candidates', href: '/candidates' }

const CUID = /^[a-z0-9]{20,32}$/

/** Only the params a board actually uses, re-serialised in a fixed order. */
function pipelineQuery(params: URLSearchParams): string {
  const out = new URLSearchParams()
  if (params.get('scope') === 'mine') out.set('scope', 'mine')
  const jobId = params.get('jobId')
  if (jobId && CUID.test(jobId)) out.set('jobId', jobId)
  const q = out.toString()
  return q ? `?${q}` : ''
}

export async function resolveBackLink(from: string | undefined): Promise<BackLink> {
  if (!from || !from.startsWith('/') || from.startsWith('//')) return CANDIDATES_BACK

  let url: URL
  try {
    // Base is required for a relative URL and is never used in the output.
    url = new URL(from, 'http://internal')
  } catch {
    return CANDIDATES_BACK
  }

  if (url.pathname === '/pipeline') {
    return { label: 'Pipeline', href: `/pipeline${pipelineQuery(url.searchParams)}` }
  }

  const job = url.pathname.match(/^\/jobs\/([^/]+)$/)
  if (job && CUID.test(job[1])) {
    // Named after the job itself — "Jobs / Back" would be a worse breadcrumb
    // than the job a reader was just looking at.
    const title = await jobTitle(job[1])
    if (title) return { label: title, href: `/jobs/${job[1]}` }
  }

  return CANDIDATES_BACK
}
