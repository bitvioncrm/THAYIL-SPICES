import { db } from '@/db/database'
import { roundKg, roundMoney } from '@/lib/calculations'
import { nowISO, uid } from '@/lib/utils'
import type { InvoiceForm } from '@/schemas'
import type { Invoice, InvoiceItem } from '@/types'
import { writeAudit } from './audit'
import { nextCode } from './ids'
import { getFarmerBalance, addLedgerEntryInTx } from './ledger'
import { notify } from './notifications'

export async function listInvoices(farmerId?: string): Promise<Invoice[]> {
  if (farmerId) {
    return db.invoices.where('farmerId').equals(farmerId).reverse().sortBy('invoiceDate')
  }
  return db.invoices.orderBy('invoiceDate').reverse().toArray()
}

export async function getInvoice(id: string): Promise<Invoice | undefined> {
  return db.invoices.get(id)
}

export async function getInvoiceItems(invoiceId: string): Promise<InvoiceItem[]> {
  return db.invoiceItems.where('invoiceId').equals(invoiceId).toArray()
}

export async function createInvoice(data: InvoiceForm, finalize = true): Promise<Invoice> {
  const farmer = await db.farmers.get(data.farmerId)
  if (!farmer) throw new Error('Farmer not found')

  const batches = await db.dryingBatches.bulkGet(data.batchIds)
  const validBatches = batches.filter(
    (b): b is NonNullable<typeof b> =>
      !!b &&
      b.farmerId === data.farmerId &&
      (b.status === 'completed' || b.status === 'delivered'),
  )
  if (validBatches.length !== data.batchIds.length) {
    throw new Error('Select only completed batches belonging to this farmer')
  }

  // Prevent double-billing same batch on active invoices
  const existing = await db.invoices
    .where('farmerId')
    .equals(data.farmerId)
    .filter((i) => i.status === 'finalized' || i.status === 'draft')
    .toArray()
  for (const inv of existing) {
    for (const bid of data.batchIds) {
      if (inv.batchIds.includes(bid)) {
        throw new Error(`Batch already included in invoice ${inv.invoiceCode}`)
      }
    }
  }

  const greenInputKg = roundKg(validBatches.reduce((s, b) => s + b.greenInputKg, 0))
  const dryOutputKg = roundKg(validBatches.reduce((s, b) => s + (b.dryOutputKg ?? 0), 0))
  const dryingLossKg = roundKg(greenInputKg - dryOutputKg)
  const dryingCharges = roundMoney(greenInputKg * data.dryingRate)
  const additionalCharges = roundMoney(data.additionalCharges ?? 0)
  const purchaseAmount = roundMoney(data.purchaseAmount ?? 0)
  const previousBalance = roundMoney(await getFarmerBalance(data.farmerId))
  // Invoice total for drying+additional+purchase; previous balance shown separately
  const totalAmount = roundMoney(dryingCharges + additionalCharges + purchaseAmount + Math.max(0, previousBalance))
  const initialPaid = roundMoney(data.paidAmount ?? 0)

  const invoiceCode = await nextCode('invoices', 'invoicePrefix')
  const now = nowISO()
  const invoice: Invoice = {
    id: uid(),
    invoiceCode,
    farmerId: data.farmerId,
    invoiceDate: data.invoiceDate,
    greenInputKg,
    dryOutputKg,
    dryingLossKg,
    dryingRate: data.dryingRate,
    dryingCharges,
    additionalCharges,
    purchaseAmount,
    previousBalance,
    totalAmount,
    paidAmount: 0,
    remainingBalance: totalAmount,
    paymentStatus: 'unpaid',
    status: finalize ? 'finalized' : 'draft',
    batchIds: data.batchIds,
    notes: data.notes,
    finalizedAt: finalize ? now : undefined,
    createdAt: now,
    updatedAt: now,
  }

  const items: InvoiceItem[] = [
    {
      id: uid(),
      invoiceId: invoice.id,
      description: `Drying charges (${greenInputKg} KG × ${data.dryingRate})`,
      quantity: greenInputKg,
      rate: data.dryingRate,
      amount: dryingCharges,
      itemType: 'drying',
    },
  ]
  if (additionalCharges > 0) {
    items.push({
      id: uid(),
      invoiceId: invoice.id,
      description: 'Additional charges',
      quantity: 1,
      rate: additionalCharges,
      amount: additionalCharges,
      itemType: 'additional',
    })
  }
  if (purchaseAmount > 0) {
    items.push({
      id: uid(),
      invoiceId: invoice.id,
      description: 'Purchase amount',
      quantity: 1,
      rate: purchaseAmount,
      amount: purchaseAmount,
      itemType: 'purchase',
    })
  }

  await db.transaction('rw', db.invoices, db.invoiceItems, db.farmerLedger, db.payments, async () => {
    await db.invoices.add(invoice)
    await db.invoiceItems.bulkAdd(items)

    // Drying charges already posted to ledger on batch completion.
    // Only post additional charges / purchase on invoice if new.
    if (additionalCharges > 0) {
      await addLedgerEntryInTx({
        farmerId: data.farmerId,
        entryType: 'debit',
        category: 'adjustment',
        amount: additionalCharges,
        description: `Additional charges on ${invoiceCode}`,
        referenceType: 'invoice',
        referenceId: invoice.id,
        entryDate: data.invoiceDate,
      })
    }
  })

  if (initialPaid > 0) {
    const { recordPayment } = await import('./payments')
    await recordPayment({
      farmerId: data.farmerId,
      paymentDate: data.invoiceDate,
      amount: initialPaid,
      method: 'cash',
      linkedInvoiceId: invoice.id,
      notes: `Payment against ${invoiceCode}`,
    })
  }

  const saved = (await db.invoices.get(invoice.id))!
  await writeAudit('invoice', invoice.id, finalize ? 'finalize' : 'create', undefined, saved)
  if (saved.remainingBalance > 0) {
    await notify({
      type: 'unpaid_invoice',
      title: 'Invoice outstanding',
      message: `${invoiceCode}: ${saved.remainingBalance} remaining for ${farmer.fullName}`,
      referenceType: 'invoice',
      referenceId: invoice.id,
    })
  }
  return saved
}

export async function cancelInvoice(id: string, note?: string): Promise<Invoice> {
  const before = await db.invoices.get(id)
  if (!before) throw new Error('Invoice not found')
  if (before.status === 'cancelled') throw new Error('Already cancelled')
  const updated: Invoice = {
    ...before,
    status: 'cancelled',
    cancelledAt: nowISO(),
    updatedAt: nowISO(),
  }
  await db.invoices.put(updated)
  await writeAudit('invoice', id, 'cancel', before, updated, note)
  return updated
}
