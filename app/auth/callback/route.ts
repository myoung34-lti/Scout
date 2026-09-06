import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'

// Exchanges the OAuth code Google/Supabase redirects back with for a session.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  // Behind Firebase Hosting/Cloud Run's proxy chain, request.url's origin
  // resolves to the container's internal address, not the public hostname —
  // x-forwarded-host carries the real one (stripped of any leaked internal
  // port). Only trusted in production: local dev has no real reverse proxy,
  // and this environment's own tooling injects a misleading
  // x-forwarded-host on local requests that would otherwise hijack this.
  // See Supabase's SSR auth docs.
  const forwardedHost =
    process.env.NODE_ENV === 'production'
      ? request.headers.get('x-forwarded-host')?.split(':')[0]
      : undefined
  const publicOrigin = forwardedHost ? `https://${forwardedHost}` : origin

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Google only ever returns this once, right at consent — not stored
      // by Supabase, so it has to be captured here or it's gone until the
      // user is forced through the consent screen again. Absent on routine
      // re-logins where Google doesn't re-issue it, which is fine — we
      // still have whatever was captured on their last real consent.
      const refreshToken = data.session.provider_refresh_token
      if (refreshToken) {
        await prisma.user.update({
          where: { id: data.user.id },
          data: { googleRefreshToken: refreshToken },
        })
      }
      return NextResponse.redirect(`${publicOrigin}/jobs`)
    }
    console.error('exchangeCodeForSession failed:', error.message, error.status)
  } else {
    console.error('auth callback hit with no code param')
  }

  return NextResponse.redirect(`${publicOrigin}/login`)
}
