import { db } from '@/db/database'
import {
  calcDryingCharges,
  calcDryingLoss,
  calcYieldPercentage,
  roundKg,
} from '@/lib/calculations'
import { nowISO, uid } from '@/lib/utils'
import type { CompleteBatchForm } from '@/schemas'
import type { DryingBatch, QualityGrade } from '@/types'
import { writeAudit } from './audit'
import { nextCode } from './ids'
import { applyStockMovementInTx } from './inventory'
import { addLedgerEntryInTx } from './ledger'
import { notify } from './notifications'

export async function createBatchFromAllocation(params: {
  farmerId: string
  receivingId: string
  dryerId: string
  greenInputKg: number
  operator?: string
  notes?: string
  quality?: QualityGrade
}): Promise<DryingBatch> {
  const settings = await db.settings.get('main')
  const batchCode = await nextCode('batches', 'batchPrefix')
  const now = nowISO()
  return {
    id: uid(),
    batchCode,
    farmerId: params.farmerId,
    receivingId: params.receivingId,
    dryerId: params.dryerId,
    greenInputKg: roundKg(params.greenInputKg),
    startAt: now,
    operator: params.operator,
    quality: params.quality,
    notes: params.notes,
    ratePerGreenKg: settings?.dryingRatePerGreenKg ?? 15,
    status: 'in_progress',
    createdAt: now,
    updatedAt: now,
  }
}

export async function listBatches(filters?: {
  status?: DryingBatch['status'] | DryingBatch['status'][]
  farmerId?: string
  dryerId?: string
}): Promise<DryingBatch[]> {
  let rows = await db.dryingBatches.orderBy('createdAt').reverse().toArray()
  if (filters?.farmerId) rows = rows.filter((b) => b.farmerId === filters.farmerId)
  if (filters?.dryerId) rows = rows.filter((b) => b.dryerId === filters.dryerId)
  if (filters?.status) {
    const statuses = Array.isArray(filters.status) ? filters.status : [filters.status]
    rows = rows.filter((b) => statuses.includes(b.status))
  }
  return rows
}

export async function getBatch(id: string): Promise<DryingBatch | undefined> {
  return db.dryingBatches.get(id)
}

export async function startBatch(id: string): Promise<DryingBatch> {
  const batch = await db.dryingBatches.get(id)
  if (!batch) throw new Error('Batch not found')
  if (batch.status === 'completed' || batch.status === 'cancelled') {
    throw new Error('Cannot start a completed or cancelled batch')
  }
  const updated: DryingBatch = {
    ...batch,
    status: 'in_progress',
    startAt: batch.startAt ?? nowISO(),
    updatedAt: nowISO(),
  }
  await db.dryingBatches.put(updated)
  await db.dryers.update(batch.dryerId, { status: 'running', updatedAt: nowISO() })
  return updated
}

