'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { requireSession } from '@/lib/session'
import { saveResumeFile, readResumeFile, deleteResumeFile } from '@/lib/storage'
import { parseResumeFromBytes, type ParsedResumeFields } from '@/lib/actions/resume-parser'
import {
  buildOverwritePreview,
  resolveOverwrite,
  type CandidateOverwriteState,
  type ResumeOverwritePreview,
} from '@/lib/resume-overwrite'
import type { Prisma } from '@prisma/client'

const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]
const MAX_SIZE_BYTES = 10 * 1024 * 1024 // 10MB

export type UploadResumeResult = { error?: string } | undefined

export async function uploadResumeForCandidate(
  candidateId: string,
  file: File
): Promise<UploadResumeResult> {
  const user = await requireSession()

  if (file.size === 0) return undefined // no file chosen, silently skip
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { error: 'Only PDF, DOC, or DOCX files are supported.' }
  }
  if (file.size > MAX_SIZE_BYTES) {
    return { error: 'File is too large (10MB max).' }
  }

  const bytes = Buffer.from(await file.arrayBuffer())
  const storagePath = await saveResumeFile(candidateId, file.name, bytes)

  const resume = await prisma.resume.create({
    data: {
      candidateId,
      fileName: file.name,
      storagePath,
      fileSize: file.size,
      uploadedById: user.id,
    },
  })

  // Every resume upload gets scanned automatically. Skills are additive —
  // a new resume never erases a tag that came from somewhere else — but
  // work history/years experience reflect a single current snapshot, so a
  // newer resume's version replaces whatever was on file. Parsing failures
  // (unsupported format, unreadable file) are silent here: the upload
  // itself already succeeded, which is the important part.
  const parsed = await parseResumeFromBytes(bytes, file.name)
  console.error(
    'resume scan result for',
    file.name,
    'data' in parsed
      ? {
          skillsCount: parsed.data.skills?.length ?? 0,
          workHistoryCount: parsed.data.workHistory?.length ?? 0,
          yearsExperience: parsed.data.yearsExperience,
        }
      : parsed
  )
  if ('data' in parsed) {
    await prisma.resume.update({
      where: { id: resume.id },
      data: { parsedFields: parsed.data as Prisma.InputJsonValue },
    })
  }

  const skills =
    'data' in parsed
      ? (parsed.data.skills ?? []).filter((s) => s.trim() !== '')
      : []

  if (skills.length > 0) {
    await Promise.all(
      skills.map(async (rawLabel) => {
        const displayLabel = rawLabel.trim()
        const label = displayLabel.toLowerCase()
        const tag = await prisma.tag.upsert({
          where: { label },
          update: {},
          create: { label, displayLabel },
        })
        await prisma.candidateTag.upsert({
          where: { candidateId_tagId: { candidateId, tagId: tag.id } },
          update: {},
          create: { candidateId, tagId: tag.id },
        })
      })
    )
    await prisma.activityNote.create({
      data: {
        candidateId,
        authorId: user.id,
        body: `Added skills from resume scan: ${skills.join(', ')}`,
      },
    })
  }

  if ('data' in parsed) {
    const { workHistory, yearsExperience } = parsed.data
    if (
      (workHistory && workHistory.length > 0) ||
      typeof yearsExperience === 'number'
    ) {
      await prisma.candidate.update({
        where: { id: candidateId },
        data: {
          ...(workHistory && workHistory.length > 0 ? { workHistory } : {}),
          ...(typeof yearsExperience === 'number' ? { yearsExperience } : {}),
        },
      })
    }
  }

  revalidatePath(`/candidates/${candidateId}`)
  return undefined
}

export async function uploadResumeAction(
  _prevState: UploadResumeResult,
  formData: FormData
): Promise<UploadResumeResult> {
  const candidateId = formData.get('candidateId')
  const files = formData.getAll('file').filter((f): f is File => f instanceof File)

  if (typeof candidateId !== 'string' || !candidateId) {
    return { error: 'Missing candidate.' }
  }
  if (files.length === 0) {
    return { error: 'No file selected.' }
  }

  for (const file of files) {
    const result = await uploadResumeForCandidate(candidateId, file)
    if (result?.error) return result
  }
  return undefined
}

