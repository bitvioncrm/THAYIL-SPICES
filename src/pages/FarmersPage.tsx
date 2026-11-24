import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Users } from 'lucide-react'
import { HeroStat, PageHero } from '@/components/brand/PageHero'
import { PageHeader } from '@/components/common/PageHeader'
import { SearchInput } from '@/components/common/SearchInput'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingState } from '@/components/common/LoadingState'
import { QuickActions } from '@/components/common/QuickActions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getFarmerTotals, listFarmers } from '@/services/simple/farmers'
import type { SimpleFarmer } from '@/types/simple'
import { formatKg, formatMoney } from '@/lib/utils'
import { RATE_METHOD_LABELS } from '@/lib/simple-defaults'

export function FarmersPage() {
  const [search, setSearch] = useState('')
  const [rows, setRows] = useState<
    (SimpleFarmer & { totals: Awaited<ReturnType<typeof getFarmerTotals>> })[]
  >([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const farmers = await listFarmers(search)
      const withTotals = await Promise.all(
        farmers.map(async (f) => ({ ...f, totals: await getFarmerTotals(f.id) })),
      )
      if (!cancelled) {
        setRows(withTotals)
        setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [search])

  const outstanding = rows.reduce((s, f) => s + f.totals.outstanding, 0)

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
        title="Farmer records & receiving"
        description="Keep plantation accounts, rates and daily green/dry entries in one place."
      >
        <HeroStat label="Farmers" value={loading ? '—' : String(rows.length)} />
        <HeroStat
          label="Outstanding"
          value={loading ? '—' : formatMoney(outstanding)}
          gold
        />
      </PageHero>

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search name, ID or phone"
      />

      {loading ? (
        <LoadingState />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No farmers"
          description="Register a farmer to start daily entries."
          action={
            <Button asChild>
              <Link to="/farmers/new">Add farmer</Link>
            </Button>
          }
        />
      ) : (
        <ul className="space-y-3">
          {rows.map((f) => (
            <li key={f.id}>
              <Link
                to={`/farmers/${f.id}`}
                className="block rounded-2xl border border-[#DCE6DE] bg-[#FFFEFA] p-4 shadow-soft transition hover:border-spice-light/70 hover:shadow-card dark:border-line dark:bg-surface"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EAF0E6] text-forest dark:bg-mist dark:text-gold">
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
                        {f.plantationName || '—'}
                        {f.plantationLocation ? ` · ${f.plantationLocation}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant={f.status === 'active' ? 'success' : 'muted'}>{f.status}</Badge>
                    {f.isDemo && <Badge variant="gold">DEMO</Badge>}
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-[#F7F4EC]/80 p-3 text-sm dark:bg-mist/40 sm:grid-cols-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-soft">Green</p>
                    <p className="font-semibold tabular-nums">{formatKg(f.totals.totalGreenKg)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-soft">Dry</p>
                    <p className="font-semibold tabular-nums">{formatKg(f.totals.totalDryKg)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-soft">Charges</p>
                    <p className="font-semibold tabular-nums">{formatMoney(f.totals.totalCharges)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-soft">Outstanding</p>
                    <p className="font-semibold tabular-nums text-forest dark:text-gold">
                      {formatMoney(f.totals.outstanding)}
                    </p>
                  </div>
                </div>
                <p className="mt-2 text-[11px] text-soft">
                  Rate: {formatMoney(f.defaultRate)} · {RATE_METHOD_LABELS[f.rateMethod]}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <QuickActions />
    </div>
  )
}
