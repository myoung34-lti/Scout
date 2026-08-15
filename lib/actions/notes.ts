'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { requireSession } from '@/lib/session'
import { ALL_STAGES } from '@/lib/pipeline'
import type { PipelineStage } from '@prisma/client'

export async function addNote(_prevState: unknown, formData: FormData) {
  const user = await requireSession()

  const candidateId = formData.get('candidateId')
  const body = formData.get('body')
  const stageRaw = formData.get('stage')
  const stage =
    typeof stageRaw === 'string' && ALL_STAGES.includes(stageRaw as PipelineStage)
      ? (stageRaw as PipelineStage)
      : null

  if (typeof candidateId !== 'string' || !candidateId) {
    return { error: 'Missing candidate.' }
  }
  if (typeof body !== 'string' || !body.trim()) {
    return { error: 'Note cannot be empty.' }
  }

  await prisma.activityNote.create({
    data: { candidateId, authorId: user.id, body: body.trim(), stage },
  })

  revalidatePath(`/candidates/${candidateId}`)
  return undefined
}
