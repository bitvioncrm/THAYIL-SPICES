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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { OverviewData } from '@/services/simple/overview'
import { formatKg, formatMoney } from '@/lib/utils'

export function OverviewCharts({ data }: { data: OverviewData }) {
  return (
    <>
      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="overflow-hidden lg:col-span-3">
          <CardHeader>
            <CardTitle>Green receiving vs dry output</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.dailyChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E3EAE5" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: '#6F7A72' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis tick={{ fontSize: 10, fill: '#6F7A72' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: '1px solid #DCE6DE',
                    background: '#FFFEFA',
                    boxShadow: '0 8px 24px rgba(27,60,45,0.08)',
                  }}
                />
                <Legend />
                <Bar dataKey="green" name="Green KG" fill="#1B3C2D" radius={[6, 6, 0, 0]} />
                <Bar dataKey="dry" name="Dry KG" fill="#6F8F3E" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent farmer activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.periodActivity.slice(0, 6).map((e) => (
              <Link
                key={e.id}
                to={`/farmers/${e.farmerId}`}
                className="flex items-center justify-between rounded-xl border border-[#E4EBE4] bg-[#FFFEFA] px-3.5 py-3 transition hover:border-spice-light/60 hover:bg-[#F7F4EC] dark:border-line dark:bg-surface"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink">{e.farmer?.fullName ?? 'Farmer'}</p>
                  <p className="text-xs text-soft">{e.entryDate}</p>
                </div>
                <div className="text-right text-sm tabular-nums">
                  <p className="font-semibold text-forest">
                    {formatKg(e.greenKg)} → {formatKg(e.dryKg)}
                  </p>
                  <p className="text-xs text-soft">{formatMoney(e.labourCharge)}</p>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Monthly trend</CardTitle>
          </CardHeader>
          <CardContent className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.monthlyChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E3EAE5" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 10, fill: '#6F7A72' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis tick={{ fontSize: 10, fill: '#6F7A72' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: '1px solid #DCE6DE',
                    background: '#FFFEFA',
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="green"
                  name="Green"
                  stroke="#1B3C2D"
                  strokeWidth={2.5}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="dry"
                  name="Dry"
                  stroke="#C5A059"
                  strokeWidth={2.5}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pending balances</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.pendingBalances.length === 0 && (
              <p className="py-6 text-center text-sm text-soft">All balances clear</p>
            )}
            {data.pendingBalances.map((p) => (
              <Link
                key={p.farmerId}
                to={`/billing/${p.farmerId}`}
                className="flex items-center justify-between rounded-xl border border-[#E4EBE4] px-3.5 py-3 transition hover:border-gold/40 hover:bg-gold/5 dark:border-line"
              >
                <div>
                  <p className="font-medium">{p.name}</p>
                  <p className="text-xs text-soft">{p.code}</p>
                </div>
                <span className="font-semibold tabular-nums text-forest">
                  {formatMoney(p.balance)}
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent entries</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {data.recentEntries.map((e) => (
              <div
                key={e.id}
                className="flex items-center justify-between border-b border-[#E8EEE8] py-2.5 text-sm last:border-0 dark:border-line"
              >
                <span className="flex items-center gap-2">
                  {e.farmer?.fullName}
                  {e.isDemo && <Badge variant="gold">DEMO</Badge>}
                </span>
                <span className="tabular-nums text-soft">{e.entryDate}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent bills</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.recentBills.length === 0 && (
              <p className="py-6 text-center text-sm text-soft">No bills generated yet</p>
            )}
            {data.recentBills.map((b) => (
              <Link
                key={b.id}
                to={`/bills/${b.id}`}
                className="flex justify-between rounded-xl border border-[#E4EBE4] px-3.5 py-3 text-sm transition hover:bg-[#F7F4EC] dark:border-line dark:hover:bg-mist"
              >
                <span className="font-medium">{b.billCode}</span>
                <span className="tabular-nums font-semibold">
                  {formatMoney(b.currentBillAmount)}
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
