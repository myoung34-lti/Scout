import {
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  subMonths,
  subDays,
  startOfQuarter,
  startOfYear,
  differenceInCalendarDays,
} from 'date-fns'
import type { DateRangeInput, TimeGrouping } from '@/lib/reporting/report-schema'

export function resolveDateRange(input: DateRangeInput): { start: Date; end: Date } {
  const now = new Date()
  switch (input.preset) {
    case 'LAST_7':
      return { start: startOfDay(subDays(now, 6)), end: endOfDay(now) }
    case 'LAST_30':
      return { start: startOfDay(subDays(now, 29)), end: endOfDay(now) }
    case 'LAST_90':
      return { start: startOfDay(subDays(now, 89)), end: endOfDay(now) }
    case 'THIS_MONTH':
      return { start: startOfMonth(now), end: endOfDay(now) }
    case 'LAST_MONTH': {
      const lastMonth = subMonths(now, 1)
      return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) }
    }
    case 'THIS_QUARTER':
      return { start: startOfQuarter(now), end: endOfDay(now) }
    case 'THIS_YEAR':
      return { start: startOfYear(now), end: endOfDay(now) }
    case 'ALL_TIME':
      // Well before Scout (or its Greenhouse-migrated history) has any data.
      return { start: new Date(2000, 0, 1), end: endOfDay(now) }
    case 'CUSTOM': {
      if (!input.start || !input.end) {
        throw new Error('Custom date range requires start and end')
      }
      return { start: startOfDay(new Date(input.start)), end: endOfDay(new Date(input.end)) }
    }
  }
}

// Picks a sensible default time bucket based on the resolved range's actual
// span, rather than the preset name — handles CUSTOM ranges sensibly too.
export function defaultTimeGrouping(range: { start: Date; end: Date }): TimeGrouping {
  const days = differenceInCalendarDays(range.end, range.start)
  if (days <= 7) return 'DAY'
  if (days <= 90) return 'WEEK'
  if (days <= 366) return 'MONTH'
  return 'QUARTER'
}
