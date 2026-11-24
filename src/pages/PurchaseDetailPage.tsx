import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Download } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { LoadingState } from '@/components/common/LoadingState'
import { ErrorState } from '@/components/common/ErrorState'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { getPurchase } from '@/services/purchases'
import { getFarmer } from '@/services/farmers'
import { getSettings } from '@/services/settings'
import { generatePurchasePdf, printPdf, saveOrSharePdf } from '@/lib/pdf'
import { formatDate, formatKg, formatMoney } from '@/lib/utils'
import type { Farmer, Purchase } from '@/types'

export function PurchaseDetailPage() {
  const { id } = useParams()
  const [purchase, setPurchase] = useState<Purchase | null>(null)
  const [farmer, setFarmer] = useState<Farmer | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    ;(async () => {
      try {
        const p = await getPurchase(id)
        if (!p) throw new Error('Purchase not found')
        setPurchase(p)
        setFarmer((await getFarmer(p.farmerId)) ?? null)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed')
      }
    })()
  }, [id])

  const download = async () => {
    if (!purchase || !farmer) return
    const settings = await getSettings()
    const doc = generatePurchasePdf(settings, farmer, purchase)
    await saveOrSharePdf(doc, `${purchase.purchaseCode}.pdf`, 'purchase')
  }

  if (error) return <ErrorState message={error} />
  if (!purchase) return <LoadingState />

  return (
    <div className="space-y-4">
      <PageHeader
        title={purchase.purchaseCode}
        subtitle={farmer?.fullName}
        backTo="/purchases"
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                if (!farmer) return
                printPdf(generatePurchasePdf(await getSettings(), farmer, purchase))
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
      <div className="flex gap-2">
        <Badge>{purchase.status}</Badge>
        <Badge variant="gold">{purchase.paymentStatus}</Badge>
      </div>
      <Card>
        <CardContent className="grid gap-2 pt-4 text-sm sm:grid-cols-2">
          <div>
            <p className="text-soft">Date</p>
            <p className="font-medium">{formatDate(purchase.purchaseDate)}</p>
          </div>
          <div>
            <p className="text-soft">Type / Qty</p>
            <p className="font-medium">
              {purchase.type} · {formatKg(purchase.quantityKg)} KG
            </p>
          </div>
          <div>
            <p className="text-soft">Rate</p>
            <p className="font-medium">{formatMoney(purchase.ratePerKg)} / KG</p>
          </div>
          <div>
            <p className="text-soft">Gross</p>
            <p className="font-medium">{formatMoney(purchase.grossAmount)}</p>
          </div>
          <div>
            <p className="text-soft">Deductions</p>
            <p className="font-medium">{formatMoney(purchase.deductions)}</p>
          </div>
          <div>
            <p className="text-soft">Net payable</p>
            <p className="font-semibold text-forest">{formatMoney(purchase.netPayable)}</p>
          </div>
          <div>
            <p className="text-soft">Paid</p>
            <p className="font-medium">{formatMoney(purchase.paidAmount)}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
