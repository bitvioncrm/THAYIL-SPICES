import { db } from '@/db/database'
import { inRange, type DatePreset, getDateRange } from '@/lib/date-ranges'
import { roundKg, roundMoney } from '@/lib/calculations'
import { getStoreStock, getTotalFarmerOwnedStock } from './inventory'

export async function getDashboardData(
  preset: DatePreset,
  customFrom?: string,
  customTo?: string,
) {
  const { from, to } = getDateRange(preset, customFrom, customTo)

  const [
    receivings,
    batches,
    invoices,
    purchases,
    payments,
    expenses,
    farmers,
    storeStock,
    farmerStock,
  ] = await Promise.all([
    db.receivingRecords.toArray(),
    db.dryingBatches.toArray(),
    db.invoices.toArray(),
    db.purchases.toArray(),
    db.payments.toArray(),
    db.expenses.toArray(),
    db.farmers.toArray(),
    getStoreStock(),
    getTotalFarmerOwnedStock(),
  ])

  const recvIn = receivings.filter((r) => inRange(r.receivedAt, from, to))
  const batchesIn = batches.filter((b) => {
    const d = b.completedAt ?? b.startAt ?? b.createdAt
    return inRange(d, from, to)
  })
  const completedIn = batchesIn.filter((b) => b.status === 'completed' || b.status === 'delivered')
  const activeBatches = batches.filter((b) =>
    ['pending', 'assigned', 'in_progress'].includes(b.status),
  )
  const invIn = invoices.filter((i) => i.status === 'finalized' && inRange(i.invoiceDate, from, to))
  const purIn = purchases.filter((p) => p.status === 'active' && inRange(p.purchaseDate, from, to))
  const payIn = payments.filter((p) => inRange(p.paymentDate, from, to))
  const expIn = expenses.filter((e) => inRange(e.expenseDate, from, to))

  const farmerIdsServed = new Set([
    ...recvIn.map((r) => r.farmerId),
    ...batchesIn.map((b) => b.farmerId),
  ])

  const greenReceived = roundKg(recvIn.reduce((s, r) => s + r.greenWeightKg, 0))
  const dryProduced = roundKg(completedIn.reduce((s, b) => s + (b.dryOutputKg ?? 0), 0))
  const dryingLoss = roundKg(completedIn.reduce((s, b) => s + (b.dryingLossKg ?? 0), 0))
  const dryingCharges = roundMoney(completedIn.reduce((s, b) => s + (b.dryingCharges ?? 0), 0))
  const totalPurchases = roundMoney(purIn.reduce((s, p) => s + p.netPayable, 0))
  const paymentsReceived = roundMoney(payIn.reduce((s, p) => s + p.amount, 0))
  const totalExpenses = roundMoney(expIn.reduce((s, e) => s + e.amount, 0))

  // Outstanding: sum of positive farmer ledger balances
  const ledger = await db.farmerLedger.toArray()
  const lastByFarmer = new Map<string, number>()
  for (const e of ledger.sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
    lastByFarmer.set(e.farmerId, e.balanceAfter)
  }
  let outstanding = 0
  for (const bal of lastByFarmer.values()) {
    if (bal > 0) outstanding += bal
  }
  outstanding = roundMoney(outstanding)

  // Charts: daily green / dry
  const dailyGreen = aggregateDaily(
    recvIn.map((r) => ({ date: r.receivedAt, value: r.greenWeightKg })),
  )
  const dailyDry = aggregateDaily(
    completedIn.map((b) => ({ date: b.completedAt!, value: b.dryOutputKg ?? 0 })),
  )
  const monthlyProcessing = aggregateMonthly(
    completedIn.map((b) => ({
      date: b.completedAt!,
      green: b.greenInputKg,
      dry: b.dryOutputKg ?? 0,
      loss: b.dryingLossKg ?? 0,
    })),
  )
  const lossAnalysis = completedIn.map((b) => ({
    batch: b.batchCode,
    green: b.greenInputKg,
    dry: b.dryOutputKg ?? 0,
    loss: b.dryingLossKg ?? 0,
    yield: b.yieldPercentage ?? 0,
  }))

  const revenueVsExpense = [
    { name: 'Drying Revenue', value: dryingCharges },
    { name: 'Purchases', value: totalPurchases },
    { name: 'Payments In', value: paymentsReceived },
    { name: 'Expenses', value: totalExpenses },
  ]

  const pendingPayments = [...lastByFarmer.entries()]
    .filter(([, bal]) => bal > 0)
    .map(([farmerId, balance]) => ({
      farmerId,
      farmer: farmers.find((f) => f.id === farmerId),
      balance,
    }))
    .sort((a, b) => b.balance - a.balance)
    .slice(0, 8)

  return {
    range: { from, to, preset },
    kpis: {
      greenReceived,
      dryProduced,
      dryingLoss,
      farmersServed: farmerIdsServed.size,
      activeBatches: activeBatches.length,
      completedBatches: completedIn.length,
      dryingCharges,
      totalPurchases,
      paymentsReceived,
      outstanding,
      greenStock: roundKg(storeStock.greenKg + farmerStock.greenKg),
      dryStock: roundKg(storeStock.dryKg + farmerStock.dryKg),
      storeGreen: storeStock.greenKg,
      storeDry: storeStock.dryKg,
      farmerGreen: farmerStock.greenKg,
      farmerDry: farmerStock.dryKg,
      totalExpenses,
      operatingProfit: roundMoney(dryingCharges - totalExpenses),
    },
    charts: { dailyGreen, dailyDry, monthlyProcessing, lossAnalysis, revenueVsExpense },
    recentReceiving: recvIn.slice(0, 8),
    activeBatches: activeBatches.slice(0, 8),
    pendingPayments,
    recentPurchases: purIn.slice(0, 8),
    recentInvoices: invIn.slice(0, 8),
  }
}

function dayKey(iso: string): string {
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
}

function monthKey(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }).slice(0, 7)
}

function aggregateDaily(items: { date: string; value: number }[]) {
  const map = new Map<string, number>()
  for (const item of items) {
    const k = dayKey(item.date)
    map.set(k, roundKg((map.get(k) ?? 0) + item.value))
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({ date, value }))
}

function aggregateMonthly(
  items: { date: string; green: number; dry: number; loss: number }[],
) {
  const map = new Map<string, { green: number; dry: number; loss: number }>()
  for (const item of items) {
    const k = monthKey(item.date)
    const cur = map.get(k) ?? { green: 0, dry: 0, loss: 0 }
    cur.green += item.green
    cur.dry += item.dry
    cur.loss += item.loss
    map.set(k, cur)
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => ({
      month,
      green: roundKg(v.green),
      dry: roundKg(v.dry),
      loss: roundKg(v.loss),
    }))
}
