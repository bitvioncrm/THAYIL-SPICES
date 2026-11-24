import type { BusinessSettings } from '@/types'
import { nowISO } from './utils'

export const DEFAULT_SETTINGS: BusinessSettings = {
  id: 'main',
  businessName: 'THAYIL CARDAMOM SPICES',
  address: 'Kerala, India',
  phone: '',
  whatsapp: '',
  email: '',
  farmerPrefix: 'THY-FRM-',
  invoicePrefix: 'THY-INV-',
  receiptPrefix: 'THY-RCV-',
  batchPrefix: 'THY-BTH-',
  purchasePrefix: 'THY-PUR-',
  paymentPrefix: 'THY-PAY-',
  expensePrefix: 'THY-EXP-',
  dryerPrefix: 'THY-DRY-',
  dryingRatePerGreenKg: 15,
  dryingRatePerDryKg: 0,
  fixedBatchRate: 0,
  currency: 'INR',
  currencySymbol: '₹',
  dateFormat: 'dd MMM yyyy',
  timezone: 'Asia/Kolkata',
  language: 'en',
  invoiceFooter: 'Thank you for your business. Quality cardamom processing since establishment.',
  updatedAt: nowISO(),
}
