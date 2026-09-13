/**
 * One-time backfill: give every UNOWNED candidate with an in-process
 * application (Introductory Call → Offer) an assigned recruiter.
 *
 * Why this exists: Home's funnel, In Process, Needs Attention and Hires all
 * count the candidates assigned to the viewer. 29 of 38 in-process
 * applications had no assigned recruiter, so they appeared on nobody's
 * dashboard.
 *
 * Only fills nulls — a candidate who already has a recruiter is never
 * touched. Run with --commit to write; without it, prints the plan.
 *
 *   npx tsx scripts/backfill/assign-unowned-in-process.ts
 *   npx tsx scripts/backfill/assign-unowned-in-process.ts --commit
 */
import { prisma } from '../../lib/db'
import { IN_PROCESS_STAGES, STAGE_LABELS } from '../../lib/pipeline'

const ASSIGNEE_EMAIL = 'dschermerhorn@logictechnologyinc.com'
const COMMIT = process.argv.includes('--commit')

async function main() {
  const assignee = await prisma.user.findFirst({
    where: { OR: [
      { email: ASSIGNEE_EMAIL },
      { name: { contains: 'Debbie', mode: 'insensitive' } },
    ] },
    select: { id: true, name: true, email: true },
  })
  if (!assignee) throw new Error('Assignee not found')
  console.log(`Assignee: ${assignee.name} <${assignee.email}>`)
  console.log(`Mode    : ${COMMIT ? 'COMMIT (writes)' : 'DRY RUN (no writes)'}\n`)

  const targets = await prisma.candidate.findMany({
    where: {
      ownerId: null,
      deletedAt: null,
      applications: {
        some: { stage: { in: IN_PROCESS_STAGES }, removedAt: null },
      },
    },
    select: {
      id: true, firstName: true, lastName: true,
      applications: {
        where: { stage: { in: IN_PROCESS_STAGES }, removedAt: null },
        select: { stage: true, job: { select: { internalName: true } } },
      },
    },
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
  })

  const byStage = new Map<string, number>()
  for (const c of targets) {
    for (const a of c.applications) byStage.set(a.stage, (byStage.get(a.stage) ?? 0) + 1)
  }

  console.log(`Candidates to assign: ${targets.length}`)
  console.log(`Applications covered: ${targets.reduce((n, c) => n + c.applications.length, 0)}\n`)
  for (const s of IN_PROCESS_STAGES) {
    const n = byStage.get(s) ?? 0
    if (n) console.log(`  ${String(n).padStart(3)}  ${STAGE_LABELS[s]}`)
  }
  console.log('')
  for (const c of targets) {
    const where = c.applications
      .map((a) => `${STAGE_LABELS[a.stage]} @ ${a.job.internalName}`)
      .join('; ')
    console.log(`  ${`${c.firstName} ${c.lastName}`.padEnd(28)} ${where}`)
  }

  if (!COMMIT) {
    console.log('\nDRY RUN — nothing written. Re-run with --commit to apply.')
    await prisma.$disconnect()
    return
  }

  let done = 0
  for (const c of targets) {
    // Guarded on ownerId: null again at write time, so a candidate assigned
    // by a person between the read above and this write is never overwritten.
    const res = await prisma.candidate.updateMany({
      where: { id: c.id, ownerId: null },
      data: { ownerId: assignee.id },
    })
    if (res.count === 1) {
      // Owner changes aren't noted anywhere in the app today, so without this
      // a bulk reassignment would be invisible on the timeline.
      await prisma.activityNote.create({
        data: {
          candidateId: c.id,
          authorId: assignee.id,
          body: `Assigned recruiter set to ${assignee.name} (backfill of unassigned in-process candidates)`,
        },
      })
      done++
    } else {
      console.log(`  skipped (already assigned): ${c.firstName} ${c.lastName}`)
    }
  }
  console.log(`\nAssigned ${done} of ${targets.length} candidates to ${assignee.name}.`)
  await prisma.$disconnect()
}

main().catch(async (e) => {
  console.error(e)
  await prisma.$disconnect()
  process.exit(1)
})
