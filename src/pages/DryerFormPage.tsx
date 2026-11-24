import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { PageHeader } from '@/components/common/PageHeader'
import { FormField } from '@/components/common/FormField'
import { LoadingState } from '@/components/common/LoadingState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { dryerSchema, type DryerForm } from '@/schemas'
import { createDryer, getDryer, updateDryer } from '@/services/dryers'

export function DryerFormPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const [loading, setLoading] = useState(isEdit)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DryerForm>({
    resolver: zodResolver(dryerSchema),
    defaultValues: { status: 'available', capacityKg: 500 },
  })

  useEffect(() => {
    if (!id) return
    getDryer(id).then((d) => {
      if (!d) {
        setSubmitError('Dryer not found')
        setLoading(false)
        return
      }
      reset({
        name: d.name,
        capacityKg: d.capacityKg,
        location: d.location,
        status: d.status,
        notes: d.notes,
      })
      setLoading(false)
    })
  }, [id, reset])

  const onSubmit = async (data: DryerForm) => {
    setSubmitError(null)
    try {
      if (isEdit && id) await updateDryer(id, data)
      else await createDryer(data)
      navigate('/dryers')
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Save failed')
    }
  }

  if (loading) return <LoadingState />

  return (
    <div>
      <PageHeader title={isEdit ? 'Edit Dryer' : 'Add Dryer'} backTo="/dryers" />
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mx-auto max-w-xl space-y-3 rounded-xl border border-line bg-white p-4 shadow-soft"
      >
        {submitError && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{submitError}</div>}
        <FormField label="Name" required error={errors.name?.message}>
          <Input {...register('name')} />
        </FormField>
        <FormField label="Capacity (KG)" required error={errors.capacityKg?.message}>
          <Input type="number" inputMode="decimal" step="0.001" {...register('capacityKg')} />
        </FormField>
        <FormField label="Location" error={errors.location?.message}>
          <Input {...register('location')} />
        </FormField>
        <FormField label="Status" error={errors.status?.message}>
          <Select {...register('status')}>
            <option value="available">Available</option>
            <option value="running">Running</option>
            <option value="maintenance">Maintenance</option>
            <option value="inactive">Inactive</option>
          </Select>
        </FormField>
        <FormField label="Notes" error={errors.notes?.message}>
          <Textarea {...register('notes')} rows={2} />
        </FormField>
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Save dryer'}
        </Button>
      </form>
    </div>
  )
}
