import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
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
import type { Bill, BillPeriodType, SimpleFarmer } from '@/types/simple'
import { formatKg, formatMoney } from '@/lib/utils'

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
    const f = await getFarmer(farmerId)
    if (!f) throw new Error('Farmer not found')
    setFarmer(f)
    setTotals(await getFarmerTotals(farmerId))
    setBills(await listBills(farmerId))
  }

  useEffect(() => {
    reload().catch((e) => setError(e instanceof Error ? e.message : 'Failed'))
  }, [farmerId])

  useEffect(() => {
    if (!farmerId) return
    previewBill({
      farmerId,
      periodType,
      anchorDate: anchor,
      customFrom,
      customTo,
    })
      .then(setPreview)
      .catch(() => setPreview(null))
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
        description="Preview unbilled entries, finalize the bill, and record payments."
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

      <Card>
        <CardHeader>
          <CardTitle>Generate bill</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          <FormField label="Billing period">
            <Select
              value={periodType}
              onChange={(e) => setPeriodType(e.target.value as BillPeriodType)}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
              <option value="custom">Custom range</option>
            </Select>
          </FormField>
          {periodType !== 'custom' ? (
            <FormField label="Date">
              <Input type="date" value={anchor} onChange={(e) => setAnchor(e.target.value)} />
            </FormField>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <FormField label="From">
                <Input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
              </FormField>
              <FormField label="To">
                <Input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
              </FormField>
            </div>
          )}

          {preview && (
            <>
              <p className="text-xs text-soft">
                Period {preview.from} → {preview.to}
                {preview.skippedBilled.length > 0 &&
                  ` · ${preview.skippedBilled.length} already billed (skipped)`}
              </p>
              <div className="overflow-x-auto rounded-lg border border-line">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-forest text-white">
                    <tr>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Green</th>
                      <th className="px-3 py-2">Dry</th>
                      <th className="px-3 py-2">Loss</th>
                      <th className="px-3 py-2">Rate</th>
                      <th className="px-3 py-2">Charge</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.entries.map((e) => (
                      <tr key={e.id} className="border-t border-line odd:bg-light-green/30">
                        <td className="px-3 py-2 whitespace-nowrap">{e.entryDate}</td>
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
                          No unbilled entries in this period
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="space-y-1 rounded-xl bg-light-green/60 px-4 py-3 text-sm">
                <p>Total green: {formatKg(preview.totalGreenKg)} KG</p>
                <p>Total dry: {formatKg(preview.totalDryKg)} KG</p>
                <p>Total loss: {formatKg(preview.totalLossKg)} KG</p>
                <p>Total charges: {formatMoney(preview.totalCharges)}</p>
                <p>Previous balance: {formatMoney(preview.previousBalance)}</p>
                <p className="font-display text-base font-semibold text-forest">
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
              className="flex items-center justify-between rounded-lg border border-line px-3 py-2.5 text-sm"
            >
              <div>
                <p className="font-medium">{b.billCode}</p>
                <p className="text-xs text-soft">
                  {b.periodFrom} → {b.periodTo}
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
