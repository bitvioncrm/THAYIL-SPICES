import { describe, expect, it } from 'vitest'
import { calcLabourCharge, calcLoss } from '@/lib/simple-calc'

describe('simple labour calculations', () => {
  it('calculates loss from actual weights', () => {
    expect(calcLoss(100, 78)).toBe(22)
  })

  it('charges per green kg', () => {
    expect(calcLabourCharge({ method: 'per_green_kg', rate: 15, greenKg: 40, dryKg: 30 })).toBe(600)
  })

  it('charges per dry kg', () => {
    expect(calcLabourCharge({ method: 'per_dry_kg', rate: 20, greenKg: 40, dryKg: 30 })).toBe(600)
  })

  it('charges per bag', () => {
    expect(
      calcLabourCharge({ method: 'per_bag', rate: 50, greenKg: 100, dryKg: 80, bags: 4 }),
    ).toBe(200)
  })

  it('uses fixed daily charge', () => {
    expect(calcLabourCharge({ method: 'fixed_daily', rate: 500, greenKg: 10, dryKg: 8 })).toBe(500)
  })
})
