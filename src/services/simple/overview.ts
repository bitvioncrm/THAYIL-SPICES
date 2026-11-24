import { sdb } from '@/db/simple-db'
import { getYmdRange, type DatePreset } from '@/lib/date-presets'
import { readCached, writeCached } from '@/lib/data-cache'
import { roundKg, roundMoney } from '@/lib/utils'
import { listFarmers } from './farmers'
import type { DailyEntry, SimpleFarmer, SimplePayment } from '@/types/simple'

export type OverviewData = Awaited<ReturnType<typeof computeOverview>>

function outstandingFromRows(
  farmers: SimpleFarmer[],
  entries: DailyEntry[],
  payments: SimplePayment[],
) {
  const charge = new Map<string, number>()
  const paid = new Map<string, number>()
  for (const e of entries) {
    charge.set(e.farmerId, (charge.get(e.farmerId) ?? 0) + e.labourCharge)
    paid.set(e.farmerId, (paid.get(e.farmerId) ?? 0) + e.amountPaid)
  }
  for (const p of payments) {
    paid.set(p.farmerId, (paid.get(p.farmerId) ?? 0) + p.amount)
  }

  let outstanding = 0
  const pending: { farmerId: string; name: string; code: string; balance: number }[] = []
  for (const f of farmers) {
    const bal = roundMoney((charge.get(f.id) ?? 0) - (paid.get(f.id) ?? 0))
    if (bal > 0.009) {
      outstanding += bal
      pending.push({
        farmerId: f.id,
        name: f.fullName,
        code: f.farmerCode,
        balance: bal,
      })
    }
  }
  pending.sort((a, b) => b.balance - a.balance)
  return { outstanding: roundMoney(outstanding), pending }
}

async function computeOverview(preset: DatePreset, customFrom?: string, customTo?: string) {
  const { from: fromDay, to: toDayStr } = getYmdRange(preset, customFrom, customTo)

  const [farmers, entries, bills, payments] = await Promise.all([
    listFarmers(),
    sdb.dailyEntries.toArray(),
    sdb.bills.toArray(),
    sdb.payments.toArray(),
  ])

  const inPeriod = entries.filter((e) => e.entryDate >= fromDay && e.entryDate <= toDayStr)
  const greenKg = roundKg(inPeriod.reduce((s, e) => s + e.greenKg, 0))
  const dryKg = roundKg(inPeriod.reduce((s, e) => s + e.dryKg, 0))
  const lossKg = roundKg(inPeriod.reduce((s, e) => s + e.lossKg, 0))
  const labourCharges = roundMoney(inPeriod.reduce((s, e) => s + e.labourCharge, 0))
  const paidOnEntries = roundMoney(inPeriod.reduce((s, e) => s + e.amountPaid, 0))

  const billsInPeriod = bills.filter(
    (b) => b.status === 'finalized' && b.billDate >= fromDay && b.billDate <= toDayStr,
  )
  const totalBilling = roundMoney(billsInPeriod.reduce((s, b) => s + b.currentBillAmount, 0))

  const paymentsInPeriod = payments.filter(
    (p) => p.paymentDate >= fromDay && p.paymentDate <= toDayStr,
  )
  const amountReceived = roundMoney(
    paidOnEntries + paymentsInPeriod.reduce((s, p) => s + p.amount, 0),
  )

  const { outstanding, pending } = outstandingFromRows(farmers, entries, payments)

  const byDay = new Map<string, { green: number; dry: number; loss: number; charge: number }>()
  for (const e of inPeriod) {
    const cur = byDay.get(e.entryDate) ?? { green: 0, dry: 0, loss: 0, charge: 0 }
    cur.green += e.greenKg
    cur.dry += e.dryKg
    cur.loss += e.lossKg
    cur.charge += e.labourCharge
    byDay.set(e.entryDate, cur)
  }
  const dailyChart = [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({
      date,
      green: roundKg(v.green),
      dry: roundKg(v.dry),
      loss: roundKg(v.loss),
      charge: roundMoney(v.charge),
    }))

  const byMonth = new Map<string, { green: number; dry: number }>()
  for (const e of entries) {
    const m = e.entryDate.slice(0, 7)
    const cur = byMonth.get(m) ?? { green: 0, dry: 0 }
    cur.green += e.greenKg
    cur.dry += e.dryKg
    byMonth.set(m, cur)
  }
  const monthlyChart = [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([month, v]) => ({
      month,
      green: roundKg(v.green),
      dry: roundKg(v.dry),
    }))

  const recentEntries = entries
    .slice()
    .sort((a, b) => b.entryDate.localeCompare(a.entryDate) || b.createdAt.localeCompare(a.createdAt))
    .slice(0, 8)
  const farmerMap = new Map(farmers.map((f) => [f.id, f]))

  return {
    range: { from: fromDay, to: toDayStr, fromDay, toDay: toDayStr, preset },
    kpis: {
      totalFarmers: farmers.length,
      greenKg,
      dryKg,
      lossKg,
      labourCharges,
      totalBilling,
      amountReceived,
      outstanding,
    },
    dailyChart,
    monthlyChart,
    recentEntries: recentEntries.map((e) => ({
      ...e,
      farmer: farmerMap.get(e.farmerId),
    })),
    recentBills: bills
      .filter((b) => b.status === 'finalized')
      .sort((a, b) => b.billDate.localeCompare(a.billDate) || b.createdAt.localeCompare(a.createdAt))
      .slice(0, 6),
    pendingBalances: pending.slice(0, 8),
    periodActivity: inPeriod
      .slice()
      .sort((a, b) => b.entryDate.localeCompare(a.entryDate))
      .slice(0, 10)
      .map((e) => ({ ...e, farmer: farmerMap.get(e.farmerId) })),
  }
}

export async function getOverview(
  preset: DatePreset,
  customFrom?: string,
  customTo?: string,
) {
  const key = `${preset}|${customFrom ?? ''}|${customTo ?? ''}`
  const hit = readCached<OverviewData>('overview', key)
  if (hit) return hit
  const data = await computeOverview(preset, customFrom, customTo)
  writeCached('overview', key, data)
  return data
}
