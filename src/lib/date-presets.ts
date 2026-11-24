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

/** Asia/Kolkata calendar day as YYYY-MM-DD — no date-fns. */
export function kolkataTodayYmd(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
}

function parseYmd(ymd: string): Date {
  return new Date(`${ymd.slice(0, 10)}T12:00:00`)
}

function toYmd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function addDays(ymd: string, n: number): string {
  const d = parseYmd(ymd)
  d.setDate(d.getDate() + n)
  return toYmd(d)
}

/** Fast YMD ranges for filters/overview (Mon–Sun weeks). */
export function getYmdRange(
  preset: DatePreset,
  customFrom?: string,
  customTo?: string,
): { from: string; to: string } {
  const today = kolkataTodayYmd()
  const d = parseYmd(today)

  switch (preset) {
    case 'today':
      return { from: today, to: today }
    case 'yesterday': {
      const y = addDays(today, -1)
      return { from: y, to: y }
    }
    case 'this_week': {
      const day = (d.getDay() + 6) % 7
      const from = addDays(today, -day)
      return { from, to: addDays(from, 6) }
    }
    case 'last_week': {
      const day = (d.getDay() + 6) % 7
      const thisMon = addDays(today, -day)
      const from = addDays(thisMon, -7)
      return { from, to: addDays(from, 6) }
    }
    case 'this_month': {
      const ym = today.slice(0, 7)
      const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
      return { from: `${ym}-01`, to: `${ym}-${String(last).padStart(2, '0')}` }
    }
    case 'last_month': {
      const firstThis = new Date(d.getFullYear(), d.getMonth(), 1)
      const lastPrev = new Date(firstThis.getTime() - 86400000)
      const ym = toYmd(lastPrev).slice(0, 7)
      const last = lastPrev.getDate()
      return { from: `${ym}-01`, to: `${ym}-${String(last).padStart(2, '0')}` }
    }
    case 'this_year': {
      const y = today.slice(0, 4)
      return { from: `${y}-01-01`, to: `${y}-12-31` }
    }
    case 'last_year': {
      const y = String(Number(today.slice(0, 4)) - 1)
      return { from: `${y}-01-01`, to: `${y}-12-31` }
    }
    case 'custom':
      return {
        from: (customFrom || today).slice(0, 10),
        to: (customTo || customFrom || today).slice(0, 10),
      }
  }
}
