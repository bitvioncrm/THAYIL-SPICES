import { Suspense, lazy, useEffect, useState, useTransition } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertCircle,
  FileText,
  Leaf,
  Scale,
  Sprout,
  Users,
  Wallet,
  Wheat,
} from 'lucide-react'
import { HeroStat, PageHero } from '@/components/brand/PageHero'
import { PageHeader } from '@/components/common/PageHeader'
import { DateRangeFilter } from '@/components/common/DateRangeFilter'
import { KpiCard } from '@/components/common/KpiCard'
import { QuickActions } from '@/components/common/QuickActions'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { Button } from '@/components/ui/button'
import { getOverview, type OverviewData } from '@/services/simple/overview'
import type { DatePreset } from '@/lib/date-presets'
import { formatKg, formatMoney } from '@/lib/utils'

const OverviewCharts = lazy(() =>
  import('@/components/overview/OverviewCharts').then((m) => ({ default: m.OverviewCharts })),
)

function KpiSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-24 animate-pulse rounded-2xl bg-mist/70" />
      ))}
    </div>
  )
}

export function OverviewPage() {
  const [preset, setPreset] = useState<DatePreset>('today')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [data, setData] = useState<OverviewData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [, startTransition] = useTransition()

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    getOverview(preset, customFrom, customTo)
      .then((next) => {
        if (cancelled) return
        startTransition(() => {
          setData(next)
          setLoading(false)
        })
      })
      .catch((e) => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'Failed to load')
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [preset, customFrom, customTo])

  if (error && !data) {
    return (
      <ErrorState
        message={error}
        onRetry={() => {
          setError(null)
          setLoading(true)
          void getOverview(preset, customFrom, customTo)
            .then(setData)
            .catch((e) => setError(e instanceof Error ? e.message : 'Failed'))
            .finally(() => setLoading(false))
        }}
      />
    )
  }

  const kpis = data?.kpis
  const emptyPeriod = !!data && data.periodActivity.length === 0 && data.kpis.greenKg === 0

  return (
    <div className="space-y-5 pb-4">
      <PageHeader
        title="Business Overview"
        subtitle="Today’s cardamom activity at a glance"
      />

      <PageHero
        title="Premium Cardamom Processing"
        description="Farmer receiving, dry output and period billing — kept clear for daily estate work."
      >
        <HeroStat label="Farmers" value={kpis ? String(kpis.totalFarmers) : '—'} />
        <HeroStat
          label="Outstanding"
          value={kpis ? formatMoney(kpis.outstanding) : '—'}
          gold
        />
      </PageHero>

      <DateRangeFilter
        preset={preset}
        onPresetChange={setPreset}
        customFrom={customFrom}
        customTo={customTo}
        onCustomFrom={setCustomFrom}
        onCustomTo={setCustomTo}
      />

      {!data || (loading && !kpis) ? (
        <KpiSkeleton />
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiCard
            label="Green received"
            value={`${formatKg(kpis!.greenKg)} KG`}
            accent="forest"
            icon={Leaf}
          />
          <KpiCard
            label="Dry output"
            value={`${formatKg(kpis!.dryKg)} KG`}
            accent="emerald"
            icon={Sprout}
          />
          <KpiCard
            label="Drying loss"
            value={`${formatKg(kpis!.lossKg)} KG`}
            accent="gold"
            icon={Scale}
          />
          <KpiCard
            label="Labour charges"
            value={formatMoney(kpis!.labourCharges)}
            accent="emerald"
            icon={Wheat}
          />
          <KpiCard label="Total billing" value={formatMoney(kpis!.totalBilling)} icon={FileText} />
          <KpiCard
            label="Amount received"
            value={formatMoney(kpis!.amountReceived)}
            accent="forest"
            icon={Wallet}
          />
          <KpiCard
            label="Outstanding"
            value={formatMoney(kpis!.outstanding)}
            accent="gold"
            icon={AlertCircle}
          />
          <KpiCard label="Total farmers" value={String(kpis!.totalFarmers)} icon={Users} />
        </div>
      )}

      {data && emptyPeriod && (
        <EmptyState
          title="No activity in this period"
          description="Open a farmer and add today’s green and dry weights to populate the overview."
          action={
            <Button asChild>
              <Link to="/farmers">Go to Farmers</Link>
            </Button>
          }
        />
      )}

      {data && !emptyPeriod && (
        <Suspense
          fallback={
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="h-72 animate-pulse rounded-2xl bg-mist/70" />
              <div className="h-72 animate-pulse rounded-2xl bg-mist/70" />
            </div>
          }
        >
          <OverviewCharts data={data} />
        </Suspense>
      )}

      <QuickActions />
    </div>
  )
}
