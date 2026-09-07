import { notFound } from 'next/navigation'
import { getJob, updateJob, listDistinctLocations } from '@/lib/actions/jobs'
import { listUsers } from '@/lib/actions/users'
import { JobForm } from '@/components/jobs/job-form'

export default async function EditJobPage({
  params,
}: {
  params: Promise<{ jobId: string }>
}) {
  const { jobId } = await params
  const [job, locations, users] = await Promise.all([
    getJob(jobId),
    listDistinctLocations(),
    listUsers(),
  ])

  if (!job) notFound()

  const boundUpdateJob = updateJob.bind(null, job.id)

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="page-title">Edit Job</h1>
      <JobForm
        action={boundUpdateJob}
        defaultValues={job}
        locations={locations}
        users={users}
        submitLabel="Save changes"
      />
    </div>
  )
}
