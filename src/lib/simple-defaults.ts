import type { SimpleSettings } from '@/types/simple'
import { nowISO } from './utils'

export const SIMPLE_DEFAULT_SETTINGS: SimpleSettings = {
  id: 'main',
  businessName: 'THAYIL CARDAMOM SPICES',
  address: 'Idukki, Kerala, India',
  phone: '',
  whatsapp: '',
  email: '',
  farmerPrefix: 'THY-FRM-',
  billPrefix: 'THY-BILL-',
  paymentPrefix: 'THY-PAY-',
  defaultRate: 15,
  defaultRateMethod: 'per_green_kg',
  currency: 'INR',
  currencySymbol: '₹',
  timezone: 'Asia/Kolkata',
  invoiceFooter: 'Thank you for your business. — Thayil Cardamom Spices',
  demoSeeded: false,
  updatedAt: nowISO(),
}

export const RATE_METHOD_LABELS: Record<string, string> = {
  per_green_kg: 'Per green KG',
  per_dry_kg: 'Per dry KG',
  per_bag: 'Per bag',
  fixed_daily: 'Fixed daily charge',
  custom: 'Custom daily rate',
}
