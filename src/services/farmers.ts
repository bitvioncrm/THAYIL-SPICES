import { db } from '@/db/database'
import { nowISO, uid } from '@/lib/utils'
import type { Farmer } from '@/types'
import type { FarmerForm } from '@/schemas'
import { nextCode } from './ids'
import { writeAudit } from './audit'
import { getFarmerBalance } from './ledger'
import { getFarmerStock } from './inventory'

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '')
}

export async function listFarmers(search?: string): Promise<Farmer[]> {
  let rows = await db.farmers.orderBy('fullName').toArray()
  if (search?.trim()) {
    const q = search.trim().toLowerCase()
    const qDigits = normalizePhone(search)
    rows = rows.filter(
      (f) =>
        f.fullName.toLowerCase().includes(q) ||
        f.farmerCode.toLowerCase().includes(q) ||
        normalizePhone(f.phone).includes(qDigits) ||
        (f.whatsapp && normalizePhone(f.whatsapp).includes(qDigits)),
    )
  }
  return rows
}

export async function getFarmer(id: string): Promise<Farmer | undefined> {
  return db.farmers.get(id)
}

export async function createFarmer(data: FarmerForm): Promise<Farmer> {
  const phoneNorm = normalizePhone(data.phone)
  const existing = await db.farmers.toArray()
  const dup = existing.find((f) => normalizePhone(f.phone) === phoneNorm)
  if (dup) {
    throw new Error(`Farmer with phone ${data.phone} already exists (${dup.farmerCode})`)
  }

  const farmerCode = await nextCode('farmers', 'farmerPrefix')
  const now = nowISO()
  const farmer: Farmer = {
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
    createdAt: now,
    updatedAt: now,
  }
  await db.farmers.add(farmer)
  await writeAudit('farmer', farmer.id, 'create', undefined, farmer)
  return farmer
}

export async function updateFarmer(id: string, data: FarmerForm): Promise<Farmer> {
  const before = await db.farmers.get(id)
  if (!before) throw new Error('Farmer not found')

  const phoneNorm = normalizePhone(data.phone)
  const existing = await db.farmers.toArray()
  const dup = existing.find((f) => f.id !== id && normalizePhone(f.phone) === phoneNorm)
  if (dup) {
    throw new Error(`Phone ${data.phone} already used by ${dup.farmerCode}`)
  }

  const updated: Farmer = {
    ...before,
    fullName: data.fullName.trim(),
    phone: data.phone.trim(),
    whatsapp: data.whatsapp?.trim() || data.phone.trim(),
    address: data.address?.trim(),
    plantationName: data.plantationName?.trim(),
    plantationLocation: data.plantationLocation?.trim(),
    notes: data.notes?.trim(),
    status: data.status ?? before.status,
    updatedAt: nowISO(),
  }
  await db.farmers.put(updated)
  await writeAudit('farmer', id, 'update', before, updated)
  return updated
}

export async function getFarmerStats(farmerId: string) {
  const [receivings, batches, invoices, purchases, payments, balance, stock] = await Promise.all([
    db.receivingRecords.where('farmerId').equals(farmerId).toArray(),
    db.dryingBatches.where('farmerId').equals(farmerId).toArray(),
    db.invoices.where('farmerId').equals(farmerId).toArray(),
    db.purchases.where('farmerId').equals(farmerId).toArray(),
    db.payments.where('farmerId').equals(farmerId).toArray(),
    getFarmerBalance(farmerId),
    getFarmerStock(farmerId),
  ])

  const completed = batches.filter((b) => b.status === 'completed' || b.status === 'delivered')
  const activeInvoices = invoices.filter((i) => i.status === 'finalized')
  const activePurchases = purchases.filter((p) => p.status === 'active')

  return {
    lifetimeGreenKg: receivings.reduce((s, r) => s + r.greenWeightKg, 0),
    lifetimeDryKg: completed.reduce((s, b) => s + (b.dryOutputKg ?? 0), 0),
    totalDryingLoss: completed.reduce((s, b) => s + (b.dryingLossKg ?? 0), 0),
    totalDryingCharges: completed.reduce((s, b) => s + (b.dryingCharges ?? 0), 0),
    totalPurchaseAmount: activePurchases.reduce((s, p) => s + p.netPayable, 0),
    totalPayments: payments.reduce((s, p) => s + p.amount, 0),
    outstandingBalance: balance,
    invoiceCount: activeInvoices.length,
    stock,
    receivings,
    batches,
    invoices,
    purchases,
    payments,
  }
}
