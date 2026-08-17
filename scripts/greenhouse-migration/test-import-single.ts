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
  GreenhouseNote,
  GreenhouseScorecard,
} from './types'

async function main() {
  const log: ImportLogEntry[] = []
  const actingUser = await prisma.user.findFirstOrThrow()

  // Pick exactly one job, then exactly one qualifying candidate on it.
  const ghJobs = await fetchLtiJobs()
  const targetJob = ghJobs[0]
  console.log(`Selected job: [${targetJob.id}] ${targetJob.name}`)

  const jobApplications = (await fetchAll(
    `applications?job_ids=${targetJob.id}&per_page=500`
  )) as GreenhouseApplication[]
  const qualifyingApp = jobApplications.find((a) => reachedAssessment(a))
  if (!qualifyingApp) throw new Error('No qualifying application found on this job — pick a different one')

  const candidates = (await fetchAll(`candidates?ids=${qualifyingApp.candidate_id}`)) as GreenhouseCandidate[]
  const targetCandidate = candidates[0]
  console.log(
    `Selected candidate: [${targetCandidate.id}] ${targetCandidate.first_name} ${targetCandidate.last_name}`
  )
  console.log(`Selected application: [${qualifyingApp.id}] stage="${qualifyingApp.stage_name}" status=${qualifyingApp.status}`)

  const jobPosts = (await fetchAll(`job_posts?job_ids=${targetJob.id}`)) as { content: string }[]
  const jobPostContent = jobPosts[0]?.content ?? null

  console.log('\n--- Importing ---')
  const scoutJobId = await importJob(targetJob, log, jobPostContent)
  if (!scoutJobId) throw new Error('Job import failed/skipped — aborting test')

  const source = await mapGreenhouseSource(qualifyingApp.source_id)
  const scoutCandidateId = await importCandidate(targetCandidate, source, actingUser.id, log)
  if (!scoutCandidateId) throw new Error('Candidate import failed — aborting test')

  const scoutApplicationId = await importApplication(
    qualifyingApp,
    scoutCandidateId,
    scoutJobId,
    targetJob.name,
    actingUser.id,
    log
  )

  const attachments = (await fetchAll(
    `attachments?candidate_ids=${targetCandidate.id}`
  )) as GreenhouseAttachment[]
  const resume = attachments.find((a) => a.type === 'resume')
  if (resume) {
    await importResume(resume, scoutCandidateId, actingUser.id, saveResumeFileAdmin, log)
  } else {
    log.push({ entity: 'resume', greenhouseId: '(none)', action: 'skipped', detail: 'no resume attachment on candidate' })
  }

  const notes = (await fetchAll(`notes?candidate_ids=${targetCandidate.id}&per_page=500`)) as GreenhouseNote[]
  const scorecards = (await fetchAll(
    `scorecards?application_ids=${qualifyingApp.id}&per_page=500`
  )) as GreenhouseScorecard[]
  const applicationIdByGreenhouseId = new Map<string, string>()
  if (scoutApplicationId) applicationIdByGreenhouseId.set(qualifyingApp.id.toString(), scoutApplicationId)
  await importActivityForCandidate(
    scoutCandidateId,
    applicationIdByGreenhouseId,
    notes,
    scorecards,
    actingUser.id,
    log
  )

  console.log('\n--- Log ---')
  for (const entry of log) {
    console.log(`${entry.entity.padEnd(11)} ${entry.greenhouseId.padEnd(15)} ${entry.action}${entry.detail ? ' — ' + entry.detail : ''}`)
  }

  console.log('\n--- Verification (reading back from Scout) ---')
  const savedCandidate = await prisma.candidate.findUnique({
    where: { id: scoutCandidateId },
    include: {
      applications: { include: { job: true, history: true } },
      notes: true,
      resumes: true,
    },
  })
  console.log(JSON.stringify(savedCandidate, (_key, value) => (typeof value === 'bigint' ? value.toString() : value), 2))

  await prisma.$disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
