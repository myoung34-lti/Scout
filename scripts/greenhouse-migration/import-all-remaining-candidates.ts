import 'dotenv/config'
import { prisma } from '../../lib/db'
import { fetchAll } from './client'
import { fetchLtiJobs, fetchLtiApplications, qualifyingCandidateIds } from './scope'
import { mapGreenhouseSource } from './sources'
import {
  importCandidate,
  importApplication,
  importResume,
  importActivityForCandidate,
  type ImportLogEntry,
} from './import-core'
import { saveResumeFileAdmin } from './storage'
import type {
  GreenhouseApplication,
  GreenhouseCandidate,
  GreenhouseAttachment,
  GreenhouseNote,
  GreenhouseScorecard,
} from './types'

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

// Full remaining scope: every LTI application (all 39 jobs) belonging to a
// candidate who reached assessment, not yet imported. Batches Greenhouse
// calls 50-at-a-time (candidates/attachments/notes) instead of one call per
// candidate, matching dry-run.ts's pattern — a straight per-candidate loop
// over ~838 candidates would make ~3,800 individual API calls.
async function main() {
  const log: ImportLogEntry[] = []
  const startedAt = Date.now()
  const actingUser = await prisma.user.findFirstOrThrow()

  const ghJobs = await fetchLtiJobs()
  const scoutJobs = await prisma.job.findMany({ where: { greenhouseJobId: { not: null } } })
  const scoutJobByGhId = new Map(scoutJobs.map((j) => [j.greenhouseJobId!.toString(), j]))

  const ghApplications = await fetchLtiApplications(ghJobs)
  const qualifyingIds = qualifyingCandidateIds(ghApplications)
  const inScopeApplications = ghApplications.filter((a) => qualifyingIds.has(a.candidate_id))

  const existingApplicationIds = new Set(
    (
      await prisma.application.findMany({
        where: { greenhouseApplicationId: { not: null } },
        select: { greenhouseApplicationId: true },
      })
    ).map((a) => a.greenhouseApplicationId!.toString())
  )
  const remainingApplications = inScopeApplications.filter(
    (a) => !existingApplicationIds.has(a.id.toString())
  )

  const byCandidateId = new Map<string, GreenhouseApplication[]>()
  for (const app of remainingApplications) {
    const key = app.candidate_id.toString()
    if (!byCandidateId.has(key)) byCandidateId.set(key, [])
    byCandidateId.get(key)!.push(app)
  }
  const candidateIds = [...byCandidateId.keys()]

  console.log(`Candidates with remaining applications: ${candidateIds.length}`)
  console.log(`Remaining applications to import: ${remainingApplications.length}\n`)

  // Batch-fetch candidates, resumes, and notes 50 at a time.
  const ghCandidateById = new Map<string, GreenhouseCandidate>()
  const attachmentsByCandidateId = new Map<string, GreenhouseAttachment[]>()
  const notesByCandidateId = new Map<string, GreenhouseNote[]>()

  for (const batch of chunk(candidateIds, 50)) {
    const idList = batch.join(',')
    const candidates = (await fetchAll(`candidates?ids=${idList}&per_page=100`)) as GreenhouseCandidate[]
    for (const c of candidates) ghCandidateById.set(c.id.toString(), c)

    const attachments = (await fetchAll(`attachments?candidate_ids=${idList}&per_page=500`)) as GreenhouseAttachment[]
    for (const a of attachments) {
      const key = a.candidate_id.toString()
      if (!attachmentsByCandidateId.has(key)) attachmentsByCandidateId.set(key, [])
      attachmentsByCandidateId.get(key)!.push(a)
    }

    const notes = (await fetchAll(`notes?candidate_ids=${idList}&per_page=500`)) as GreenhouseNote[]
    for (const n of notes) {
      const key = n.candidate_id.toString()
      if (!notesByCandidateId.has(key)) notesByCandidateId.set(key, [])
      notesByCandidateId.get(key)!.push(n)
    }
    console.log(`  fetched batch: ${ghCandidateById.size}/${candidateIds.length} candidates so far`)
  }

  const scorecardsByApplicationId = new Map<string, GreenhouseScorecard[]>()
  for (const batch of chunk(remainingApplications.map((a) => a.id.toString()), 50)) {
    const scorecards = (await fetchAll(
      `scorecards?application_ids=${batch.join(',')}&per_page=500`
    )) as GreenhouseScorecard[]
    for (const s of scorecards) {
      const key = s.application_id.toString()
      if (!scorecardsByApplicationId.has(key)) scorecardsByApplicationId.set(key, [])
      scorecardsByApplicationId.get(key)!.push(s)
    }
  }

  console.log('\n--- Importing ---')
  let processed = 0
  for (const [candidateIdStr, apps] of byCandidateId) {
    const ghCandidate = ghCandidateById.get(candidateIdStr)
    if (!ghCandidate) {
      log.push({ entity: 'candidate', greenhouseId: candidateIdStr, action: 'failed', detail: 'not returned by candidates?ids= lookup' })
      continue
    }

    const source = await mapGreenhouseSource(apps[0].source_id)
    const scoutCandidateId = await importCandidate(ghCandidate, source, actingUser.id, log)
    if (!scoutCandidateId) continue

    const applicationIdByGreenhouseId = new Map<string, string>()
    // Include this candidate's already-imported applications too, so a note
    // or scorecard tied to one of those still resolves to a real Application.
    const existingScoutApplications = await prisma.application.findMany({
      where: { candidateId: scoutCandidateId, greenhouseApplicationId: { not: null } },
      select: { id: true, greenhouseApplicationId: true },
    })
    for (const a of existingScoutApplications) {
      applicationIdByGreenhouseId.set(a.greenhouseApplicationId!.toString(), a.id)
    }

    for (const app of apps) {
      const scoutJob = scoutJobByGhId.get(app.job_id.toString())
      if (!scoutJob) {
        log.push({ entity: 'application', greenhouseId: app.id.toString(), action: 'skipped', detail: 'job not found in Scout' })
        continue
      }
      const scoutApplicationId = await importApplication(
        app, scoutCandidateId, scoutJob.id, scoutJob.internalName, actingUser.id, log
      )
      if (scoutApplicationId) applicationIdByGreenhouseId.set(app.id.toString(), scoutApplicationId)
    }

    const resume = attachmentsByCandidateId.get(candidateIdStr)?.find((a) => a.type === 'resume')
    if (resume) {
      await importResume(resume, scoutCandidateId, actingUser.id, saveResumeFileAdmin, log)
    }

    const notes = notesByCandidateId.get(candidateIdStr) ?? []
    const scorecards = apps.flatMap((a) => scorecardsByApplicationId.get(a.id.toString()) ?? [])
    await importActivityForCandidate(scoutCandidateId, applicationIdByGreenhouseId, notes, scorecards, actingUser.id, log)

    processed += 1
    if (processed % 25 === 0) console.log(`  processed ${processed}/${byCandidateId.size} candidates`)
  }

  console.log('\n--- Summary ---')
  const byEntity = new Map<string, Map<string, number>>()
  for (const entry of log) {
    if (!byEntity.has(entry.entity)) byEntity.set(entry.entity, new Map())
    const m = byEntity.get(entry.entity)!
    m.set(entry.action, (m.get(entry.action) ?? 0) + 1)
  }
  for (const [entity, actions] of byEntity) {
    console.log(entity, Object.fromEntries(actions))
  }
  const failed = log.filter((l) => l.action === 'failed')
  if (failed.length > 0) {
    console.log('\nFailures:')
    for (const f of failed) console.log(`  ${f.entity} ${f.greenhouseId}: ${f.detail}`)
  }
  console.log(`\nElapsed: ${Math.round((Date.now() - startedAt) / 1000)}s`)

  await prisma.$disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
