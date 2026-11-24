import { describe, expect, it } from 'vitest'
import { getDateRange, inRange } from '@/lib/date-ranges'

describe('date ranges', () => {
  it('returns today range covering now', () => {
    const { from, to } = getDateRange('today')
    expect(inRange(new Date().toISOString(), from, to)).toBe(true)
  })

  it('supports custom range', () => {
    const { from, to } = getDateRange('custom', '2024-01-01', '2024-01-31')
    expect(new Date(from).getTime()).toBeLessThan(new Date(to).getTime())
    expect(inRange('2024-01-15T12:00:00.000Z', from, to)).toBe(true)
    expect(inRange('2023-12-31T12:00:00.000Z', from, to)).toBe(false)
  })
})
