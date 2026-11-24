import { sdb } from '@/db/simple-db'
import { calcLabourCharge, calcLoss } from '@/lib/simple-calc'
import { nowISO, uid, padCode } from '@/lib/utils'
import type { DailyEntry, RateMethod, SimpleFarmer } from '@/types/simple'

const DEMO_FARMERS: {
  name: string
  phone: string
  plantation: string
  location: string
  rate: number
  method: RateMethod
}[] = [
  { name: 'Rajan Varghese', phone: '9876543210', plantation: 'Vellaram Estate', location: 'Vandanmedu', rate: 15, method: 'per_green_kg' },
  { name: 'Marykutty Joseph', phone: '9876543211', plantation: 'Hilltop Gardens', location: 'Kattappana', rate: 18, method: 'per_green_kg' },
  { name: 'Suresh Kumar', phone: '9876543212', plantation: 'Anakkara Farm', location: 'Anakkara', rate: 20, method: 'per_dry_kg' },
  { name: 'Latha Babu', phone: '9876543213', plantation: 'Green Valley', location: 'Nedumkandam', rate: 50, method: 'per_bag' },
  { name: 'Thomas Mathew', phone: '9876543214', plantation: 'Cardamom Hills', location: 'Udumbanchola', rate: 500, method: 'fixed_daily' },
  { name: 'Anitha Ravi', phone: '9876543215', plantation: 'Spice Grove', location: 'Elappara', rate: 16, method: 'per_green_kg' },
  { name: 'Biju Paul', phone: '9876543216', plantation: 'Malayalam Estate', location: 'Peerumade', rate: 22, method: 'per_dry_kg' },
  { name: 'Shiny George', phone: '9876543217', plantation: 'Puliampally Farm', location: 'Kumily', rate: 14, method: 'per_green_kg' },
]

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
}

export async function seedDemoData(): Promise<void> {
  await clearDemoData()
  const now = nowISO()
  const farmers: SimpleFarmer[] = DEMO_FARMERS.map((f, i) => ({
    id: uid(),
    farmerCode: `THY-FRM-${padCode(i + 1)}`,
    fullName: f.name,
    phone: f.phone,
    whatsapp: f.phone,
    plantationName: f.plantation,
    plantationLocation: f.location,
    address: `${f.location}, Idukki, Kerala`,
    registrationDate: daysAgo(60 + i),
    status: 'active' as const,
    defaultRate: f.rate,
    rateMethod: f.method,
    notes: 'DEMO DATA',
    isDemo: true,
    createdAt: now,
    updatedAt: now,
  }))

  await sdb.farmers.bulkAdd(farmers)
  await sdb.counters.put({ id: 'main', farmers: farmers.length, bills: 0, payments: 0 })

  const entries: DailyEntry[] = []
  for (let fi = 0; fi < farmers.length; fi++) {
    const farmer = farmers[fi]
    for (const dayOffset of [0, 1, 2, 5, 8, 12, 20]) {
      const green = 40 + ((fi * 7 + dayOffset * 3) % 80)
      const dry = Math.round(green * (0.72 + (fi % 5) * 0.02) * 1000) / 1000
      const bags = Math.max(1, Math.round(green / 50))
      const rate = farmer.defaultRate
      const method = farmer.rateMethod
      const labourCharge = calcLabourCharge({
        method,
        rate,
        greenKg: green,
        dryKg: dry,
        bags,
      })
      const amountPaid = dayOffset % 3 === 0 ? labourCharge : dayOffset % 3 === 1 ? labourCharge / 2 : 0
      entries.push({
        id: uid(),
        farmerId: farmer.id,
        entryDate: daysAgo(dayOffset),
        greenKg: green,
        dryKg: dry,
        lossKg: calcLoss(green, dry),
        bags,
        rate,
        rateMethod: method,
        labourCharge,
        amountPaid: Math.round(amountPaid * 100) / 100,
        paymentMethod: amountPaid > 0 ? 'cash' : undefined,
        notes: 'DEMO DATA',
        isDemo: true,
        createdAt: now,
        updatedAt: now,
      })
    }
  }
  await sdb.dailyEntries.bulkAdd(entries)
  await sdb.settings.update('main', { demoSeeded: true, updatedAt: now })
}

export async function clearDemoData(): Promise<void> {
  const allFarmers = await sdb.farmers.toArray()
  const demos = allFarmers.filter((f) => f.isDemo)
  const demoIds = new Set(demos.map((f) => f.id))

  const entries = await sdb.dailyEntries.toArray()
  await sdb.dailyEntries.bulkDelete(
    entries.filter((e) => e.isDemo || demoIds.has(e.farmerId)).map((e) => e.id),
  )

  const bills = await sdb.bills.toArray()
  await sdb.bills.bulkDelete(
    bills.filter((b) => b.isDemo || demoIds.has(b.farmerId)).map((b) => b.id),
  )

  const payments = await sdb.payments.toArray()
  await sdb.payments.bulkDelete(
    payments.filter((p) => p.isDemo || demoIds.has(p.farmerId)).map((p) => p.id),
  )

  await sdb.farmers.bulkDelete([...demoIds])
  await sdb.settings.update('main', { demoSeeded: false, updatedAt: nowISO() })
}

export async function ensureDemoIfEmpty(): Promise<void> {
  const settings = await sdb.settings.get('main')
  const count = await sdb.farmers.count()
  if (count === 0 && settings && !settings.demoSeeded) {
    await seedDemoData()
  }
}
