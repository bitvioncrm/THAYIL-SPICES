import { db } from '@/db/database'
import { nowISO, uid } from '@/lib/utils'
import type { DryerForm } from '@/schemas'
import type { Dryer } from '@/types'
import { writeAudit } from './audit'
import { nextCode } from './ids'
import { notify } from './notifications'

export async function listDryers(): Promise<Dryer[]> {
  return db.dryers.orderBy('name').toArray()
}

export async function getDryer(id: string): Promise<Dryer | undefined> {
  return db.dryers.get(id)
}

export async function createDryer(data: DryerForm): Promise<Dryer> {
  const dryerCode = await nextCode('dryers', 'dryerPrefix')
  const now = nowISO()
  const dryer: Dryer = {
    id: uid(),
    dryerCode,
    name: data.name.trim(),
    capacityKg: data.capacityKg,
    location: data.location?.trim(),
    status: data.status,
    notes: data.notes?.trim(),
    createdAt: now,
    updatedAt: now,
  }
  await db.dryers.add(dryer)
  await writeAudit('dryer', dryer.id, 'create', undefined, dryer)
  return dryer
}

export async function updateDryer(id: string, data: DryerForm): Promise<Dryer> {
  const before = await db.dryers.get(id)
  if (!before) throw new Error('Dryer not found')
  const updated: Dryer = {
    ...before,
    name: data.name.trim(),
    capacityKg: data.capacityKg,
    location: data.location?.trim(),
    status: data.status,
    notes: data.notes?.trim(),
    updatedAt: nowISO(),
  }
  await db.dryers.put(updated)
  await writeAudit('dryer', id, 'update', before, updated)
  if (data.status === 'maintenance') {
    await notify({
      type: 'dryer_maintenance',
      title: 'Dryer maintenance',
      message: `${updated.name} marked for maintenance`,
      referenceType: 'dryer',
      referenceId: id,
    })
  }
  return updated
}

export async function getDryerWorkload(dryerId: string) {
  const active = await db.dryingBatches
    .where('dryerId')
    .equals(dryerId)
    .filter((b) => ['pending', 'assigned', 'in_progress'].includes(b.status))
    .toArray()
  const completed = await db.dryingBatches
    .where('dryerId')
    .equals(dryerId)
    .filter((b) => b.status === 'completed' || b.status === 'delivered')
    .toArray()
  const currentLoad = active.reduce((s, b) => s + b.greenInputKg, 0)
  const totalProcessed = completed.reduce((s, b) => s + b.greenInputKg, 0)
  const totalDry = completed.reduce((s, b) => s + (b.dryOutputKg ?? 0), 0)
  return { active, completed, currentLoad, totalProcessed, totalDry, batchCount: completed.length }
}