export async function getResumeFile(resumeId: string) {
  await requireSession()

  const resume = await prisma.resume.findUnique({ where: { id: resumeId } })
  if (!resume) return null

  const bytes = await readResumeFile(resume.storagePath)
  return { resume, bytes }
}

// ---------------------------------------------------------------------------
// Review-then-apply upload (the profile sidebar)
//
// uploadResumeForCandidate above stays as-is for the Add and Edit Candidate
// forms: there, the recruiter has already reviewed the parsed values in the
// form before submitting, so merging them again needs no confirmation.
//
// An upload from the profile has no such review step, and it is the path
// where a wrong file does real damage — which is exactly what a full
// replace of name, contact info and tags would make worse. So it stores and
// scans the resume, then hands back a preview and writes nothing to the
// candidate until applyResumeToCandidate is called.
// ---------------------------------------------------------------------------

export type UploadForReviewResult =
  | { error: string }
  | { resumeId: string; preview: ResumeOverwritePreview }

function toOverwriteState(candidate: {
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  linkedinUrl: string | null
  currentCompany: string | null
  currentTitle: string | null
  location: string | null
  yearsExperience: number | null
  workHistory: Prisma.JsonValue
  tags: { tag: { displayLabel: string } }[]
}): CandidateOverwriteState {
  return {
    firstName: candidate.firstName,
    lastName: candidate.lastName,
    email: candidate.email,
    phone: candidate.phone,
    linkedinUrl: candidate.linkedinUrl,
    currentCompany: candidate.currentCompany,
    currentTitle: candidate.currentTitle,
    location: candidate.location,
    yearsExperience: candidate.yearsExperience,
    workHistory: candidate.workHistory,
    tagLabels: candidate.tags.map((t) => t.tag.displayLabel),
  }
}

const OVERWRITE_CANDIDATE_SELECT = {
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  linkedinUrl: true,
  currentCompany: true,
  currentTitle: true,
  location: true,
  yearsExperience: true,
  workHistory: true,
  tags: { select: { tag: { select: { displayLabel: true } } } },
} as const

export async function uploadResumeForReview(
  candidateId: string,
  file: File
): Promise<UploadForReviewResult> {
  const user = await requireSession()

  if (file.size === 0) return { error: 'No file selected.' }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { error: 'Only PDF, DOC, or DOCX files are supported.' }
  }
  if (file.size > MAX_SIZE_BYTES) {
    return { error: 'File is too large (10MB max).' }
  }

  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
    select: OVERWRITE_CANDIDATE_SELECT,
  })
  if (!candidate) return { error: 'Candidate not found.' }

  const bytes = Buffer.from(await file.arrayBuffer())
  const storagePath = await saveResumeFile(candidateId, file.name, bytes)
  const parsed = await parseResumeFromBytes(bytes, file.name)

  // The file is attached either way. A resume that can't be scanned is
  // still the candidate's resume, and losing the upload because the parse
  // failed would be the worse outcome.
  const resume = await prisma.resume.create({
    data: {
      candidateId,
      fileName: file.name,
      storagePath,
      fileSize: file.size,
      uploadedById: user.id,
      ...('data' in parsed
        ? { parsedFields: parsed.data as Prisma.InputJsonValue }
        : {}),
    },
  })

  revalidatePath(`/candidates/${candidateId}`)

  if (!('data' in parsed)) {
    return {
      resumeId: resume.id,
      preview: {
        resumeId: resume.id,
        fileName: file.name,
        parseError: parsed.error,
        fields: [],
        tagsAdded: [],
        tagsRemoved: [],
        tagsKept: [],
        hasChanges: false,
      },
    }
  }

  return {
    resumeId: resume.id,
    preview: buildOverwritePreview(
      resume.id,
      file.name,
      toOverwriteState(candidate),
      parsed.data
    ),
  }
}

