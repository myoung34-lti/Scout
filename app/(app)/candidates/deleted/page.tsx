import { Trash2 } from 'lucide-react'
import { listDeletedCandidates } from '@/lib/actions/candidates'
import { RETENTION_DAYS } from '@/lib/candidate-visibility'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { RestoreCandidateButton } from '@/components/candidates/restore-candidate-button'
import { Breadcrumb } from '@/components/ui/breadcrumb'

export const metadata = { title: 'Deleted Candidates' }

const dateFormatter = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' })

export default async function DeletedCandidatesPage() {
  const candidates = await listDeletedCandidates()

  return (
    <div className="space-y-5">
      <div>
        <Breadcrumb
          items={[{ label: 'Candidates', href: '/candidates' }, { label: 'Deleted' }]}
        />
        <h1 className="page-title">Deleted Candidates</h1>
        <p className="text-sm text-muted-foreground">
          Restorable for {RETENTION_DAYS} days. Their applications, interviews, notes and
          emails are all kept, so restoring puts everything back as it was.
        </p>
      </div>

      {candidates.length === 0 ? (
        <div className="rounded-xl border border-border bg-card shadow-xs">
          <EmptyState
            icon={Trash2}
            title="Nothing deleted"
            description="Candidates you delete will appear here, and can be restored."
          />
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Name</TableHead>
                <TableHead>Title / Company</TableHead>
                <TableHead>Records kept</TableHead>
                <TableHead>Deleted</TableHead>
                <TableHead>Time left</TableHead>
                <TableHead className="w-10" aria-label="Actions" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {candidates.map((c) => {
                const kept = [
                  c.counts.applications &&
                    `${c.counts.applications} application${c.counts.applications === 1 ? '' : 's'}`,
                  c.counts.interviews &&
                    `${c.counts.interviews} interview${c.counts.interviews === 1 ? '' : 's'}`,
                  c.counts.notes && `${c.counts.notes} note${c.counts.notes === 1 ? '' : 's'}`,
                ].filter(Boolean)

                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="max-w-[16rem] truncate text-muted-foreground">
                      {c.subtitle ?? '—'}
                    </TableCell>
                    <TableCell className="max-w-[16rem] whitespace-normal text-muted-foreground">
                      {kept.length > 0 ? kept.join(' · ') : 'None'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <span className="block">{dateFormatter.format(c.deletedAt)}</span>
                      {c.deletedByName && (
                        <span className="block text-xs">by {c.deletedByName}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {/* Nothing purges automatically, so past the window this
                          reports as overdue rather than pretending it's gone. */}
                      {c.daysLeft > 0 ? (
                        <Badge variant={c.daysLeft <= 7 ? 'warning' : 'neutral'}>
                          {c.daysLeft}d left
                        </Badge>
                      ) : (
                        <Badge variant="danger">Past {RETENTION_DAYS}d</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <RestoreCandidateButton candidateId={c.id} candidateName={c.name} />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
