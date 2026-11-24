import { roundKg, roundMoney } from './utils'

export { roundKg, roundMoney }

/** Drying Loss = Green Input - Dry Output */
export function calcDryingLoss(greenInputKg: number, dryOutputKg: number): number {
  return roundKg(Math.max(0, greenInputKg - dryOutputKg))
}

/** Yield % = (Dry Output / Green Input) × 100 */
export function calcYieldPercentage(greenInputKg: number, dryOutputKg: number): number {
  if (greenInputKg <= 0) return 0
  return roundKg((dryOutputKg / greenInputKg) * 100)
}

export function calcDryingCharges(
  greenInputKg: number,
  ratePerGreenKg: number,
  additionalCharges = 0,
  fixedBatchRate = 0,
): number {
  return roundMoney(greenInputKg * ratePerGreenKg + additionalCharges + fixedBatchRate)
}

export function calcPurchaseNet(quantityKg: number, ratePerKg: number, deductions = 0): {
  grossAmount: number
  netPayable: number
} {
  const grossAmount = roundMoney(quantityKg * ratePerKg)
  const netPayable = roundMoney(Math.max(0, grossAmount - deductions))
  return { grossAmount, netPayable }
}

export function calcPaymentStatus(total: number, paid: number): 'unpaid' | 'partial' | 'paid' | 'overpaid' {
  const t = roundMoney(total)
  const p = roundMoney(paid)
  if (p <= 0) return 'unpaid'
  if (p < t) return 'partial'
  if (p === t) return 'paid'
  return 'overpaid'
}

export function calcRemaining(total: number, paid: number): number {
  return roundMoney(total - paid)
}

export function assertNonNegativeStock(current: number, delta: number, label = 'stock'): number {
  const next = roundKg(current + delta)
  if (next < -0.0005) {
    throw new Error(`Insufficient ${label}. Available: ${current} KG`)
  }
  return Math.max(0, next)
}

export function assertAllocation(
  receivedKg: number,
  alreadyAllocatedKg: number,
  newAllocationKg: number,
): void {
  const remaining = roundKg(receivedKg - alreadyAllocatedKg)
  if (newAllocationKg <= 0) {
    throw new Error('Allocation quantity must be greater than zero')
  }
  if (roundKg(newAllocationKg) > remaining + 0.0005) {
    throw new Error(
      `Cannot allocate ${newAllocationKg} KG. Only ${remaining} KG remaining of ${receivedKg} KG received.`,
    )
  }
}
