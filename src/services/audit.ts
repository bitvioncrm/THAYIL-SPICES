import { db } from '@/db/database'
import { nowISO, uid } from '@/lib/utils'
import type { AuditLog } from '@/types'

export async function writeAudit(
  entityType: string,
  entityId: string,
  action: AuditLog['action'],
  before?: unknown,
  after?: unknown,
  note?: string,
) {
  await db.auditLogs.add({
    id: uid(),
    entityType,
    entityId,
    action,
    before: before ? JSON.stringify(before) : undefined,
    after: after ? JSON.stringify(after) : undefined,
    note,
    createdAt: nowISO(),
  })
}
