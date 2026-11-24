import {
  startOfDay,
  endOfDay,
  subDays,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  subWeeks,
  subMonths,
  subYears,
} from 'date-fns'
import { toZonedTime, fromZonedTime } from 'date-fns-tz'

const TZ = 'Asia/Kolkata'

export type DatePreset =
  | 'today'
  | 'yesterday'
  | 'this_week'
  | 'last_week'
  | 'this_month'
  | 'last_month'
  | 'this_year'
  | 'last_year'
  | 'custom'

export const DATE_PRESET_LABELS: Record<DatePreset, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  this_week: 'This Week',
  last_week: 'Last Week',
  this_month: 'This Month',
  last_month: 'Last Month',
  this_year: 'This Year',
  last_year: 'Last Year',
  custom: 'Custom Range',
}

function kolkataNow(): Date {
  return toZonedTime(new Date(), TZ)
}

function rangeFromLocal(startLocal: Date, endLocal: Date): { from: string; to: string } {
  return {
    from: fromZonedTime(startLocal, TZ).toISOString(),
    to: fromZonedTime(endLocal, TZ).toISOString(),
  }
}

export function getDateRange(
  preset: DatePreset,
  customFrom?: string,
  customTo?: string,
): { from: string; to: string } {
  const now = kolkataNow()

  switch (preset) {
    case 'today':
      return rangeFromLocal(startOfDay(now), endOfDay(now))
    case 'yesterday': {
      const d = subDays(now, 1)
      return rangeFromLocal(startOfDay(d), endOfDay(d))
    }
    case 'this_week':
      return rangeFromLocal(
        startOfWeek(now, { weekStartsOn: 1 }),
        endOfWeek(now, { weekStartsOn: 1 }),
      )
    case 'last_week': {
      const last = subWeeks(now, 1)
      return rangeFromLocal(
        startOfWeek(last, { weekStartsOn: 1 }),
        endOfWeek(last, { weekStartsOn: 1 }),
      )
    }
    case 'this_month':
      return rangeFromLocal(startOfMonth(now), endOfMonth(now))
    case 'last_month': {
      const last = subMonths(now, 1)
      return rangeFromLocal(startOfMonth(last), endOfMonth(last))
    }
    case 'this_year':
      return rangeFromLocal(startOfYear(now), endOfYear(now))
    case 'last_year': {
      const last = subYears(now, 1)
      return rangeFromLocal(startOfYear(last), endOfYear(last))
    }
    case 'custom': {
      const from = customFrom
        ? fromZonedTime(startOfDay(toZonedTime(new Date(customFrom), TZ)), TZ).toISOString()
        : rangeFromLocal(startOfMonth(now), endOfMonth(now)).from
      const to = customTo
        ? fromZonedTime(endOfDay(toZonedTime(new Date(customTo), TZ)), TZ).toISOString()
        : rangeFromLocal(startOfMonth(now), endOfMonth(now)).to
      return { from, to }
    }
  }
}

export function inRange(iso: string, from: string, to: string): boolean {
  const t = new Date(iso).getTime()
  return t >= new Date(from).getTime() && t <= new Date(to).getTime()
}
