import { startOfDay } from 'date-fns'
import { fromZonedTime, toZonedTime } from 'date-fns-tz'

const TZ = 'Asia/Kolkata'

/** YYYY-MM-DD for date inputs in IST */
export function todayDateInput(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: TZ })
}

export function dateInputToISO(date: string): string {
  const local = toZonedTime(new Date(date), TZ)
  return fromZonedTime(startOfDay(local), TZ).toISOString()
}