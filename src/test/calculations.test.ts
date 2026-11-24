import { describe, expect, it } from 'vitest'
import {
  assertAllocation,
  assertNonNegativeStock,
  calcDryingCharges,
  calcDryingLoss,
  calcPaymentStatus,
  calcPurchaseNet,
  calcRemaining,
  calcYieldPercentage,
} from '@/lib/calculations'

describe('drying calculations', () => {
  it('calculates drying loss from actual weights', () => {
    expect(calcDryingLoss(100, 78.5)).toBe(21.5)
  })

  it('calculates yield percentage', () => {
    expect(calcYieldPercentage(100, 80)).toBe(80)
    expect(calcYieldPercentage(0, 10)).toBe(0)
  })

  it('calculates drying charges at configurable rate', () => {
    expect(calcDryingCharges(50, 15)).toBe(750)
    expect(calcDryingCharges(50, 15, 25, 100)).toBe(875)
  })
})

describe('purchase and payment', () => {
  it('calculates purchase net after deductions', () => {
    expect(calcPurchaseNet(10, 800, 50)).toEqual({ grossAmount: 8000, netPayable: 7950 })
  })

  it('tracks payment status and remaining', () => {
    expect(calcPaymentStatus(1000, 0)).toBe('unpaid')
    expect(calcPaymentStatus(1000, 400)).toBe('partial')
    expect(calcPaymentStatus(1000, 1000)).toBe('paid')
    expect(calcPaymentStatus(1000, 1100)).toBe('overpaid')
    expect(calcRemaining(1000, 250)).toBe(750)
  })
})

describe('stock and allocation guards', () => {
  it('prevents negative stock', () => {
    expect(assertNonNegativeStock(10, -5)).toBe(5)
    expect(() => assertNonNegativeStock(2, -5)).toThrow(/Insufficient/)
  })

  it('prevents over-allocation', () => {
    expect(() => assertAllocation(100, 80, 30)).toThrow(/Cannot allocate/)
    expect(() => assertAllocation(100, 80, 20)).not.toThrow()
  })
})
