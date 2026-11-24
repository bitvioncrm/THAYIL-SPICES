import { db } from '@/db/database'
import { padCode } from '@/lib/utils'
import type { BusinessSettings } from '@/types'

type CounterKey = keyof Omit<import('@/types').IdCounters, 'id'>

export async function nextCode(
  counterKey: CounterKey,
  prefixKey: keyof Pick<
    BusinessSettings,
    | 'farmerPrefix'
    | 'receiptPrefix'
    | 'batchPrefix'
    | 'invoicePrefix'
    | 'purchasePrefix'
    | 'paymentPrefix'
    | 'expensePrefix'
    | 'dryerPrefix'
  >,
): Promise<string> {
  return db.transaction('rw', db.counters, db.settings, async () => {
    const counters = await db.counters.get('main')
    const settings = await db.settings.get('main')
    if (!counters || !settings) throw new Error('Database not initialized')
    const next = (counters[counterKey] as number) + 1
    await db.counters.update('main', { [counterKey]: next })
    const prefix = settings[prefixKey] as string
    return `${prefix}${padCode(next)}`
  })
}
