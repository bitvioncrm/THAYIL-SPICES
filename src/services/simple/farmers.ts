import { sdb } from '@/db/simple-db'
import { nowISO, uid } from '@/lib/utils'
import type { RateMethod, SimpleFarmer } from '@/types/simple'
import { nextSimpleCode, getSimpleSettings } from './ids'
import { listEntriesForFarmer } from './entries'
import { listPaymentsForFarmer } from './payments'

function normPhone(p: string) {
  return p.replace(/\D/g, '')
}

export interface FarmerFormData {
  fullName: string
  phone: string
  whatsapp?: string
  address?: string
  plantationName?: string
  plantationLocation?: string
  notes?: string
  status?: 'active' | 'inactive'
  defaultRate: number
  rateMethod: RateMethod
}

export async function listFarmers(search?: string): Promise<SimpleFarmer[]> {
  let rows = await sdb.farmers.orderBy('fullName').toArray()
  if (search?.trim()) {
    const q = search.trim().toLowerCase()
    const d = normPhone(search)
    rows = rows.filter(
      (f) =>
        f.fullName.toLowerCase().includes(q) ||
        f.farmerCode.toLowerCase().includes(q) ||
        normPhone(f.phone).includes(d),
    )
  }
  return rows
}

export async function getFarmer(id: string) {
  return sdb.farmers.get(id)
}

export async function createFarmer(data: FarmerFormData): Promise<SimpleFarmer> {
  const existing = await sdb.farmers.toArray()
  if (existing.some((f) => normPhone(f.phone) === normPhone(data.phone))) {
    throw new Error('A farmer with this phone number already exists')
  }
  const settings = await getSimpleSettings()
  const farmerCode = await nextSimpleCode('farmers', 'farmerPrefix')
  const now = nowISO()
  const farmer: SimpleFarmer = {
    id: uid(),
    farmerCode,
    fullName: data.fullName.trim(),
    phone: data.phone.trim(),
    whatsapp: data.whatsapp?.trim() || data.phone.trim(),
    address: data.address?.trim(),
    plantationName: data.plantationName?.trim(),
    plantationLocation: data.plantationLocation?.trim(),
    registrationDate: now,
    notes: data.notes?.trim(),
    status: data.status ?? 'active',
    defaultRate: data.defaultRate ?? settings.defaultRate,
    rateMethod: data.rateMethod ?? settings.defaultRateMethod,
    createdAt: now,
    updatedAt: now,
  }
  await sdb.farmers.add(farmer)
  return farmer
}

export async function updateFarmer(id: string, data: FarmerFormData): Promise<SimpleFarmer> {
  const before = await sdb.farmers.get(id)
  if (!before) throw new Error('Farmer not found')
  const dup = (await sdb.farmers.toArray()).find(
    (f) => f.id !== id && normPhone(f.phone) === normPhone(data.phone),
  )
  if (dup) throw new Error('Phone already used by another farmer')
  const updated: SimpleFarmer = {
    ...before,
    fullName: data.fullName.trim(),
    phone: data.phone.trim(),
    whatsapp: data.whatsapp?.trim() || data.phone.trim(),
    address: data.address?.trim(),
    plantationName: data.plantationName?.trim(),
    plantationLocation: data.plantationLocation?.trim(),
    notes: data.notes?.trim(),
    status: data.status ?? before.status,
    defaultRate: data.defaultRate,
    rateMethod: data.rateMethod,
    updatedAt: nowISO(),
  }
  await sdb.farmers.put(updated)
  return updated
}

export type FarmerTotals = {
  totalGreenKg: number
  totalDryKg: number
  totalLossKg: number
  totalCharges: number
  totalPaid: number
  outstanding: number
  entries: Awaited<ReturnType<typeof listEntriesForFarmer>>
  payments: Awaited<ReturnType<typeof listPaymentsForFarmer>>
}

function totalsFromRows(
  entries: FarmerTotals['entries'],
  payments: FarmerTotals['payments'],
): FarmerTotals {
  const totalGreenKg = entries.reduce((s, e) => s + e.greenKg, 0)
  const totalDryKg = entries.reduce((s, e) => s + e.dryKg, 0)
  const totalLossKg = entries.reduce((s, e) => s + e.lossKg, 0)
  const totalCharges = entries.reduce((s, e) => s + e.labourCharge, 0)
  const paidOnEntries = entries.reduce((s, e) => s + e.amountPaid, 0)
  const paidSeparate = payments.reduce((s, p) => s + p.amount, 0)
  const totalPaid = paidOnEntries + paidSeparate
  const outstanding = Math.round((totalCharges - totalPaid) * 100) / 100
  return {
    totalGreenKg,
    totalDryKg,
    totalLossKg,
    totalCharges,
    totalPaid,
    outstanding,
    entries,
    payments,
  }
}

export async function getFarmerTotals(farmerId: string): Promise<FarmerTotals> {
  const [entries, payments] = await Promise.all([
    listEntriesForFarmer(farmerId),
    listPaymentsForFarmer(farmerId),
  ])
  return totalsFromRows(entries, payments)
}

/** One IndexedDB pass for all farmers — used by list pages & overview. */
export async function getAllFarmerTotalsMap(): Promise<Map<string, FarmerTotals>> {
  const [entries, payments] = await Promise.all([
    sdb.dailyEntries.toArray(),
    sdb.payments.toArray(),
  ])
  const entriesBy = new Map<string, typeof entries>()
  const paymentsBy = new Map<string, typeof payments>()
  for (const e of entries) {
    const list = entriesBy.get(e.farmerId)
    if (list) list.push(e)
    else entriesBy.set(e.farmerId, [e])
  }
  for (const p of payments) {
    const list = paymentsBy.get(p.farmerId)
    if (list) list.push(p)
    else paymentsBy.set(p.farmerId, [p])
  }
  const map = new Map<string, FarmerTotals>()
  const ids = new Set([...entriesBy.keys(), ...paymentsBy.keys()])
  for (const id of ids) {
    map.set(id, totalsFromRows(entriesBy.get(id) ?? [], paymentsBy.get(id) ?? []))
  }
  return map
}

export function emptyFarmerTotals(): FarmerTotals {
  return totalsFromRows([], [])
}
