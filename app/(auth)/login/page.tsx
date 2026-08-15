import { LoginForm } from '@/components/auth/login-form'

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold">ATS</h1>
          <p className="text-sm text-muted-foreground">
            Sign in to your team account
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
