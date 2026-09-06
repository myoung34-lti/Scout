import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/login', '/signup', '/auth/callback']

// Refreshes the Supabase session on every request and redirects
// unauthenticated visitors to /login. Called from proxy.ts.
export async function updateSession(request: NextRequest) {
  // Hit by Google Cloud Scheduler, never by a logged-in browser — there's no
  // Supabase session to check. Not added to PUBLIC_PATHS (that means "no
  // auth needed at all" for a real page); the route itself enforces a
  // shared-secret header, this just stops the proxy redirecting a request
  // that will never carry a session cookie. Prefix covers future cron
  // routes too.
  if (request.nextUrl.pathname.startsWith('/api/cron/')) {
    return NextResponse.next({ request })
  }

  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isPublicPath = PUBLIC_PATHS.includes(request.nextUrl.pathname)

  // Behind Firebase Hosting/Cloud Run's proxy chain, request.nextUrl's host
  // resolves to the container's internal address, not the public hostname —
  // x-forwarded-host carries the real one (stripped of any leaked internal
  // port). Only trusted in production: local dev has no real reverse proxy,
  // and this environment's own tooling injects a misleading
  // x-forwarded-host on local requests that would otherwise hijack this.
  // A fresh URL is built from it rather than mutating the cloned NextURL,
  // which retains the internal port even after .host is reassigned. See
  // Supabase's SSR auth docs.
  const forwardedHost =
    process.env.NODE_ENV === 'production'
      ? request.headers.get('x-forwarded-host')?.split(':')[0]
      : undefined

  function redirectTo(pathname: string) {
    if (forwardedHost) {
      return NextResponse.redirect(new URL(pathname, `https://${forwardedHost}`))
    }
    const url = request.nextUrl.clone()
    url.pathname = pathname
    return NextResponse.redirect(url)
  }

  if (!user && !isPublicPath) {
    return redirectTo('/login')
  }

  if (user && isPublicPath) {
    return redirectTo('/jobs')
  }

  return response
}
