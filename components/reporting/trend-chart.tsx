'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { useFilterParams } from '@/lib/use-filter-params'
import { Button } from '@/components/ui/button'
import type { TrendSeriesPoint } from '@/lib/reporting/reporting-service'

const RANGE_OPTIONS = [
  { value: '30', label: '30 Days' },
  { value: '90', label: '90 Days' },
  { value: '180', label: '180 Days' },
]

export function TrendChart({
  data,
  selectedDays,
}: {
  data: TrendSeriesPoint[]
  selectedDays: string
}) {
  const { setSingle } = useFilterParams()

  return (
    <div className="rounded-xl border border-border bg-card shadow-xs p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-medium">Recruiting Activity Over Time</h2>
        <div className="flex gap-1.5">
          {RANGE_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              type="button"
              size="sm"
              variant={selectedDays === opt.value ? 'default' : 'outline'}
              onClick={() => setSingle('trendDays', opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>
      {data.length === 0 ? (
        <p className="text-sm text-muted-foreground">No activity in this range yet.</p>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} width={32} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="added" name="Added" stroke="var(--chart-1)" strokeWidth={2} dot={false} />
            <Line
              type="monotone"
              dataKey="interviewed"
              name="Interviewed"
              stroke="var(--chart-4)"
              strokeWidth={2}
              dot={false}
            />
            <Line type="monotone" dataKey="hired" name="Hired" stroke="var(--chart-3)" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
