import 'dotenv/config'
import { prisma } from '../../lib/db'
import { fetchAll } from './client'
import { fetchLtiJobs, fetchLtiApplications, qualifyingCandidateIds } from './scope'
import { mapJob, mapApplicationStage } from './mapper'
import type { GreenhouseCandidate } from './types'

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

async function fetchCandidatesByIds(ids: bigint[]): Promise<GreenhouseCandidate[]> {
  const all: GreenhouseCandidate[] = []
  for (const batch of chunk(ids, 50)) {
    const idList = batch.join(',')
    const results = (await fetchAll(`candidates?ids=${idList}&per_page=100`)) as GreenhouseCandidate[]
    all.push(...results)
  }
  return all
}

function normalizeEmail(email: string | null): string | null {
  return email ? email.trim().toLowerCase() : null
}

async function main() {
  console.log('=== Greenhouse → Scout dry run (read-only, zero Scout writes) ===\n')

  // --- Jobs ---
  const ghJobs = await fetchLtiJobs()
  const existingJobIds = new Set(
    (await prisma.job.findMany({ where: { greenhouseJobId: { not: null } }, select: { greenhouseJobId: true } })).map(
      (j) => j.greenhouseJobId!.toString()
    )
  )
  let jobsUnmapped = 0
  let jobsAlreadyMigrated = 0
  let jobsToCreate = 0
  for (const job of ghJobs) {
    const mapped = mapJob(job)
    if ('unmapped' in mapped) {
      jobsUnmapped += 1
      continue
    }
    if (existingJobIds.has(job.id.toString())) jobsAlreadyMigrated += 1
    else jobsToCreate += 1
  }

  console.log('Jobs')
  console.log(`  Found: ${ghJobs.length}`)
  console.log(`  To create: ${jobsToCreate}`)
  console.log(`  Already migrated: ${jobsAlreadyMigrated}`)
  console.log(`  Unmapped status: ${jobsUnmapped}`)

  // --- Applications + qualifying candidates ---
  const ghApplications = await fetchLtiApplications(ghJobs)
  const qualifyingIds = qualifyingCandidateIds(ghApplications)
  console.log(`\nApplications found (all LTI jobs): ${ghApplications.length}`)
  console.log(`Distinct candidates reaching assessment: ${qualifyingIds.size}`)

  // Every LTI application belonging to a qualifying candidate gets imported,
  // not just the one that qualified them.
  const importableApplications = ghApplications.filter((a) => qualifyingIds.has(a.candidate_id))
  const jobById = new Map(ghJobs.map((j) => [j.id.toString(), j]))

  let holdingPatternCount = 0
  const unmappedStages = new Map<string, number>()
  for (const app of importableApplications) {
    const job = jobById.get(app.job_id.toString())
    const result = mapApplicationStage(app, job?.name ?? 'Unknown job')
    if (result.kind === 'holding_pattern') holdingPatternCount += 1
    if (result.kind === 'unmapped') {
      const key = `${result.stageName ?? '(null)'} / status=${result.status}`
      unmappedStages.set(key, (unmappedStages.get(key) ?? 0) + 1)
    }
  }

  const existingApplicationIds = new Set(
    (
      await prisma.application.findMany({
        where: { greenhouseApplicationId: { not: null } },
        select: { greenhouseApplicationId: true },
      })
    ).map((a) => a.greenhouseApplicationId!.toString())
  )
  const applicationsAlreadyMigrated = importableApplications.filter((a) =>
    existingApplicationIds.has(a.id.toString())
  ).length

  console.log(`Applications to import (qualifying candidates' full LTI history): ${importableApplications.length}`)
  console.log(`  Already migrated: ${applicationsAlreadyMigrated}`)
  console.log(`  → Holding Pattern (proxy stage + Talent Pool): ${holdingPatternCount}`)
  if (unmappedStages.size > 0) {
    console.log('  Unmapped stage/status combinations (would be skipped, logged):')
    for (const [key, count] of unmappedStages) console.log(`    - ${key}: ${count}`)
  } else {
    console.log('  Unmapped stage/status combinations: none')
  }

  // --- Candidates ---
  const qualifyingIdsArray = [...qualifyingIds]
  const ghCandidates = await fetchCandidatesByIds(qualifyingIdsArray)
  console.log(`\nCandidates fetched: ${ghCandidates.length} (expected ${qualifyingIdsArray.length})`)

  const existingCandidateIds = new Set(
    (
      await prisma.candidate.findMany({
        where: { greenhouseCandidateId: { not: null } },
        select: { greenhouseCandidateId: true },
      })
    ).map((c) => c.greenhouseCandidateId!.toString())
  )
  const candidatesAlreadyMigrated = ghCandidates.filter((c) => existingCandidateIds.has(c.id.toString())).length
  const candidatesToCreate = ghCandidates.length - candidatesAlreadyMigrated

  console.log(`  To create: ${candidatesToCreate}`)
  console.log(`  Already migrated: ${candidatesAlreadyMigrated}`)

  // --- Potential duplicates against pre-existing (non-Greenhouse) Scout candidates ---
  const nonGreenhouseCandidates = await prisma.candidate.findMany({
    where: { greenhouseCandidateId: null },
    select: { id: true, firstName: true, lastName: true, email: true },
  })
  const nonGhEmails = new Map(
    nonGreenhouseCandidates.filter((c) => c.email).map((c) => [normalizeEmail(c.email), c])
  )
  let potentialDuplicates = 0
  for (const c of ghCandidates) {
    const email = normalizeEmail(
      c.email_addresses?.find((e) => e.type === 'personal')?.value ?? c.email_addresses?.[0]?.value ?? null
    )
    if (email && nonGhEmails.has(email)) potentialDuplicates += 1
  }
  console.log(`  Potential duplicates (email match vs. non-Greenhouse Scout candidates): ${potentialDuplicates}`)
  console.log(
    `  (Pre-existing non-Greenhouse Scout candidates checked against: ${nonGreenhouseCandidates.length})`
  )

  // --- Resumes ---
  let resumeAvailableCount = 0
  for (const batch of chunk(qualifyingIdsArray, 50)) {
    const idList = batch.join(',')
    const attachments = (await fetchAll(`attachments?candidate_ids=${idList}&per_page=500`)) as {
      candidate_id: bigint
      type: string
    }[]
    const candidatesWithResume = new Set(
      attachments.filter((a) => a.type === 'resume').map((a) => a.candidate_id.toString())
    )
    resumeAvailableCount += candidatesWithResume.size
  }
  console.log(`\nResumes available: ${resumeAvailableCount} of ${qualifyingIdsArray.length} candidates`)

  console.log('\nNotes/Scorecards: SKIPPED — harvest:notes:list / harvest:scorecards:list not granted on this credential yet.')

  console.log('\n=== Dry run complete — zero Scout writes were made ===')
  await prisma.$disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
