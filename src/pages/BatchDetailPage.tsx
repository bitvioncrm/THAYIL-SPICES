import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { PageHeader } from '@/components/common/PageHeader'
import { LoadingState } from '@/components/common/LoadingState'
import { ErrorState } from '@/components/common/ErrorState'
import { FormField } from '@/components/common/FormField'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { completeBatchSchema, type CompleteBatchForm } from '@/schemas'
import { completeBatch, getBatch, markDelivered } from '@/services/drying'
import { getFarmer } from '@/services/farmers'
import { getDryer } from '@/services/dryers'
import { formatDate, formatKg, formatMoney } from '@/lib/utils'
import type { Dryer, DryingBatch, Farmer } from '@/types'

export function BatchDetailPage() {
  const { id } = useParams()
  const [batch, setBatch] = useState<DryingBatch | null>(null)
  const [farmer, setFarmer] = useState<Farmer | null>(null)
  const [dryer, setDryer] = useState<Dryer | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CompleteBatchForm>({
    resolver: zodResolver(completeBatchSchema),
    defaultValues: {
      completedAt: new Date().toISOString().slice(0, 16),
      quality: 'A',
    },
  })

  const reload = async () => {
    if (!id) return
    const b = await getBatch(id)
    if (!b) throw new Error('Batch not found')
    setBatch(b)
    setFarmer((await getFarmer(b.farmerId)) ?? null)
    setDryer((await getDryer(b.dryerId)) ?? null)
  }

  useEffect(() => {
    reload().catch((e) => setError(e instanceof Error ? e.message : 'Failed'))
  }, [id])

  const onComplete = async (data: CompleteBatchForm) => {
    if (!batch) return
    setMsg(null)
    try {
      const completedAt =
        data.completedAt.length === 16 ? new Date(data.completedAt).toISOString() : data.completedAt
      await completeBatch(batch.id, { ...data, completedAt })
      await reload()
      setMsg('Batch completed. Inventory and ledger updated.')
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Failed')
    }
  }

  const onDeliver = async () => {
    if (!batch) return
    try {
      await markDelivered(batch.id)
      await reload()
      setMsg('Marked as delivered.')
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Failed')
    }
  }

  if (error) return <ErrorState message={error} />
  if (!batch) return <LoadingState />

  const canComplete = ['pending', 'assigned', 'in_progress'].includes(batch.status)

  return (
    <div className="space-y-4">
      <PageHeader title={batch.batchCode} subtitle={farmer?.fullName} backTo="/drying" />
      {msg && <div className="rounded-lg bg-light-green px-3 py-2 text-sm text-forest">{msg}</div>}

      <Card>
        <CardContent className="grid gap-2 pt-4 text-sm sm:grid-cols-2">
          <div>
            <p className="text-soft">Status</p>
            <Badge>{batch.status.replace('_', ' ')}</Badge>
          </div>
          <div>
            <p className="text-soft">Dryer</p>
            <p className="font-medium">{dryer?.name ?? '—'}</p>
          </div>
          <div>
            <p className="text-soft">Green input</p>
            <p className="font-semibold tabular-nums">{formatKg(batch.greenInputKg)} KG</p>
          </div>
          <div>
            <p className="text-soft">Started</p>
            <p className="font-medium">{batch.startAt ? formatDate(batch.startAt, true) : '—'}</p>
          </div>
          {batch.dryOutputKg != null && (
            <>
              <div>
                <p className="text-soft">Dry output</p>
                <p className="font-semibold text-emerald tabular-nums">{formatKg(batch.dryOutputKg)} KG</p>
              </div>
              <div>
                <p className="text-soft">Loss / Yield</p>
                <p className="font-medium">
                  {formatKg(batch.dryingLossKg)} KG · {batch.yieldPercentage?.toFixed(1)}%
                </p>
              </div>
              <div>
                <p className="text-soft">Drying charges</p>
                <p className="font-semibold">{formatMoney(batch.dryingCharges)}</p>
              </div>
              <div>
                <p className="text-soft">Completed</p>
                <p className="font-medium">
                  {batch.completedAt ? formatDate(batch.completedAt, true) : '—'}
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {canComplete && (
        <Card>
          <CardHeader>
            <CardTitle>Complete drying</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onComplete)} className="space-y-3">
              <FormField label="Actual dry weight (KG)" required error={errors.dryOutputKg?.message}>
                <Input type="number" inputMode="decimal" step="0.001" {...register('dryOutputKg')} />
              </FormField>
              <FormField label="Completion time" required error={errors.completedAt?.message}>
                <Input type="datetime-local" {...register('completedAt')} />
              </FormField>
              <FormField label="Rate per green KG (optional)" error={errors.dryingRate?.message}>
                <Input type="number" inputMode="decimal" step="0.01" {...register('dryingRate')} />
              </FormField>
              <FormField label="Quality" error={errors.quality?.message}>
                <Select {...register('quality')}>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                  <option value="mixed">Mixed</option>
                </Select>
              </FormField>
              <FormField label="Operator" error={errors.operator?.message}>
                <Input {...register('operator')} />
              </FormField>
              <FormField label="Notes" error={errors.notes?.message}>
                <Textarea {...register('notes')} rows={2} />
              </FormField>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Saving…' : 'Complete batch'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {batch.status === 'completed' && (
        <Button className="w-full" variant="secondary" onClick={onDeliver}>
          Mark delivered to farmer
        </Button>
      )}
    </div>
  )
}
