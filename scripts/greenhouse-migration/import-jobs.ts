import 'dotenv/config'
import { prisma } from '../../lib/db'
import { fetchAll } from './client'
import { fetchLtiJobs } from './scope'
import { importJob, type ImportLogEntry } from './import-core'

async function main() {
  const log: ImportLogEntry[] = []

  const ghJobs = await fetchLtiJobs()

  // "Online" is the job_post's own `live` flag (actually published on the
  // careers site) — NOT the Job resource's open/closed status, which is an
  // internal requisition state that can diverge from what's really posted
  // (confirmed against live data: 25 jobs are "open" internally, but only 7
  // have a live posting).
  const jobIds = ghJobs.map((j) => j.id).join(',')
  const jobPosts = (await fetchAll(`job_posts?job_ids=${jobIds}`)) as {
    job_id: bigint
    content: string
    live: boolean
  }[]
  const contentByJobId = new Map(jobPosts.map((p) => [p.job_id.toString(), p.content]))
  const liveJobIds = new Set(jobPosts.filter((p) => p.live).map((p) => p.job_id.toString()))
  const onlineJobs = ghJobs.filter((j) => liveJobIds.has(j.id.toString()))

  console.log(`LTI jobs found: ${ghJobs.length} total, ${onlineJobs.length} online (live posting)`)

  for (const job of onlineJobs) {
    const content = contentByJobId.get(job.id.toString()) ?? null
    await importJob(job, log, content)
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
  console.log(`Job posts found for: ${contentByJobId.size} of ${onlineJobs.length} online jobs`)

  await prisma.$disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
