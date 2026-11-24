import Dexie, { type Table } from 'dexie'
import type {
  Bill,
  DailyEntry,
  SimpleCounters,
  SimpleFarmer,
  SimplePayment,
  SimpleSettings,
} from '@/types/simple'
import type { AuditLog } from '@/types'
import { SIMPLE_DEFAULT_SETTINGS } from '@/lib/simple-defaults'

export class ThayilSimpleDB extends Dexie {
  farmers!: Table<SimpleFarmer, string>
  dailyEntries!: Table<DailyEntry, string>
  bills!: Table<Bill, string>
  payments!: Table<SimplePayment, string>
  settings!: Table<SimpleSettings, string>
  counters!: Table<SimpleCounters, string>
  auditLogs!: Table<AuditLog, string>

  constructor() {
    super('thayil_cardamom_simple')
    this.version(1).stores({
      farmers: 'id, farmerCode, fullName, phone, status, isDemo',
      dailyEntries: 'id, farmerId, entryDate, billedBillId, isDemo, [farmerId+entryDate]',
      bills: 'id, billCode, farmerId, status, periodFrom, periodTo, isDemo',
      payments: 'id, paymentCode, farmerId, paymentDate, linkedBillId, isDemo',
      settings: 'id',
      counters: 'id',
      auditLogs: 'id, entityType, entityId, createdAt',
    })
    // v2: add billDate index used by listBills orderBy
    this.version(2).stores({
      bills: 'id, billCode, farmerId, billDate, status, periodFrom, periodTo, isDemo',
    })
  }
}

export const sdb = new ThayilSimpleDB()

let ready: Promise<void> | null = null

export async function ensureSimpleDb(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await sdb.open()
      const settings = await sdb.settings.get('main')
      if (!settings) {
        await sdb.settings.put({ ...SIMPLE_DEFAULT_SETTINGS })
      }
      const counters = await sdb.counters.get('main')
      if (!counters) {
        await sdb.counters.put({ id: 'main', farmers: 0, bills: 0, payments: 0 })
      }
    })()
  }
  return ready
}
