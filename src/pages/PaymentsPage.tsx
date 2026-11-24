import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useLiveQuery } from 'dexie-react-hooks'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingState } from '@/components/common/LoadingState'
import { FormField } from '@/components/common/FormField'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { paymentSchema, type PaymentForm } from '@/schemas'
import { listPayments, recordPayment } from '@/services/payments'
import { listFarmers } from '@/services/farmers'
import { listInvoices } from '@/services/billing'
import { listPurchases } from '@/services/purchases'
import { formatDate, formatMoney } from '@/lib/utils'

export function PaymentsPage() {
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const payments = useLiveQuery(() => listPayments(), [])
  const farmers = useLiveQuery(() => listFarmers(), [])
  const invoices = useLiveQuery(() => listInvoices(), [])
  const purchases = useLiveQuery(() => listPurchases(), [])
  const farmerMap = new Map((farmers ?? []).map((f) => [f.id, f]))

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PaymentForm>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      paymentDate: new Date().toISOString().slice(0, 10),
      method: 'cash',
    },
  })

  const farmerId = watch('farmerId')

  const onSubmit = async (data: PaymentForm) => {
    setError(null)
    try {
      const p = await recordPayment({
        ...data,
        linkedInvoiceId: data.linkedInvoiceId || undefined,
        linkedPurchaseId: data.linkedPurchaseId || undefined,
      })
      reset({
        paymentDate: new Date().toISOString().slice(0, 10),
        method: 'cash',
        farmerId: '',
        amount: undefined as unknown as number,
      })
      setShowForm(false)
      window.location.href = `/payments/${p.id}`
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    }
  }

  if (!payments || !farmers) return <LoadingState />

  return (
    <div className="space-y-4">
      <PageHeader
        title="Payments"
        actions={<Button onClick={() => setShowForm((s) => !s)}>{showForm ? 'Hide' : 'Record payment'}</Button>}
      />
      {showForm && (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-3 rounded-xl border border-line bg-white p-4 shadow-soft"
        >
          {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          <FormField label="Farmer" required error={errors.farmerId?.message}>
            <Select {...register('farmerId')}>
              <option value="">Select</option>
              {farmers.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.fullName}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Date" required error={errors.paymentDate?.message}>
            <Input type="date" {...register('paymentDate')} />
          </FormField>
          <FormField label="Amount" required error={errors.amount?.message}>
            <Input type="number" inputMode="decimal" step="0.01" {...register('amount')} />
          </FormField>
          <FormField label="Method" error={errors.method?.message}>
            <Select {...register('method')}>
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="other">Other</option>
            </Select>
          </FormField>
          <FormField label="Transaction ref" error={errors.transactionRef?.message}>
            <Input {...register('transactionRef')} />
          </FormField>
          <FormField label="Link invoice (optional)">
            <Select {...register('linkedInvoiceId')}>
              <option value="">None</option>
              {(invoices ?? [])
                .filter((i) => i.farmerId === farmerId && i.status === 'finalized')
                .map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.invoiceCode} · due {formatMoney(i.remainingBalance)}
                  </option>
                ))}
            </Select>
          </FormField>
          <FormField label="Link purchase (optional)">
            <Select {...register('linkedPurchaseId')}>
              <option value="">None</option>
              {(purchases ?? [])
                .filter((p) => p.farmerId === farmerId && p.status === 'active')
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.purchaseCode}
                  </option>
                ))}
            </Select>
          </FormField>
          <FormField label="Notes">
            <Textarea {...register('notes')} rows={2} />
          </FormField>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Save payment'}
          </Button>
        </form>
      )}
      {payments.length === 0 ? (
        <EmptyState title="No payments recorded" />
      ) : (
        <ul className="space-y-2">
          {payments.map((p) => (
            <li key={p.id}>
              <Link
                to={`/payments/${p.id}`}
                className="flex justify-between rounded-xl border border-line bg-white px-4 py-3 shadow-soft"
              >
                <div>
                  <p className="font-semibold">{p.paymentCode}</p>
                  <p className="text-xs text-soft">
                    {farmerMap.get(p.farmerId)?.fullName} · {formatDate(p.paymentDate)} · {p.method}
                  </p>
                </div>
                <p className="font-semibold text-emerald tabular-nums">{formatMoney(p.amount)}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
