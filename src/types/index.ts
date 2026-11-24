export type FarmerStatus = 'active' | 'inactive'
export type DryerStatus = 'available' | 'running' | 'maintenance' | 'inactive'
export type BatchStatus = 'pending' | 'assigned' | 'in_progress' | 'completed' | 'delivered' | 'cancelled'
export type QualityGrade = 'A' | 'B' | 'C' | 'mixed'
export type PaymentMethod = 'cash' | 'upi' | 'bank_transfer' | 'other'
export type PaymentStatus = 'unpaid' | 'partial' | 'paid' | 'overpaid'
export type InvoiceStatus = 'draft' | 'finalized' | 'cancelled' | 'corrected'
export type PurchaseType = 'green' | 'dry'
export type StockOwner = 'farmer' | 'store'
export type StockKind = 'green' | 'dry'
export type ExpenseCategory =
  | 'electricity'
  | 'labour'
  | 'transport'
  | 'dryer_maintenance'
  | 'packaging'
  | 'rent'
  | 'miscellaneous'
export type NotificationType =
  | 'receiving'
  | 'drying_completed'
  | 'pending_batch'
  | 'unpaid_invoice'
  | 'outstanding_balance'
  | 'dryer_maintenance'
  | 'inventory_discrepancy'
  | 'system'
export type MovementType =
  | 'receiving'
  | 'allocation'
  | 'processing_input'
  | 'processing_output'
  | 'drying_loss'
  | 'purchase'
  | 'dispatch'
  | 'delivery'
  | 'adjustment'
  | 'sale'

export interface Farmer {
  id: string
  farmerCode: string
  fullName: string
  phone: string
  whatsapp?: string
  address?: string
  plantationName?: string
  plantationLocation?: string
  registrationDate: string
  notes?: string
  status: FarmerStatus
  createdAt: string
  updatedAt: string
}

export interface Dryer {
  id: string
  dryerCode: string
  name: string
  capacityKg: number
  location?: string
  status: DryerStatus
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface ReceivingRecord {
  id: string
  receiptCode: string
  farmerId: string
  receivedAt: string
  greenWeightKg: number
  numberOfBags: number
  bagWeights?: number[]
  quality: QualityGrade
  staffName?: string
  notes?: string
  allocatedKg: number
  createdAt: string
  updatedAt: string
}

export interface ReceivingAllocation {
  id: string
  receivingId: string
  dryerId: string
  batchId: string
  allocatedKg: number
  createdAt: string
}

export interface DryingBatch {
  id: string
  batchCode: string
  farmerId: string
  receivingId: string
  dryerId: string
  greenInputKg: number
  startAt?: string
  completedAt?: string
  dryOutputKg?: number
  dryingLossKg?: number
  yieldPercentage?: number
  operator?: string
  quality?: QualityGrade
  dryingCharges?: number
  ratePerGreenKg?: number
  notes?: string
  status: BatchStatus
  createdAt: string
  updatedAt: string
}

export interface Invoice {
  id: string
  invoiceCode: string
  farmerId: string
  invoiceDate: string
  greenInputKg: number
  dryOutputKg: number
  dryingLossKg: number
  dryingRate: number
  dryingCharges: number
  additionalCharges: number
  purchaseAmount: number
  previousBalance: number
  totalAmount: number
  paidAmount: number
  remainingBalance: number
  paymentStatus: PaymentStatus
  status: InvoiceStatus
  batchIds: string[]
  notes?: string
  finalizedAt?: string
  cancelledAt?: string
  createdAt: string
  updatedAt: string
}

export interface InvoiceItem {
  id: string
  invoiceId: string
  description: string
  quantity: number
  rate: number
  amount: number
  itemType: 'drying' | 'purchase' | 'additional' | 'adjustment'
}

export interface Purchase {
  id: string
  purchaseCode: string
  farmerId: string
  purchaseDate: string
  type: PurchaseType
  quantityKg: number
  ratePerKg: number
  grossAmount: number
  deductions: number
  netPayable: number
  paidAmount: number
  paymentStatus: PaymentStatus
  notes?: string
  status: 'active' | 'cancelled'
  createdAt: string
  updatedAt: string
}

export interface Payment {
  id: string
  paymentCode: string
  farmerId: string
  paymentDate: string
  amount: number
  method: PaymentMethod
  transactionRef?: string
  linkedInvoiceId?: string
  linkedPurchaseId?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface FarmerLedgerEntry {
  id: string
  farmerId: string
  entryDate: string
  entryType: 'debit' | 'credit'
  category: 'drying_charge' | 'purchase' | 'payment' | 'advance' | 'adjustment' | 'opening'
  amount: number
  referenceType?: string
  referenceId?: string
  description: string
  balanceAfter: number
  createdAt: string
}

export interface InventoryBalance {
  id: string
  owner: StockOwner
  farmerId?: string
  kind: StockKind
  quantityKg: number
  updatedAt: string
}

export interface InventoryMovement {
  id: string
  movementDate: string
  owner: StockOwner
  farmerId?: string
  kind: StockKind
  movementType: MovementType
  quantityKg: number
  balanceAfter: number
  referenceType?: string
  referenceId?: string
  notes?: string
  createdAt: string
}

export interface Expense {
  id: string
  expenseCode: string
  expenseDate: string
  category: ExpenseCategory
  amount: number
  paymentMethod: PaymentMethod
  description: string
  attachmentName?: string
  createdAt: string
  updatedAt: string
}

export interface AppNotification {
  id: string
  type: NotificationType
  title: string
  message: string
  read: boolean
  referenceType?: string
  referenceId?: string
  createdAt: string
}

export interface BusinessSettings {
  id: string
  businessName: string
  address: string
  phone: string
  whatsapp: string
  email?: string
  logoDataUrl?: string
  farmerPrefix: string
  invoicePrefix: string
  receiptPrefix: string
  batchPrefix: string
  purchasePrefix: string
  paymentPrefix: string
  expensePrefix: string
  dryerPrefix: string
  dryingRatePerGreenKg: number
  dryingRatePerDryKg: number
  fixedBatchRate: number
  currency: string
  currencySymbol: string
  dateFormat: string
  timezone: string
  language: string
  invoiceFooter?: string
  updatedAt: string
}

export interface AuditLog {
  id: string
  entityType: string
  entityId: string
  action: 'create' | 'update' | 'delete' | 'finalize' | 'cancel' | 'correct'
  before?: string
  after?: string
  note?: string
  createdAt: string
}

export interface IdCounters {
  id: string
  farmers: number
  receipts: number
  batches: number
  invoices: number
  purchases: number
  payments: number
  expenses: number
  dryers: number
}
