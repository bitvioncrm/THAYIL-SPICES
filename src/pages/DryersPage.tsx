import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingState } from '@/components/common/LoadingState'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { listDryers } from '@/services/dryers'
import { formatKg } from '@/lib/utils'

const statusVariant: Record<string, 'success' | 'warning' | 'danger' | 'muted' | 'gold'> = {
  available: 'success',
  running: 'gold',
  maintenance: 'warning',
  inactive: 'muted',
}

export function DryersPage() {
  const dryers = useLiveQuery(() => listDryers(), [])
  if (!dryers) return <LoadingState />

  return (
    <div>
      <PageHeader
        title="Dryers"
        subtitle="Drying machines"
        actions={
          <Button asChild>
            <Link to="/dryers/new">
              <Plus className="h-4 w-4" /> Add
            </Link>
          </Button>
        }
      />
      {dryers.length === 0 ? (
        <EmptyState
          title="No dryers"
          description="Add your drying machines to allocate receiving."
          action={
            <Button asChild>
              <Link to="/dryers/new">Add dryer</Link>
            </Button>
          }
        />
      ) : (
        <ul className="space-y-2">
          {dryers.map((d) => (
            <li key={d.id}>
              <Link
                to={`/dryers/${d.id}/edit`}
                className="flex items-center justify-between rounded-xl border border-line bg-white px-4 py-3 shadow-soft"
              >
                <div>
                  <p className="font-semibold text-ink">{d.name}</p>
                  <p className="text-xs text-soft">
                    {d.dryerCode} · Capacity {formatKg(d.capacityKg)} KG
                    {d.location ? ` · ${d.location}` : ''}
                  </p>
                </div>
                <Badge variant={statusVariant[d.status] ?? 'muted'}>{d.status}</Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