export async function completeBatch(id: string, data: CompleteBatchForm): Promise<DryingBatch> {
  const batch = await db.dryingBatches.get(id)
  if (!batch) throw new Error('Batch not found')
  if (batch.status === 'completed' || batch.status === 'delivered') {
    throw new Error('Batch already completed')
  }
  if (batch.status === 'cancelled') {
    throw new Error('Cannot complete a cancelled batch')
  }

  const dryOutputKg = roundKg(data.dryOutputKg)
  if (dryOutputKg <= 0) throw new Error('Actual dry weight is required')
  if (dryOutputKg > batch.greenInputKg + 0.0005) {
    throw new Error('Dry output cannot exceed green input')
  }

  const settings = await db.settings.get('main')
  const rate = data.dryingRate ?? batch.ratePerGreenKg ?? settings?.dryingRatePerGreenKg ?? 15
  const dryingLossKg = calcDryingLoss(batch.greenInputKg, dryOutputKg)
  const yieldPercentage = calcYieldPercentage(batch.greenInputKg, dryOutputKg)
  const dryingCharges = calcDryingCharges(
    batch.greenInputKg,
    rate,
    0,
    settings?.fixedBatchRate ?? 0,
  )

  const updated: DryingBatch = {
    ...batch,
    dryOutputKg,
    dryingLossKg,
    yieldPercentage,
    dryingCharges,
    ratePerGreenKg: rate,
    completedAt: data.completedAt,
    quality: data.quality ?? batch.quality,
    operator: data.operator ?? batch.operator,
    notes: data.notes ?? batch.notes,
    status: 'completed',
    updatedAt: nowISO(),
  }

  await db.transaction(
    'rw',
    [db.dryingBatches, db.dryers, db.inventory, db.inventoryMovements, db.farmerLedger],
    async () => {
      await db.dryingBatches.put(updated)

      await applyStockMovementInTx({
        owner: 'farmer',
        kind: 'dry',
        farmerId: batch.farmerId,
        deltaKg: dryOutputKg,
        movementType: 'processing_output',
        referenceType: 'batch',
        referenceId: batch.id,
        notes: `Batch ${batch.batchCode} completed`,
        movementDate: data.completedAt,
      })

      if (dryingLossKg > 0) {
        await db.inventoryMovements.add({
          id: uid(),
          movementDate: data.completedAt,
          owner: 'farmer',
          farmerId: batch.farmerId,
          kind: 'green',
          movementType: 'drying_loss',
          quantityKg: -dryingLossKg,
          balanceAfter: 0,
          referenceType: 'batch',
          referenceId: batch.id,
          notes: `Drying loss ${dryingLossKg} KG on ${batch.batchCode}`,
          createdAt: nowISO(),
        })
      }

      // Free dryer if no other active batches
      const otherActive = await db.dryingBatches
        .where('dryerId')
        .equals(batch.dryerId)
        .filter(
          (b) =>
            b.id !== batch.id && ['pending', 'assigned', 'in_progress'].includes(b.status),
        )
        .count()
      if (otherActive === 0) {
        await db.dryers.update(batch.dryerId, { status: 'available', updatedAt: nowISO() })
      }

      await addLedgerEntryInTx({
        farmerId: batch.farmerId,
        entryType: 'debit',
        category: 'drying_charge',
        amount: dryingCharges,
        description: `Drying charges for ${batch.batchCode}`,
        referenceType: 'batch',
        referenceId: batch.id,
        entryDate: data.completedAt,
      })
    },
  )

  await writeAudit('batch', id, 'update', batch, updated, 'completed')
  const farmer = await db.farmers.get(batch.farmerId)
  await notify({
    type: 'drying_completed',
    title: 'Drying completed',
    message: `${batch.batchCode}: ${dryOutputKg} KG dry (${yieldPercentage}% yield) — ${farmer?.fullName ?? ''}`,
    referenceType: 'batch',
    referenceId: batch.id,
  })
  return updated
}

export async function markDelivered(id: string): Promise<DryingBatch> {
  const batch = await db.dryingBatches.get(id)
  if (!batch) throw new Error('Batch not found')
  if (batch.status !== 'completed') throw new Error('Only completed batches can be delivered')
  const dryKg = batch.dryOutputKg ?? 0

  const updated: DryingBatch = { ...batch, status: 'delivered', updatedAt: nowISO() }
  await db.transaction('rw', db.dryingBatches, db.inventory, db.inventoryMovements, async () => {
    await db.dryingBatches.put(updated)
    if (dryKg > 0) {
      await applyStockMovementInTx({
        owner: 'farmer',
        kind: 'dry',
        farmerId: batch.farmerId,
        deltaKg: -dryKg,
        movementType: 'delivery',
        referenceType: 'batch',
        referenceId: batch.id,
        notes: `Delivered ${batch.batchCode}`,
      })
    }
  })
  await writeAudit('batch', id, 'update', batch, updated, 'delivered')
  return updated
}
