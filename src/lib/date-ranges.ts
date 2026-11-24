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
import type { DatePreset } from './date-presets'

export type { DatePreset } from './date-presets'
export { DATE_PRESET_LABELS, getYmdRange, kolkataTodayYmd } from './date-presets'

const TZ = 'Asia/Kolkata'

function kolkataNow(): Date {
  return toZonedTime(new Date(), TZ)
}

function rangeFromLocal(startLocal: Date, endLocal: Date): { from: string; to: string } {
  return {
    from: fromZonedTime(startLocal, TZ).toISOString(),
    to: fromZonedTime(endLocal, TZ).toISOString(),
  }
}

/** ISO timestamp ranges (heavier). Prefer getYmdRange for entryDate filters. */
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
