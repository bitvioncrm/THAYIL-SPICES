import { db } from '@/db/database'
import { DEFAULT_SETTINGS } from '@/lib/defaults'
import { nowISO } from '@/lib/utils'
import type { SettingsForm } from '@/schemas'
import type { BusinessSettings } from '@/types'
import { writeAudit } from './audit'

export async function getSettings(): Promise<BusinessSettings> {
  const s = await db.settings.get('main')
  return s ?? DEFAULT_SETTINGS
}

export async function updateSettings(data: SettingsForm): Promise<BusinessSettings> {
  const before = await getSettings()
  const updated: BusinessSettings = {
    ...before,
    ...data,
    email: data.email || undefined,
    updatedAt: nowISO(),
  }
  await db.settings.put(updated)
  await writeAudit('settings', 'main', 'update', before, updated)
  return updated
}

export async function updateLogo(dataUrl: string): Promise<BusinessSettings> {
  const before = await getSettings()
  const updated = { ...before, logoDataUrl: dataUrl, updatedAt: nowISO() }
  await db.settings.put(updated)
  return updated
}
