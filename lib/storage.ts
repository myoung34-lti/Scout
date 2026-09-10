import { createClient } from '@/lib/supabase/server'

// Supabase Storage, bucket "resumes" (private — access goes through the
// authenticated user's session, same as every other authenticated query in
// this app). Callers only ever deal with storagePath, never the bucket
// details, so swapping providers again later stays a one-file change.
const BUCKET = 'resumes'

export async function saveResumeFile(
  candidateId: string,
  fileName: string,
  bytes: Buffer
) {
  const supabase = await createClient()
  const storagePath = `resumes/${candidateId}/${Date.now()}-${fileName}`

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, bytes, { upsert: false })

  if (error) throw error

  return storagePath
}

// Genuinely removes the object rather than orphaning it. A resume attached
// to the wrong candidate is somebody else's personal data sitting on the
// wrong record, so "remove" has to mean the file is gone, not hidden.
export async function deleteResumeFile(storagePath: string) {
  const supabase = await createClient()
  const { error } = await supabase.storage.from(BUCKET).remove([storagePath])
  if (error) throw error
}

export async function readResumeFile(storagePath: string) {
  const supabase = await createClient()
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .download(storagePath)

  if (error) throw error

  return Buffer.from(await data.arrayBuffer())
}
