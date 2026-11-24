import { sdb } from '@/db/simple-db'
import { bumpDataCache } from '@/lib/data-cache'
import { roundKg, roundMoney, nowISO, uid } from '@/lib/utils'
import type { Bill, BillPeriodType, DailyEntry } from '@/types/simple'
import { listEntriesInRange } from './entries'
import { getFarmerTotals } from './farmers'
import { nextSimpleCode } from './ids'
function endOfMonth(ym: string) {
  const [y, m] = ym.split('-').map(Number)
  const last = new Date(y, m, 0).getDate()
  return `${ym}-${String(last).padStart(2, '0')}`
}

export function resolvePeriod(
  type: BillPeriodType,
  anchor: string,
  customFrom?: string,
  customTo?: string,
): { from: string; to: string } {
  const d = anchor.slice(0, 10)
  switch (type) {
    case 'daily':
      return { from: d, to: d }
    case 'weekly': {
      const date = new Date(d + 'T12:00:00')
      const day = (date.getDay() + 6) % 7 // Mon=0
      const start = new Date(date)
      start.setDate(date.getDate() - day)
      const end = new Date(start)
      end.setDate(start.getDate() + 6)
      return {
        from: start.toISOString().slice(0, 10),
        to: end.toISOString().slice(0, 10),
      }
    }
    case 'monthly': {
      const ym = d.slice(0, 7)
      return { from: `${ym}-01`, to: endOfMonth(ym) }
    }
    case 'yearly': {
      const y = d.slice(0, 4)
      return { from: `${y}-01-01`, to: `${y}-12-31` }
    }
    case 'custom':
      return {
        from: (customFrom ?? d).slice(0, 10),
        to: (customTo ?? d).slice(0, 10),
      }
  }
}

export async function previewBill(params: {
  farmerId: string
  periodType: BillPeriodType
  anchorDate: string
  customFrom?: string
  customTo?: string
}) {
  const { from, to } = resolvePeriod(
    params.periodType,
    params.anchorDate,
    params.customFrom,
    params.customTo,
  )
  const [entries, totals] = await Promise.all([
    listEntriesInRange(params.farmerId, from, to),
    getFarmerTotals(params.farmerId),
  ])
  const unbilled = entries.filter((e) => !e.billedBillId)
  const billedElsewhere = entries.filter((e) => !!e.billedBillId)

  const totalGreenKg = roundKg(unbilled.reduce((s, e) => s + e.greenKg, 0))
  const totalDryKg = roundKg(unbilled.reduce((s, e) => s + e.dryKg, 0))
  const totalLossKg = roundKg(unbilled.reduce((s, e) => s + e.lossKg, 0))
  const totalCharges = roundMoney(unbilled.reduce((s, e) => s + e.labourCharge, 0))
  const paidOnEntries = roundMoney(unbilled.reduce((s, e) => s + e.amountPaid, 0))

  // Previous balance = outstanding before this period's unbilled charges
  const periodNet = roundMoney(totalCharges - paidOnEntries)
  const previousBalance = roundMoney(totals.outstanding - periodNet)

  const paymentsInPeriod = roundMoney(
    totals.payments
      .filter((p) => p.paymentDate >= from && p.paymentDate <= to && !p.linkedBillId)
      .reduce((s, p) => s + p.amount, 0),
  )

  const currentBillAmount = roundMoney(Math.max(0, previousBalance) + totalCharges - paidOnEntries - paymentsInPeriod)

  return {
    from,
    to,
    entries: unbilled,
    skippedBilled: billedElsewhere,
    totalGreenKg,
    totalDryKg,
    totalLossKg,
    totalCharges,
    paidOnEntries,
    paymentsInPeriod,
    previousBalance: Math.max(0, previousBalance),
    currentBillAmount,
  }
}

export async function finalizeBill(params: {
  farmerId: string
  periodType: BillPeriodType
  anchorDate: string
  customFrom?: string
  customTo?: string
  amountPaid?: number
  notes?: string
}): Promise<Bill> {
  const preview = await previewBill(params)
  if (preview.entries.length === 0) {
    throw new Error('No unbilled daily entries in this period')
  }

  const billCode = await nextSimpleCode('bills', 'billPrefix')
  const now = nowISO()
  const currentBillAmount = preview.currentBillAmount

  const bill: Bill = {
    id: uid(),
    billCode,
    farmerId: params.farmerId,
    periodType: params.periodType,
    periodFrom: preview.from,
    periodTo: preview.to,
    billDate: now.slice(0, 10),
    totalGreenKg: preview.totalGreenKg,
    totalDryKg: preview.totalDryKg,
    totalLossKg: preview.totalLossKg,
    totalCharges: preview.totalCharges,
    previousBalance: preview.previousBalance,
    paymentsInPeriod: preview.paymentsInPeriod,
    amountPaidOnBill: 0,
    currentBillAmount,
    finalBalance: currentBillAmount,
    paymentStatus: currentBillAmount <= 0 ? 'paid' : 'unpaid',
    status: 'finalized',
    entryIds: preview.entries.map((e: DailyEntry) => e.id),
    notes: params.notes,
    finalizedAt: now,
    createdAt: now,
    updatedAt: now,
  }

  await sdb.transaction('rw', sdb.bills, sdb.dailyEntries, async () => {
    await sdb.bills.add(bill)
    for (const e of preview.entries) {
      await sdb.dailyEntries.update(e.id, { billedBillId: bill.id, updatedAt: now })
    }
  })

  const paid = roundMoney(params.amountPaid ?? 0)
  if (paid > 0) {
    const { recordPayment } = await import('./payments')
    await recordPayment({
      farmerId: params.farmerId,
      paymentDate: bill.billDate,
      amount: paid,
      method: 'cash',
      linkedBillId: bill.id,
      notes: `Payment on ${billCode}`,
    })
  } else {
    bumpDataCache()
  }

  return (await sdb.bills.get(bill.id))!
}

export async function cancelBill(id: string): Promise<Bill> {
  const bill = await sdb.bills.get(id)
  if (!bill) throw new Error('Bill not found')
  if (bill.status === 'cancelled') throw new Error('Already cancelled')
  const now = nowISO()
  await sdb.transaction('rw', sdb.bills, sdb.dailyEntries, async () => {
    await sdb.bills.update(id, {
      status: 'cancelled',
      cancelledAt: now,
      updatedAt: now,
    })
    for (const eid of bill.entryIds) {
      const entry = await sdb.dailyEntries.get(eid)
      if (entry?.billedBillId === id) {
        await sdb.dailyEntries.update(eid, { billedBillId: undefined, updatedAt: now })
      }
    }
  })
  bumpDataCache()
  return (await sdb.bills.get(id))!
}

export async function listBills(farmerId?: string): Promise<Bill[]> {
  const rows = farmerId
    ? await sdb.bills.where('farmerId').equals(farmerId).toArray()
    : await sdb.bills.toArray()
  return rows.sort((a, b) => b.billDate.localeCompare(a.billDate) || b.createdAt.localeCompare(a.createdAt))
}

export async function getBill(id: string) {
  return sdb.bills.get(id)
}
