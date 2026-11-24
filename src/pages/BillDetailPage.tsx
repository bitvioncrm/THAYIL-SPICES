import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Download } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { LoadingState } from '@/components/common/LoadingState'
import { ErrorState } from '@/components/common/ErrorState'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { cancelBill, getBill } from '@/services/simple/billing'
import { getFarmer } from '@/services/simple/farmers'
import { getSimpleSettings } from '@/services/simple/ids'
import { sdb } from '@/db/simple-db'
import { generatePeriodBillPdf, printPdfDoc, savePdf } from '@/lib/simple-pdf'
import { formatKg, formatMoney } from '@/lib/utils'
import type { Bill, DailyEntry, SimpleFarmer } from '@/types/simple'

export function BillDetailPage() {
  const { id } = useParams()
  const [bill, setBill] = useState<Bill | null>(null)
  const [farmer, setFarmer] = useState<SimpleFarmer | null>(null)
  const [entries, setEntries] = useState<DailyEntry[]>([])
  const [error, setError] = useState<string | null>(null)

  const reload = async () => {
    if (!id) return
    const b = await getBill(id)
    if (!b) throw new Error('Bill not found')
    setBill(b)
    setFarmer((await getFarmer(b.farmerId)) ?? null)
    const ents = await sdb.dailyEntries.bulkGet(b.entryIds)
    setEntries(ents.filter(Boolean) as DailyEntry[])
  }

  useEffect(() => {
    reload().catch((e) => setError(e instanceof Error ? e.message : 'Failed'))
  }, [id])

  const download = async () => {
    if (!bill || !farmer) return
    const settings = await getSimpleSettings()
    const doc = generatePeriodBillPdf(settings, farmer, bill, entries)
    await savePdf(doc, `${bill.billCode}.pdf`)
  }

  const print = async () => {
    if (!bill || !farmer) return
    const settings = await getSimpleSettings()
    printPdfDoc(generatePeriodBillPdf(settings, farmer, bill, entries))
  }

  const onCancel = async () => {
    if (!bill || !confirm('Cancel this bill and free its daily entries?')) return
    await cancelBill(bill.id)
    await reload()
  }

  if (error) return <ErrorState message={error} />
  if (!bill) return <LoadingState />

  return (
    <div className="space-y-4">
      <PageHeader
        title={bill.billCode}
        subtitle={farmer?.fullName}
        backTo={farmer ? `/billing/${farmer.id}` : '/billing'}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={print}>
              Print
            </Button>
            <Button variant="secondary" size="sm" onClick={download}>
              <Download className="h-4 w-4" /> PDF
            </Button>
          </>
        }
      />
      <div className="flex flex-wrap gap-2">
        <Badge>{bill.status}</Badge>
        <Badge variant={bill.paymentStatus === 'paid' ? 'success' : 'warning'}>
          {bill.paymentStatus}
        </Badge>
        <Badge variant="muted">
          {bill.periodFrom} → {bill.periodTo}
        </Badge>
      </div>

      <Card>
        <CardContent className="grid gap-2 pt-4 text-sm sm:grid-cols-2">
          <div>
            <p className="text-soft">Green / Dry / Loss</p>
            <p className="font-medium tabular-nums">
              {formatKg(bill.totalGreenKg)} / {formatKg(bill.totalDryKg)} /{' '}
              {formatKg(bill.totalLossKg)} KG
            </p>
          </div>
          <div>
            <p className="text-soft">Total charges</p>
            <p className="font-semibold">{formatMoney(bill.totalCharges)}</p>
          </div>
          <div>
            <p className="text-soft">Previous balance</p>
            <p className="font-medium">{formatMoney(bill.previousBalance)}</p>
          </div>
          <div>
            <p className="text-soft">Current bill</p>
            <p className="font-semibold text-forest">{formatMoney(bill.currentBillAmount)}</p>
          </div>
          <div>
            <p className="text-soft">Paid</p>
            <p className="font-medium">{formatMoney(bill.amountPaidOnBill)}</p>
          </div>
          <div>
            <p className="text-soft">Final balance</p>
            <p className="font-semibold">{formatMoney(bill.finalBalance)}</p>
          </div>
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-2xl border border-[#DCE6DE] bg-[#FFFEFA] dark:border-line dark:bg-surface">
        <table className="min-w-full text-sm">
          <thead className="bg-forest text-white">
            <tr>
              <th className="px-3 py-2 text-left">Date</th>
              <th className="px-3 py-2 text-left">Green</th>
              <th className="px-3 py-2 text-left">Dry</th>
              <th className="px-3 py-2 text-left">Loss</th>
              <th className="px-3 py-2 text-left">Charge</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className="border-t border-line">
                <td className="px-3 py-2">{e.entryDate}</td>
                <td className="px-3 py-2 tabular-nums">{formatKg(e.greenKg)}</td>
                <td className="px-3 py-2 tabular-nums">{formatKg(e.dryKg)}</td>
                <td className="px-3 py-2 tabular-nums">{formatKg(e.lossKg)}</td>
                <td className="px-3 py-2 tabular-nums">{formatMoney(e.labourCharge)}</td>
              </tr>
            ))}
          </tbody>
        </table>
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
