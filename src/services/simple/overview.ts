import { sdb } from '@/db/simple-db'
import { getDateRange, type DatePreset } from '@/lib/date-ranges'
import { roundKg, roundMoney } from '@/lib/utils'
import { getFarmerTotals, listFarmers } from './farmers'
import { listBills } from './billing'

/** Convert ISO range to YYYY-MM-DD in local/Kolkata-ish for entryDate compare */
function toDay(iso: string): string {
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
}

export async function getOverview(preset: DatePreset, customFrom?: string, customTo?: string) {
  const range = getDateRange(preset, customFrom, customTo)
  const fromDay = toDay(range.from)
  const toDayStr = toDay(range.to)

  const [farmers, entries, bills, payments] = await Promise.all([
    listFarmers(),
    sdb.dailyEntries.toArray(),
    listBills(),
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

  let outstanding = 0
  const pending: { farmerId: string; name: string; code: string; balance: number }[] = []
  for (const f of farmers) {
    const t = await getFarmerTotals(f.id)
    if (t.outstanding > 0.009) {
      outstanding += t.outstanding
      pending.push({
        farmerId: f.id,
        name: f.fullName,
        code: f.farmerCode,
        balance: t.outstanding,
      })
    }
  }
  outstanding = roundMoney(outstanding)
  pending.sort((a, b) => b.balance - a.balance)

  // Charts
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

  const recentEntries = [...entries]
    .sort((a, b) => b.entryDate.localeCompare(a.entryDate) || b.createdAt.localeCompare(a.createdAt))
    .slice(0, 8)
  const farmerMap = new Map(farmers.map((f) => [f.id, f]))

  return {
    range: { from: range.from, to: range.to, fromDay, toDay: toDayStr, preset },
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
    recentBills: bills.filter((b) => b.status === 'finalized').slice(0, 6),
    pendingBalances: pending.slice(0, 8),
    periodActivity: inPeriod
      .sort((a, b) => b.entryDate.localeCompare(a.entryDate))
      .slice(0, 10)
      .map((e) => ({ ...e, farmer: farmerMap.get(e.farmerId) })),
  }
}
