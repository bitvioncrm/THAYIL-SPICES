import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingState } from '@/components/common/LoadingState'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { db } from '@/db/database'
import { listReceiving } from '@/services/receiving'
import { formatDate, formatKg } from '@/lib/utils'

export function ReceivingPage() {
  const records = useLiveQuery(() => listReceiving(), [])
  const farmers = useLiveQuery(() => db.farmers.toArray(), [])
  const farmerMap = new Map((farmers ?? []).map((f) => [f.id, f]))

  if (!records) return <LoadingState />

  return (
    <div>
      <PageHeader
        title="Receiving"
        subtitle="Green cardamom intake"
        actions={
          <Button asChild>
            <Link to="/receiving/new">
              <Plus className="h-4 w-4" /> Receive
            </Link>
          </Button>
        }
      />
      {records.length === 0 ? (
        <EmptyState
          title="No receiving records"
          action={
            <Button asChild>
              <Link to="/receiving/new">Record receiving</Link>
            </Button>
          }
        />
      ) : (
        <ul className="space-y-2">
          {records.map((r) => {
            const pending = r.greenWeightKg - r.allocatedKg
            return (
              <li key={r.id}>
                <Link
                  to={`/receiving/${r.id}`}
                  className="block rounded-xl border border-line bg-white px-4 py-3 shadow-soft hover:border-emerald/30"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-ink">{r.receiptCode}</p>
                      <p className="text-xs text-soft">
                        {farmerMap.get(r.farmerId)?.fullName ?? '—'} · {formatDate(r.receivedAt, true)}
                      </p>
                    </div>
                    <span className="tabular-nums font-semibold text-emerald">
                      {formatKg(r.greenWeightKg)} KG
                    </span>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <Badge variant="muted">{r.numberOfBags} bags</Badge>
                    <Badge variant={pending > 0.001 ? 'warning' : 'success'}>
                      {pending > 0.001 ? `${formatKg(pending)} left` : 'Fully allocated'}
                    </Badge>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
