import { DATE_PRESET_LABELS, type DatePreset } from '@/lib/date-ranges'
import { Select } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { FormField } from './FormField'

const PRESETS = Object.keys(DATE_PRESET_LABELS) as DatePreset[]

export function DateRangeFilter({
  preset,
  onPresetChange,
  customFrom,
  customTo,
  onCustomFrom,
  onCustomTo,
}: {
  preset: DatePreset
  onPresetChange: (p: DatePreset) => void
  customFrom?: string
  customTo?: string
  onCustomFrom?: (v: string) => void
  onCustomTo?: (v: string) => void
}) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-[#DCE6DE] bg-[#FFFEFA] p-3 shadow-soft dark:border-line dark:bg-surface sm:flex-row sm:items-end">
      <FormField label="Period" className="sm:min-w-[220px]">
        <Select value={preset} onChange={(e) => onPresetChange(e.target.value as DatePreset)}>
          {PRESETS.map((p) => (
            <option key={p} value={p}>
              {DATE_PRESET_LABELS[p]}
            </option>
          ))}
        </Select>
      </FormField>
      {preset === 'custom' && (
        <>
          <FormField label="From">
            <Input type="date" value={customFrom ?? ''} onChange={(e) => onCustomFrom?.(e.target.value)} />
          </FormField>
          <FormField label="To">
            <Input type="date" value={customTo ?? ''} onChange={(e) => onCustomTo?.(e.target.value)} />
          </FormField>
        </>
      )}
    </div>
  )
}
