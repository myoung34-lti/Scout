import { LoginForm } from '@/components/auth/login-form'
import { ScoutMark } from '@/components/icons/scout-mark'
import { LtiMark } from '@/components/icons/lti-mark'

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <ScoutMark className="mx-auto h-8 w-11 text-primary" />
          <h1 className="text-2xl font-semibold tracking-tight">Scout</h1>
          <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            Powered by
            <LtiMark className="h-4 w-auto text-primary" />
          </div>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
