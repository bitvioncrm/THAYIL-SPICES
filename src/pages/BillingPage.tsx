import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Receipt } from 'lucide-react'
import { HeroStat, PageHero } from '@/components/brand/PageHero'
import { PageHeader } from '@/components/common/PageHeader'
import { SearchInput } from '@/components/common/SearchInput'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingState } from '@/components/common/LoadingState'
import { QuickActions } from '@/components/common/QuickActions'
import { Badge } from '@/components/ui/badge'
import { getFarmerTotals, listFarmers } from '@/services/simple/farmers'
import type { SimpleFarmer } from '@/types/simple'
import { formatKg, formatMoney } from '@/lib/utils'

export function BillingPage() {
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
      withTotals.sort((a, b) => b.totals.outstanding - a.totals.outstanding)
      if (!cancelled) {
        setRows(withTotals)
        setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [search])

  const dueCount = rows.filter((f) => f.totals.outstanding > 0).length
  const outstanding = rows.reduce((s, f) => s + f.totals.outstanding, 0)

  return (
    <div className="space-y-5 pb-4">
      <PageHeader title="Billing" subtitle="Generate period bills & track balances" />

      <PageHero
        title="Period billing workspace"
        description="Create daily, weekly or monthly bills and clear outstanding farmer balances."
      >
        <HeroStat label="Due" value={loading ? '—' : String(dueCount)} />
        <HeroStat
          label="Outstanding"
          value={loading ? '—' : formatMoney(outstanding)}
          gold
        />
      </PageHero>

      <SearchInput value={search} onChange={setSearch} placeholder="Search farmer" />

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
                className="block rounded-2xl border border-[#DCE6DE] bg-[#FFFEFA] p-4 shadow-soft transition hover:border-gold/40 hover:shadow-card dark:border-line dark:bg-surface"
              >
                <div className="flex justify-between gap-2">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold/15 text-forest">
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
                <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-[#F7F4EC]/80 p-3 text-sm dark:bg-mist/40 sm:grid-cols-4">
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
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-soft">Paid</p>
                    <p className="font-medium tabular-nums">{formatMoney(f.totals.totalPaid)}</p>
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
