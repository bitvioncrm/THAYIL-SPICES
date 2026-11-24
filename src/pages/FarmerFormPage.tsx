import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { FormField } from '@/components/common/FormField'
import { LoadingState } from '@/components/common/LoadingState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { createFarmer, getFarmer, updateFarmer } from '@/services/simple/farmers'
import { getSimpleSettings } from '@/services/simple/ids'
import type { RateMethod } from '@/types/simple'
import { RATE_METHOD_LABELS } from '@/lib/simple-defaults'

export function FarmerFormPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const [loading, setLoading] = useState(isEdit)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    whatsapp: '',
    address: '',
    plantationName: '',
    plantationLocation: '',
    notes: '',
    status: 'active' as 'active' | 'inactive',
    defaultRate: 15,
    rateMethod: 'per_green_kg' as RateMethod,
  })

  useEffect(() => {
    ;(async () => {
      const s = await getSimpleSettings()
      if (!id) {
        setForm((f) => ({
          ...f,
          defaultRate: s.defaultRate,
          rateMethod: s.defaultRateMethod,
        }))
        setLoading(false)
        return
      }
      const farmer = await getFarmer(id)
      if (!farmer) {
        setError('Farmer not found')
        setLoading(false)
        return
      }
      setForm({
        fullName: farmer.fullName,
        phone: farmer.phone,
        whatsapp: farmer.whatsapp ?? '',
        address: farmer.address ?? '',
        plantationName: farmer.plantationName ?? '',
        plantationLocation: farmer.plantationLocation ?? '',
        notes: farmer.notes ?? '',
        status: farmer.status,
        defaultRate: farmer.defaultRate,
        rateMethod: farmer.rateMethod,
      })
      setLoading(false)
    })()
  }, [id])

  const set = (key: string, value: string | number) =>
    setForm((f) => ({ ...f, [key]: value }))

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      if (!form.fullName.trim() || form.phone.trim().length < 10) {
        throw new Error('Name and valid phone are required')
      }
      if (form.defaultRate < 0) throw new Error('Rate cannot be negative')
      const farmer =
        isEdit && id
          ? await updateFarmer(id, form)
          : await createFarmer(form)
      navigate(`/farmers/${farmer.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <LoadingState />

  return (
    <div>
      <PageHeader
        title={isEdit ? 'Edit Farmer' : 'Add Farmer'}
        backTo={isEdit && id ? `/farmers/${id}` : '/farmers'}
      />
      <form
        onSubmit={onSubmit}
        className="mx-auto max-w-xl space-y-3 rounded-2xl border border-[#DCE6DE] bg-[#FFFEFA] p-4 shadow-soft dark:border-line dark:bg-surface"
      >
        {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        <FormField label="Full name" required>
          <Input value={form.fullName} onChange={(e) => set('fullName', e.target.value)} required />
        </FormField>
        <FormField label="Phone" required>
          <Input value={form.phone} onChange={(e) => set('phone', e.target.value)} inputMode="tel" required />
        </FormField>
        <FormField label="WhatsApp">
          <Input value={form.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} inputMode="tel" />
        </FormField>
        <FormField label="Address">
          <Textarea value={form.address} onChange={(e) => set('address', e.target.value)} rows={2} />
        </FormField>
        <FormField label="Plantation name">
          <Input value={form.plantationName} onChange={(e) => set('plantationName', e.target.value)} />
        </FormField>
        <FormField label="Location">
          <Input
            value={form.plantationLocation}
            onChange={(e) => set('plantationLocation', e.target.value)}
          />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Default rate" required>
            <Input
              type="number"
              inputMode="decimal"
              step="0.01"
              value={form.defaultRate}
              onChange={(e) => set('defaultRate', Number(e.target.value))}
              required
            />
          </FormField>
          <FormField label="Rate method" required>
            <Select
              value={form.rateMethod}
              onChange={(e) => set('rateMethod', e.target.value as RateMethod)}
            >
              {Object.entries(RATE_METHOD_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </FormField>
        </div>
        <FormField label="Status">
          <Select value={form.status} onChange={(e) => set('status', e.target.value)}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
        </FormField>
        <FormField label="Notes">
          <Textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2} />
        </FormField>
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? 'Saving…' : isEdit ? 'Update farmer' : 'Create farmer'}
        </Button>
      </form>
    </div>
  )
}
