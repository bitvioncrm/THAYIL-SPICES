import { sdb } from '@/db/simple-db'
import { assertValidWeights, calcLabourCharge, calcLoss } from '@/lib/simple-calc'
import { nowISO, uid } from '@/lib/utils'
import type { DailyEntry, PaymentMethod, RateMethod } from '@/types/simple'

export interface DailyEntryForm {
  farmerId: string
  entryDate: string
  greenKg: number
  dryKg: number
  bags?: number
  rate: number
  rateMethod: RateMethod
  amountPaid?: number
  paymentMethod?: PaymentMethod
  notes?: string
}

export async function listEntriesForFarmer(farmerId: string): Promise<DailyEntry[]> {
  return sdb.dailyEntries.where('farmerId').equals(farmerId).reverse().sortBy('entryDate')
}

export async function listEntriesInRange(
  farmerId: string,
  from: string,
  to: string,
): Promise<DailyEntry[]> {
  const all = await sdb.dailyEntries.where('farmerId').equals(farmerId).toArray()
  return all
    .filter((e) => e.entryDate >= from && e.entryDate <= to)
    .sort((a, b) => a.entryDate.localeCompare(b.entryDate))
}

export async function listEntriesByDateRange(from: string, to: string): Promise<DailyEntry[]> {
  const all = await sdb.dailyEntries.toArray()
  return all.filter((e) => e.entryDate >= from && e.entryDate <= to)
}

export async function getEntry(id: string) {
  return sdb.dailyEntries.get(id)
}

export async function createDailyEntry(data: DailyEntryForm): Promise<DailyEntry> {
  const farmer = await sdb.farmers.get(data.farmerId)
  if (!farmer) throw new Error('Farmer not found')
  assertValidWeights(data.greenKg, data.dryKg)
  if (data.rate < 0) throw new Error('Rate cannot be negative')

  const lossKg = calcLoss(data.greenKg, data.dryKg)
  const labourCharge = calcLabourCharge({
    method: data.rateMethod,
    rate: data.rate,
    greenKg: data.greenKg,
    dryKg: data.dryKg,
    bags: data.bags,
  })
  const amountPaid = Math.max(0, data.amountPaid ?? 0)
  const now = nowISO()
  const entry: DailyEntry = {
    id: uid(),
    farmerId: data.farmerId,
    entryDate: data.entryDate.slice(0, 10),
    greenKg: data.greenKg,
    dryKg: data.dryKg,
    lossKg,
    bags: data.bags,
    rate: data.rate,
    rateMethod: data.rateMethod,
    labourCharge,
    amountPaid,
    paymentMethod: data.paymentMethod,
    notes: data.notes?.trim(),
    createdAt: now,
    updatedAt: now,
  }
  await sdb.dailyEntries.add(entry)
  return entry
}

export async function updateDailyEntry(id: string, data: DailyEntryForm): Promise<DailyEntry> {
  const before = await sdb.dailyEntries.get(id)
  if (!before) throw new Error('Entry not found')
  if (before.billedBillId) {
    throw new Error('This entry is on a finalized bill. Cancel the bill before editing.')
  }
  assertValidWeights(data.greenKg, data.dryKg)
  const lossKg = calcLoss(data.greenKg, data.dryKg)
  const labourCharge = calcLabourCharge({
    method: data.rateMethod,
    rate: data.rate,
    greenKg: data.greenKg,
    dryKg: data.dryKg,
    bags: data.bags,
  })
  const updated: DailyEntry = {
    ...before,
    entryDate: data.entryDate.slice(0, 10),
    greenKg: data.greenKg,
    dryKg: data.dryKg,
    lossKg,
    bags: data.bags,
    rate: data.rate,
    rateMethod: data.rateMethod,
    labourCharge,
    amountPaid: Math.max(0, data.amountPaid ?? 0),
    paymentMethod: data.paymentMethod,
    notes: data.notes?.trim(),
    updatedAt: nowISO(),
  }
  await sdb.dailyEntries.put(updated)
  return updated
}

export async function deleteDailyEntry(id: string) {
  const before = await sdb.dailyEntries.get(id)
  if (!before) throw new Error('Entry not found')
  if (before.billedBillId) throw new Error('Cannot delete a billed entry. Cancel the bill first.')
  await sdb.dailyEntries.delete(id)
}
