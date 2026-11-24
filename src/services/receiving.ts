import { db } from '@/db/database'
import { assertAllocation, roundKg } from '@/lib/calculations'
import { nowISO, uid } from '@/lib/utils'
import type { ReceivingForm } from '@/schemas'
import type { ReceivingAllocation, ReceivingRecord } from '@/types'
import { writeAudit } from './audit'
import { nextCode } from './ids'
import { applyStockMovementInTx } from './inventory'
import { notify } from './notifications'
import { createBatchFromAllocation } from './drying'

export async function listReceiving(farmerId?: string): Promise<ReceivingRecord[]> {
  if (farmerId) {
    return db.receivingRecords.where('farmerId').equals(farmerId).reverse().sortBy('receivedAt')
  }
  return db.receivingRecords.orderBy('receivedAt').reverse().toArray()
}

export async function getReceiving(id: string): Promise<ReceivingRecord | undefined> {
  return db.receivingRecords.get(id)
}

export async function createReceiving(data: ReceivingForm): Promise<ReceivingRecord> {
  const farmer = await db.farmers.get(data.farmerId)
  if (!farmer) throw new Error('Farmer not found')
  if (farmer.status !== 'active') throw new Error('Farmer is inactive')

  const greenWeightKg = roundKg(data.greenWeightKg)
  if (data.bagWeights?.length) {
    const sum = roundKg(data.bagWeights.reduce((s, w) => s + w, 0))
    if (Math.abs(sum - greenWeightKg) > 0.05) {
      throw new Error(`Bag weights (${sum} KG) must match total green weight (${greenWeightKg} KG)`)
    }
  }

  const receiptCode = await nextCode('receipts', 'receiptPrefix')
  const now = nowISO()
  const record: ReceivingRecord = {
    id: uid(),
    receiptCode,
    farmerId: data.farmerId,
    receivedAt: data.receivedAt,
    greenWeightKg,
    numberOfBags: data.numberOfBags,
    bagWeights: data.bagWeights,
    quality: data.quality,
    staffName: data.staffName?.trim(),
    notes: data.notes?.trim(),
    allocatedKg: 0,
    createdAt: now,
    updatedAt: now,
  }

  await db.transaction('rw', db.receivingRecords, db.inventory, db.inventoryMovements, async () => {
    await db.receivingRecords.add(record)
    await applyStockMovementInTx({
      owner: 'farmer',
      kind: 'green',
      farmerId: data.farmerId,
      deltaKg: greenWeightKg,
      movementType: 'receiving',
      referenceType: 'receiving',
      referenceId: record.id,
      movementDate: data.receivedAt,
      notes: `Received ${receiptCode}`,
    })
  })

  await writeAudit('receiving', record.id, 'create', undefined, record)
  await notify({
    type: 'receiving',
    title: 'New receiving',
    message: `${receiptCode}: ${greenWeightKg} KG from ${farmer.fullName}`,
    referenceType: 'receiving',
    referenceId: record.id,
  })
  return record
}

export async function updateReceiving(
  id: string,
  data: ReceivingForm,
): Promise<ReceivingRecord> {
  const before = await db.receivingRecords.get(id)
  if (!before) throw new Error('Receiving record not found')
  if (before.allocatedKg > 0 && data.greenWeightKg < before.allocatedKg) {
    throw new Error(`Cannot reduce weight below allocated ${before.allocatedKg} KG`)
  }

  const greenWeightKg = roundKg(data.greenWeightKg)
  const delta = roundKg(greenWeightKg - before.greenWeightKg)

  const updated: ReceivingRecord = {
    ...before,
    farmerId: data.farmerId,
    receivedAt: data.receivedAt,
    greenWeightKg,
    numberOfBags: data.numberOfBags,
    bagWeights: data.bagWeights,
    quality: data.quality,
    staffName: data.staffName?.trim(),
    notes: data.notes?.trim(),
    updatedAt: nowISO(),
  }

  await db.transaction('rw', db.receivingRecords, db.inventory, db.inventoryMovements, async () => {
    await db.receivingRecords.put(updated)
    if (delta !== 0) {
      await applyStockMovementInTx({
        owner: 'farmer',
        kind: 'green',
        farmerId: before.farmerId,
        deltaKg: delta,
        movementType: 'adjustment',
        referenceType: 'receiving',
        referenceId: id,
        notes: `Receiving ${before.receiptCode} adjusted`,
      })
    }
  })

  await writeAudit('receiving', id, 'update', before, updated)
  return updated
}

export async function allocateReceiving(params: {
  receivingId: string
  dryerId: string
  allocatedKg: number
  operator?: string
  notes?: string
}): Promise<{ allocation: ReceivingAllocation; batchId: string }> {
  const receiving = await db.receivingRecords.get(params.receivingId)
  if (!receiving) throw new Error('Receiving record not found')
  const dryer = await db.dryers.get(params.dryerId)
  if (!dryer) throw new Error('Dryer not found')
  if (dryer.status === 'inactive' || dryer.status === 'maintenance') {
    throw new Error(`Dryer is ${dryer.status}`)
  }

  const allocatedKg = roundKg(params.allocatedKg)
  assertAllocation(receiving.greenWeightKg, receiving.allocatedKg, allocatedKg)

  const batch = await createBatchFromAllocation({
    farmerId: receiving.farmerId,
    receivingId: receiving.id,
    dryerId: dryer.id,
    greenInputKg: allocatedKg,
    operator: params.operator,
    notes: params.notes,
    quality: receiving.quality,
  })

  const allocation: ReceivingAllocation = {
    id: uid(),
    receivingId: receiving.id,
    dryerId: dryer.id,
    batchId: batch.id,
    allocatedKg,
    createdAt: nowISO(),
  }

  await db.transaction(
    'rw',
    [
      db.receivingRecords,
      db.receivingAllocations,
      db.dryingBatches,
      db.dryers,
      db.inventory,
      db.inventoryMovements,
    ],
    async () => {
      await db.receivingAllocations.add(allocation)
      await db.receivingRecords.update(receiving.id, {
        allocatedKg: roundKg(receiving.allocatedKg + allocatedKg),
        updatedAt: nowISO(),
      })
      await db.dryingBatches.put(batch)
      if (dryer.status === 'available') {
        await db.dryers.update(dryer.id, { status: 'running', updatedAt: nowISO() })
      }
      await applyStockMovementInTx({
        owner: 'farmer',
        kind: 'green',
        farmerId: receiving.farmerId,
        deltaKg: -allocatedKg,
        movementType: 'processing_input',
        referenceType: 'batch',
        referenceId: batch.id,
        notes: `Allocated to batch ${batch.batchCode}`,
      })
    },
  )

  await writeAudit('allocation', allocation.id, 'create', undefined, allocation)
  return { allocation, batchId: batch.id }
}

export async function getAllocations(receivingId: string): Promise<ReceivingAllocation[]> {
  return db.receivingAllocations.where('receivingId').equals(receivingId).toArray()
}
