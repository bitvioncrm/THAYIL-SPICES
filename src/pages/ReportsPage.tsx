import { useState } from 'react'
import * as XLSX from 'xlsx'
import { PageHeader } from '@/components/common/PageHeader'
import { DateRangeFilter } from '@/components/common/DateRangeFilter'
import { FormField } from '@/components/common/FormField'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { buildReport } from '@/services/reports'
import { getSettings } from '@/services/settings'
import { generateReportPdf, saveOrSharePdf } from '@/lib/pdf'
import { downloadBlob } from '@/lib/utils'
import type { DatePreset } from '@/lib/date-ranges'

const TYPES = [
  { id: 'daily_receiving', label: 'Daily Receiving' },
  { id: 'production', label: 'Green-to-Dry Production' },
  { id: 'drying_loss', label: 'Drying Loss' },
  { id: 'dryer_performance', label: 'Dryer Performance' },
  { id: 'purchases', label: 'Purchases' },
  { id: 'payments', label: 'Payments' },
  { id: 'expenses', label: 'Expenses' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'outstanding', label: 'Outstanding Balances' },
  { id: 'business_performance', label: 'Business Performance' },
  { id: 'farmer_transactions', label: 'Farmer Directory' },
]

export function ReportsPage() {
  const [type, setType] = useState('daily_receiving')
  const [preset, setPreset] = useState<DatePreset>('this_month')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [report, setReport] = useState<{ title: string; rows: Record<string, unknown>[] } | null>(
    null,
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = async () => {
    setBusy(true)
    setError(null)
    try {
      const result = await buildReport(type, preset, customFrom, customTo)
      setReport({ title: result.title, rows: result.rows as Record<string, unknown>[] })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Report failed')
    } finally {
      setBusy(false)
    }
  }

  const columns = report?.rows[0] ? Object.keys(report.rows[0]) : []

  const exportCsv = () => {
    if (!report || !columns.length) return
    const header = columns.join(',')
    const body = report.rows
      .map((r) => columns.map((c) => JSON.stringify(r[c] ?? '')).join(','))
      .join('\n')
    downloadBlob(new Blob([`${header}\n${body}`], { type: 'text/csv' }), `${type}.csv`)
  }

  const exportExcel = () => {
    if (!report) return
    const ws = XLSX.utils.json_to_sheet(report.rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Report')
    XLSX.writeFile(wb, `${type}.xlsx`)
  }

  const exportPdf = async () => {
    if (!report || !columns.length) return
    const settings = await getSettings()
    const rows = report.rows.map((r) => columns.map((c) => String(r[c] ?? '')))
    const doc = generateReportPdf(settings, report.title, columns, rows)
    await saveOrSharePdf(doc, `${type}.pdf`, 'report')
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Reports" subtitle="Filter, export PDF / CSV / Excel" />
      <Card>
        <CardContent className="space-y-3 pt-4">
          <FormField label="Report type">
            <Select value={type} onChange={(e) => setType(e.target.value)}>
              {TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </Select>
          </FormField>
          <DateRangeFilter
            preset={preset}
            onPresetChange={setPreset}
            customFrom={customFrom}
            customTo={customTo}
            onCustomFrom={setCustomFrom}
            onCustomTo={setCustomTo}
          />
          <Button className="w-full" onClick={run} disabled={busy}>
            {busy ? 'Generating…' : 'Generate report'}
          </Button>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </CardContent>
      </Card>

      {report && (
        <>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={exportPdf}>
              PDF
            </Button>
            <Button size="sm" variant="outline" onClick={exportCsv}>
              CSV
            </Button>
            <Button size="sm" variant="outline" onClick={exportExcel}>
              Excel
            </Button>
          </div>
          <h2 className="font-display text-lg text-forest">{report.title}</h2>
          <div className="overflow-x-auto rounded-xl border border-line bg-white shadow-soft">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-forest text-white">
                <tr>
                  {columns.map((c) => (
                    <th key={c} className="px-3 py-2 font-medium capitalize whitespace-nowrap">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {report.rows.map((r, i) => (
                  <tr key={i} className="border-t border-line odd:bg-light-green/30">
                    {columns.map((c) => (
                      <td key={c} className="px-3 py-2 whitespace-nowrap tabular-nums">
                        {String(r[c] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
                {report.rows.length === 0 && (
                  <tr>
                    <td className="px-3 py-6 text-soft" colSpan={Math.max(columns.length, 1)}>
                      No rows for this period
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
