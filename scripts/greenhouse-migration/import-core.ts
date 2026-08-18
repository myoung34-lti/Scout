import { prisma } from '../../lib/db'
import { mapJob, mapCandidate, mapApplicationStage } from './mapper'
import { resolveUserNames } from './users'
import type { GreenhouseJob, GreenhouseCandidate, GreenhouseApplication, GreenhouseNote, GreenhouseScorecard } from './types'
import type { CandidateSource } from '@prisma/client'

export type ImportLogEntry = {
  entity: 'job' | 'candidate' | 'application' | 'resume' | 'activity'
  greenhouseId: string
  action: 'created' | 'updated' | 'skipped' | 'failed'
  detail?: string
}

export async function importJob(
  ghJob: GreenhouseJob,
  log: ImportLogEntry[],
  jobPostContent?: string | null
): Promise<string | null> {
  const mapped = mapJob(ghJob, jobPostContent)
  if ('unmapped' in mapped) {
    log.push({ entity: 'job', greenhouseId: ghJob.id.toString(), action: 'skipped', detail: mapped.reason })
    return null
  }

  const existing = await prisma.job.findUnique({ where: { greenhouseJobId: mapped.greenhouseJobId } })
  const job = await prisma.job.upsert({
    where: { greenhouseJobId: mapped.greenhouseJobId },
    create: {
      greenhouseJobId: mapped.greenhouseJobId,
      internalName: mapped.internalName,
      externalName: mapped.externalName,
      // Greenhouse has no reliable per-job location data for LTI jobs (its
      // offices are organizational, not physical, and job_posts don't carry
      // one either) — leave blank for a human to fill in via the Job form.
      location: '',
      status: mapped.status,
      description: mapped.description,
      createdAt: mapped.createdAt,
      updatedAt: mapped.updatedAt,
    },
    update: {
      internalName: mapped.internalName,
      externalName: mapped.externalName,
      status: mapped.status,
      description: mapped.description,
      updatedAt: mapped.updatedAt,
    },
  })
  log.push({
    entity: 'job',
    greenhouseId: ghJob.id.toString(),
    action: existing ? 'updated' : 'created',
  })
  return job.id
}

export async function importCandidate(
  ghCandidate: GreenhouseCandidate,
  source: CandidateSource,
  actingUserId: string,
  log: ImportLogEntry[]
): Promise<string | null> {
  const mapped = mapCandidate(ghCandidate, source)

  try {
    const existing = await prisma.candidate.findUnique({
      where: { greenhouseCandidateId: mapped.greenhouseCandidateId },
    })
    const candidate = await prisma.candidate.upsert({
      where: { greenhouseCandidateId: mapped.greenhouseCandidateId },
      create: {
        greenhouseCandidateId: mapped.greenhouseCandidateId,
        firstName: mapped.firstName,
        lastName: mapped.lastName,
        email: mapped.email,
        phone: mapped.phone,
        linkedinUrl: mapped.linkedinUrl,
        currentCompany: mapped.currentCompany,
        currentTitle: mapped.currentTitle,
        location: mapped.location,
        source: mapped.source,
        createdAt: mapped.createdAt,
      },
      update: {
        firstName: mapped.firstName,
        lastName: mapped.lastName,
        email: mapped.email,
        phone: mapped.phone,
        linkedinUrl: mapped.linkedinUrl,
        currentCompany: mapped.currentCompany,
        currentTitle: mapped.currentTitle,
        location: mapped.location,
      },
    })
    log.push({
      entity: 'candidate',
      greenhouseId: ghCandidate.id.toString(),
      action: existing ? 'updated' : 'created',
    })

    if (!existing) {
      await prisma.activityNote.create({
        data: {
          candidateId: candidate.id,
          authorId: actingUserId,
          body: 'Imported from Greenhouse',
        },
      })
    }

    return candidate.id
  } catch (err) {
    log.push({
      entity: 'candidate',
      greenhouseId: ghCandidate.id.toString(),
      action: 'failed',
      detail: err instanceof Error ? err.message : String(err),
    })
    return null
  }
}

