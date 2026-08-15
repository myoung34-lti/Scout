import { listUsers } from '@/lib/actions/users'
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

const dateFormatter = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' })

export default async function AdminPage() {
  const users = await listUsers()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Admin</h1>
        <p className="text-sm text-muted-foreground">
          Manage your team&apos;s roles. New teammates are added directly in
          Supabase for now — once they sign in, they&apos;ll show up here.
        </p>
      </div>

      <div className="rounded-lg border bg-background">
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
  )
}
