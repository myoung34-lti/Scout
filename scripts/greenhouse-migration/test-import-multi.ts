import 'dotenv/config'
import { prisma } from '../../lib/db'
import { fetchAll } from './client'
import { fetchLtiJobs, reachedAssessment } from './scope'
import {
  importJob,
  importCandidate,
  importApplication,
  importResume,
  importActivityForCandidate,
  type ImportLogEntry,
} from './import-core'
import { saveResumeFileAdmin } from './storage'
import { mapGreenhouseSource } from './sources'
import type {
  GreenhouseApplication,
  GreenhouseCandidate,
  GreenhouseAttachment,
  GreenhouseJob,
  GreenhouseNote,
  GreenhouseScorecard,
} from './types'

const CANDIDATES_PER_JOB = 3
// Skip index 0 — that's the job used in the single-record test already.
const JOB_INDEXES = [1, 2]

async function importJobWithCandidates(
  ghJob: GreenhouseJob,
  actingUserId: string,
  log: ImportLogEntry[]
) {
  console.log(`\n=== Job: [${ghJob.id}] ${ghJob.name} ===`)

  const jobApplications = (await fetchAll(
    `applications?job_ids=${ghJob.id}&per_page=500`
  )) as GreenhouseApplication[]
  const qualifying = jobApplications.filter((a) => reachedAssessment(a))

  // Dedupe by candidate in case of re-applications; take the first N distinct.
  const seen = new Set<string>()
  const selected: GreenhouseApplication[] = []
  for (const app of qualifying) {
    const key = app.candidate_id.toString()
    if (seen.has(key)) continue
    seen.add(key)
    selected.push(app)
    if (selected.length === CANDIDATES_PER_JOB) break
  }

  if (selected.length < CANDIDATES_PER_JOB) {
    console.log(
      `  Warning: only found ${selected.length} qualifying candidates on this job (wanted ${CANDIDATES_PER_JOB})`
    )
  }

  const jobPosts = (await fetchAll(`job_posts?job_ids=${ghJob.id}`)) as { content: string }[]
  const scoutJobId = await importJob(ghJob, log, jobPosts[0]?.content ?? null)
  if (!scoutJobId) {
    console.log('  Job import failed/skipped — aborting this job')
    return
  }

  for (const app of selected) {
    const candidates = (await fetchAll(`candidates?ids=${app.candidate_id}`)) as GreenhouseCandidate[]
    const ghCandidate = candidates[0]
    console.log(`  - [${ghCandidate.id}] ${ghCandidate.first_name} ${ghCandidate.last_name} — stage="${app.stage_name}" status=${app.status}`)

    const source = await mapGreenhouseSource(app.source_id)
    const scoutCandidateId = await importCandidate(ghCandidate, source, actingUserId, log)
    if (!scoutCandidateId) continue

    const scoutApplicationId = await importApplication(app, scoutCandidateId, scoutJobId, ghJob.name, actingUserId, log)

    const attachments = (await fetchAll(`attachments?candidate_ids=${ghCandidate.id}`)) as GreenhouseAttachment[]
    const resume = attachments.find((a) => a.type === 'resume')
    if (resume) {
      await importResume(resume, scoutCandidateId, actingUserId, saveResumeFileAdmin, log)
    } else {
      log.push({ entity: 'resume', greenhouseId: '(none)', action: 'skipped', detail: 'no resume attachment' })
    }

    const notes = (await fetchAll(`notes?candidate_ids=${ghCandidate.id}&per_page=500`)) as GreenhouseNote[]
    const scorecards = (await fetchAll(
      `scorecards?application_ids=${app.id}&per_page=500`
    )) as GreenhouseScorecard[]
    const applicationIdByGreenhouseId = new Map<string, string>()
    if (scoutApplicationId) applicationIdByGreenhouseId.set(app.id.toString(), scoutApplicationId)
    await importActivityForCandidate(scoutCandidateId, applicationIdByGreenhouseId, notes, scorecards, actingUserId, log)
  }
}

async function main() {
  const log: ImportLogEntry[] = []
  const actingUser = await prisma.user.findFirstOrThrow()

  const ghJobs = await fetchLtiJobs()
  const targets = JOB_INDEXES.map((i) => ghJobs[i])

  for (const job of targets) {
    await importJobWithCandidates(job, actingUser.id, log)
  }

  console.log('\n--- Log ---')
  for (const entry of log) {
    console.log(
      `${entry.entity.padEnd(11)} ${entry.greenhouseId.padEnd(15)} ${entry.action}${entry.detail ? ' — ' + entry.detail : ''}`
    )
  }

  const created = log.filter((l) => l.action === 'created')
  const updated = log.filter((l) => l.action === 'updated')
  const skipped = log.filter((l) => l.action === 'skipped')
  const failed = log.filter((l) => l.action === 'failed')
  console.log(
    `\nSummary: ${created.length} created, ${updated.length} updated, ${skipped.length} skipped, ${failed.length} failed`
  )

  await prisma.$disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
