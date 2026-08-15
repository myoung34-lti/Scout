import { getAllBoardApplications } from '@/lib/actions/pipeline'
import { MasterPipelineView } from '@/components/kanban/master-pipeline-view'

export default async function PipelinePage() {
  const applications = await getAllBoardApplications()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Pipeline</h1>
        <p className="text-muted-foreground">
          Every candidate in process across all open and on-hold positions.
        </p>
      </div>
      <MasterPipelineView applications={applications} />
    </div>
  )
}
