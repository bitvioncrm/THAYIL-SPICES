import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { FormField } from '@/components/common/FormField'
import { LoadingState } from '@/components/common/LoadingState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { getFarmer } from '@/services/simple/farmers'
import {
  createDailyEntry,
  getEntry,
  updateDailyEntry,
  deleteDailyEntry,
} from '@/services/simple/entries'
import { calcLabourCharge, calcLoss } from '@/lib/simple-calc'
import { formatMoney } from '@/lib/utils'
import type { PaymentMethod, RateMethod, SimpleFarmer } from '@/types/simple'
import { RATE_METHOD_LABELS } from '@/lib/simple-defaults'

export function DailyEntryPage() {
  const { id: farmerId, entryId } = useParams()
  const navigate = useNavigate()
  const [farmer, setFarmer] = useState<SimpleFarmer | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [locked, setLocked] = useState(false)
  const [form, setForm] = useState({
    entryDate: new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }),
    greenKg: '',
    dryKg: '',
    bags: '',
    rate: '',
    rateMethod: 'per_green_kg' as RateMethod,
    amountPaid: '',
    paymentMethod: 'cash' as PaymentMethod,
    notes: '',
  })

  useEffect(() => {
    if (!farmerId) return
    ;(async () => {
      const f = await getFarmer(farmerId)
      if (!f) {
        setError('Farmer not found')
        return
      }
      setFarmer(f)
      if (entryId) {
        const e = await getEntry(entryId)
        if (!e) {
          setError('Entry not found')
          return
        }
        setLocked(Boolean(e.billedBillId))
        setForm({
          entryDate: e.entryDate,
          greenKg: String(e.greenKg),
          dryKg: String(e.dryKg),
          bags: e.bags != null ? String(e.bags) : '',
          rate: String(e.rate),
          rateMethod: e.rateMethod,
          amountPaid: String(e.amountPaid || ''),
          paymentMethod: (e.paymentMethod as PaymentMethod) || 'cash',
          notes: e.notes ?? '',
        })
      } else {
        setForm((prev) => ({
          ...prev,
          rate: String(f.defaultRate),
          rateMethod: f.rateMethod,
        }))
      }
    })()
  }, [farmerId, entryId])

  const preview = useMemo(() => {
    const greenKg = Number(form.greenKg) || 0
    const dryKg = Number(form.dryKg) || 0
    const bags = Number(form.bags) || 0
    const rate = Number(form.rate) || 0
    return {
      loss: calcLoss(greenKg, dryKg),
      charge: calcLabourCharge({
        method: form.rateMethod,
        rate,
        greenKg,
        dryKg,
        bags,
      }),
    }
  }, [form])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!farmerId || locked) return
    setBusy(true)
    setError(null)
    try {
      const payload = {
        farmerId,
        entryDate: form.entryDate,
        greenKg: Number(form.greenKg),
        dryKg: Number(form.dryKg),
        bags: form.bags ? Number(form.bags) : undefined,
        rate: Number(form.rate),
        rateMethod: form.rateMethod,
        amountPaid: form.amountPaid ? Number(form.amountPaid) : 0,
        paymentMethod: form.paymentMethod,
        notes: form.notes,
      }
      if (entryId) await updateDailyEntry(entryId, payload)
      else await createDailyEntry(payload)
      navigate(`/farmers/${farmerId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  const onDelete = async () => {
    if (!entryId || locked || !confirm('Delete this daily entry?')) return
    try {
      await deleteDailyEntry(entryId)
      navigate(`/farmers/${farmerId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  if (!farmer && !error) return <LoadingState />

  return (
    <div>
      <PageHeader
        title={entryId ? 'Edit Daily Entry' : 'Add Daily Entry'}
        subtitle={farmer?.fullName}
        backTo={`/farmers/${farmerId}`}
      />
      <form
        onSubmit={onSubmit}
        className="mx-auto max-w-xl space-y-3 rounded-2xl border border-[#DCE6DE] bg-[#FFFEFA] p-4 pb-28 shadow-soft dark:border-line dark:bg-surface md:pb-4"
      >
        {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        {locked && (
          <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            This entry is on a finalized bill. Cancel the bill before editing.
          </div>
        )}
        <FormField label="Entry date" required>
          <Input
            type="date"
            value={form.entryDate}
            onChange={(e) => setForm({ ...form, entryDate: e.target.value })}
            disabled={locked}
            required
          />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Green KG" required>
            <Input
              type="number"
              inputMode="decimal"
              step="0.001"
              value={form.greenKg}
              onChange={(e) => setForm({ ...form, greenKg: e.target.value })}
              disabled={locked}
              required
            />
          </FormField>
          <FormField label="Dry KG" required>
            <Input
              type="number"
              inputMode="decimal"
              step="0.001"
              value={form.dryKg}
              onChange={(e) => setForm({ ...form, dryKg: e.target.value })}
              disabled={locked}
              required
            />
          </FormField>
        </div>
        <FormField label="Number of bags (optional)">
          <Input
            type="number"
            inputMode="numeric"
            value={form.bags}
            onChange={(e) => setForm({ ...form, bags: e.target.value })}
            disabled={locked}
          />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Rate" required>
            <Input
              type="number"
              inputMode="decimal"
              step="0.01"
              value={form.rate}
              onChange={(e) => setForm({ ...form, rate: e.target.value })}
              disabled={locked}
              required
            />
          </FormField>
          <FormField label="Rate method" required>
            <Select
              value={form.rateMethod}
              onChange={(e) => setForm({ ...form, rateMethod: e.target.value as RateMethod })}
              disabled={locked}
            >
              {Object.entries(RATE_METHOD_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </FormField>
        </div>

        <div className="rounded-xl bg-light-green/70 px-4 py-3 text-sm">
          <p>
            Drying loss:{' '}
            <span className="font-semibold tabular-nums">{preview.loss.toFixed(3)} KG</span>
          </p>
          <p className="mt-1 font-display text-lg text-forest">
            Labour charge: {formatMoney(preview.charge)}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Amount paid">
            <Input
              type="number"
              inputMode="decimal"
              step="0.01"
              value={form.amountPaid}
              onChange={(e) => setForm({ ...form, amountPaid: e.target.value })}
              disabled={locked}
            />
          </FormField>
          <FormField label="Payment method">
            <Select
              value={form.paymentMethod}
              onChange={(e) =>
                setForm({ ...form, paymentMethod: e.target.value as PaymentMethod })
              }
              disabled={locked}
            >
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="other">Other</option>
            </Select>
          </FormField>
        </div>
        <FormField label="Notes">
          <Textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={2}
            disabled={locked}
          />
        </FormField>

        {!locked && (
          <div className="fixed inset-x-0 bottom-16 z-30 border-t border-line bg-surface/95 p-3 safe-bottom md:static md:border-0 md:bg-transparent md:p-0">
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? 'Saving…' : entryId ? 'Update entry' : 'Save daily entry'}
            </Button>
          </div>
        )}
        {entryId && !locked && (
          <Button type="button" variant="destructive" className="w-full" onClick={onDelete}>
            Delete entry
          </Button>
        )}
      </form>
    </div>
  )
}
