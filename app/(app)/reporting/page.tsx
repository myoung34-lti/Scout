import { requireSession } from '@/lib/session'
import {
  getReportingHeadlineStats,
  getActivityTrendSeries,
  getHeadlineCurrentPeriodDefinition,
} from '@/lib/reporting/reporting-service'
import { listSavedReports } from '@/lib/actions/reports'
import { listUsers } from '@/lib/actions/users'
import { listJobs } from '@/lib/actions/jobs'
import { listTagOptions } from '@/lib/actions/tags'
import { StatCard } from '@/components/reporting/stat-card'
import { TrendChart } from '@/components/reporting/trend-chart'
import { ReportingView } from '@/components/reporting/reporting-view'

export const metadata = { title: 'Reporting' }

const VALID_TREND_DAYS = ['30', '90', '180']

export default async function ReportingPage({
  searchParams,
}: {
  searchParams: Promise<{ trendDays?: string }>
}) {
  await requireSession()
  const { trendDays } = await searchParams
  const selectedDays = VALID_TREND_DAYS.includes(trendDays ?? '') ? trendDays! : '90'

  const [stats, trend, savedReports, recruiters, jobs, tags] = await Promise.all([
    getReportingHeadlineStats(),
    getActivityTrendSeries(Number(selectedDays)),
    listSavedReports(),
    listUsers(),
    listJobs(),
    listTagOptions(),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Reporting</h1>
        <p className="text-muted-foreground">
          Build, visualize, and save reports across your recruiting data.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Candidates Added"
          stat={stats.added}
          definition={getHeadlineCurrentPeriodDefinition('CANDIDATES_ADDED')}
        />
        <StatCard
          label="Candidates Interviewed"
          stat={stats.interviewed}
          definition={getHeadlineCurrentPeriodDefinition('CANDIDATES_INTERVIEWED')}
        />
        <StatCard
          label="Candidates Hired"
          stat={stats.hired}
          definition={getHeadlineCurrentPeriodDefinition('CANDIDATES_HIRED')}
        />
      </div>

      <TrendChart data={trend} selectedDays={selectedDays} />

      <ReportingView
        lookups={{
          recruiters: recruiters.map((r) => ({ id: r.id, name: r.name })),
          jobs: jobs.map((j) => ({ id: j.id, internalName: j.internalName })),
          tags,
        }}
        savedReports={savedReports}
      />
    </div>
  )
}
