import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Leaf, Pencil, Plus, Scale, Wallet } from 'lucide-react'
import { HeroStat, PageHero } from '@/components/brand/PageHero'
import { PageHeader } from '@/components/common/PageHeader'
import { LoadingState } from '@/components/common/LoadingState'
import { ErrorState } from '@/components/common/ErrorState'
import { KpiCard } from '@/components/common/KpiCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getFarmer, getFarmerTotals } from '@/services/simple/farmers'
import type { SimpleFarmer } from '@/types/simple'
import { formatDate, formatKg, formatMoney } from '@/lib/utils'
import { RATE_METHOD_LABELS } from '@/lib/simple-defaults'

export function FarmerDetailPage() {
  const { id } = useParams()
  const [farmer, setFarmer] = useState<SimpleFarmer | null>(null)
  const [totals, setTotals] = useState<Awaited<ReturnType<typeof getFarmerTotals>> | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    ;(async () => {
      try {
        const f = await getFarmer(id)
        if (!f) throw new Error('Farmer not found')
        setFarmer(f)
        setTotals(await getFarmerTotals(id))
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed')
      }
    })()
  }, [id])

  if (error) return <ErrorState message={error} />
  if (!farmer || !totals) return <LoadingState />

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
  const todayEntries = totals.entries.filter((e) => e.entryDate === today)

  return (
    <div className="space-y-5 pb-4">
      <PageHeader
        title={farmer.fullName}
        subtitle={farmer.farmerCode}
        backTo="/farmers"
        actions={
          <>
            <Button asChild size="sm" variant="secondary">
              <Link to={`/farmers/${farmer.id}/edit`}>
                <Pencil className="h-4 w-4" /> Edit
              </Link>
            </Button>
            <Button asChild size="sm" variant="gold">
              <Link to={`/billing/${farmer.id}`}>Bill</Link>
            </Button>
          </>
        }
      />

      <PageHero
        title={farmer.plantationName || 'Plantation account'}
        description={`${farmer.plantationLocation || 'Kerala'} · Rate ${formatMoney(farmer.defaultRate)} (${RATE_METHOD_LABELS[farmer.rateMethod]})`}
      >
        <HeroStat label="Green" value={`${formatKg(totals.totalGreenKg)}`} />
        <HeroStat label="Outstanding" value={formatMoney(totals.outstanding)} gold />
      </PageHero>

      <div className="rounded-2xl border border-[#DCE6DE] bg-[#FFFEFA] p-4 shadow-soft dark:border-line dark:bg-surface">
        <div className="flex flex-wrap gap-2">
          <Badge variant={farmer.status === 'active' ? 'success' : 'muted'}>{farmer.status}</Badge>
          {farmer.isDemo && <Badge variant="gold">DEMO DATA</Badge>}
        </div>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-soft">Phone</dt>
            <dd className="font-medium">{farmer.phone}</dd>
          </div>
          <div>
            <dt className="text-soft">WhatsApp</dt>
            <dd className="font-medium">{farmer.whatsapp || '—'}</dd>
          </div>
          <div>
            <dt className="text-soft">Registered</dt>
            <dd className="font-medium">{formatDate(farmer.registrationDate)}</dd>
          </div>
          <div>
            <dt className="text-soft">Rate method</dt>
            <dd className="font-medium">{RATE_METHOD_LABELS[farmer.rateMethod]}</dd>
          </div>
        </dl>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <KpiCard label="Total Green" value={`${formatKg(totals.totalGreenKg)} KG`} accent="forest" icon={Leaf} />
        <KpiCard label="Total Dry" value={`${formatKg(totals.totalDryKg)} KG`} accent="emerald" icon={Scale} />
        <KpiCard label="Total Loss" value={`${formatKg(totals.totalLossKg)} KG`} accent="gold" />
        <KpiCard label="Charges" value={formatMoney(totals.totalCharges)} icon={Wallet} />
        <KpiCard label="Paid" value={formatMoney(totals.totalPaid)} accent="forest" />
        <KpiCard label="Outstanding" value={formatMoney(totals.outstanding)} accent="gold" />
      </div>

      <Button asChild className="w-full sticky bottom-20 z-20 shadow-card md:static md:bottom-auto">
        <Link to={`/farmers/${farmer.id}/entry`}>
          <Plus className="h-4 w-4" /> Add Daily Entry
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Today&apos;s entries</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {todayEntries.length === 0 && (
            <p className="text-sm text-soft">No receiving recorded today</p>
          )}
          {todayEntries.map((e) => (
            <Link
              key={e.id}
              to={`/farmers/${farmer.id}/entry/${e.id}`}
              className="flex justify-between rounded-lg border border-line px-3 py-2 text-sm"
            >
              <span>
                {formatKg(e.greenKg)} → {formatKg(e.dryKg)} KG
              </span>
              <span className="font-semibold">{formatMoney(e.labourCharge)}</span>
            </Link>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Previous daily entries</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {totals.entries.length === 0 && <p className="text-sm text-soft">No entries yet</p>}
          {totals.entries.slice(0, 30).map((e) => (
            <Link
              key={e.id}
              to={`/farmers/${farmer.id}/entry/${e.id}`}
              className="flex items-center justify-between border-b border-line py-2.5 text-sm last:border-0"
            >
              <div>
                <p className="font-medium">{e.entryDate}</p>
                <p className="text-xs text-soft">
                  Green {formatKg(e.greenKg)} · Dry {formatKg(e.dryKg)} · Loss {formatKg(e.lossKg)}
                  {e.billedBillId ? ' · Billed' : ''}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold tabular-nums">{formatMoney(e.labourCharge)}</p>
                {e.amountPaid > 0 && (
                  <p className="text-xs text-emerald">Paid {formatMoney(e.amountPaid)}</p>
                )}
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
