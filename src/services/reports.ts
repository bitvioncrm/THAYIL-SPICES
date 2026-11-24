import { db } from '@/db/database'
import { getDateRange, inRange, type DatePreset } from '@/lib/date-ranges'
import { roundKg, roundMoney } from '@/lib/calculations'

export async function buildReport(type: string, preset: DatePreset, from?: string, to?: string) {
  const range = getDateRange(preset, from, to)
  const farmers = await db.farmers.toArray()
  const farmerMap = new Map(farmers.map((f) => [f.id, f]))

  switch (type) {
    case 'daily_receiving': {
      const rows = (await db.receivingRecords.toArray())
        .filter((r) => inRange(r.receivedAt, range.from, range.to))
        .map((r) => ({
          receipt: r.receiptCode,
          date: r.receivedAt,
          farmer: farmerMap.get(r.farmerId)?.fullName ?? '',
          farmerCode: farmerMap.get(r.farmerId)?.farmerCode ?? '',
          greenKg: r.greenWeightKg,
          bags: r.numberOfBags,
          quality: r.quality,
          allocated: r.allocatedKg,
        }))
      return { title: 'Daily Receiving Report', rows, range }
    }
    case 'farmer_transactions': {
      const rows = farmers.map((f) => {
        return {
          farmerCode: f.farmerCode,
          name: f.fullName,
          phone: f.phone,
          status: f.status,
        }
      })
      return { title: 'Farmer Directory', rows, range }
    }
    case 'production': {
      const rows = (await db.dryingBatches.toArray())
        .filter(
          (b) =>
            (b.status === 'completed' || b.status === 'delivered') &&
            b.completedAt &&
            inRange(b.completedAt, range.from, range.to),
        )
        .map((b) => ({
          batch: b.batchCode,
          farmer: farmerMap.get(b.farmerId)?.fullName ?? '',
          greenKg: b.greenInputKg,
          dryKg: b.dryOutputKg ?? 0,
          lossKg: b.dryingLossKg ?? 0,
          yieldPct: b.yieldPercentage ?? 0,
          charges: b.dryingCharges ?? 0,
          completedAt: b.completedAt,
        }))
      return { title: 'Green-to-Dry Production', rows, range }
    }
    case 'drying_loss': {
      const rows = (await db.dryingBatches.toArray())
        .filter(
          (b) =>
            (b.status === 'completed' || b.status === 'delivered') &&
            b.completedAt &&
            inRange(b.completedAt, range.from, range.to),
        )
        .map((b) => ({
          batch: b.batchCode,
          greenKg: b.greenInputKg,
          dryKg: b.dryOutputKg ?? 0,
          lossKg: b.dryingLossKg ?? 0,
          lossPct:
            b.greenInputKg > 0
              ? roundKg(((b.dryingLossKg ?? 0) / b.greenInputKg) * 100)
              : 0,
        }))
      return { title: 'Drying Loss Analysis', rows, range }
    }
    case 'dryer_performance': {
      const dryers = await db.dryers.toArray()
      const batches = await db.dryingBatches.toArray()
      const rows = dryers.map((d) => {
        const completed = batches.filter(
          (b) =>
            b.dryerId === d.id &&
            (b.status === 'completed' || b.status === 'delivered') &&
            b.completedAt &&
            inRange(b.completedAt, range.from, range.to),
        )
        return {
          dryer: d.name,
          code: d.dryerCode,
          batches: completed.length,
          greenKg: roundKg(completed.reduce((s, b) => s + b.greenInputKg, 0)),
          dryKg: roundKg(completed.reduce((s, b) => s + (b.dryOutputKg ?? 0), 0)),
          avgYield:
            completed.length > 0
              ? roundKg(
                  completed.reduce((s, b) => s + (b.yieldPercentage ?? 0), 0) / completed.length,
                )
              : 0,
        }
      })
      return { title: 'Dryer Performance', rows, range }
    }
    case 'purchases': {
      const rows = (await db.purchases.toArray())
        .filter((p) => p.status === 'active' && inRange(p.purchaseDate, range.from, range.to))
        .map((p) => ({
          purchase: p.purchaseCode,
          farmer: farmerMap.get(p.farmerId)?.fullName ?? '',
          type: p.type,
          qty: p.quantityKg,
          rate: p.ratePerKg,
          net: p.netPayable,
          paid: p.paidAmount,
          status: p.paymentStatus,
        }))
      return { title: 'Purchases Report', rows, range }
    }
    case 'payments': {
      const rows = (await db.payments.toArray())
        .filter((p) => inRange(p.paymentDate, range.from, range.to))
        .map((p) => ({
          payment: p.paymentCode,
          farmer: farmerMap.get(p.farmerId)?.fullName ?? '',
          amount: p.amount,
          method: p.method,
          date: p.paymentDate,
          ref: p.transactionRef ?? '',
        }))
      return { title: 'Payments Report', rows, range }
    }
    case 'expenses': {
      const rows = (await db.expenses.toArray())
        .filter((e) => inRange(e.expenseDate, range.from, range.to))
        .map((e) => ({
          expense: e.expenseCode,
          category: e.category,
          amount: e.amount,
          method: e.paymentMethod,
          description: e.description,
          date: e.expenseDate,
        }))
      return { title: 'Expenses Report', rows, range }
    }
    case 'inventory': {
      const rows = (await db.inventory.toArray()).map((i) => ({
        owner: i.owner,
        farmer: i.farmerId ? farmerMap.get(i.farmerId)?.fullName ?? i.farmerId : '—',
        kind: i.kind,
        qtyKg: i.quantityKg,
      }))
      return { title: 'Inventory Balances', rows, range }
    }
    case 'outstanding': {
      const ledger = await db.farmerLedger.toArray()
      const last = new Map<string, number>()
      for (const e of ledger.sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
        last.set(e.farmerId, e.balanceAfter)
      }
      const rows = [...last.entries()]
        .filter(([, bal]) => bal !== 0)
        .map(([id, balance]) => ({
          farmer: farmerMap.get(id)?.fullName ?? '',
          code: farmerMap.get(id)?.farmerCode ?? '',
          balance: roundMoney(balance),
        }))
        .sort((a, b) => b.balance - a.balance)
      return { title: 'Outstanding Balances', rows, range }
    }
    case 'business_performance': {
      const completed = (await db.dryingBatches.toArray()).filter(
        (b) =>
          (b.status === 'completed' || b.status === 'delivered') &&
          b.completedAt &&
          inRange(b.completedAt, range.from, range.to),
      )
      const expenses = (await db.expenses.toArray()).filter((e) =>
        inRange(e.expenseDate, range.from, range.to),
      )
      const purchases = (await db.purchases.toArray()).filter(
        (p) => p.status === 'active' && inRange(p.purchaseDate, range.from, range.to),
      )
      const revenue = roundMoney(completed.reduce((s, b) => s + (b.dryingCharges ?? 0), 0))
      const expenseTotal = roundMoney(expenses.reduce((s, e) => s + e.amount, 0))
      const purchaseTotal = roundMoney(purchases.reduce((s, p) => s + p.netPayable, 0))
      const rows = [
        { metric: 'Drying Revenue', value: revenue },
        { metric: 'Operating Expenses', value: expenseTotal },
        { metric: 'Cardamom Purchases (COGS)', value: purchaseTotal },
        { metric: 'Operating Profit (Revenue − Expenses)', value: roundMoney(revenue - expenseTotal) },
      ]
      return { title: 'Business Performance', rows, range }
    }
    default:
      return { title: 'Report', rows: [], range }
  }
}