export async function importApplication(
  ghApplication: GreenhouseApplication,
  scoutCandidateId: string,
  scoutJobId: string,
  jobName: string,
  actingUserId: string,
  log: ImportLogEntry[]
): Promise<string | null> {
  try {
    const mapping = mapApplicationStage(ghApplication, jobName)

    if (mapping.kind === 'unmapped') {
      log.push({
        entity: 'application',
        greenhouseId: ghApplication.id.toString(),
        action: 'skipped',
        detail: `Unmapped stage "${mapping.stageName}" / status "${mapping.status}"`,
      })
      return null
    }

    // Holding Pattern never creates (or updates) a job-tied Application —
    // Greenhouse has effectively stopped tracking these candidates
    // precisely, so in Scout they only ever surface via the Talent Pool,
    // never as an "in process" pipeline entry on any job. Checked on every
    // run (not just once) so a candidate who drifts into Holding Pattern
    // after their first import still gets caught — guarded on current
    // inTalentPool state so we never fight a recruiter who deliberately
    // removed someone from the pool in Scout since the last run.
    if (mapping.kind === 'holding_pattern') {
      const candidate = await prisma.candidate.findUniqueOrThrow({
        where: { id: scoutCandidateId },
        select: { inTalentPool: true },
      })
      if (!candidate.inTalentPool) {
        await prisma.candidate.update({
          where: { id: scoutCandidateId },
          data: {
            inTalentPool: true,
            talentPoolAddedAt: new Date(ghApplication.last_activity_at),
            talentPoolAddedById: actingUserId,
          },
        })
        await prisma.activityNote.create({
          data: {
            candidateId: scoutCandidateId,
            authorId: actingUserId,
            body: `Greenhouse status: Holding Pattern for ${mapping.originalJobName} (imported from Greenhouse) — added to Talent Pool`,
          },
        })
      }
      log.push({
        entity: 'application',
        greenhouseId: ghApplication.id.toString(),
        action: 'skipped',
        detail: 'Holding Pattern — routed to Talent Pool only, no job application created',
      })
      return null
    }

    const stage = mapping.stage
    const existing = await prisma.application.findUnique({
      where: { greenhouseApplicationId: ghApplication.id },
    })

    const application = await prisma.application.upsert({
      where: { greenhouseApplicationId: ghApplication.id },
      create: {
        greenhouseApplicationId: ghApplication.id,
        candidateId: scoutCandidateId,
        jobId: scoutJobId,
        stage,
        appliedAt: new Date(ghApplication.created_at),
        rejectedAt: ghApplication.rejected_at ? new Date(ghApplication.rejected_at) : null,
        hiredAt: ghApplication.status === 'hired' ? new Date(ghApplication.last_activity_at) : null,
        createdAt: new Date(ghApplication.created_at),
        updatedAt: new Date(ghApplication.updated_at),
      },
      update: {
        stage,
        rejectedAt: ghApplication.rejected_at ? new Date(ghApplication.rejected_at) : null,
        hiredAt: ghApplication.status === 'hired' ? new Date(ghApplication.last_activity_at) : null,
        updatedAt: new Date(ghApplication.updated_at),
      },
    })
    log.push({
      entity: 'application',
      greenhouseId: ghApplication.id.toString(),
      action: existing ? 'updated' : 'created',
    })

    if (!existing) {
      await prisma.stageHistory.create({
        data: { applicationId: application.id, fromStage: null, toStage: stage, changedById: actingUserId },
      })
      await prisma.activityNote.create({
        data: {
          candidateId: scoutCandidateId,
          applicationId: application.id,
          authorId: actingUserId,
          body: `Imported from Greenhouse — application to ${jobName}`,
        },
      })
    }

    return application.id
  } catch (err) {
    log.push({
      entity: 'application',
      greenhouseId: ghApplication.id.toString(),
      action: 'failed',
      detail: err instanceof Error ? err.message : String(err),
    })
    return null
  }
}

export async function importResume(
  attachment: { id: bigint; url: string; filename: string },
  scoutCandidateId: string,
  actingUserId: string,
  saveResumeFile: (candidateId: string, fileName: string, bytes: Buffer) => Promise<string>,
  log: ImportLogEntry[]
): Promise<void> {
  try {
    const existing = await prisma.resume.findUnique({ where: { greenhouseAttachmentId: attachment.id } })
    if (existing) {
      log.push({ entity: 'resume', greenhouseId: attachment.id.toString(), action: 'skipped', detail: 'already migrated' })
      return
    }

    const res = await fetch(attachment.url)
    if (!res.ok) throw new Error(`Download failed: ${res.status}`)
    const bytes = Buffer.from(await res.arrayBuffer())

    const storagePath = await saveResumeFile(scoutCandidateId, attachment.filename, bytes)
    await prisma.resume.create({
      data: {
        candidateId: scoutCandidateId,
        fileName: attachment.filename,
        storagePath,
        fileSize: bytes.length,
        uploadedById: actingUserId,
        greenhouseAttachmentId: attachment.id,
      },
    })
    log.push({ entity: 'resume', greenhouseId: attachment.id.toString(), action: 'created' })
  } catch (err) {
    // A resume failure must never fail the candidate's migration.
    log.push({
      entity: 'resume',
      greenhouseId: attachment.id.toString(),
      action: 'failed',
      detail: err instanceof Error ? err.message : String(err),
    })
  }
}

