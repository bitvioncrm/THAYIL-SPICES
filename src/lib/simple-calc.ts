import { roundKg, roundMoney } from './utils'
import type { RateMethod } from '@/types/simple'

export function calcLoss(greenKg: number, dryKg: number): number {
  return roundKg(Math.max(0, greenKg - dryKg))
}

export function calcLabourCharge(params: {
  method: RateMethod
  rate: number
  greenKg: number
  dryKg: number
  bags?: number
}): number {
  const { method, rate, greenKg, dryKg, bags = 0 } = params
  switch (method) {
    case 'per_green_kg':
      return roundMoney(greenKg * rate)
    case 'per_dry_kg':
      return roundMoney(dryKg * rate)
    case 'per_bag':
      return roundMoney(bags * rate)
    case 'fixed_daily':
    case 'custom':
      return roundMoney(rate)
    default:
      return roundMoney(greenKg * rate)
  }
}

export function assertValidWeights(greenKg: number, dryKg: number) {
  if (greenKg < 0 || dryKg < 0) throw new Error('Weights cannot be negative')
  if (dryKg > greenKg + 0.0005 && greenKg > 0) {
    // Allow dry-only later entry when green was 0 previously; if both set, dry should not exceed green
    if (greenKg > 0) throw new Error('Dry KG cannot exceed green KG')
  }
}
