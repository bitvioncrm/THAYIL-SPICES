import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { PageHeader } from '@/components/common/PageHeader'
import { FormField } from '@/components/common/FormField'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { receivingSchema, type ReceivingForm } from '@/schemas'
import { createReceiving } from '@/services/receiving'
import { listFarmers } from '@/services/farmers'

export function ReceivingFormPage() {
  const navigate = useNavigate()
  const farmers = useLiveQuery(() => listFarmers(), []) ?? []
  const [submitError, setSubmitError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ReceivingForm>({
    resolver: zodResolver(receivingSchema),
    defaultValues: {
      receivedAt: new Date().toISOString().slice(0, 16),
      quality: 'A',
      numberOfBags: 1,
    },
  })

  const onSubmit = async (data: ReceivingForm) => {
    setSubmitError(null)
    try {
      const receivedAt = data.receivedAt.length === 16 ? new Date(data.receivedAt).toISOString() : data.receivedAt
      const record = await createReceiving({ ...data, receivedAt })
      navigate(`/receiving/${record.id}`)
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Failed to save')
    }
  }

  return (
    <div>
      <PageHeader title="New Receiving" backTo="/receiving" />
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mx-auto max-w-xl space-y-3 rounded-xl border border-line bg-white p-4 shadow-soft"
      >
        {submitError && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{submitError}</div>}
        <FormField label="Farmer" required error={errors.farmerId?.message}>
          <Select {...register('farmerId')}>
            <option value="">Select farmer</option>
            {farmers
              .filter((f) => f.status === 'active')
              .map((f) => (
                <option key={f.id} value={f.id}>
                  {f.fullName} ({f.farmerCode})
                </option>
              ))}
          </Select>
        </FormField>
        <FormField label="Date & time" required error={errors.receivedAt?.message}>
          <Input type="datetime-local" {...register('receivedAt')} />
        </FormField>
        <FormField label="Green weight (KG)" required error={errors.greenWeightKg?.message}>
          <Input type="number" inputMode="decimal" step="0.001" {...register('greenWeightKg')} />
        </FormField>
        <FormField label="Number of bags" required error={errors.numberOfBags?.message}>
          <Input type="number" inputMode="numeric" {...register('numberOfBags')} />
        </FormField>
        <FormField label="Quality" error={errors.quality?.message}>
          <Select {...register('quality')}>
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
            <option value="mixed">Mixed</option>
          </Select>
        </FormField>
        <FormField label="Staff name" error={errors.staffName?.message}>
          <Input {...register('staffName')} />
        </FormField>
        <FormField label="Notes" error={errors.notes?.message}>
          <Textarea {...register('notes')} rows={2} />
        </FormField>
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Save receiving'}
        </Button>
      </form>
    </div>
  )
}
