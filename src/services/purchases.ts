import { db } from '@/db/database'
import { calcPaymentStatus, calcPurchaseNet, roundMoney } from '@/lib/calculations'
import { nowISO, uid } from '@/lib/utils'
import type { PurchaseForm } from '@/schemas'
import type { Purchase } from '@/types'
import { writeAudit } from './audit'
import { nextCode } from './ids'
import { applyStockMovementInTx } from './inventory'
import { addLedgerEntryInTx } from './ledger'
import { recordPayment } from './payments'

export async function listPurchases(farmerId?: string): Promise<Purchase[]> {
  if (farmerId) {
    return db.purchases.where('farmerId').equals(farmerId).reverse().sortBy('purchaseDate')
  }
  return db.purchases.orderBy('purchaseDate').reverse().toArray()
}

export async function getPurchase(id: string): Promise<Purchase | undefined> {
  return db.purchases.get(id)
}

export async function createPurchase(data: PurchaseForm): Promise<Purchase> {
  const farmer = await db.farmers.get(data.farmerId)
  if (!farmer) throw new Error('Farmer not found')

  const { grossAmount, netPayable } = calcPurchaseNet(
    data.quantityKg,
    data.ratePerKg,
    data.deductions ?? 0,
  )
  const paidAmount = roundMoney(data.paidAmount ?? 0)
  const purchaseCode = await nextCode('purchases', 'purchasePrefix')
  const now = nowISO()

  const purchase: Purchase = {
    id: uid(),
    purchaseCode,
    farmerId: data.farmerId,
    purchaseDate: data.purchaseDate,
    type: data.type,
    quantityKg: data.quantityKg,
    ratePerKg: data.ratePerKg,
    grossAmount,
    deductions: data.deductions ?? 0,
    netPayable,
    paidAmount: 0,
    paymentStatus: 'unpaid',
    notes: data.notes?.trim(),
    status: 'active',
    createdAt: now,
    updatedAt: now,
  }

  await db.transaction(
    'rw',
    db.purchases,
    db.inventory,
    db.inventoryMovements,
    db.farmerLedger,
    async () => {
      await db.purchases.add(purchase)

      try {
        await applyStockMovementInTx({
          owner: 'farmer',
          kind: data.type,
          farmerId: data.farmerId,
          deltaKg: -data.quantityKg,
          movementType: 'purchase',
          referenceType: 'purchase',
          referenceId: purchase.id,
          notes: `Sold to store ${purchaseCode}`,
          movementDate: data.purchaseDate,
        })
      } catch {
        // Farmer may not have tracked stock (direct purchase); continue with store inflow
      }

      await applyStockMovementInTx({
        owner: 'store',
        kind: data.type,
        deltaKg: data.quantityKg,
        movementType: 'purchase',
        referenceType: 'purchase',
        referenceId: purchase.id,
        notes: `Purchase ${purchaseCode} from ${farmer.fullName}`,
        movementDate: data.purchaseDate,
      })

      // Store owes farmer = debit? Actually purchase creates payable TO farmer = credit reduces farmer debt / increases what we owe
      // Convention: positive balance = farmer owes store. Purchase means store owes farmer → credit farmer ledger
      await addLedgerEntryInTx({
        farmerId: data.farmerId,
        entryType: 'credit',
        category: 'purchase',
        amount: netPayable,
        description: `Purchase ${purchaseCode} (${data.type} ${data.quantityKg} KG)`,
        referenceType: 'purchase',
        referenceId: purchase.id,
        entryDate: data.purchaseDate,
      })
    },
  )

  if (paidAmount > 0) {
    await recordPayment({
      farmerId: data.farmerId,
      paymentDate: data.purchaseDate,
      amount: paidAmount,
      method: 'cash',
      linkedPurchaseId: purchase.id,
      notes: `Payment against ${purchaseCode}`,
    })
  } else {
    await db.purchases.update(purchase.id, {
      paymentStatus: calcPaymentStatus(netPayable, 0),
    })
  }

  await writeAudit('purchase', purchase.id, 'create', undefined, purchase)
  return (await db.purchases.get(purchase.id))!
}

export async function cancelPurchase(id: string): Promise<Purchase> {
  const before = await db.purchases.get(id)
  if (!before) throw new Error('Purchase not found')
  if (before.status === 'cancelled') throw new Error('Already cancelled')

  const updated: Purchase = { ...before, status: 'cancelled', updatedAt: nowISO() }
  await db.transaction(
    'rw',
    db.purchases,
    db.inventory,
    db.inventoryMovements,
    db.farmerLedger,
    async () => {
      await db.purchases.put(updated)
      await applyStockMovementInTx({
        owner: 'store',
        kind: before.type,
        deltaKg: -before.quantityKg,
        movementType: 'adjustment',
        referenceType: 'purchase',
        referenceId: id,
        notes: `Cancelled ${before.purchaseCode}`,
      })
      await addLedgerEntryInTx({
        farmerId: before.farmerId,
        entryType: 'debit',
        category: 'adjustment',
        amount: before.netPayable,
        description: `Cancelled purchase ${before.purchaseCode}`,
        referenceType: 'purchase',
        referenceId: id,
      })
    },
  )
  await writeAudit('purchase', id, 'cancel', before, updated)
  return updated
}
