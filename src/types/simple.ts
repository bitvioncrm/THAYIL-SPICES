import type { FarmerStatus, PaymentMethod, PaymentStatus } from './index'

export type { PaymentMethod, PaymentStatus, FarmerStatus }

export type RateMethod = 'per_green_kg' | 'per_dry_kg' | 'per_bag' | 'fixed_daily' | 'custom'

export type BillPeriodType = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'

export type BillStatus = 'draft' | 'finalized' | 'cancelled'

export interface SimpleFarmer {
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
  /** Default labour/drying rate */
  defaultRate: number
  rateMethod: RateMethod
  isDemo?: boolean
  createdAt: string
  updatedAt: string
}

export interface DailyEntry {
  id: string
  farmerId: string
  entryDate: string // YYYY-MM-DD (Asia/Kolkata business date)
  greenKg: number
  dryKg: number
  lossKg: number
  bags?: number
  rate: number
  rateMethod: RateMethod
  labourCharge: number
  amountPaid: number
  paymentMethod?: PaymentMethod
  notes?: string
  /** Set when included in a finalized bill */
  billedBillId?: string
  isDemo?: boolean
  createdAt: string
  updatedAt: string
}

export interface Bill {
  id: string
  billCode: string
  farmerId: string
  periodType: BillPeriodType
  periodFrom: string
  periodTo: string
  billDate: string
  totalGreenKg: number
  totalDryKg: number
  totalLossKg: number
  totalCharges: number
  previousBalance: number
  paymentsInPeriod: number
  amountPaidOnBill: number
  currentBillAmount: number
  finalBalance: number
  paymentStatus: PaymentStatus
  status: BillStatus
  entryIds: string[]
  notes?: string
  isDemo?: boolean
  finalizedAt?: string
  cancelledAt?: string
  createdAt: string
  updatedAt: string
}

export interface SimplePayment {
  id: string
  paymentCode: string
  farmerId: string
  paymentDate: string
  amount: number
  method: PaymentMethod
  linkedBillId?: string
  notes?: string
  isDemo?: boolean
  createdAt: string
}

export interface SimpleSettings {
  id: string
  businessName: string
  address: string
  phone: string
  whatsapp: string
  email?: string
  logoDataUrl?: string
  farmerPrefix: string
  billPrefix: string
  paymentPrefix: string
  defaultRate: number
  defaultRateMethod: RateMethod
  currency: string
  currencySymbol: string
  timezone: string
  invoiceFooter?: string
  demoSeeded: boolean
  updatedAt: string
}

export interface SimpleCounters {
  id: string
  farmers: number
  bills: number
  payments: number
}
