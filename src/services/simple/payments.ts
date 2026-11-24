import { sdb } from '@/db/simple-db'
import { nowISO, uid } from '@/lib/utils'
import type { PaymentMethod, SimplePayment } from '@/types/simple'
import { nextSimpleCode } from './ids'

export async function listPaymentsForFarmer(farmerId: string): Promise<SimplePayment[]> {
  return sdb.payments.where('farmerId').equals(farmerId).reverse().sortBy('paymentDate')
}

export async function recordPayment(params: {
  farmerId: string
  paymentDate: string
  amount: number
  method: PaymentMethod
  linkedBillId?: string
  notes?: string
}): Promise<SimplePayment> {
  if (params.amount <= 0) throw new Error('Amount must be greater than zero')
  const paymentCode = await nextSimpleCode('payments', 'paymentPrefix')
  const payment: SimplePayment = {
    id: uid(),
    paymentCode,
    farmerId: params.farmerId,
    paymentDate: params.paymentDate.slice(0, 10),
    amount: params.amount,
    method: params.method,
    linkedBillId: params.linkedBillId,
    notes: params.notes?.trim(),
    createdAt: nowISO(),
  }
  await sdb.transaction('rw', sdb.payments, sdb.bills, async () => {
    await sdb.payments.add(payment)
    if (params.linkedBillId) {
      const bill = await sdb.bills.get(params.linkedBillId)
      if (bill && bill.status === 'finalized') {
        const amountPaidOnBill = Math.round((bill.amountPaidOnBill + params.amount) * 100) / 100
        const finalBalance = Math.round((bill.currentBillAmount - amountPaidOnBill) * 100) / 100
        let paymentStatus: typeof bill.paymentStatus = 'unpaid'
        if (amountPaidOnBill <= 0) paymentStatus = 'unpaid'
        else if (amountPaidOnBill < bill.currentBillAmount) paymentStatus = 'partial'
        else if (amountPaidOnBill === bill.currentBillAmount) paymentStatus = 'paid'
        else paymentStatus = 'overpaid'
        await sdb.bills.update(bill.id, {
          amountPaidOnBill,
          finalBalance,
          paymentStatus,
          updatedAt: nowISO(),
        })
      }
    }
  })
  return payment
}
