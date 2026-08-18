import 'dotenv/config'
import { prisma } from '../../lib/db'
import { fetchAll } from './client'
import { fetchLtiJobs } from './scope'
import { importJob, type ImportLogEntry } from './import-core'

// Brings over every remaining LTI job (not just the ones with a live
// posting) — importJob is an idempotent upsert, so already-imported jobs
// are just updated in place, never duplicated.
async function main() {
  const log: ImportLogEntry[] = []

  const ghJobs = await fetchLtiJobs()
  const jobIds = ghJobs.map((j) => j.id).join(',')
  const jobPosts = (await fetchAll(`job_posts?job_ids=${jobIds}`)) as {
    job_id: bigint
    content: string
    live: boolean
  }[]
  const contentByJobId = new Map(jobPosts.map((p) => [p.job_id.toString(), p.content]))
  const liveJobIds = new Set(jobPosts.filter((p) => p.live).map((p) => p.job_id.toString()))

  console.log(`LTI jobs found: ${ghJobs.length} total, ${liveJobIds.size} with a live posting`)

  for (const job of ghJobs) {
    const content = contentByJobId.get(job.id.toString()) ?? null
    await importJob(job, log, content)
  }

  console.log('\n--- Log ---')
  for (const entry of log) {
    console.log(
      `${entry.entity.padEnd(11)} ${entry.greenhouseId.padEnd(15)} ${entry.action}${entry.detail ? ' — ' + entry.detail : ''}`
    )
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
