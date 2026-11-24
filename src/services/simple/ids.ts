import { sdb } from '@/db/simple-db'
import { padCode } from '@/lib/utils'
import type { SimpleSettings } from '@/types/simple'

type CounterKey = 'farmers' | 'bills' | 'payments'
type PrefixKey = 'farmerPrefix' | 'billPrefix' | 'paymentPrefix'

export async function nextSimpleCode(counterKey: CounterKey, prefixKey: PrefixKey): Promise<string> {
  return sdb.transaction('rw', sdb.counters, sdb.settings, async () => {
    const counters = await sdb.counters.get('main')
    const settings = await sdb.settings.get('main')
    if (!counters || !settings) throw new Error('Database not ready')
    const next = counters[counterKey] + 1
    await sdb.counters.update('main', { [counterKey]: next })
    return `${settings[prefixKey] as string}${padCode(next)}`
  })
}

export async function getSimpleSettings(): Promise<SimpleSettings> {
  const s = await sdb.settings.get('main')
  if (!s) throw new Error('Settings missing')
  return s
}
