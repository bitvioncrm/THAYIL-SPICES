import { db } from '@/db/database'
import { calcPaymentStatus, calcRemaining, roundMoney } from '@/lib/calculations'
import { nowISO, uid } from '@/lib/utils'
import type { PaymentForm } from '@/schemas'
import type { Payment } from '@/types'
import { writeAudit } from './audit'
import { nextCode } from './ids'
import { addLedgerEntryInTx } from './ledger'

export async function listPayments(farmerId?: string): Promise<Payment[]> {
  if (farmerId) {
    return db.payments.where('farmerId').equals(farmerId).reverse().sortBy('paymentDate')
  }
  return db.payments.orderBy('paymentDate').reverse().toArray()
}

export async function getPayment(id: string): Promise<Payment | undefined> {
  return db.payments.get(id)
}

export async function recordPayment(data: PaymentForm): Promise<Payment> {
  const farmer = await db.farmers.get(data.farmerId)
  if (!farmer) throw new Error('Farmer not found')
  const amount = roundMoney(data.amount)
  if (amount <= 0) throw new Error('Payment amount must be greater than zero')

  const paymentCode = await nextCode('payments', 'paymentPrefix')
  const now = nowISO()
  const payment: Payment = {
    id: uid(),
    paymentCode,
    farmerId: data.farmerId,
    paymentDate: data.paymentDate,
    amount,
    method: data.method,
    transactionRef: data.transactionRef?.trim(),
    linkedInvoiceId: data.linkedInvoiceId || undefined,
    linkedPurchaseId: data.linkedPurchaseId || undefined,
    notes: data.notes?.trim(),
    createdAt: now,
    updatedAt: now,
  }

  await db.transaction(
    'rw',
    db.payments,
    db.farmerLedger,
    db.invoices,
    db.purchases,
    async () => {
      await db.payments.add(payment)
      await addLedgerEntryInTx({
        farmerId: data.farmerId,
        entryType: 'credit',
        category: data.linkedInvoiceId || data.linkedPurchaseId ? 'payment' : 'advance',
        amount,
        description: `Payment ${paymentCode} (${data.method})`,
        referenceType: 'payment',
        referenceId: payment.id,
        entryDate: data.paymentDate,
      })

      if (data.linkedInvoiceId) {
        const inv = await db.invoices.get(data.linkedInvoiceId)
        if (inv && inv.status !== 'cancelled') {
          const paidAmount = roundMoney(inv.paidAmount + amount)
          const remainingBalance = calcRemaining(inv.totalAmount, paidAmount)
          await db.invoices.update(inv.id, {
            paidAmount,
            remainingBalance,
            paymentStatus: calcPaymentStatus(inv.totalAmount, paidAmount),
            updatedAt: nowISO(),
          })
        }
      }

      if (data.linkedPurchaseId) {
        const pur = await db.purchases.get(data.linkedPurchaseId)
        if (pur && pur.status !== 'cancelled') {
          const paidAmount = roundMoney(pur.paidAmount + amount)
          await db.purchases.update(pur.id, {
            paidAmount,
            paymentStatus: calcPaymentStatus(pur.netPayable, paidAmount),
            updatedAt: nowISO(),
          })
        }
      }
    },
  )

  await writeAudit('payment', payment.id, 'create', undefined, payment)
  return payment
}
