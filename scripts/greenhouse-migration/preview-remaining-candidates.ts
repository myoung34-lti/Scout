import 'dotenv/config'
import { prisma } from '../../lib/db'
import { fetchLtiJobs, fetchLtiApplications, qualifyingCandidateIds } from './scope'
import { mapApplicationStage, type StageMappingResult } from './mapper'
import { STAGE_LABELS } from '../../lib/pipeline'

// Read-only report: for the 892-candidate "reached assessment" scope across
// all 39 LTI jobs, shows where every application NOT YET in Scout would
// land, broken down by Scout pipeline stage. Zero writes — Greenhouse is
// GET-only, and this only reads from the Scout DB too.
async function main() {
  const ghJobs = await fetchLtiJobs()
  const ghApplications = await fetchLtiApplications(ghJobs)
  const qualifyingIds = qualifyingCandidateIds(ghApplications)
  const jobById = new Map(ghJobs.map((j) => [j.id.toString(), j]))

  // Every LTI application belonging to a qualifying candidate is in scope,
  // not just the one that qualified them — matches the actual import logic.
  const inScopeApplications = ghApplications.filter((a) => qualifyingIds.has(a.candidate_id))

  const existingCandidateIds = new Set(
    (
      await prisma.candidate.findMany({
        where: { greenhouseCandidateId: { not: null } },
        select: { greenhouseCandidateId: true },
      })
    ).map((c) => c.greenhouseCandidateId!.toString())
  )
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
  const remainingCandidateIds = new Set(
    [...qualifyingIds].filter((id) => !existingCandidateIds.has(id.toString()))
  )

  console.log('=== Scope ===')
  console.log(`Qualifying candidates (reached assessment, all 39 jobs): ${qualifyingIds.size}`)
  console.log(`Already in Scout: ${existingCandidateIds.size}`)
  console.log(`Remaining candidates (net-new): ${remainingCandidateIds.size}`)
  console.log(`\nIn-scope applications (all LTI apps for qualifying candidates): ${inScopeApplications.length}`)
  console.log(`Already in Scout: ${existingApplicationIds.size}`)
  console.log(`Remaining applications to import: ${remainingApplications.length}`)

  const stageCounts = new Map<string, number>()
  let holdingPatternCount = 0
  const unmapped = new Map<string, number>()

  for (const app of remainingApplications) {
    const job = jobById.get(app.job_id.toString())
    const result: StageMappingResult = mapApplicationStage(app, job?.name ?? 'Unknown job')
    if (result.kind === 'stage') {
      stageCounts.set(result.stage, (stageCounts.get(result.stage) ?? 0) + 1)
    } else if (result.kind === 'holding_pattern') {
      holdingPatternCount += 1
      stageCounts.set(result.proxyStage, (stageCounts.get(result.proxyStage) ?? 0) + 1)
    } else {
      const key = `${result.stageName ?? '(null)'} / status=${result.status}`
      unmapped.set(key, (unmapped.get(key) ?? 0) + 1)
    }
  }

  console.log('\n=== Map: remaining applications by destination stage ===')
  const orderedStages = [
    'APPLIED', 'SCREENING', 'INTRODUCTORY_CALL', 'BEHAVIORAL_INTERVIEW',
    'TECHNICAL_INTERVIEW', 'EXECUTIVE_INTERVIEW', 'CLIENT_INTERVIEW', 'OFFER',
    'HIRED', 'REJECTED',
  ]
  for (const stage of orderedStages) {
    const count = stageCounts.get(stage) ?? 0
    if (count > 0) console.log(`  ${STAGE_LABELS[stage as keyof typeof STAGE_LABELS].padEnd(20)} ${count}`)
  }
  console.log(`\n  (of which, via Holding Pattern → proxy Introductory Call + Talent Pool: ${holdingPatternCount})`)

  if (unmapped.size > 0) {
    console.log('\n=== Unmapped stage/status combinations (would be skipped, logged) ===')
    for (const [key, count] of unmapped) console.log(`  ${key}: ${count}`)
  }

  await prisma.$disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
