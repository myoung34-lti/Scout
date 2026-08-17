import 'dotenv/config'
import { prisma } from '../../lib/db'
import { fetchAll } from './client'
import { reachedAssessment } from './scope'
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

// Approved scope (see conversation): every in_process, reached-assessment
// application on the 7 currently-open LTI jobs — not the full 1,044
// in-process pool, which is mostly unscreened Application Review noise.
async function main() {
  const log: ImportLogEntry[] = []
  const actingUser = await prisma.user.findFirstOrThrow()

  const openJobs = await prisma.job.findMany({
    where: { status: 'OPEN', greenhouseJobId: { not: null } },
  })
  console.log(`Open jobs: ${openJobs.length}`)

  for (const job of openJobs) {
    const applications = (await fetchAll(
      `applications?job_ids=${job.greenhouseJobId}&per_page=500`
    )) as GreenhouseApplication[]
    const target = applications.filter((a) => a.status === 'in_process' && reachedAssessment(a))

    console.log(`\n=== ${job.internalName} (${target.length} qualifying) ===`)

    for (const app of target) {
      const candidates = (await fetchAll(`candidates?ids=${app.candidate_id}`)) as GreenhouseCandidate[]
      const ghCandidate = candidates[0]
      console.log(`  - [${ghCandidate.id}] ${ghCandidate.first_name} ${ghCandidate.last_name} — stage="${app.stage_name}"`)

      const source = await mapGreenhouseSource(app.source_id)
      const scoutCandidateId = await importCandidate(ghCandidate, source, actingUser.id, log)
      if (!scoutCandidateId) continue

      const scoutApplicationId = await importApplication(
        app,
        scoutCandidateId,
        job.id,
        job.internalName,
        actingUser.id,
        log
      )

      const attachments = (await fetchAll(`attachments?candidate_ids=${ghCandidate.id}`)) as GreenhouseAttachment[]
      const resume = attachments.find((a) => a.type === 'resume')
      if (resume) {
        await importResume(resume, scoutCandidateId, actingUser.id, saveResumeFileAdmin, log)
      } else {
        log.push({ entity: 'resume', greenhouseId: '(none)', action: 'skipped', detail: 'no resume attachment' })
      }

      const notes = (await fetchAll(`notes?candidate_ids=${ghCandidate.id}&per_page=500`)) as GreenhouseNote[]
      const scorecards = (await fetchAll(
        `scorecards?application_ids=${app.id}&per_page=500`
      )) as GreenhouseScorecard[]
      const applicationIdByGreenhouseId = new Map<string, string>()
      if (scoutApplicationId) applicationIdByGreenhouseId.set(app.id.toString(), scoutApplicationId)
      await importActivityForCandidate(
        scoutCandidateId,
        applicationIdByGreenhouseId,
        notes,
        scorecards,
        actingUser.id,
        log
      )
    }
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

  await prisma.$disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
