import { useLiveQuery } from 'dexie-react-hooks'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingState } from '@/components/common/LoadingState'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/services/notifications'
import { formatDate } from '@/lib/utils'

export function NotificationsPage() {
  const notifications = useLiveQuery(() => listNotifications(100), [])

  if (!notifications) return <LoadingState />

  return (
    <div className="space-y-4">
      <PageHeader
        title="Notifications"
        actions={
          <Button
            size="sm"
            variant="outline"
            onClick={() => markAllNotificationsRead()}
            disabled={!notifications.some((n) => !n.read)}
          >
            Mark all read
          </Button>
        }
      />
      {notifications.length === 0 ? (
        <EmptyState title="No notifications" description="Alerts will appear here as work happens." />
      ) : (
        <ul className="space-y-2">
          {notifications.map((n) => (
            <li
              key={n.id}
              className={`rounded-xl border px-4 py-3 shadow-soft ${
                n.read ? 'border-line bg-white' : 'border-emerald/30 bg-light-green/40'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-ink">{n.title}</p>
                  <p className="text-sm text-soft">{n.message}</p>
                  <p className="mt-1 text-xs text-soft">{formatDate(n.createdAt, true)}</p>
                </div>
                {!n.read ? (
                  <Button size="sm" variant="ghost" onClick={() => markNotificationRead(n.id)}>
                    Mark read
                  </Button>
                ) : (
                  <Badge variant="muted">Read</Badge>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
