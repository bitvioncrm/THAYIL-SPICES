import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Download, Printer } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { LoadingState } from '@/components/common/LoadingState'
import { ErrorState } from '@/components/common/ErrorState'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cancelBill, getBill } from '@/services/simple/billing'
import { getFarmer } from '@/services/simple/farmers'
import { getSimpleSettings } from '@/services/simple/ids'
import { sdb } from '@/db/simple-db'
import { eachDayYmd, formatBusinessDate, formatKg, formatMoney } from '@/lib/utils'
import type { Bill, DailyEntry, SimpleFarmer } from '@/types/simple'

export function BillDetailPage() {
  const { id } = useParams()
  const [bill, setBill] = useState<Bill | null>(null)
  const [farmer, setFarmer] = useState<SimpleFarmer | null>(null)
  const [entries, setEntries] = useState<DailyEntry[]>([])
  const [error, setError] = useState<string | null>(null)
  const [pdfBusy, setPdfBusy] = useState(false)

  const reload = async () => {
    if (!id) return
    const b = await getBill(id)
    if (!b) throw new Error('Bill not found')
    setBill(b)
    const [f, ents] = await Promise.all([
      getFarmer(b.farmerId),
      sdb.dailyEntries.bulkGet(b.entryIds),
    ])
    setFarmer(f ?? null)
    setEntries(
      (ents.filter(Boolean) as DailyEntry[]).sort((a, c) =>
        a.entryDate.localeCompare(c.entryDate),
      ),
    )
  }

  useEffect(() => {
    reload().catch((e) => setError(e instanceof Error ? e.message : 'Failed'))
  }, [id])

  const weeklyDays = useMemo(() => {
    if (!bill || bill.periodType !== 'weekly') return null
    const byDate = new Map<string, DailyEntry[]>()
    for (const e of entries) {
      const list = byDate.get(e.entryDate) ?? []
      list.push(e)
      byDate.set(e.entryDate, list)
    }
    return eachDayYmd(bill.periodFrom, bill.periodTo).map((day) => {
      const dayEntries = byDate.get(day) ?? []
      return {
        day,
        green: dayEntries.reduce((s, e) => s + e.greenKg, 0),
        dry: dayEntries.reduce((s, e) => s + e.dryKg, 0),
        loss: dayEntries.reduce((s, e) => s + e.lossKg, 0),
        charge: dayEntries.reduce((s, e) => s + e.labourCharge, 0),
        empty: dayEntries.length === 0,
      }
    })
  }, [bill, entries])

  const loadPdf = async () => {
    if (!bill || !farmer) return null
    const [{ generatePeriodBillPdf }, settings] = await Promise.all([
      import('@/lib/simple-pdf'),
      getSimpleSettings(),
    ])
    return { generatePeriodBillPdf, settings }
  }

  const download = async () => {
    if (!bill || !farmer) return
    setPdfBusy(true)
    try {
      const mod = await loadPdf()
      if (!mod) return
      const { savePdf } = await import('@/lib/simple-pdf')
      const doc = mod.generatePeriodBillPdf(mod.settings, farmer, bill, entries)
      await savePdf(doc, `${bill.billCode}.pdf`)
    } finally {
      setPdfBusy(false)
    }
  }

  const print = async () => {
    if (!bill || !farmer) return
    setPdfBusy(true)
    try {
      const mod = await loadPdf()
      if (!mod) return
      const { printPdfDoc } = await import('@/lib/simple-pdf')
      printPdfDoc(mod.generatePeriodBillPdf(mod.settings, farmer, bill, entries))
    } finally {
      setPdfBusy(false)
    }
  }

  const onCancel = async () => {
    if (!bill || !confirm('Cancel this bill and free its daily entries?')) return
    await cancelBill(bill.id)
    await reload()
  }

  if (error) return <ErrorState message={error} />
  if (!bill) return <LoadingState />

  const periodLabel =
    bill.periodType === 'daily'
      ? `Daily · ${formatBusinessDate(bill.periodFrom, true)}`
      : bill.periodType === 'weekly'
        ? `Weekly · ${formatBusinessDate(bill.periodFrom)} → ${formatBusinessDate(bill.periodTo)}`
        : `${bill.periodType} · ${formatBusinessDate(bill.periodFrom)} → ${formatBusinessDate(bill.periodTo)}`

  return (
    <div className="space-y-4 pb-4">
      <PageHeader
        title={bill.billCode}
        subtitle={farmer?.fullName}
        backTo={farmer ? `/billing/${farmer.id}` : '/billing'}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={print} disabled={pdfBusy || !farmer}>
              <Printer className="h-4 w-4" /> Print
            </Button>
            <Button variant="secondary" size="sm" onClick={download} disabled={pdfBusy || !farmer}>
              <Download className="h-4 w-4" /> {pdfBusy ? '…' : 'PDF'}
            </Button>
          </>
        }
      />

      <div className="overflow-hidden rounded-2xl border border-[#DCE6DE] bg-[#FFFEFA] shadow-soft dark:border-line dark:bg-surface">
        <div className="bg-forest px-4 py-3 text-white">
          <p className="text-[10px] uppercase tracking-[0.18em] text-gold">Farmer bill</p>
          <p className="font-display text-xl font-semibold">{farmer?.fullName ?? '—'}</p>
          <p className="text-sm text-white/80">{periodLabel}</p>
        </div>
        <div className="flex flex-wrap gap-2 px-4 py-3">
          <Badge>{bill.status}</Badge>
          <Badge variant={bill.paymentStatus === 'paid' ? 'success' : 'warning'}>
            {bill.paymentStatus}
          </Badge>
          <Badge variant="muted">{bill.periodType}</Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-xl bg-light-green/50 px-3 py-2">
            <p className="text-soft">Green / Dry / Loss</p>
            <p className="font-medium tabular-nums">
              {formatKg(bill.totalGreenKg)} / {formatKg(bill.totalDryKg)} /{' '}
              {formatKg(bill.totalLossKg)} KG
            </p>
          </div>
          <div className="rounded-xl bg-light-green/50 px-3 py-2">
            <p className="text-soft">Total charges</p>
            <p className="font-semibold tabular-nums">{formatMoney(bill.totalCharges)}</p>
          </div>
          <div>
            <p className="text-soft">Previous balance</p>
            <p className="font-medium tabular-nums">{formatMoney(bill.previousBalance)}</p>
          </div>
          <div>
            <p className="text-soft">Current bill</p>
            <p className="font-semibold tabular-nums text-forest">
              {formatMoney(bill.currentBillAmount)}
            </p>
          </div>
          <div>
            <p className="text-soft">Paid</p>
            <p className="font-medium tabular-nums">{formatMoney(bill.amountPaidOnBill)}</p>
          </div>
          <div>
            <p className="text-soft">Final balance</p>
            <p className="font-semibold tabular-nums">{formatMoney(bill.finalBalance)}</p>
          </div>
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-2xl border border-[#DCE6DE] bg-[#FFFEFA] dark:border-line dark:bg-surface">
        {weeklyDays ? (
          <table className="min-w-full text-sm">
            <thead className="bg-forest text-white">
              <tr>
                <th className="px-3 py-2.5 text-left">Day</th>
                <th className="px-3 py-2.5 text-left">Date</th>
                <th className="px-3 py-2.5 text-left">Green</th>
                <th className="px-3 py-2.5 text-left">Dry</th>
                <th className="px-3 py-2.5 text-left">Loss</th>
                <th className="px-3 py-2.5 text-left">Charge</th>
              </tr>
            </thead>
            <tbody>
              {weeklyDays.map((row) => (
                <tr
                  key={row.day}
                  className={`border-t border-line ${row.empty ? 'text-soft' : ''}`}
                >
                  <td className="px-3 py-2 font-medium">
                    {formatBusinessDate(row.day, true).split(',')[0]}
                  </td>
                  <td className="px-3 py-2 tabular-nums">{row.day}</td>
                  <td className="px-3 py-2 tabular-nums">
                    {row.empty ? '—' : formatKg(row.green)}
                  </td>
                  <td className="px-3 py-2 tabular-nums">{row.empty ? '—' : formatKg(row.dry)}</td>
                  <td className="px-3 py-2 tabular-nums">{row.empty ? '—' : formatKg(row.loss)}</td>
                  <td className="px-3 py-2 tabular-nums font-medium">
                    {row.empty ? '—' : formatMoney(row.charge)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-forest text-white">
              <tr>
                <th className="px-3 py-2.5 text-left">Date</th>
                <th className="px-3 py-2.5 text-left">Green</th>
                <th className="px-3 py-2.5 text-left">Dry</th>
                <th className="px-3 py-2.5 text-left">Loss</th>
                <th className="px-3 py-2.5 text-left">Charge</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-t border-line">
                  <td className="px-3 py-2">{formatBusinessDate(e.entryDate, true)}</td>
                  <td className="px-3 py-2 tabular-nums">{formatKg(e.greenKg)}</td>
                  <td className="px-3 py-2 tabular-nums">{formatKg(e.dryKg)}</td>
                  <td className="px-3 py-2 tabular-nums">{formatKg(e.lossKg)}</td>
                  <td className="px-3 py-2 tabular-nums">{formatMoney(e.labourCharge)}</td>
                </tr>
              ))}
              {entries.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-soft">
                    No entries on this bill
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {bill.status === 'finalized' && (
        <Button variant="destructive" className="w-full" onClick={onCancel}>
          Cancel bill
        </Button>
      )}
      {farmer && (
        <Button asChild variant="outline" className="w-full">
          <Link to={`/billing/${farmer.id}`}>Back to billing workspace</Link>
        </Button>
      )}
    </div>
  )
}
