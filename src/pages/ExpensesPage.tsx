import { useState } from 'react'
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
import { expenseSchema, type ExpenseForm } from '@/schemas'
import { createExpense, listExpenses } from '@/services/expenses'
import { formatDate, formatMoney } from '@/lib/utils'

const CATEGORIES = [
  'electricity',
  'labour',
  'transport',
  'dryer_maintenance',
  'packaging',
  'rent',
  'miscellaneous',
] as const

export function ExpensesPage() {
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const expenses = useLiveQuery(() => listExpenses(), [])

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ExpenseForm>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      expenseDate: new Date().toISOString().slice(0, 10),
      category: 'miscellaneous',
      paymentMethod: 'cash',
    },
  })

  const onSubmit = async (data: ExpenseForm) => {
    setError(null)
    try {
      await createExpense(data)
      reset({
        expenseDate: new Date().toISOString().slice(0, 10),
        category: 'miscellaneous',
        paymentMethod: 'cash',
        description: '',
        amount: undefined as unknown as number,
      })
      setShowForm(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    }
  }

  if (!expenses) return <LoadingState />

  const total = expenses.reduce((s, e) => s + e.amount, 0)

  return (
    <div className="space-y-4">
      <PageHeader
        title="Expenses"
        subtitle={`Total ${formatMoney(total)}`}
        actions={<Button onClick={() => setShowForm((s) => !s)}>{showForm ? 'Hide' : 'Add expense'}</Button>}
      />
      {showForm && (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-3 rounded-xl border border-line bg-white p-4 shadow-soft"
        >
          {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          <FormField label="Date" required error={errors.expenseDate?.message}>
            <Input type="date" {...register('expenseDate')} />
          </FormField>
          <FormField label="Category" error={errors.category?.message}>
            <Select {...register('category')}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c.replace(/_/g, ' ')}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Amount" required error={errors.amount?.message}>
            <Input type="number" inputMode="decimal" step="0.01" {...register('amount')} />
          </FormField>
          <FormField label="Payment method" error={errors.paymentMethod?.message}>
            <Select {...register('paymentMethod')}>
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="other">Other</option>
            </Select>
          </FormField>
          <FormField label="Description" required error={errors.description?.message}>
            <Textarea {...register('description')} rows={2} />
          </FormField>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Save expense'}
          </Button>
        </form>
      )}
      {expenses.length === 0 ? (
        <EmptyState title="No expenses" />
      ) : (
        <ul className="space-y-2">
          {expenses.map((e) => (
            <li
              key={e.id}
              className="flex justify-between rounded-xl border border-line bg-white px-4 py-3 shadow-soft"
            >
              <div>
                <p className="font-semibold">{e.description}</p>
                <p className="text-xs text-soft">
                  {e.expenseCode} · {formatDate(e.expenseDate)}
                </p>
                <Badge className="mt-1" variant="muted">
                  {e.category.replace(/_/g, ' ')}
                </Badge>
              </div>
              <p className="font-semibold tabular-nums">{formatMoney(e.amount)}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
