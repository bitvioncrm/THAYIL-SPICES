import { db } from '@/db/database'
import { nowISO, uid } from '@/lib/utils'
import type { AppNotification, NotificationType } from '@/types'

export async function notify(params: {
  type: NotificationType
  title: string
  message: string
  referenceType?: string
  referenceId?: string
}) {
  await db.notifications.add({
    id: uid(),
    type: params.type,
    title: params.title,
    message: params.message,
    read: false,
    referenceType: params.referenceType,
    referenceId: params.referenceId,
    createdAt: nowISO(),
  })
}

export async function listNotifications(limit = 50): Promise<AppNotification[]> {
  const all = await db.notifications.orderBy('createdAt').reverse().limit(limit).toArray()
  return all
}

export async function markNotificationRead(id: string) {
  await db.notifications.update(id, { read: true })
}

export async function markAllNotificationsRead() {
  const unread = await db.notifications.filter((n) => !n.read).toArray()
  await Promise.all(unread.map((n) => db.notifications.update(n.id, { read: true })))
}

export async function unreadCount(): Promise<number> {
  return db.notifications.filter((n) => !n.read).count()
}