// Approved filter (see conversation): only rejection-reason ACTIVITY notes
// carry real human judgment — routine system events (stage moves, imports,
// job-adds) duplicate what our own import already logs via StageHistory /
// the "application to X" note, so they're deliberately excluded.
export function isImportableActivityNote(note: GreenhouseNote): boolean {
  if (note.type !== 'ACTIVITY') return false
  return /^Reason:/i.test(note.body ?? '') || /^Rejected from/i.test(note.subject ?? '')
}

// Draft/empty scorecards aren't real submitted feedback yet.
export function isImportableScorecard(scorecard: GreenhouseScorecard): boolean {
  return scorecard.status === 'complete' && !!scorecard.notes?.trim()
}

// Imports Scorecards (interview feedback) and filtered rejection-reason
// notes as ActivityNote rows. Author identity can't be a real Scout User
// (see the authorship constraint in the conversation) — the acting
// migration user is the FK, and the original Greenhouse author's name and
// timestamp are preserved as a text prefix instead.
export async function importActivityForCandidate(
  scoutCandidateId: string,
  applicationIdByGreenhouseId: Map<string, string>,
  notes: GreenhouseNote[],
  scorecards: GreenhouseScorecard[],
  actingUserId: string,
  log: ImportLogEntry[]
): Promise<void> {
  const rejectionNotes = notes.filter(isImportableActivityNote)
  const importableScorecards = scorecards.filter(isImportableScorecard)

  const userIds = [
    ...rejectionNotes.map((n) => n.user_id).filter((id): id is bigint => id !== null),
    ...importableScorecards.map((s) => s.interviewer_id),
  ]
  const userNames = await resolveUserNames(userIds)

  for (const note of rejectionNotes) {
    try {
      const existing = await prisma.activityNote.findUnique({ where: { greenhouseNoteId: note.id } })
      if (existing) {
        log.push({ entity: 'activity', greenhouseId: note.id.toString(), action: 'skipped', detail: 'already migrated' })
        continue
      }

      const authorName = note.user_id ? (userNames.get(note.user_id.toString()) ?? 'Greenhouse') : 'Greenhouse'
      const scoutApplicationId = note.application_id
        ? (applicationIdByGreenhouseId.get(note.application_id.toString()) ?? null)
        : null
      const date = new Date(note.created_at).toLocaleDateString()

      await prisma.activityNote.create({
        data: {
          candidateId: scoutCandidateId,
          applicationId: scoutApplicationId,
          authorId: actingUserId,
          body: `[Originally by ${authorName} via Greenhouse, ${date}] ${note.body}`,
          greenhouseNoteId: note.id,
          createdAt: new Date(note.created_at),
        },
      })
      log.push({ entity: 'activity', greenhouseId: note.id.toString(), action: 'created' })
    } catch (err) {
      log.push({
        entity: 'activity',
        greenhouseId: note.id.toString(),
        action: 'failed',
        detail: err instanceof Error ? err.message : String(err),
      })
    }
  }

  for (const scorecard of importableScorecards) {
    try {
      const existing = await prisma.activityNote.findUnique({ where: { greenhouseNoteId: scorecard.id } })
      if (existing) {
        log.push({ entity: 'activity', greenhouseId: scorecard.id.toString(), action: 'skipped', detail: 'already migrated' })
        continue
      }

      const interviewerName = userNames.get(scorecard.interviewer_id.toString()) ?? 'Greenhouse interviewer'
      const scoutApplicationId = applicationIdByGreenhouseId.get(scorecard.application_id.toString()) ?? null
      const timestampSource = scorecard.submitted_at ?? scorecard.interviewed_at ?? new Date(0).toISOString()
      const date = new Date(timestampSource).toLocaleDateString()
      const ratingSuffix = scorecard.candidate_rating ? ` (candidate rating: ${scorecard.candidate_rating})` : ''

      await prisma.activityNote.create({
        data: {
          candidateId: scoutCandidateId,
          applicationId: scoutApplicationId,
          authorId: actingUserId,
          body: `[Interview feedback by ${interviewerName} via Greenhouse, ${date}]${ratingSuffix} ${scorecard.notes}`,
          greenhouseNoteId: scorecard.id,
          createdAt: new Date(timestampSource),
        },
      })
      log.push({ entity: 'activity', greenhouseId: scorecard.id.toString(), action: 'created' })
    } catch (err) {
      log.push({
        entity: 'activity',
        greenhouseId: scorecard.id.toString(),
        action: 'failed',
        detail: err instanceof Error ? err.message : String(err),
      })
    }
  }
}