export async function applyResumeToCandidate(
  resumeId: string
): Promise<{ error?: string }> {
  const user = await requireSession()

  const resume = await prisma.resume.findUnique({
    where: { id: resumeId },
    select: { id: true, candidateId: true, fileName: true, parsedFields: true },
  })
  if (!resume) return { error: 'That resume is no longer available.' }
  if (!resume.parsedFields) {
    return { error: "This resume wasn't scanned, so there's nothing to apply." }
  }

  const candidate = await prisma.candidate.findUnique({
    where: { id: resume.candidateId },
    select: OVERWRITE_CANDIDATE_SELECT,
  })
  if (!candidate) return { error: 'Candidate not found.' }

  const parsed = resume.parsedFields as ParsedResumeFields
  const current = toOverwriteState(candidate)
  const next = resolveOverwrite(current, parsed)
  const preview = buildOverwritePreview(resume.id, resume.fileName, current, parsed)

  const { candidateId } = resume

  await prisma.candidate.update({
    where: { id: candidateId },
    data: {
      firstName: next.firstName,
      lastName: next.lastName,
      email: next.email,
      phone: next.phone,
      linkedinUrl: next.linkedinUrl,
      currentCompany: next.currentCompany,
      currentTitle: next.currentTitle,
      location: next.location,
      yearsExperience: next.yearsExperience,
      workHistory: next.workHistory as Prisma.InputJsonValue,
    },
  })

  // A full tag replace, per the chosen behaviour: the newest resume is the
  // source of truth for skills, so tags the new scan doesn't mention go
  // away. The recruiter has already seen the exact add/remove list in the
  // preview dialog before this runs.
  await prisma.candidateTag.deleteMany({ where: { candidateId } })
  await Promise.all(
    next.tagLabels.map(async (displayLabel) => {
      const label = displayLabel.toLowerCase()
      const tag = await prisma.tag.upsert({
        where: { label },
        update: {},
        create: { label, displayLabel },
      })
      await prisma.candidateTag.upsert({
        where: { candidateId_tagId: { candidateId, tagId: tag.id } },
        update: {},
        create: { candidateId, tagId: tag.id },
      })
    })
  )

  // What changed, on the timeline — the only record of the previous values
  // once they're overwritten.
  const parts: string[] = []
  for (const field of preview.fields) {
    parts.push(`${field.label}: ${field.before ?? '—'} → ${field.after ?? '—'}`)
  }
  if (preview.tagsAdded.length) parts.push(`tags added: ${preview.tagsAdded.join(', ')}`)
  if (preview.tagsRemoved.length) {
    parts.push(`tags removed: ${preview.tagsRemoved.join(', ')}`)
  }
  await prisma.activityNote.create({
    data: {
      candidateId,
      authorId: user.id,
      body: parts.length
        ? `Applied resume scan from ${resume.fileName} — ${parts.join('; ')}`
        : `Applied resume scan from ${resume.fileName} — no changes`,
    },
  })

  revalidatePath(`/candidates/${candidateId}`)
  revalidatePath('/candidates')
  return {}
}

export async function deleteResume(resumeId: string): Promise<{ error?: string }> {
  const user = await requireSession()

  const resume = await prisma.resume.findUnique({
    where: { id: resumeId },
    select: { id: true, candidateId: true, fileName: true, storagePath: true },
  })
  if (!resume) return { error: 'That resume is no longer available.' }

  // Storage first: a row without its file is a broken download link, while
  // a file without its row is invisible and harmless. If the object is
  // already gone, the row should still go.
  try {
    await deleteResumeFile(resume.storagePath)
  } catch (err) {
    console.error('resume file delete failed for', resume.storagePath, err)
  }

  await prisma.resume.delete({ where: { id: resume.id } })

  // Deliberately does not revert the name, contact info, tags or work
  // history this resume contributed. Those are candidate data now, and
  // silently rewinding a profile because a file was tidied up would be a
  // surprise. Upload the right resume, or use Edit, to correct them.
  await prisma.activityNote.create({
    data: {
      candidateId: resume.candidateId,
      authorId: user.id,
      body: `Removed resume: ${resume.fileName}`,
    },
  })

  revalidatePath(`/candidates/${resume.candidateId}`)
  return {}
}
