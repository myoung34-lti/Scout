'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export function LoginForm() {
  const [googlePending, setGooglePending] = useState(false)

  async function signInWithGoogle() {
    setGooglePending(true)
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        // gmail.send: send-as-the-user for the candidate-emailing feature.
        // gmail.settings.basic: read-only access to their Gmail "Send mail
        // as" signature, so Compose Email can use their real signature
        // instead of a separate Scout-owned copy. offline access is what
        // makes Google issue a refresh token — captured once in the auth
        // callback and stored so we can act as the user without them being
        // actively logged in at send time.
        scopes:
          'https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.settings.basic',
        queryParams: { access_type: 'offline' },
      },
    })
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <Button
          type="button"
          className="w-full"
          disabled={googlePending}
          onClick={signInWithGoogle}
        >
          {googlePending ? 'Redirecting…' : 'Continue with Google'}
        </Button>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Sign in with your logictechnologyinc.com Google account.
        </p>
      </CardContent>
    </Card>
  )
}
