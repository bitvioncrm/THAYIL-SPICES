import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingState } from '@/components/common/LoadingState'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { db } from '@/db/database'
import { listInvoices } from '@/services/billing'
import { formatDate, formatMoney } from '@/lib/utils'

export function InvoicesPage() {
  const invoices = useLiveQuery(() => listInvoices(), [])
  const farmers = useLiveQuery(() => db.farmers.toArray(), [])
  const farmerMap = new Map((farmers ?? []).map((f) => [f.id, f]))
  if (!invoices) return <LoadingState />

  return (
    <div>
      <PageHeader
        title="Invoices"
        actions={
          <Button asChild>
            <Link to="/billing">
              <Plus className="h-4 w-4" /> New
            </Link>
          </Button>
        }
      />
      {invoices.length === 0 ? (
        <EmptyState
          title="No invoices"
          action={
            <Button asChild>
              <Link to="/billing">Create invoice</Link>
            </Button>
          }
        />
      ) : (
        <ul className="space-y-2">
          {invoices.map((inv) => (
            <li key={inv.id}>
              <Link
                to={`/invoices/${inv.id}`}
                className="block rounded-xl border border-line bg-white px-4 py-3 shadow-soft"
              >
                <div className="flex justify-between gap-2">
                  <div>
                    <p className="font-semibold">{inv.invoiceCode}</p>
                    <p className="text-xs text-soft">
                      {farmerMap.get(inv.farmerId)?.fullName} · {formatDate(inv.invoiceDate)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold tabular-nums">{formatMoney(inv.totalAmount)}</p>
                    <div className="mt-1 flex justify-end gap-1">
                      <Badge variant={inv.status === 'cancelled' ? 'danger' : 'success'}>
                        {inv.status}
                      </Badge>
                      <Badge variant={inv.paymentStatus === 'paid' ? 'success' : 'warning'}>
                        {inv.paymentStatus}
                      </Badge>
                    </div>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
