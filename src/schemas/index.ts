import { z } from 'zod'

export const farmerSchema = z.object({
  fullName: z.string().min(2, 'Name is required'),
  phone: z
    .string()
    .min(10, 'Phone must be at least 10 digits')
    .regex(/^[0-9+\-\s]+$/, 'Invalid phone number'),
  whatsapp: z.string().optional(),
  address: z.string().optional(),
  plantationName: z.string().optional(),
  plantationLocation: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['active', 'inactive']).default('active'),
})

export const dryerSchema = z.object({
  name: z.string().min(1, 'Dryer name is required'),
  capacityKg: z.coerce.number().positive('Capacity must be greater than 0'),
  location: z.string().optional(),
  status: z.enum(['available', 'running', 'maintenance', 'inactive']),
  notes: z.string().optional(),
})

export const receivingSchema = z.object({
  farmerId: z.string().min(1, 'Select a farmer'),
  receivedAt: z.string().min(1, 'Date is required'),
  greenWeightKg: z.coerce.number().positive('Green weight must be greater than 0'),
  numberOfBags: z.coerce.number().int().min(1, 'At least 1 bag'),
  bagWeights: z.array(z.coerce.number().nonnegative()).optional(),
  quality: z.enum(['A', 'B', 'C', 'mixed']),
  staffName: z.string().optional(),
  notes: z.string().optional(),
})

export const allocationSchema = z.object({
  receivingId: z.string().min(1),
  dryerId: z.string().min(1, 'Select a dryer'),
  allocatedKg: z.coerce.number().positive('Allocation must be greater than 0'),
  operator: z.string().optional(),
  notes: z.string().optional(),
})

export const completeBatchSchema = z.object({
  dryOutputKg: z.coerce.number().positive('Actual dry weight is required'),
  completedAt: z.string().min(1),
  quality: z.enum(['A', 'B', 'C', 'mixed']).optional(),
  operator: z.string().optional(),
  notes: z.string().optional(),
  dryingRate: z.coerce.number().nonnegative().optional(),
})

export const invoiceSchema = z.object({
  farmerId: z.string().min(1, 'Select a farmer'),
  invoiceDate: z.string().min(1),
  batchIds: z.array(z.string()).min(1, 'Select at least one batch'),
  dryingRate: z.coerce.number().nonnegative(),
  additionalCharges: z.coerce.number().nonnegative().default(0),
  purchaseAmount: z.coerce.number().nonnegative().default(0),
  paidAmount: z.coerce.number().nonnegative().default(0),
  notes: z.string().optional(),
})

export const purchaseSchema = z.object({
  farmerId: z.string().min(1, 'Select a farmer'),
  purchaseDate: z.string().min(1),
  type: z.enum(['green', 'dry']),
  quantityKg: z.coerce.number().positive('Quantity required'),
  ratePerKg: z.coerce.number().positive('Rate required'),
  deductions: z.coerce.number().nonnegative().default(0),
  paidAmount: z.coerce.number().nonnegative().default(0),
  notes: z.string().optional(),
})

export const paymentSchema = z.object({
  farmerId: z.string().min(1, 'Select a farmer'),
  paymentDate: z.string().min(1),
  amount: z.coerce.number().positive('Amount required'),
  method: z.enum(['cash', 'upi', 'bank_transfer', 'other']),
  transactionRef: z.string().optional(),
  linkedInvoiceId: z.string().optional(),
  linkedPurchaseId: z.string().optional(),
  notes: z.string().optional(),
})

export const expenseSchema = z.object({
  expenseDate: z.string().min(1),
  category: z.enum([
    'electricity',
    'labour',
    'transport',
    'dryer_maintenance',
    'packaging',
    'rent',
    'miscellaneous',
  ]),
  amount: z.coerce.number().positive('Amount required'),
  paymentMethod: z.enum(['cash', 'upi', 'bank_transfer', 'other']),
  description: z.string().min(1, 'Description required'),
})

export const settingsSchema = z.object({
  businessName: z.string().min(1),
  address: z.string().optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  farmerPrefix: z.string().min(1),
  invoicePrefix: z.string().min(1),
  receiptPrefix: z.string().min(1),
  batchPrefix: z.string().min(1),
  purchasePrefix: z.string().min(1),
  paymentPrefix: z.string().min(1),
  expensePrefix: z.string().min(1),
  dryerPrefix: z.string().min(1),
  dryingRatePerGreenKg: z.coerce.number().nonnegative(),
  dryingRatePerDryKg: z.coerce.number().nonnegative(),
  fixedBatchRate: z.coerce.number().nonnegative(),
  currency: z.string().min(1),
  currencySymbol: z.string().min(1),
  dateFormat: z.string().min(1),
  timezone: z.string().min(1),
  language: z.string().min(1),
  invoiceFooter: z.string().optional(),
})

export type FarmerForm = z.infer<typeof farmerSchema>
export type DryerForm = z.infer<typeof dryerSchema>
export type ReceivingForm = z.infer<typeof receivingSchema>
export type AllocationForm = z.infer<typeof allocationSchema>
export type CompleteBatchForm = z.infer<typeof completeBatchSchema>
export type InvoiceForm = z.infer<typeof invoiceSchema>
export type PurchaseForm = z.infer<typeof purchaseSchema>
export type PaymentForm = z.infer<typeof paymentSchema>
export type ExpenseForm = z.infer<typeof expenseSchema>
export type SettingsForm = z.infer<typeof settingsSchema>
