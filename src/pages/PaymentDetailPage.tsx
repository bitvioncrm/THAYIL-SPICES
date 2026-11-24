import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Download } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { LoadingState } from '@/components/common/LoadingState'
import { ErrorState } from '@/components/common/ErrorState'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { getPayment } from '@/services/payments'
import { getFarmer } from '@/services/farmers'
import { getSettings } from '@/services/settings'
import { generatePaymentPdf, printPdf, saveOrSharePdf } from '@/lib/pdf'
import { formatDate, formatMoney } from '@/lib/utils'
import type { Farmer, Payment } from '@/types'

export function PaymentDetailPage() {
  const { id } = useParams()
  const [payment, setPayment] = useState<Payment | null>(null)
  const [farmer, setFarmer] = useState<Farmer | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    ;(async () => {
      try {
        const p = await getPayment(id)
        if (!p) throw new Error('Payment not found')
        setPayment(p)
        setFarmer((await getFarmer(p.farmerId)) ?? null)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed')
      }
    })()
  }, [id])

  if (error) return <ErrorState message={error} />
  if (!payment) return <LoadingState />

  const download = async () => {
    if (!farmer) return
    const settings = await getSettings()
    await saveOrSharePdf(
      generatePaymentPdf(settings, farmer, payment),
      `${payment.paymentCode}.pdf`,
      'payment',
    )
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={payment.paymentCode}
        subtitle={farmer?.fullName}
        backTo="/payments"
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                if (!farmer) return
                printPdf(generatePaymentPdf(await getSettings(), farmer, payment))
              }}
            >
              Print
            </Button>
            <Button variant="secondary" size="sm" onClick={download}>
              <Download className="h-4 w-4" /> PDF
            </Button>
          </>
        }
      />
      <Card>
        <CardContent className="grid gap-2 pt-4 text-sm sm:grid-cols-2">
          <div>
            <p className="text-soft">Date</p>
            <p className="font-medium">{formatDate(payment.paymentDate)}</p>
          </div>
          <div>
            <p className="text-soft">Amount</p>
            <p className="font-semibold text-emerald text-lg">{formatMoney(payment.amount)}</p>
          </div>
          <div>
            <p className="text-soft">Method</p>
            <p className="font-medium capitalize">{payment.method.replace('_', ' ')}</p>
          </div>
          <div>
            <p className="text-soft">Reference</p>
            <p className="font-medium">{payment.transactionRef || '—'}</p>
          </div>
          {payment.notes && (
            <div className="sm:col-span-2">
              <p className="text-soft">Notes</p>
              <p>{payment.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
