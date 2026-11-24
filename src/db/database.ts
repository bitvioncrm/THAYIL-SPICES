import Dexie, { type Table } from 'dexie'
import type {
  Farmer,
  Dryer,
  ReceivingRecord,
  ReceivingAllocation,
  DryingBatch,
  Invoice,
  InvoiceItem,
  Purchase,
  Payment,
  FarmerLedgerEntry,
  InventoryBalance,
  InventoryMovement,
  Expense,
  AppNotification,
  BusinessSettings,
  AuditLog,
  IdCounters,
} from '@/types'
import { DEFAULT_SETTINGS } from '@/lib/defaults'

export class ThayilDB extends Dexie {
  farmers!: Table<Farmer, string>
  dryers!: Table<Dryer, string>
  receivingRecords!: Table<ReceivingRecord, string>
  receivingAllocations!: Table<ReceivingAllocation, string>
  dryingBatches!: Table<DryingBatch, string>
  invoices!: Table<Invoice, string>
  invoiceItems!: Table<InvoiceItem, string>
  purchases!: Table<Purchase, string>
  payments!: Table<Payment, string>
  farmerLedger!: Table<FarmerLedgerEntry, string>
  inventory!: Table<InventoryBalance, string>
  inventoryMovements!: Table<InventoryMovement, string>
  expenses!: Table<Expense, string>
  notifications!: Table<AppNotification, string>
  settings!: Table<BusinessSettings, string>
  auditLogs!: Table<AuditLog, string>
  counters!: Table<IdCounters, string>

  constructor() {
    super('thayil_cardamom_erp')
    this.version(1).stores({
      farmers: 'id, farmerCode, fullName, phone, status, registrationDate',
      dryers: 'id, dryerCode, name, status',
      receivingRecords: 'id, receiptCode, farmerId, receivedAt',
      receivingAllocations: 'id, receivingId, dryerId, batchId',
      dryingBatches: 'id, batchCode, farmerId, receivingId, dryerId, status, startAt, completedAt',
      invoices: 'id, invoiceCode, farmerId, invoiceDate, status, paymentStatus',
      invoiceItems: 'id, invoiceId',
      purchases: 'id, purchaseCode, farmerId, purchaseDate, status, paymentStatus',
      payments: 'id, paymentCode, farmerId, paymentDate, linkedInvoiceId, linkedPurchaseId',
      farmerLedger: 'id, farmerId, entryDate, category',
      inventory: 'id, owner, farmerId, kind, [owner+kind], [owner+farmerId+kind]',
      inventoryMovements: 'id, movementDate, owner, farmerId, kind, movementType',
      expenses: 'id, expenseCode, expenseDate, category',
      notifications: 'id, type, read, createdAt',
      settings: 'id',
      auditLogs: 'id, entityType, entityId, createdAt',
      counters: 'id',
    })
  }
}

export const db = new ThayilDB()

let initPromise: Promise<void> | null = null

export async function ensureDbReady(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      await db.open()
      const settings = await db.settings.get('main')
      if (!settings) {
        await db.settings.put({ ...DEFAULT_SETTINGS })
      }
      const counters = await db.counters.get('main')
      if (!counters) {
        await db.counters.put({
          id: 'main',
          farmers: 0,
          receipts: 0,
          batches: 0,
          invoices: 0,
          purchases: 0,
          payments: 0,
          expenses: 0,
          dryers: 0,
        })
      }
      // Seed default inventory buckets for store
      const storeGreen = await db.inventory
        .where('[owner+kind]')
        .equals(['store', 'green'])
        .first()
      if (!storeGreen) {
        const now = new Date().toISOString()
        await db.inventory.bulkAdd([
          { id: 'inv-store-green', owner: 'store', kind: 'green', quantityKg: 0, updatedAt: now },
          { id: 'inv-store-dry', owner: 'store', kind: 'dry', quantityKg: 0, updatedAt: now },
        ])
      }
    })()
  }
  return initPromise
}
