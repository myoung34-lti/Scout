import { writeFile, readFile } from 'fs/promises'
import path from 'path'

const STORAGE_ROOT = path.join(process.cwd(), 'storage')

// Local filesystem storage. Swappable for Vercel Blob/S3 later behind this
// same interface — callers only deal with storagePath, never the disk path.
export async function saveResumeFile(
  candidateId: string,
  fileName: string,
  bytes: Buffer
) {
  const storagePath = path.posix.join(
    'resumes',
    candidateId,
    `${Date.now()}-${fileName}`
  )
  const diskPath = path.join(STORAGE_ROOT, storagePath)

  await writeFile(diskPath, bytes, { flag: 'wx' }).catch(async (err) => {
    if (err.code === 'ENOENT') {
      const fs = await import('fs/promises')
      await fs.mkdir(path.dirname(diskPath), { recursive: true })
      await writeFile(diskPath, bytes)
      return
    }
    throw err
  })

  return storagePath
}

export async function readResumeFile(storagePath: string) {
  const diskPath = path.join(STORAGE_ROOT, storagePath)
  return readFile(diskPath)
}
