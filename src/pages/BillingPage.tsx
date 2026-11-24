import { useEffect, useMemo, useState, useTransition } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Receipt, Search } from 'lucide-react'
import { HeroStat, PageHero } from '@/components/brand/PageHero'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingState } from '@/components/common/LoadingState'
import { QuickActions } from '@/components/common/QuickActions'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  emptyFarmerTotals,
  getAllFarmerTotalsMap,
  listFarmers,
  type FarmerTotals,
} from '@/services/simple/farmers'
import type { SimpleFarmer } from '@/types/simple'
import { formatKg, formatMoney } from '@/lib/utils'

type Row = SimpleFarmer & { totals: FarmerTotals }

export function BillingPage() {
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [, startTransition] = useTransition()

  useEffect(() => {
    const t = window.setTimeout(() => setQuery(search), 180)
    return () => window.clearTimeout(t)
  }, [search])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const [farmers, totalsMap] = await Promise.all([
        listFarmers(query),
        getAllFarmerTotalsMap(),
      ])
      const withTotals: Row[] = farmers.map((f) => ({
        ...f,
        totals: totalsMap.get(f.id) ?? emptyFarmerTotals(),
      }))
      withTotals.sort((a, b) => b.totals.outstanding - a.totals.outstanding)
      if (!cancelled) {
        startTransition(() => {
          setRows(withTotals)
          setLoading(false)
        })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [query])

  const dueCount = useMemo(() => rows.filter((f) => f.totals.outstanding > 0).length, [rows])
  const outstanding = useMemo(
    () => rows.reduce((s, f) => s + f.totals.outstanding, 0),
    [rows],
  )

  return (
    <div className="space-y-5 pb-4">
      <PageHeader title="Billing" subtitle="Daily & weekly farmer bills · clear balances" />

      <PageHero
        title="Period billing workspace"
        description="Generate a clean daily bill for one day, or a 7-day weekly report with every date listed."
      >
        <HeroStat label="Due" value={loading ? '—' : String(dueCount)} />
        <HeroStat
          label="Outstanding"
          value={loading ? '—' : formatMoney(outstanding)}
          gold
        />
      </PageHero>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-soft" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search farmer by name, code or phone"
          className="pl-9"
          aria-label="Search farmer"
        />
      </div>

      {loading ? (
        <LoadingState />
      ) : rows.length === 0 ? (
        <EmptyState title="No farmers to bill" />
      ) : (
        <ul className="space-y-3">
          {rows.map((f) => (
            <li key={f.id}>
              <Link
                to={`/billing/${f.id}`}
                className="group block overflow-hidden rounded-2xl border border-[#DCE6DE] bg-[#FFFEFA] shadow-soft transition hover:border-gold/45 hover:shadow-card dark:border-line dark:bg-surface"
              >
                <div className="flex items-stretch">
                  <div className="w-1.5 shrink-0 bg-gradient-to-b from-forest to-gold" />
                  <div className="min-w-0 flex-1 p-4">
                    <div className="flex justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-forest/10 text-forest">
                          <Receipt className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-display text-lg font-semibold text-forest dark:text-gold">
                            {f.fullName}
                          </p>
                          <p className="text-xs text-soft">
                            {f.farmerCode} · {f.phone}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] uppercase tracking-wide text-soft">Outstanding</p>
                        <p className="font-semibold tabular-nums text-forest dark:text-gold">
                          {formatMoney(f.totals.outstanding)}
                        </p>
                        {f.totals.outstanding > 0 ? (
                          <Badge variant="warning">Due</Badge>
                        ) : (
                          <Badge variant="success">Clear</Badge>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-[#F7F4EC]/90 p-3 text-sm dark:bg-mist/40 sm:grid-cols-4">
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-soft">Green</p>
                        <p className="font-medium tabular-nums">{formatKg(f.totals.totalGreenKg)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-soft">Dry</p>
                        <p className="font-medium tabular-nums">{formatKg(f.totals.totalDryKg)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-soft">Charges</p>
                        <p className="font-medium tabular-nums">
                          {formatMoney(f.totals.totalCharges)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-soft">Paid</p>
                        <p className="font-medium tabular-nums">{formatMoney(f.totals.totalPaid)}</p>
                      </div>
                    </div>
                    <p className="mt-2 flex items-center gap-1 text-xs font-medium text-forest/80 group-hover:text-forest">
                      Open billing workspace
                      <ChevronRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                    </p>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <QuickActions />
    </div>
  )
}
