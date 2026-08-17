import { createClient } from '@supabase/supabase-js'

// The app's lib/storage.ts uses the cookie-based Supabase server client,
// which only works inside a real Next.js request — this standalone script
// has no request/cookies to read. A service-role client is the standard
// pattern for trusted backend tooling like a migration script: it bypasses
// the "authenticated user" RLS check entirely, so it must stay server-side
// only and never be exposed to the browser.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const BUCKET = 'resumes'

// Matches the storage path convention in lib/storage.ts exactly, so files
// written here are indistinguishable from ones uploaded through the app.
export async function saveResumeFileAdmin(
  candidateId: string,
  fileName: string,
  bytes: Buffer
): Promise<string> {
  const storagePath = `resumes/${candidateId}/${Date.now()}-${fileName}`

  const { error } = await supabase.storage.from(BUCKET).upload(storagePath, bytes, { upsert: false })
  if (error) throw error

  return storagePath
}
