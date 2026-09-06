import { startOfDay, startOfWeek, startOfMonth, startOfQuarter, format, getQuarter, getYear } from 'date-fns'
import type { TimeGrouping } from '@/lib/reporting/report-schema'

// A stable sort key (so buckets order chronologically) plus a human label.
export function bucketKeyAndLabel(date: Date, grouping: TimeGrouping): { key: string; label: string } {
  switch (grouping) {
    case 'DAY': {
      const d = startOfDay(date)
      return { key: format(d, 'yyyy-MM-dd'), label: format(d, 'MMM d') }
    }
    case 'WEEK': {
      const d = startOfWeek(date, { weekStartsOn: 1 })
      return { key: format(d, 'yyyy-MM-dd'), label: `Week of ${format(d, 'MMM d')}` }
    }
    case 'MONTH': {
      const d = startOfMonth(date)
      return { key: format(d, 'yyyy-MM'), label: format(d, 'MMM yyyy') }
    }
    case 'QUARTER': {
      const d = startOfQuarter(date)
      return { key: `${getYear(d)}-Q${getQuarter(d)}`, label: `Q${getQuarter(d)} ${getYear(d)}` }
    }
  }
}
