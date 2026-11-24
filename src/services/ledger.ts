import { db } from '@/db/database'
import { roundMoney } from '@/lib/calculations'
import { nowISO, uid } from '@/lib/utils'
import type { FarmerLedgerEntry } from '@/types'

export async function getFarmerBalance(farmerId: string): Promise<number> {
  const last = await db.farmerLedger.where('farmerId').equals(farmerId).sortBy('createdAt')
  if (!last.length) return 0
  return last[last.length - 1].balanceAfter
}

export async function addLedgerEntryInTx(params: {
  farmerId: string
  entryType: 'debit' | 'credit'
  category: FarmerLedgerEntry['category']
  amount: number
  description: string
  referenceType?: string
  referenceId?: string
  entryDate?: string
}): Promise<FarmerLedgerEntry> {
  const amount = roundMoney(params.amount)
  if (amount <= 0) throw new Error('Ledger amount must be positive')

  const current = await getFarmerBalance(params.farmerId)
  const signed = params.entryType === 'debit' ? amount : -amount
  const balanceAfter = roundMoney(current + signed)
  const entry: FarmerLedgerEntry = {
    id: uid(),
    farmerId: params.farmerId,
    entryDate: params.entryDate ?? nowISO(),
    entryType: params.entryType,
    category: params.category,
    amount,
    referenceType: params.referenceType,
    referenceId: params.referenceId,
    description: params.description,
    balanceAfter,
    createdAt: nowISO(),
  }
  await db.farmerLedger.add(entry)
  return entry
}

export async function addLedgerEntry(
  params: Parameters<typeof addLedgerEntryInTx>[0],
): Promise<FarmerLedgerEntry> {
  return db.transaction('rw', db.farmerLedger, () => addLedgerEntryInTx(params))
}

export async function getFarmerLedger(farmerId: string): Promise<FarmerLedgerEntry[]> {
  return db.farmerLedger.where('farmerId').equals(farmerId).sortBy('createdAt')
}
