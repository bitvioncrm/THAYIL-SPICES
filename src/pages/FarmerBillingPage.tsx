import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CalendarDays, FileSpreadsheet } from 'lucide-react'
import { HeroStat, PageHero } from '@/components/brand/PageHero'
import { PageHeader } from '@/components/common/PageHeader'
import { FormField } from '@/components/common/FormField'
import { LoadingState } from '@/components/common/LoadingState'
import { ErrorState } from '@/components/common/ErrorState'
import { KpiCard } from '@/components/common/KpiCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getFarmer, getFarmerTotals } from '@/services/simple/farmers'
import { finalizeBill, listBills, previewBill } from '@/services/simple/billing'
import { recordPayment } from '@/services/simple/payments'
import type { Bill, BillPeriodType, DailyEntry, SimpleFarmer } from '@/types/simple'
import { eachDayYmd, formatBusinessDate, formatKg, formatMoney } from '@/lib/utils'

function periodHint(type: BillPeriodType, from: string, to: string) {
  if (type === 'daily') return `Daily report — only ${formatBusinessDate(from, true)}`
  if (type === 'weekly') {
    return `Weekly report — 7 days ${formatBusinessDate(from)} → ${formatBusinessDate(to)}`
  }
  return `Period ${formatBusinessDate(from)} → ${formatBusinessDate(to)}`
}

