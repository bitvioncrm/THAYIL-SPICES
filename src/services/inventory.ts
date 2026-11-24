import { db } from '@/db/database'
import { assertNonNegativeStock, roundKg } from '@/lib/calculations'
import { nowISO, uid } from '@/lib/utils'
import type { InventoryBalance, MovementType, StockKind, StockOwner } from '@/types'

function inventoryKey(owner: StockOwner, kind: StockKind, farmerId?: string): string {
  if (owner === 'store') return `inv-store-${kind}`
  return `inv-farmer-${farmerId}-${kind}`
}

export async function getOrCreateBalance(
  owner: StockOwner,
  kind: StockKind,
  farmerId?: string,
): Promise<InventoryBalance> {
  const id = inventoryKey(owner, kind, farmerId)
  let bal = await db.inventory.get(id)
  if (!bal) {
    bal = {
      id,
      owner,
      farmerId: owner === 'farmer' ? farmerId : undefined,
      kind,
      quantityKg: 0,
      updatedAt: nowISO(),
    }
    await db.inventory.put(bal)
  }
  return bal
}

/** Mutates inventory; call inside an existing Dexie transaction that includes inventory + inventoryMovements. */
export async function applyStockMovementInTx(params: {
  owner: StockOwner
  kind: StockKind
  farmerId?: string
  deltaKg: number
  movementType: MovementType
  referenceType?: string
  referenceId?: string
  notes?: string
  movementDate?: string
}): Promise<InventoryBalance> {
  const {
    owner,
    kind,
    farmerId,
    deltaKg,
    movementType,
    referenceType,
    referenceId,
    notes,
    movementDate,
  } = params

  if (owner === 'farmer' && !farmerId) {
    throw new Error('Farmer ID required for farmer-owned inventory')
  }

  const bal = await getOrCreateBalance(owner, kind, farmerId)
  const nextQty = assertNonNegativeStock(bal.quantityKg, deltaKg, `${owner} ${kind}`)
  const updated: InventoryBalance = {
    ...bal,
    quantityKg: nextQty,
    updatedAt: nowISO(),
  }
  await db.inventory.put(updated)
  await db.inventoryMovements.add({
    id: uid(),
    movementDate: movementDate ?? nowISO(),
    owner,
    farmerId: owner === 'farmer' ? farmerId : undefined,
    kind,
    movementType,
    quantityKg: roundKg(deltaKg),
    balanceAfter: nextQty,
    referenceType,
    referenceId,
    notes,
    createdAt: nowISO(),
  })
  return updated
}

export async function applyStockMovement(
  params: Parameters<typeof applyStockMovementInTx>[0],
): Promise<InventoryBalance> {
  return db.transaction('rw', db.inventory, db.inventoryMovements, () =>
    applyStockMovementInTx(params),
  )
}

export async function getStoreStock() {
  const green = await getOrCreateBalance('store', 'green')
  const dry = await getOrCreateBalance('store', 'dry')
  return { greenKg: green.quantityKg, dryKg: dry.quantityKg }
}

export async function getFarmerStock(farmerId: string) {
  const green = await getOrCreateBalance('farmer', 'green', farmerId)
  const dry = await getOrCreateBalance('farmer', 'dry', farmerId)
  return { greenKg: green.quantityKg, dryKg: dry.quantityKg }
}

export async function getTotalFarmerOwnedStock() {
  const all = await db.inventory.where('owner').equals('farmer').toArray()
  return {
    greenKg: roundKg(all.filter((i) => i.kind === 'green').reduce((s, i) => s + i.quantityKg, 0)),
    dryKg: roundKg(all.filter((i) => i.kind === 'dry').reduce((s, i) => s + i.quantityKg, 0)),
  }
}
