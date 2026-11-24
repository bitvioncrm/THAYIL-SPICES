import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Download } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { LoadingState } from '@/components/common/LoadingState'
import { ErrorState } from '@/components/common/ErrorState'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { cancelInvoice, getInvoice, getInvoiceItems } from '@/services/billing'
import { getFarmer } from '@/services/farmers'
import { getSettings } from '@/services/settings'
import { db } from '@/db/database'
import { generateInvoicePdf, printPdf, saveOrSharePdf } from '@/lib/pdf'
import { formatDate, formatKg, formatMoney } from '@/lib/utils'
import type { Farmer, Invoice, InvoiceItem, DryingBatch } from '@/types'

export function InvoiceDetailPage() {
  const { id } = useParams()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [items, setItems] = useState<InvoiceItem[]>([])
  const [farmer, setFarmer] = useState<Farmer | null>(null)
  const [batches, setBatches] = useState<DryingBatch[]>([])
  const [error, setError] = useState<string | null>(null)

  const reload = async () => {
    if (!id) return
    const inv = await getInvoice(id)
    if (!inv) throw new Error('Invoice not found')
    setInvoice(inv)
    setItems(await getInvoiceItems(inv.id))
    setFarmer((await getFarmer(inv.farmerId)) ?? null)
    setBatches((await db.dryingBatches.bulkGet(inv.batchIds)).filter(Boolean) as DryingBatch[])
  }

  useEffect(() => {
    reload().catch((e) => setError(e instanceof Error ? e.message : 'Failed'))
  }, [id])

  const download = async () => {
    if (!invoice || !farmer) return
    const settings = await getSettings()
    const doc = generateInvoicePdf(settings, farmer, invoice, items, batches)
    await saveOrSharePdf(doc, `${invoice.invoiceCode}.pdf`, 'invoice')
  }

  const print = async () => {
    if (!invoice || !farmer) return
    const settings = await getSettings()
    printPdf(generateInvoicePdf(settings, farmer, invoice, items, batches))
  }

  const onCancel = async () => {
    if (!invoice || !confirm('Cancel this invoice? This will be recorded in audit logs.')) return
    await cancelInvoice(invoice.id, 'Cancelled by user')
    await reload()
  }

  if (error) return <ErrorState message={error} />
  if (!invoice) return <LoadingState />

  return (
    <div className="space-y-4">
      <PageHeader
        title={invoice.invoiceCode}
        subtitle={farmer?.fullName}
        backTo="/invoices"
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
        <Badge>{invoice.status}</Badge>
        <Badge variant={invoice.paymentStatus === 'paid' ? 'success' : 'warning'}>
          {invoice.paymentStatus}
        </Badge>
      </div>
      <Card>
        <CardContent className="grid gap-2 pt-4 text-sm sm:grid-cols-2">
          <div>
            <p className="text-soft">Date</p>
            <p className="font-medium">{formatDate(invoice.invoiceDate)}</p>
          </div>
          <div>
            <p className="text-soft">Green / Dry / Loss</p>
            <p className="font-medium tabular-nums">
              {formatKg(invoice.greenInputKg)} / {formatKg(invoice.dryOutputKg)} /{' '}
              {formatKg(invoice.dryingLossKg)} KG
            </p>
          </div>
          <div>
            <p className="text-soft">Drying charges</p>
            <p className="font-semibold">{formatMoney(invoice.dryingCharges)}</p>
          </div>
          <div>
            <p className="text-soft">Additional</p>
            <p className="font-medium">{formatMoney(invoice.additionalCharges)}</p>
          </div>
          <div>
            <p className="text-soft">Previous balance</p>
            <p className="font-medium">{formatMoney(invoice.previousBalance)}</p>
          </div>
          <div>
            <p className="text-soft">Total</p>
            <p className="font-semibold text-forest">{formatMoney(invoice.totalAmount)}</p>
          </div>
          <div>
            <p className="text-soft">Paid</p>
            <p className="font-medium">{formatMoney(invoice.paidAmount)}</p>
          </div>
          <div>
            <p className="text-soft">Remaining</p>
            <p className="font-semibold">{formatMoney(invoice.remainingBalance)}</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="space-y-2 pt-4">
          {items.map((i) => (
            <div key={i.id} className="flex justify-between border-b border-line py-2 text-sm">
              <span>{i.description}</span>
              <span className="tabular-nums font-medium">{formatMoney(i.amount)}</span>
            </div>
          ))}
        </CardContent>
      </Card>
      {invoice.status === 'finalized' && (
        <Button variant="destructive" className="w-full" onClick={onCancel}>
          Cancel invoice
        </Button>
      )}
    </div>
  )
}
