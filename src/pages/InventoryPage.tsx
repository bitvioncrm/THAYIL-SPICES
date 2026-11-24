import { useLiveQuery } from 'dexie-react-hooks'
import { PageHeader } from '@/components/common/PageHeader'
import { LoadingState } from '@/components/common/LoadingState'
import { KpiCard } from '@/components/common/KpiCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { db } from '@/db/database'
import { formatDate, formatKg } from '@/lib/utils'

export function InventoryPage() {
  const inventory = useLiveQuery(() => db.inventory.toArray(), [])
  const movements = useLiveQuery(
    () => db.inventoryMovements.orderBy('createdAt').reverse().limit(40).toArray(),
    [],
  )
  const farmers = useLiveQuery(() => db.farmers.toArray(), [])
  const farmerMap = new Map((farmers ?? []).map((f) => [f.id, f]))

  if (!inventory || !movements) return <LoadingState />

  const storeGreen = inventory.find((i) => i.owner === 'store' && i.kind === 'green')?.quantityKg ?? 0
  const storeDry = inventory.find((i) => i.owner === 'store' && i.kind === 'dry')?.quantityKg ?? 0
  const farmerGreen = inventory
    .filter((i) => i.owner === 'farmer' && i.kind === 'green')
    .reduce((s, i) => s + i.quantityKg, 0)
  const farmerDry = inventory
    .filter((i) => i.owner === 'farmer' && i.kind === 'dry')
    .reduce((s, i) => s + i.quantityKg, 0)

  return (
    <div className="space-y-4">
      <PageHeader title="Inventory" subtitle="Ownership kept separate" />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <KpiCard label="Store Green" value={`${formatKg(storeGreen)} KG`} />
        <KpiCard label="Store Dry" value={`${formatKg(storeDry)} KG`} />
        <KpiCard label="Farmer Green" value={`${formatKg(farmerGreen)} KG`} />
        <KpiCard label="Farmer Dry" value={`${formatKg(farmerDry)} KG`} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Balances</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {inventory
            .filter((i) => i.quantityKg > 0 || i.owner === 'store')
            .map((i) => (
              <div
                key={i.id}
                className="flex items-center justify-between rounded-lg border border-line px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium capitalize">
                    {i.owner} {i.kind}
                  </p>
                  <p className="text-xs text-soft">
                    {i.farmerId ? farmerMap.get(i.farmerId)?.fullName ?? i.farmerId : 'Store owned'}
                  </p>
                </div>
                <span className="tabular-nums font-semibold">{formatKg(i.quantityKg)} KG</span>
              </div>
            ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent movements</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {movements.map((m) => (
            <div key={m.id} className="flex items-start justify-between gap-2 border-b border-line py-2 text-sm">
              <div>
                <p className="font-medium">
                  {m.movementType.replace(/_/g, ' ')} · {m.owner} {m.kind}
                </p>
                <p className="text-xs text-soft">
                  {formatDate(m.movementDate, true)}
                  {m.farmerId ? ` · ${farmerMap.get(m.farmerId)?.fullName ?? ''}` : ''}
                </p>
                {m.notes && <p className="text-xs text-soft">{m.notes}</p>}
              </div>
              <div className="text-right">
                <Badge variant={m.quantityKg >= 0 ? 'success' : 'warning'}>
                  {m.quantityKg >= 0 ? '+' : ''}
                  {formatKg(m.quantityKg)}
                </Badge>
                <p className="mt-1 text-xs text-soft">Bal {formatKg(m.balanceAfter)}</p>
              </div>
            </div>
          ))}
          {movements.length === 0 && <p className="text-sm text-soft">No movements yet</p>}
        </CardContent>
      </Card>
    </div>
  )
}
