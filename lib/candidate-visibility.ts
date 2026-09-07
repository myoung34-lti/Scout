// A soft-deleted candidate must not surface anywhere: not in search, the
// board, the talent pool, the dashboard, or any report. There are ~20 query
// sites that can reach a candidate, so the predicates live here rather than
// being retyped — a missed one means a deleted person quietly reappears in a
// list or a metric.
//
// Spread these into a `where`, e.g.
//   where: { ...NOT_DELETED, inTalentPool: true }
//   where: { ...VISIBLE_APPLICATION, stage: { in: ACTIVE_STAGES } }

/** Queries rooted at Candidate. */
export const NOT_DELETED = { deletedAt: null } as const

/**
 * Queries rooted at Application. Also drops applications removed from their
 * job, which are retained for history but are no longer part of a pipeline.
 */
export const VISIBLE_APPLICATION = {
  removedAt: null,
  candidate: { deletedAt: null },
} as const

/** Queries rooted at Interview, StageHistory, or anything else that joins to a candidate. */
export const CANDIDATE_VISIBLE = { candidate: { deletedAt: null } } as const

/** The 30-day recovery window shown on the Deleted Candidates screen. */
export const RETENTION_DAYS = 30