function WeeklyDayPreview({
  from,
  to,
  entries,
}: {
  from: string
  to: string
  entries: DailyEntry[]
}) {
  const byDate = useMemo(() => {
    const map = new Map<string, DailyEntry[]>()
    for (const e of entries) {
      const list = map.get(e.entryDate) ?? []
      list.push(e)
      map.set(e.entryDate, list)
    }
    return map
  }, [entries])

  const days = eachDayYmd(from, to)

  return (
    <div className="overflow-x-auto rounded-xl border border-[#DCE6DE] dark:border-line">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-forest text-white">
          <tr>
            <th className="px-3 py-2.5">Day</th>
            <th className="px-3 py-2.5">Date</th>
            <th className="px-3 py-2.5">Green</th>
            <th className="px-3 py-2.5">Dry</th>
            <th className="px-3 py-2.5">Loss</th>
            <th className="px-3 py-2.5">Charge</th>
          </tr>
        </thead>
        <tbody>
          {days.map((day) => {
            const dayEntries = byDate.get(day) ?? []
            const green = dayEntries.reduce((s, e) => s + e.greenKg, 0)
            const dry = dayEntries.reduce((s, e) => s + e.dryKg, 0)
            const loss = dayEntries.reduce((s, e) => s + e.lossKg, 0)
            const charge = dayEntries.reduce((s, e) => s + e.labourCharge, 0)
            const empty = dayEntries.length === 0
            return (
              <tr
                key={day}
                className={`border-t border-line ${empty ? 'bg-mist/20 text-soft' : 'odd:bg-light-green/30'}`}
              >
                <td className="px-3 py-2 font-medium whitespace-nowrap">
                  {formatBusinessDate(day, true).split(',')[0]}
                </td>
                <td className="px-3 py-2 whitespace-nowrap tabular-nums">{day}</td>
                <td className="px-3 py-2 tabular-nums">{empty ? '—' : formatKg(green)}</td>
                <td className="px-3 py-2 tabular-nums">{empty ? '—' : formatKg(dry)}</td>
                <td className="px-3 py-2 tabular-nums">{empty ? '—' : formatKg(loss)}</td>
                <td className="px-3 py-2 tabular-nums font-medium">
                  {empty ? '—' : formatMoney(charge)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export function FarmerBillingPage() {
  const { farmerId } = useParams()
  const navigate = useNavigate()
  const [farmer, setFarmer] = useState<SimpleFarmer | null>(null)
  const [totals, setTotals] = useState<Awaited<ReturnType<typeof getFarmerTotals>> | null>(null)
  const [bills, setBills] = useState<Bill[]>([])
  const [periodType, setPeriodType] = useState<BillPeriodType>('daily')
  const [anchor, setAnchor] = useState(
    new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }),
  )
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [paidNow, setPaidNow] = useState('')
  const [preview, setPreview] = useState<Awaited<ReturnType<typeof previewBill>> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [payAmount, setPayAmount] = useState('')

  const reload = async () => {
    if (!farmerId) return
    const [f, t, b] = await Promise.all([
      getFarmer(farmerId),
      getFarmerTotals(farmerId),
      listBills(farmerId),
    ])
    if (!f) throw new Error('Farmer not found')
    setFarmer(f)
    setTotals(t)
    setBills(b)
  }

  useEffect(() => {
    reload().catch((e) => setError(e instanceof Error ? e.message : 'Failed'))
  }, [farmerId])

  useEffect(() => {
    if (!farmerId) return
    let cancelled = false
    previewBill({
      farmerId,
      periodType,
      anchorDate: anchor,
      customFrom,
      customTo,
    })
      .then((p) => {
        if (!cancelled) setPreview(p)
      })
      .catch(() => {
        if (!cancelled) setPreview(null)
      })
    return () => {
      cancelled = true
    }
  }, [farmerId, periodType, anchor, customFrom, customTo])

  const onGenerate = async () => {
    if (!farmerId) return
    setBusy(true)
    setError(null)
    try {
      const bill = await finalizeBill({
        farmerId,
        periodType,
        anchorDate: anchor,
        customFrom,
        customTo,
        amountPaid: paidNow ? Number(paidNow) : 0,
      })
      navigate(`/bills/${bill.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate bill')
    } finally {
      setBusy(false)
    }
  }

  const onRecordPayment = async () => {
    if (!farmerId || !payAmount) return
    setBusy(true)
    try {
      await recordPayment({
        farmerId,
        paymentDate: new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }),
        amount: Number(payAmount),
        method: 'cash',
      })
      setPayAmount('')
      await reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Payment failed')
    } finally {
      setBusy(false)
    }
  }

  if (error && !farmer) return <ErrorState message={error} />
  if (!farmer || !totals) return <LoadingState />

  return (
    <div className="space-y-5 pb-4">
      <PageHeader
        title={farmer.fullName}
        subtitle="Billing workspace"
        backTo="/billing"
        actions={
          <Button asChild size="sm" variant="outline">
            <Link to={`/farmers/${farmer.id}`}>Profile</Link>
          </Button>
        }
      />

      <PageHero
        title="Generate period bill"
        description="Daily = that date only. Weekly = full 7 days with each date on the PDF."
      >
        <HeroStat label="Outstanding" value={formatMoney(totals.outstanding)} gold />
        <HeroStat label="Charges" value={formatMoney(totals.totalCharges)} />
      </PageHero>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <KpiCard label="Outstanding" value={formatMoney(totals.outstanding)} accent="gold" />
        <KpiCard label="Green KG" value={formatKg(totals.totalGreenKg)} accent="forest" />
        <KpiCard label="Dry KG" value={formatKg(totals.totalDryKg)} accent="emerald" />
        <KpiCard label="Charges" value={formatMoney(totals.totalCharges)} />
        <KpiCard label="Paid" value={formatMoney(totals.totalPaid)} accent="forest" />
      </div>

      <Card className="overflow-hidden border-[#DCE6DE] shadow-soft">
        <CardHeader className="border-b border-line bg-gradient-to-r from-forest/5 to-gold/5">
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-forest" />
            Generate bill
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-4">
          {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Billing period">
              <Select
                value={periodType}
                onChange={(e) => setPeriodType(e.target.value as BillPeriodType)}
              >
                <option value="daily">Daily (single day)</option>
                <option value="weekly">Weekly (7 days)</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
                <option value="custom">Custom range</option>
              </Select>
            </FormField>
            {periodType !== 'custom' ? (
              <FormField label={periodType === 'weekly' ? 'Any date in the week' : 'Report date'}>
                <Input type="date" value={anchor} onChange={(e) => setAnchor(e.target.value)} />
              </FormField>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:col-span-2">
                <FormField label="From">
                  <Input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
                </FormField>
                <FormField label="To">
                  <Input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
                </FormField>
              </div>
            )}
          </div>

          {preview && (
            <>
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-gold/25 bg-[#FFF9EF] px-3 py-2 text-sm text-forest dark:border-line dark:bg-mist/30">
                <CalendarDays className="h-4 w-4 shrink-0 text-gold" />
                <span className="font-medium">
                  {periodHint(periodType, preview.from, preview.to)}
                </span>
                {preview.skippedBilled.length > 0 && (
                  <Badge variant="muted">{preview.skippedBilled.length} already billed (skipped)</Badge>
                )}
              </div>

              {periodType === 'weekly' ? (
                <WeeklyDayPreview from={preview.from} to={preview.to} entries={preview.entries} />
              ) : (
                <div className="overflow-x-auto rounded-xl border border-[#DCE6DE] dark:border-line">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-forest text-white">
                      <tr>
                        <th className="px-3 py-2.5">Date</th>
                        <th className="px-3 py-2.5">Green</th>
                        <th className="px-3 py-2.5">Dry</th>
                        <th className="px-3 py-2.5">Loss</th>
                        <th className="px-3 py-2.5">Rate</th>
                        <th className="px-3 py-2.5">Charge</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.entries.map((e) => (
                        <tr key={e.id} className="border-t border-line odd:bg-light-green/30">
                          <td className="px-3 py-2 whitespace-nowrap">
                            {formatBusinessDate(e.entryDate, true)}
                          </td>
                          <td className="px-3 py-2 tabular-nums">{formatKg(e.greenKg)}</td>
                          <td className="px-3 py-2 tabular-nums">{formatKg(e.dryKg)}</td>
                          <td className="px-3 py-2 tabular-nums">{formatKg(e.lossKg)}</td>
                          <td className="px-3 py-2 tabular-nums">{formatMoney(e.rate)}</td>
                          <td className="px-3 py-2 tabular-nums font-medium">
                            {formatMoney(e.labourCharge)}
                          </td>
                        </tr>
                      ))}
                      {preview.entries.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-3 py-6 text-center text-soft">
                            {periodType === 'daily'
                              ? 'No unbilled entry on this day'
                              : 'No unbilled entries in this period'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="grid gap-2 rounded-xl border border-forest/10 bg-gradient-to-br from-light-green/70 to-[#FFFDF8] px-4 py-3 text-sm sm:grid-cols-2">
                <p>
                  Total green: <span className="font-medium tabular-nums">{formatKg(preview.totalGreenKg)} KG</span>
                </p>
                <p>
                  Total dry: <span className="font-medium tabular-nums">{formatKg(preview.totalDryKg)} KG</span>
                </p>
                <p>
                  Total loss: <span className="font-medium tabular-nums">{formatKg(preview.totalLossKg)} KG</span>
                </p>
                <p>
                  Total charges: <span className="font-medium tabular-nums">{formatMoney(preview.totalCharges)}</span>
                </p>
                <p>
                  Previous balance:{' '}
                  <span className="font-medium tabular-nums">{formatMoney(preview.previousBalance)}</span>
                </p>
                <p className="font-display text-base font-semibold text-forest sm:col-span-2">
                  Current bill: {formatMoney(preview.currentBillAmount)}
                </p>
              </div>
            </>
          )}

          <FormField label="Amount paid now (optional)">
            <Input
              type="number"
              inputMode="decimal"
              step="0.01"
              value={paidNow}
              onChange={(e) => setPaidNow(e.target.value)}
            />
          </FormField>
          <Button
            className="w-full"
            onClick={onGenerate}
            disabled={busy || !preview?.entries.length}
          >
            {busy ? 'Generating…' : 'Generate & finalize bill'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Record payment</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 sm:flex-row">
          <Input
            type="number"
            inputMode="decimal"
            placeholder="Amount"
            value={payAmount}
            onChange={(e) => setPayAmount(e.target.value)}
          />
          <Button onClick={onRecordPayment} disabled={busy || !payAmount}>
            Save payment
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Previous bills</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {bills.length === 0 && <p className="text-sm text-soft">No bills yet</p>}
          {bills.map((b) => (
            <Link
              key={b.id}
              to={`/bills/${b.id}`}
              className="flex items-center justify-between rounded-xl border border-line bg-[#FFFEFA] px-3 py-2.5 text-sm transition hover:border-gold/40 dark:bg-surface"
            >
              <div>
                <p className="font-medium">{b.billCode}</p>
                <p className="text-xs text-soft">
                  {b.periodType.toUpperCase()} · {formatBusinessDate(b.periodFrom)}
                  {b.periodFrom !== b.periodTo ? ` → ${formatBusinessDate(b.periodTo)}` : ''}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold">{formatMoney(b.currentBillAmount)}</p>
                <Badge variant={b.status === 'cancelled' ? 'danger' : 'success'}>{b.status}</Badge>
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
