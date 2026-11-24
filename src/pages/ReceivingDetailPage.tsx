import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Download } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { LoadingState } from '@/components/common/LoadingState'
import { ErrorState } from '@/components/common/ErrorState'
import { FormField } from '@/components/common/FormField'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { allocateReceiving, getAllocations, getReceiving } from '@/services/receiving'
import { getFarmer } from '@/services/farmers'
import { listDryers } from '@/services/dryers'
import { getSettings } from '@/services/settings'
import { generateReceivingPdf, saveOrSharePdf, printPdf } from '@/lib/pdf'
import { formatDate, formatKg } from '@/lib/utils'
import type { Dryer, Farmer, ReceivingAllocation, ReceivingRecord } from '@/types'

export function ReceivingDetailPage() {
  const { id } = useParams()
  const [record, setRecord] = useState<ReceivingRecord | null>(null)
  const [farmer, setFarmer] = useState<Farmer | null>(null)
  const [dryers, setDryers] = useState<Dryer[]>([])
  const [allocations, setAllocations] = useState<ReceivingAllocation[]>([])
  const [dryerId, setDryerId] = useState('')
  const [allocatedKg, setAllocatedKg] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [allocError, setAllocError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const reload = async () => {
    if (!id) return
    const r = await getReceiving(id)
    if (!r) throw new Error('Receiving not found')
    setRecord(r)
    setFarmer((await getFarmer(r.farmerId)) ?? null)
    setAllocations(await getAllocations(r.id))
    setDryers(await listDryers())
    const pending = r.greenWeightKg - r.allocatedKg
    setAllocatedKg(pending > 0 ? String(pending) : '')
  }

  useEffect(() => {
    reload().catch((e) => setError(e instanceof Error ? e.message : 'Failed'))
  }, [id])

  const downloadPdf = async () => {
    if (!record || !farmer) return
    const settings = await getSettings()
    const doc = generateReceivingPdf(settings, farmer, record)
    await saveOrSharePdf(doc, `${record.receiptCode}.pdf`, 'receiving')
  }

  const print = async () => {
    if (!record || !farmer) return
    const settings = await getSettings()
    printPdf(generateReceivingPdf(settings, farmer, record))
  }

  const onAllocate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!record) return
    setAllocError(null)
    setBusy(true)
    try {
      await allocateReceiving({
        receivingId: record.id,
        dryerId,
        allocatedKg: Number(allocatedKg),
      })
      await reload()
      setDryerId('')
    } catch (err) {
      setAllocError(err instanceof Error ? err.message : 'Allocation failed')
    } finally {
      setBusy(false)
    }
  }

  if (error) return <ErrorState message={error} />
  if (!record) return <LoadingState />

  const pending = record.greenWeightKg - record.allocatedKg

  return (
    <div className="space-y-4">
      <PageHeader
        title={record.receiptCode}
        subtitle={farmer?.fullName}
        backTo="/receiving"
        actions={
          <>
            <Button variant="outline" size="sm" onClick={print}>
              Print
            </Button>
            <Button variant="secondary" size="sm" onClick={downloadPdf}>
              <Download className="h-4 w-4" /> PDF
            </Button>
          </>
        }
      />

      <Card>
        <CardContent className="grid gap-2 pt-4 text-sm sm:grid-cols-2">
          <div>
            <p className="text-soft">Date</p>
            <p className="font-medium">{formatDate(record.receivedAt, true)}</p>
          </div>
          <div>
            <p className="text-soft">Green weight</p>
            <p className="font-semibold text-emerald tabular-nums">{formatKg(record.greenWeightKg)} KG</p>
          </div>
          <div>
            <p className="text-soft">Bags / Quality</p>
            <p className="font-medium">
              {record.numberOfBags} · {record.quality}
            </p>
          </div>
          <div>
            <p className="text-soft">Allocation</p>
            <p className="font-medium">
              {formatKg(record.allocatedKg)} / {formatKg(record.greenWeightKg)} KG
            </p>
          </div>
          {record.notes && (
            <div className="sm:col-span-2">
              <p className="text-soft">Notes</p>
              <p>{record.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {pending > 0.001 && (
        <Card>
          <CardHeader>
            <CardTitle>Allocate to dryer</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onAllocate} className="space-y-3">
              {allocError && (
                <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{allocError}</div>
              )}
              <FormField label="Dryer" required>
                <Select value={dryerId} onChange={(e) => setDryerId(e.target.value)} required>
                  <option value="">Select dryer</option>
                  {dryers
                    .filter((d) => d.status === 'available' || d.status === 'running')
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.capacityKg} KG) — {d.status}
                      </option>
                    ))}
                </Select>
              </FormField>
              <FormField label={`Quantity KG (max ${formatKg(pending)})`} required>
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.001"
                  max={pending}
                  value={allocatedKg}
                  onChange={(e) => setAllocatedKg(e.target.value)}
                  required
                />
              </FormField>
              <Button type="submit" className="w-full" disabled={busy || !dryerId}>
                {busy ? 'Allocating…' : 'Allocate & create batch'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Allocations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {allocations.length === 0 && <p className="text-sm text-soft">Not allocated yet</p>}
          {allocations.map((a) => (
            <div key={a.id} className="flex justify-between rounded-lg border border-line px-3 py-2 text-sm">
              <span>{formatKg(a.allocatedKg)} KG</span>
              <Badge variant="success">Batch linked</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
