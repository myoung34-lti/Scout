'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { requireSession } from '@/lib/session'
import { saveResumeFile, readResumeFile } from '@/lib/storage'

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

  await prisma.resume.create({
    data: {
      candidateId,
      fileName: file.name,
      storagePath,
      fileSize: file.size,
      uploadedById: user.id,
    },
  })

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
