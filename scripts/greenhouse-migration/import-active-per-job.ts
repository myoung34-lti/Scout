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
import type { GreenhouseApplication, GreenhouseCandidate, GreenhouseAttachment, GreenhouseNote, GreenhouseScorecard } from './types'

async function main() {
  const log: ImportLogEntry[] = []
  const actingUser = await prisma.user.findFirstOrThrow()

  // Only Scout-OPEN jobs, and only ones that don't already have at least
  // one active (non-terminal) candidate — the other two already satisfy
  // "1 active candidate per open job" from earlier test imports.
  const openJobs = await prisma.job.findMany({
    where: { status: 'OPEN', greenhouseJobId: { not: null } },
    include: { applications: { where: { stage: { notIn: ['HIRED', 'REJECTED'] } } } },
  })
  const targets = openJobs.filter((j) => j.applications.length === 0)
  console.log(`Open jobs: ${openJobs.length}, need an active candidate: ${targets.length}`)

  for (const job of targets) {
    console.log(`\n=== ${job.internalName} ===`)
    const applications = (await fetchAll(
      `applications?job_ids=${job.greenhouseJobId}&per_page=500`
    )) as GreenhouseApplication[]
    const candidate = applications.find((a) => a.status === 'in_process' && reachedAssessment(a))

    if (!candidate) {
      console.log('  No active (in_process, reached-assessment) candidate found on this job — skipping')
      log.push({ entity: 'candidate', greenhouseId: '(none)', action: 'skipped', detail: `no active candidate on ${job.internalName}` })
      continue
    }

    const candidates = (await fetchAll(`candidates?ids=${candidate.candidate_id}`)) as GreenhouseCandidate[]
    const ghCandidate = candidates[0]
    console.log(`  Selected: [${ghCandidate.id}] ${ghCandidate.first_name} ${ghCandidate.last_name} — stage="${candidate.stage_name}"`)

    const source = await mapGreenhouseSource(candidate.source_id)
    const scoutCandidateId = await importCandidate(ghCandidate, source, actingUser.id, log)
    if (!scoutCandidateId) continue

    const scoutApplicationId = await importApplication(
      candidate,
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
      `scorecards?application_ids=${candidate.id}&per_page=500`
    )) as GreenhouseScorecard[]
    const applicationIdByGreenhouseId = new Map<string, string>()
    if (scoutApplicationId) applicationIdByGreenhouseId.set(candidate.id.toString(), scoutApplicationId)
    await importActivityForCandidate(scoutCandidateId, applicationIdByGreenhouseId, notes, scorecards, actingUser.id, log)
  }

  console.log('\n--- Log ---')
  for (const entry of log) {
    console.log(`${entry.entity.padEnd(11)} ${entry.greenhouseId.padEnd(15)} ${entry.action}${entry.detail ? ' — ' + entry.detail : ''}`)
  }

  const created = log.filter((l) => l.action === 'created').length
  const updated = log.filter((l) => l.action === 'updated').length
  const skipped = log.filter((l) => l.action === 'skipped').length
  const failed = log.filter((l) => l.action === 'failed').length
  console.log(`\nSummary: ${created} created, ${updated} updated, ${skipped} skipped, ${failed} failed`)

  await prisma.$disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
