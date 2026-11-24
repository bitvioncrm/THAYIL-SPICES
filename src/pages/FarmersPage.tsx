import { useEffect, useMemo, useState, useTransition } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Users } from 'lucide-react'
import { HeroStat, PageHero } from '@/components/brand/PageHero'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingState } from '@/components/common/LoadingState'
import { QuickActions } from '@/components/common/QuickActions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  emptyFarmerTotals,
  getAllFarmerTotalsMap,
  listFarmers,
  type FarmerTotals,
} from '@/services/simple/farmers'
import type { SimpleFarmer } from '@/types/simple'
import { formatKg, formatMoney } from '@/lib/utils'
import { RATE_METHOD_LABELS } from '@/lib/simple-defaults'

type Row = SimpleFarmer & { totals: FarmerTotals }

export function FarmersPage() {
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

  const outstanding = useMemo(
    () => rows.reduce((s, f) => s + f.totals.outstanding, 0),
    [rows],
  )

  return (
    <div className="space-y-5 pb-4">
      <PageHeader
        title="Farmers"
        subtitle="Accounts, plantations & daily receiving"
        actions={
          <Button asChild>
            <Link to="/farmers/new">
              <Plus className="h-4 w-4" /> Add farmer
            </Link>
          </Button>
        }
      />

      <PageHero
        title="Farmer directory"
        description="Open a farmer for daily entries, balances and billing."
      >
        <HeroStat label="Farmers" value={loading ? '—' : String(rows.length)} />
        <HeroStat label="Outstanding" value={loading ? '—' : formatMoney(outstanding)} gold />
      </PageHero>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-soft" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search farmer"
          className="pl-9"
          aria-label="Search farmer"
        />
      </div>

      {loading ? (
        <LoadingState />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No farmers yet"
          action={
            <Button asChild>
              <Link to="/farmers/new">Add first farmer</Link>
            </Button>
          }
        />
      ) : (
        <ul className="space-y-3">
          {rows.map((f) => (
            <li key={f.id}>
              <Link
                to={`/farmers/${f.id}`}
                className="block rounded-2xl border border-[#DCE6DE] bg-[#FFFEFA] p-4 shadow-soft transition hover:border-gold/40 hover:shadow-card dark:border-line dark:bg-surface"
              >
                <div className="flex justify-between gap-2">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-forest/10 text-forest">
                      <Users className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-display text-lg font-semibold text-forest dark:text-gold">
                        {f.fullName}
                      </p>
                      <p className="text-xs text-soft">
                        {f.farmerCode} · {f.phone}
                      </p>
                      <p className="mt-1 text-xs text-soft">
                        {RATE_METHOD_LABELS[f.rateMethod] ?? f.rateMethod} ·{' '}
                        {formatMoney(f.defaultRate)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {f.status === 'active' ? (
                      <Badge variant="success">Active</Badge>
                    ) : (
                      <Badge variant="muted">Inactive</Badge>
                    )}
                    <p className="mt-2 text-[10px] uppercase tracking-wide text-soft">Due</p>
                    <p className="font-semibold tabular-nums text-forest dark:text-gold">
                      {formatMoney(f.totals.outstanding)}
                    </p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-[#F7F4EC]/80 p-3 text-sm dark:bg-mist/40">
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
                    <p className="font-medium tabular-nums">{formatMoney(f.totals.totalCharges)}</p>
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
