import 'dotenv/config'
import { prisma } from '../../lib/db'

// One-time cleanup: 9 Applications were created early in this migration for
// Holding Pattern candidates, before the rule was corrected to never create
// a job-tied Application for them at all (see import-core.ts). Verified
// beforehand that each of these has exactly one StageHistory row (the
// original auto-import) and no human activity since — safe to remove.
// Every existing ActivityNote is preserved, just detached from the deleted
// Application (moved to candidate-level) so no history is lost.
async function main() {
  const notes = await prisma.activityNote.findMany({
    where: { body: { contains: 'Holding Pattern' }, applicationId: { not: null } },
    select: { applicationId: true },
  })
  const appIds = [...new Set(notes.map((n) => n.applicationId).filter((id): id is string => id !== null))]

  const apps = await prisma.application.findMany({
    where: { id: { in: appIds }, stage: 'INTRODUCTORY_CALL' },
    include: {
      history: true,
      candidate: { select: { firstName: true, lastName: true } },
      job: { select: { internalName: true } },
    },
  })

  console.log(`Found ${apps.length} Holding Pattern Applications still at Introductory Call.`)

  for (const app of apps) {
    if (app.history.length !== 1 || app.history[0].fromStage !== null) {
      console.log(`  SKIP ${app.candidate.firstName} ${app.candidate.lastName} — has ${app.history.length} history rows, not untouched`)
      continue
    }

    await prisma.$transaction([
      prisma.activityNote.updateMany({
        where: { applicationId: app.id },
        data: { applicationId: null },
      }),
      prisma.stageHistory.deleteMany({ where: { applicationId: app.id } }),
      prisma.application.delete({ where: { id: app.id } }),
    ])
    console.log(`  CLEANED ${app.candidate.firstName} ${app.candidate.lastName} / ${app.job.internalName}`)
  }

  await prisma.$disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
