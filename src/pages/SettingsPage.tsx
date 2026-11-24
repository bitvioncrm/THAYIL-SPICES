import { useEffect, useState } from 'react'
import { PageHero } from '@/components/brand/PageHero'
import { PageHeader } from '@/components/common/PageHeader'
import { FormField } from '@/components/common/FormField'
import { LoadingState } from '@/components/common/LoadingState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { sdb } from '@/db/simple-db'
import { clearDemoData, seedDemoData } from '@/services/simple/demo'
import type { RateMethod, SimpleSettings } from '@/types/simple'
import { RATE_METHOD_LABELS } from '@/lib/simple-defaults'
import { nowISO } from '@/lib/utils'

export function SettingsPage() {
  const [settings, setSettings] = useState<SimpleSettings | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    sdb.settings.get('main').then((s) => setSettings(s ?? null))
  }, [])

  if (!settings) return <LoadingState />

  const set = (key: keyof SimpleSettings, value: string | number | boolean) =>
    setSettings({ ...settings, [key]: value } as SimpleSettings)

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await sdb.settings.put({ ...settings, updatedAt: nowISO() })
      setMessage('Settings saved. Data is stored locally on this device (IndexedDB).')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  const onLogo = (file: File | null) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => set('logoDataUrl', String(reader.result))
    reader.readAsDataURL(file)
  }

  const onSeed = async () => {
    setBusy(true)
    try {
      await seedDemoData()
      setMessage('Demo data loaded (8 Kerala farmers + daily entries). Marked as DEMO DATA.')
      const s = await sdb.settings.get('main')
      if (s) setSettings(s)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Seed failed')
    } finally {
      setBusy(false)
    }
  }

  const onClearDemo = async () => {
    if (!confirm('Remove all DEMO DATA farmers and related entries/bills?')) return
    setBusy(true)
    try {
      await clearDemoData()
      setMessage('Demo data cleared.')
      const s = await sdb.settings.get('main')
      if (s) setSettings(s)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Clear failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-5 pb-4">
      <PageHeader title="Settings" subtitle="Business profile & demo data" />
      <PageHero
        title="Business profile"
        description="Logo, contact details and default rates for bills printed from this device."
      />
      <form
        onSubmit={onSave}
        className="mx-auto max-w-xl space-y-3 rounded-2xl border border-[#DCE6DE] bg-[#FFFEFA] p-4 shadow-soft dark:border-line dark:bg-surface"
      >
        {message && <div className="rounded-lg bg-light-green px-3 py-2 text-sm text-forest">{message}</div>}
        {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

        <p className="text-xs text-soft">
          Storage: local IndexedDB on this device — not cloud-synced unless you later connect a
          private backend.
        </p>

        <FormField label="Business name">
          <Input value={settings.businessName} onChange={(e) => set('businessName', e.target.value)} />
        </FormField>
        <FormField label="Address">
          <Textarea value={settings.address} onChange={(e) => set('address', e.target.value)} rows={2} />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Phone">
            <Input value={settings.phone} onChange={(e) => set('phone', e.target.value)} />
          </FormField>
          <FormField label="WhatsApp">
            <Input value={settings.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} />
          </FormField>
        </div>
        <FormField label="Logo">
          <div className="flex items-center gap-3">
            {settings.logoDataUrl && (
              <img
                src={settings.logoDataUrl}
                alt="Logo"
                className="h-12 w-12 rounded-lg border border-line object-cover"
              />
            )}
            <Input type="file" accept="image/*" onChange={(e) => onLogo(e.target.files?.[0] ?? null)} />
          </div>
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Default rate">
            <Input
              type="number"
              inputMode="decimal"
              value={settings.defaultRate}
              onChange={(e) => set('defaultRate', Number(e.target.value))}
            />
          </FormField>
          <FormField label="Default method">
            <Select
              value={settings.defaultRateMethod}
              onChange={(e) => set('defaultRateMethod', e.target.value as RateMethod)}
            >
              {Object.entries(RATE_METHOD_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </FormField>
        </div>
        <FormField label="Bill footer">
          <Textarea
            value={settings.invoiceFooter ?? ''}
            onChange={(e) => set('invoiceFooter', e.target.value)}
            rows={2}
          />
        </FormField>
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? 'Saving…' : 'Save settings'}
        </Button>
      </form>

      <div className="mx-auto mt-4 max-w-xl space-y-2 rounded-xl border border-gold/40 bg-gold/10 p-4">
        <h3 className="font-display font-semibold text-forest">Demo data</h3>
        <p className="text-sm text-soft">
          Load sample Kerala farmers and daily entries for preview. Clearly marked DEMO. Safe to
          reset anytime.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="gold" onClick={onSeed} disabled={busy}>
            Load demo data
          </Button>
          <Button variant="outline" onClick={onClearDemo} disabled={busy}>
            Clear demo data
          </Button>
        </div>
      </div>
    </div>
  )
}
