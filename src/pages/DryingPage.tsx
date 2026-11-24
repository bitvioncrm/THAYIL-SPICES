import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingState } from '@/components/common/LoadingState'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { db } from '@/db/database'
import { listBatches } from '@/services/drying'
import { formatDate, formatKg } from '@/lib/utils'
import type { BatchStatus } from '@/types'

export function DryingPage() {
  const [status, setStatus] = useState<string>('all')
  const batches = useLiveQuery(
    () =>
      listBatches(
        status === 'all' ? undefined : { status: status as BatchStatus },
      ),
    [status],
  )
  const farmers = useLiveQuery(() => db.farmers.toArray(), [])
  const dryers = useLiveQuery(() => db.dryers.toArray(), [])
  const farmerMap = new Map((farmers ?? []).map((f) => [f.id, f]))
  const dryerMap = new Map((dryers ?? []).map((d) => [d.id, d]))

  if (!batches) return <LoadingState />

  return (
    <div>
      <PageHeader title="Drying Batches" subtitle="Track processing" />
      <Select value={status} onChange={(e) => setStatus(e.target.value)} className="mb-4 max-w-xs">
        <option value="all">All statuses</option>
        <option value="in_progress">In Progress</option>
        <option value="completed">Completed</option>
        <option value="delivered">Delivered</option>
        <option value="pending">Pending</option>
        <option value="assigned">Assigned</option>
      </Select>
      {batches.length === 0 ? (
        <EmptyState title="No batches" description="Allocate receiving to a dryer to create a batch." />
      ) : (
        <ul className="space-y-2">
          {batches.map((b) => (
            <li key={b.id}>
              <Link
                to={`/drying/${b.id}`}
                className="block rounded-xl border border-line bg-white px-4 py-3 shadow-soft"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{b.batchCode}</p>
                    <p className="text-xs text-soft">
                      {farmerMap.get(b.farmerId)?.fullName} · {dryerMap.get(b.dryerId)?.name}
                    </p>
                    <p className="text-xs text-soft">{formatDate(b.startAt ?? b.createdAt, true)}</p>
                  </div>
                  <Badge>{b.status.replace('_', ' ')}</Badge>
                </div>
                <div className="mt-2 flex gap-3 text-sm tabular-nums">
                  <span>Green {formatKg(b.greenInputKg)}</span>
                  {b.dryOutputKg != null && <span className="text-emerald">Dry {formatKg(b.dryOutputKg)}</span>}
                  {b.yieldPercentage != null && <span>{b.yieldPercentage.toFixed(1)}%</span>}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
