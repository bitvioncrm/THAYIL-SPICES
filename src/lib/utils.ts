import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function uid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

export function nowISO(): string {
  return new Date().toISOString()
}

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export function roundKg(value: number): number {
  return Math.round((value + Number.EPSILON) * 1000) / 1000
}

export function formatKg(value: number | undefined | null): string {
  if (value == null || Number.isNaN(value)) return '0.000'
  return roundKg(value).toFixed(3)
}

export function formatMoney(value: number | undefined | null, symbol = '₹'): string {
  if (value == null || Number.isNaN(value)) return `${symbol}0.00`
  return `${symbol}${roundMoney(value).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export function formatDate(iso: string, withTime = false): string {
  const d = new Date(iso.includes('T') ? iso : `${iso}T12:00:00`)
  if (Number.isNaN(d.getTime())) return '—'
  const date = d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  })
  if (!withTime) return date
  const time = d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  })
  return `${date}, ${time}`
}

/** Format YYYY-MM-DD for bills/reports without timezone drift. */
export function formatBusinessDate(ymd: string, withWeekday = false): string {
  const d = new Date(`${ymd.slice(0, 10)}T12:00:00`)
  if (Number.isNaN(d.getTime())) return ymd
  return d.toLocaleDateString('en-IN', {
    weekday: withWeekday ? 'short' : undefined,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

/** Inclusive list of YYYY-MM-DD days between from and to. */
export function eachDayYmd(from: string, to: string): string[] {
  const days: string[] = []
  const cur = new Date(`${from.slice(0, 10)}T12:00:00`)
  const end = new Date(`${to.slice(0, 10)}T12:00:00`)
  if (Number.isNaN(cur.getTime()) || Number.isNaN(end.getTime())) return days
  while (cur <= end) {
    const y = cur.getFullYear()
    const m = String(cur.getMonth() + 1).padStart(2, '0')
    const day = String(cur.getDate()).padStart(2, '0')
    days.push(`${y}-${m}-${day}`)
    cur.setDate(cur.getDate() + 1)
  }
  return days
}

export function padCode(n: number, width = 4): string {
  return String(n).padStart(width, '0')
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function debounce<T extends (...args: never[]) => void>(fn: T, ms: number) {
  let t: ReturnType<typeof setTimeout> | undefined
  return (...args: Parameters<T>) => {
    if (t) clearTimeout(t)
    t = setTimeout(() => fn(...args), ms)
  }
}
