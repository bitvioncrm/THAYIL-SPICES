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
import { Badge } from '@/components/ui/badge'
import { purchaseSchema, type PurchaseForm } from '@/schemas'
import { createPurchase, listPurchases } from '@/services/purchases'
import { listFarmers } from '@/services/farmers'
import { formatDate, formatKg, formatMoney } from '@/lib/utils'

export function PurchasesPage() {
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const purchases = useLiveQuery(() => listPurchases(), [])
  const farmers = useLiveQuery(() => listFarmers(), [])
  const farmerMap = new Map((farmers ?? []).map((f) => [f.id, f]))

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PurchaseForm>({
    resolver: zodResolver(purchaseSchema),
    defaultValues: {
      purchaseDate: new Date().toISOString().slice(0, 10),
      type: 'dry',
      deductions: 0,
      paidAmount: 0,
    },
  })

  const onSubmit = async (data: PurchaseForm) => {
    setError(null)
    try {
      const p = await createPurchase(data)
      reset({
        purchaseDate: new Date().toISOString().slice(0, 10),
        type: 'dry',
        deductions: 0,
        paidAmount: 0,
        farmerId: '',
        quantityKg: undefined as unknown as number,
        ratePerKg: undefined as unknown as number,
      })
      setShowForm(false)
      window.location.href = `/purchases/${p.id}`
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    }
  }

  if (!purchases || !farmers) return <LoadingState />

  return (
    <div className="space-y-4">
      <PageHeader
        title="Purchases"
        subtitle="Store buys cardamom from farmers"
        actions={
          <Button onClick={() => setShowForm((s) => !s)}>{showForm ? 'Hide' : 'New purchase'}</Button>
        }
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
          <FormField label="Date" required error={errors.purchaseDate?.message}>
            <Input type="date" {...register('purchaseDate')} />
          </FormField>
          <FormField label="Type" error={errors.type?.message}>
            <Select {...register('type')}>
              <option value="green">Green</option>
              <option value="dry">Dry</option>
            </Select>
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Quantity KG" required error={errors.quantityKg?.message}>
              <Input type="number" inputMode="decimal" step="0.001" {...register('quantityKg')} />
            </FormField>
            <FormField label="Rate / KG" required error={errors.ratePerKg?.message}>
              <Input type="number" inputMode="decimal" step="0.01" {...register('ratePerKg')} />
            </FormField>
          </div>
          <FormField label="Deductions" error={errors.deductions?.message}>
            <Input type="number" inputMode="decimal" step="0.01" {...register('deductions')} />
          </FormField>
          <FormField label="Paid now" error={errors.paidAmount?.message}>
            <Input type="number" inputMode="decimal" step="0.01" {...register('paidAmount')} />
          </FormField>
          <FormField label="Notes" error={errors.notes?.message}>
            <Textarea {...register('notes')} rows={2} />
          </FormField>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Save purchase'}
          </Button>
        </form>
      )}
      {purchases.length === 0 ? (
        <EmptyState title="No purchases yet" />
      ) : (
        <ul className="space-y-2">
          {purchases.map((p) => (
            <li key={p.id}>
              <Link
                to={`/purchases/${p.id}`}
                className="flex justify-between rounded-xl border border-line bg-white px-4 py-3 shadow-soft"
              >
                <div>
                  <p className="font-semibold">{p.purchaseCode}</p>
                  <p className="text-xs text-soft">
                    {farmerMap.get(p.farmerId)?.fullName} · {formatDate(p.purchaseDate)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold tabular-nums">{formatMoney(p.netPayable)}</p>
                  <Badge className="mt-1">
                    {p.type} {formatKg(p.quantityKg)}
                  </Badge>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
