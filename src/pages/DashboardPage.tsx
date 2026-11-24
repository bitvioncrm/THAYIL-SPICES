import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { PageHeader } from '@/components/common/PageHeader'
import { DateRangeFilter } from '@/components/common/DateRangeFilter'
import { KpiCard } from '@/components/common/KpiCard'
import { LoadingState } from '@/components/common/LoadingState'
import { ErrorState } from '@/components/common/ErrorState'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getDashboardData } from '@/services/dashboard'
import type { DatePreset } from '@/lib/date-ranges'
import { formatDate, formatKg, formatMoney } from '@/lib/utils'

export function DashboardPage() {
  const [preset, setPreset] = useState<DatePreset>('this_month')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [data, setData] = useState<Awaited<ReturnType<typeof getDashboardData>> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      setData(await getDashboardData(preset, customFrom, customTo))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset, customFrom, customTo])

  if (loading && !data) return <LoadingState label="Loading dashboard…" />
  if (error && !data) return <ErrorState message={error} onRetry={load} />
  if (!data) return null

  const { kpis, charts } = data

  return (
    <div className="space-y-5">
      <PageHeader
        title="Thayil Cardamom Spices"
        subtitle="Processing · Drying · Billing · Inventory"
        actions={
          <div className="hidden gap-2 md:flex">
            <Button asChild size="sm" variant="secondary">
              <Link to="/receiving/new">New Receiving</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/billing">New Invoice</Link>
            </Button>
          </div>
        }
      />

      <DateRangeFilter
        preset={preset}
        onPresetChange={setPreset}
        customFrom={customFrom}
        customTo={customTo}
        onCustomFrom={setCustomFrom}
        onCustomTo={setCustomTo}
      />

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        <KpiCard label="Green Received" value={`${formatKg(kpis.greenReceived)} KG`} />
        <KpiCard label="Dry Produced" value={`${formatKg(kpis.dryProduced)} KG`} />
        <KpiCard label="Drying Loss" value={`${formatKg(kpis.dryingLoss)} KG`} />
        <KpiCard label="Farmers Served" value={String(kpis.farmersServed)} />
        <KpiCard label="Active Batches" value={String(kpis.activeBatches)} />
        <KpiCard label="Completed Batches" value={String(kpis.completedBatches)} />
        <KpiCard label="Drying Charges" value={formatMoney(kpis.dryingCharges)} />
        <KpiCard label="Purchases" value={formatMoney(kpis.totalPurchases)} />
        <KpiCard label="Payments Received" value={formatMoney(kpis.paymentsReceived)} />
        <KpiCard label="Outstanding" value={formatMoney(kpis.outstanding)} />
        <KpiCard
          label="Green Stock"
          value={`${formatKg(kpis.greenStock)} KG`}
          hint={`Store ${formatKg(kpis.storeGreen)} · Farmer ${formatKg(kpis.farmerGreen)}`}
        />
        <KpiCard
          label="Dry Stock"
          value={`${formatKg(kpis.dryStock)} KG`}
          hint={`Store ${formatKg(kpis.storeDry)} · Farmer ${formatKg(kpis.farmerDry)}`}
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 md:hidden">
        <Button asChild size="sm" className="shrink-0">
          <Link to="/receiving/new">Receive</Link>
        </Button>
        <Button asChild size="sm" variant="secondary" className="shrink-0">
          <Link to="/farmers/new">Add Farmer</Link>
        </Button>
        <Button asChild size="sm" variant="outline" className="shrink-0">
          <Link to="/drying">Batches</Link>
        </Button>
        <Button asChild size="sm" variant="outline" className="shrink-0">
          <Link to="/billing">Bill</Link>
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Daily Green Receiving</CardTitle>
          </CardHeader>
          <CardContent className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.dailyGreen}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E3EAE5" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="value" name="KG" fill="#16845B" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Daily Dry Production</CardTitle>
          </CardHeader>
          <CardContent className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={charts.dailyDry}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E3EAE5" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line type="monotone" dataKey="value" name="KG" stroke="#C6A45C" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Monthly Processing</CardTitle>
          </CardHeader>
          <CardContent className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.monthlyProcessing}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E3EAE5" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="green" name="Green" fill="#123B2A" />
                <Bar dataKey="dry" name="Dry" fill="#16845B" />
                <Bar dataKey="loss" name="Loss" fill="#C6A45C" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Revenue & Expenses</CardTitle>
          </CardHeader>
          <CardContent className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.revenueVsExpense}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E3EAE5" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#123B2A" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Active Drying Batches</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.activeBatches.length === 0 && (
              <p className="text-sm text-soft">No active batches</p>
            )}
            {data.activeBatches.map((b) => (
              <Link
                key={b.id}
                to={`/drying/${b.id}`}
                className="flex items-center justify-between rounded-lg border border-line px-3 py-2.5 hover:bg-light-green/40"
              >
                <div>
                  <p className="font-medium text-ink">{b.batchCode}</p>
                  <p className="text-xs text-soft">{formatKg(b.greenInputKg)} KG green</p>
                </div>
                <Badge>{b.status.replace('_', ' ')}</Badge>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pending Farmer Payments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.pendingPayments.length === 0 && (
              <p className="text-sm text-soft">No outstanding balances</p>
            )}
            {data.pendingPayments.map((p) => (
              <Link
                key={p.farmerId}
                to={`/farmers/${p.farmerId}`}
                className="flex items-center justify-between rounded-lg border border-line px-3 py-2.5 hover:bg-light-green/40"
              >
                <div>
                  <p className="font-medium text-ink">{p.farmer?.fullName ?? 'Farmer'}</p>
                  <p className="text-xs text-soft">{p.farmer?.farmerCode}</p>
                </div>
                <span className="font-semibold text-forest tabular-nums">
                  {formatMoney(p.balance)}
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Receiving</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.recentReceiving.length === 0 && (
              <p className="text-sm text-soft">No receiving in period</p>
            )}
            {data.recentReceiving.map((r) => (
              <Link
                key={r.id}
                to={`/receiving/${r.id}`}
                className="flex items-center justify-between rounded-lg border border-line px-3 py-2.5 hover:bg-light-green/40"
              >
                <div>
                  <p className="font-medium text-ink">{r.receiptCode}</p>
                  <p className="text-xs text-soft">{formatDate(r.receivedAt, true)}</p>
                </div>
                <span className="tabular-nums text-sm font-semibold text-emerald">
                  {formatKg(r.greenWeightKg)} KG
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Purchases</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.recentPurchases.length === 0 && (
              <p className="text-sm text-soft">No purchases in period</p>
            )}
            {data.recentPurchases.map((p) => (
              <Link
                key={p.id}
                to={`/purchases/${p.id}`}
                className="flex items-center justify-between rounded-lg border border-line px-3 py-2.5 hover:bg-light-green/40"
              >
                <div>
                  <p className="font-medium text-ink">{p.purchaseCode}</p>
                  <p className="text-xs text-soft">
                    {p.type} · {formatKg(p.quantityKg)} KG
                  </p>
                </div>
                <span className="tabular-nums text-sm font-semibold">
                  {formatMoney(p.netPayable)}
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
