import type { ExpenseCategory, InvoiceStatus, PaymentMethod, PaymentStatus } from '@/types'

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  electricity: 'Electricity',
  labour: 'Labour',
  transport: 'Transport',
  dryer_maintenance: 'Dryer Maintenance',
  packaging: 'Packaging',
  rent: 'Rent',
  miscellaneous: 'Miscellaneous',
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Cash',
  upi: 'UPI',
  bank_transfer: 'Bank Transfer',
  other: 'Other',
}

export function paymentStatusVariant(
  status: PaymentStatus,
): 'success' | 'warning' | 'danger' | 'muted' | 'gold' {
  switch (status) {
    case 'paid':
      return 'success'
    case 'partial':
      return 'warning'
    case 'unpaid':
      return 'danger'
    case 'overpaid':
      return 'gold'
    default:
      return 'muted'
  }
}

export function invoiceStatusVariant(status: InvoiceStatus): 'success' | 'warning' | 'danger' | 'muted' | 'gold' {
  switch (status) {
    case 'finalized':
      return 'success'
    case 'draft':
      return 'warning'
    case 'cancelled':
      return 'danger'
    case 'corrected':
      return 'gold'
    default:
      return 'muted'
  }
}