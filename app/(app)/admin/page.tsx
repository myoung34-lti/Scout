import Link from 'next/link'
import { ArrowRight, Undo2 } from 'lucide-react'
import { listUsers } from '@/lib/actions/users'
import { countDeletedCandidates } from '@/lib/actions/candidates'
import { RETENTION_DAYS } from '@/lib/candidate-visibility'
import { listEmailVariables } from '@/lib/email-variables'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { UserRoleSelect } from '@/components/admin/user-role-select'
import { UserNameInput } from '@/components/admin/user-name-input'
import { EmailVariableRow } from '@/components/admin/email-variable-row'
import { AddEmailVariableDialog } from '@/components/admin/add-email-variable-dialog'

export const metadata = { title: 'Admin' }

const dateFormatter = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' })

export default async function AdminPage() {
  const [users, emailVariables, deletedCount] = await Promise.all([
    listUsers(),
    listEmailVariables(),
    countDeletedCandidates(),
  ])

  return (
    <div className="space-y-10">
      <div>
        <div>
          <h1 className="page-title">Admin</h1>
          <p className="text-sm text-muted-foreground">
            Manage your team&apos;s roles. New teammates are added directly in
            Supabase for now — once they sign in, they&apos;ll show up here.
          </p>
        </div>

        <div className="mt-4 rounded-xl border border-border bg-card shadow-xs">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    <UserNameInput userId={user.id} initialName={user.name} />
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{dateFormatter.format(user.createdAt)}</TableCell>
                  <TableCell>
                    <UserRoleSelect userId={user.id} initialRole={user.role} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Static Email Variables</h2>
            <p className="text-sm text-muted-foreground">
              Company-wide {'{{'}tokens{'}}'} available in every email template — edit label/value
              inline, no deploy needed.
            </p>
          </div>
          <AddEmailVariableDialog />
        </div>

        <div className="mt-4 rounded-xl border border-border bg-card shadow-xs">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Key</TableHead>
                <TableHead>Label</TableHead>
                <TableHead>Value</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {emailVariables.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                    No static variables yet.
                  </TableCell>
                </TableRow>
              ) : (
                emailVariables.map((variable) => (
                  <EmailVariableRow key={variable.id} variable={variable} />
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div>
        <h2 className="page-title text-xl">Recovery</h2>
        <p className="text-sm text-muted-foreground">
          Deleted candidates are kept for {RETENTION_DAYS} days and can be put back.
        </p>

        <Link
          href="/admin/deleted-candidates"
          className="mt-4 flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-xs transition-colors hover:border-primary/50"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
            <Undo2 className="size-5" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium">Recover deleted candidates</span>
            <span className="block text-xs text-muted-foreground">
              {deletedCount === 0
                ? 'Nothing deleted right now.'
                : `${deletedCount} candidate${deletedCount === 1 ? '' : 's'} recoverable.`}
            </span>
          </span>
          <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        </Link>
      </div>
    </div>
  )
}
