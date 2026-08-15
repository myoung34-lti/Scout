import { prisma } from '@/lib/db'
import { requireSession } from '@/lib/session'
import { listUsers } from '@/lib/actions/users'
import { CandidateForm } from '@/components/candidates/candidate-form'

export default async function NewCandidatePage({
  searchParams,
}: {
  searchParams: Promise<{ jobId?: string }>
}) {
  await requireSession()
  const { jobId } = await searchParams

  const [jobs, users] = await Promise.all([
    prisma.job.findMany({
      where: { status: { in: ['OPEN', 'ON_HOLD'] } },
      orderBy: { internalName: 'asc' },
    }),
    listUsers(),
  ])

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Add Candidate</h1>
      <CandidateForm jobs={jobs} users={users} defaultJobId={jobId} />
    </div>
  )
}
