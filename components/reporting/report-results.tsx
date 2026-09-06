'use client'

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { ReportResult, Visualization } from '@/lib/reporting/report-schema'

export function ReportResults({
  result,
  visualization,
  loading,
  error,
  onDrillDown,
}: {
  result: ReportResult | null
  visualization: Visualization
  loading: boolean
  error: string | null
  onDrillDown: (groupLabel: string) => void
}) {
  if (error) {
    return <p className="text-sm text-destructive">{error}</p>
  }

  if (!result) {
    return <p className="text-sm text-muted-foreground">Configuring your report…</p>
  }

  if (result.categories.length === 0) {
    return <p className="text-sm text-muted-foreground">No data matches these filters.</p>
  }

  const chartData = result.categories.map((category, i) => {
    const row: Record<string, string | number> = { category }
    for (const s of result.series) row[s.name] = s.data[i]
    return row
  })
  const columns = result.rows.length > 0 ? Object.keys(result.rows[0]) : []
  const groupColumn = columns[0]

  return (
    <div className={loading ? 'opacity-50 transition-opacity' : 'transition-opacity'}>
      <p className="mb-2 text-xs text-muted-foreground">
        Click a {visualization === 'TABLE' ? 'row' : visualization === 'LINE' ? 'point' : 'bar'} to see
        the underlying records.
      </p>
      {visualization === 'TABLE' ? (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((col) => (
                  <TableHead key={col}>{col}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.rows.map((row, i) => (
                <TableRow
                  key={i}
                  className="cursor-pointer"
                  onClick={() => onDrillDown(String(row[groupColumn]))}
                >
                  {columns.map((col) => (
                    <TableCell key={col} className="tabular-nums">
                      {row[col]}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={320}>
          {visualization === 'LINE' ? (
            <LineChart
              data={chartData}
              onClick={(e) => {
                if (e && typeof e.activeLabel === 'string') onDrillDown(e.activeLabel)
              }}
              className="cursor-pointer"
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="category" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} width={32} />
              <Tooltip />
              {result.series.map((s) => (
                <Line
                  key={s.name}
                  type="monotone"
                  dataKey={s.name}
                  stroke="#2563eb"
                  strokeWidth={2}
                  dot={{ r: 3, cursor: 'pointer' }}
                  activeDot={{ r: 5, cursor: 'pointer' }}
                />
              ))}
            </LineChart>
          ) : (
            <BarChart
              data={chartData}
              onClick={(e) => {
                if (e && typeof e.activeLabel === 'string') onDrillDown(e.activeLabel)
              }}
              className="cursor-pointer"
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="category" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} width={32} />
              <Tooltip />
              {result.series.map((s) => (
                <Bar key={s.name} dataKey={s.name} fill="#2563eb" radius={[4, 4, 0, 0]} />
              ))}
            </BarChart>
          )}
        </ResponsiveContainer>
      )}
    </div>
  )
}
