import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { eachDayYmd, formatBusinessDate, formatDate, formatKg, formatMoney } from './utils'
import type { Bill, DailyEntry, SimpleFarmer, SimpleSettings } from '@/types/simple'
import { RATE_METHOD_LABELS } from './simple-defaults'

type Doc = jsPDF & { lastAutoTable: { finalY: number } }

const FOREST: [number, number, number] = [18, 59, 42]
const GOLD: [number, number, number] = [180, 140, 60]
const INK: [number, number, number] = [28, 36, 32]
const MUTED: [number, number, number] = [100, 112, 104]
const CREAM: [number, number, number] = [249, 247, 241]
const ROW_ALT: [number, number, number] = [242, 246, 243]

function periodTitle(bill: Bill): string {
  switch (bill.periodType) {
    case 'daily':
      return 'DAILY REPORT'
    case 'weekly':
      return 'WEEKLY REPORT'
    case 'monthly':
      return 'MONTHLY REPORT'
    case 'yearly':
      return 'YEARLY REPORT'
    default:
      return 'PERIOD BILL'
  }
}

function periodSubtitle(bill: Bill): string {
  if (bill.periodType === 'daily') {
    return `Report date: ${formatBusinessDate(bill.periodFrom, true)}`
  }
  if (bill.periodType === 'weekly') {
    return `7-day week: ${formatBusinessDate(bill.periodFrom)} → ${formatBusinessDate(bill.periodTo)}`
  }
  return `${formatBusinessDate(bill.periodFrom)} → ${formatBusinessDate(bill.periodTo)}`
}

function drawHeader(doc: Doc, settings: SimpleSettings, bill: Bill) {
  doc.setFillColor(...FOREST)
  doc.rect(0, 0, 210, 32, 'F')
  doc.setFillColor(...GOLD)
  doc.rect(0, 32, 210, 1.2, 'F')

  doc.setTextColor(...GOLD)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.text(settings.businessName, 14, 12)

  doc.setTextColor(234, 243, 237)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  const contact = [settings.address, settings.phone ? `Ph: ${settings.phone}` : '', settings.whatsapp ? `WA: ${settings.whatsapp}` : '']
    .filter(Boolean)
    .join('  ·  ')
  doc.text(contact || 'Cardamom processing & farmer billing', 14, 19)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(255, 255, 255)
  doc.text(periodTitle(bill), 196, 12, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text(bill.billCode, 196, 19, { align: 'right' })
  doc.text(`Bill date: ${formatDate(bill.billDate)}`, 196, 25, { align: 'right' })
}

function drawFarmerBlock(doc: Doc, farmer: SimpleFarmer, bill: Bill, y: number): number {
  doc.setFillColor(...CREAM)
  doc.roundedRect(14, y, 182, 22, 2, 2, 'F')

  doc.setTextColor(...INK)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('Farmer', 18, y + 7)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.text(`${farmer.fullName}  (${farmer.farmerCode})`, 18, y + 14)
  doc.setFontSize(8)
  doc.setTextColor(...MUTED)
  doc.text(`Phone: ${farmer.phone || '—'}`, 18, y + 19)

  doc.setTextColor(...INK)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text(periodSubtitle(bill), 192, y + 10, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...MUTED)
  doc.text(`Period type: ${bill.periodType.toUpperCase()}`, 192, y + 16, { align: 'right' })

  return y + 28
}

function buildDailyRows(entries: DailyEntry[], settings: SimpleSettings) {
  return entries.map((e) => [
    formatBusinessDate(e.entryDate, true),
    formatKg(e.greenKg),
    formatKg(e.dryKg),
    formatKg(e.lossKg),
    `${formatMoney(e.rate, settings.currencySymbol)}`,
    RATE_METHOD_LABELS[e.rateMethod] ?? e.rateMethod,
    formatMoney(e.labourCharge, settings.currencySymbol),
  ])
}

/** Weekly: one row per calendar day (all 7 days), with date detail. */
function buildWeeklyDayRows(
  bill: Bill,
  entries: DailyEntry[],
  settings: SimpleSettings,
): string[][] {
  const byDate = new Map<string, DailyEntry[]>()
  for (const e of entries) {
    const list = byDate.get(e.entryDate) ?? []
    list.push(e)
    byDate.set(e.entryDate, list)
  }

  const days = eachDayYmd(bill.periodFrom, bill.periodTo)
  return days.map((day) => {
    const dayEntries = byDate.get(day) ?? []
    const green = dayEntries.reduce((s, e) => s + e.greenKg, 0)
    const dry = dayEntries.reduce((s, e) => s + e.dryKg, 0)
    const loss = dayEntries.reduce((s, e) => s + e.lossKg, 0)
    const charge = dayEntries.reduce((s, e) => s + e.labourCharge, 0)
    const rateNote =
      dayEntries.length === 0
        ? '—'
        : dayEntries.length === 1
          ? formatMoney(dayEntries[0].rate, settings.currencySymbol)
          : `${dayEntries.length} entries`
    return [
      formatBusinessDate(day, true),
      day,
      formatKg(green),
      formatKg(dry),
      formatKg(loss),
      rateNote,
      dayEntries.length ? formatMoney(charge, settings.currencySymbol) : '—',
    ]
  })
}

export function generatePeriodBillPdf(
  settings: SimpleSettings,
  farmer: SimpleFarmer,
  bill: Bill,
  entries: DailyEntry[],
) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' }) as Doc
  drawHeader(doc, settings, bill)

  let y = drawFarmerBlock(doc, farmer, bill, 38)

  const sorted = [...entries].sort((a, b) => a.entryDate.localeCompare(b.entryDate))

  if (bill.periodType === 'daily') {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...FOREST)
    doc.text(`Daily activity — ${formatBusinessDate(bill.periodFrom, true)}`, 14, y)
    y += 4

    autoTable(doc, {
      startY: y,
      head: [['Date', 'Green KG', 'Dry KG', 'Loss KG', 'Rate', 'Method', 'Charge']],
      body:
        sorted.length > 0
          ? buildDailyRows(sorted, settings)
          : [['No entry for this day', '—', '—', '—', '—', '—', '—']],
      theme: 'grid',
      headStyles: {
        fillColor: FOREST,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
        halign: 'center',
      },
      bodyStyles: { fontSize: 8, textColor: INK, cellPadding: 2.2 },
      alternateRowStyles: { fillColor: ROW_ALT },
      columnStyles: {
        0: { cellWidth: 32, fontStyle: 'bold' },
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right' },
        6: { halign: 'right', fontStyle: 'bold' },
      },
      margin: { left: 14, right: 14 },
    })
  } else if (bill.periodType === 'weekly') {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...FOREST)
    doc.text('Day-by-day weekly detail (7 days)', 14, y)
    y += 4

    autoTable(doc, {
      startY: y,
      head: [['Day', 'Date (YYYY-MM-DD)', 'Green KG', 'Dry KG', 'Loss KG', 'Rate', 'Charge']],
      body: buildWeeklyDayRows(bill, sorted, settings),
      theme: 'grid',
      headStyles: {
        fillColor: FOREST,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
        halign: 'center',
      },
      bodyStyles: { fontSize: 8, textColor: INK, cellPadding: 2 },
      alternateRowStyles: { fillColor: ROW_ALT },
      columnStyles: {
        0: { cellWidth: 28, fontStyle: 'bold' },
        1: { cellWidth: 28, fontSize: 7 },
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right' },
        6: { halign: 'right', fontStyle: 'bold' },
      },
      margin: { left: 14, right: 14 },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 6 && data.cell.raw === '—') {
          data.cell.styles.textColor = MUTED
        }
      },
    })

    // Detail lines if multiple entries share a day
    const multi = sorted.filter((e, _, all) => all.filter((x) => x.entryDate === e.entryDate).length > 1)
    if (multi.length > 0) {
      y = doc.lastAutoTable.finalY + 6
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(...FOREST)
      doc.text('Entry-level detail (days with more than one entry)', 14, y)
      autoTable(doc, {
        startY: y + 3,
        head: [['Date', 'Green', 'Dry', 'Loss', 'Rate / Method', 'Charge']],
        body: buildDailyRows(multi, settings).map((r) => [r[0], r[1], r[2], r[3], `${r[4]} · ${r[5]}`, r[6]]),
        theme: 'striped',
        headStyles: { fillColor: [60, 90, 70], fontSize: 7 },
        styles: { fontSize: 7 },
        margin: { left: 14, right: 14 },
      })
    }
  } else {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...FOREST)
    doc.text('Period entries', 14, y)
    y += 4

    autoTable(doc, {
      startY: y,
      head: [['Date', 'Green KG', 'Dry KG', 'Loss KG', 'Rate', 'Method', 'Charge']],
      body:
        sorted.length > 0
          ? buildDailyRows(sorted, settings)
          : [['No entries', '—', '—', '—', '—', '—', '—']],
      theme: 'grid',
      headStyles: {
        fillColor: FOREST,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
      },
      bodyStyles: { fontSize: 8, textColor: INK },
      alternateRowStyles: { fillColor: ROW_ALT },
      columnStyles: {
        0: { cellWidth: 32, fontStyle: 'bold' },
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right' },
        6: { halign: 'right', fontStyle: 'bold' },
      },
      margin: { left: 14, right: 14 },
    })
  }

  y = doc.lastAutoTable.finalY + 8

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...FOREST)
  doc.text('Bill summary', 14, y)
  y += 3

  autoTable(doc, {
    startY: y,
    body: [
      ['Total Green KG', formatKg(bill.totalGreenKg)],
      ['Total Dry KG', formatKg(bill.totalDryKg)],
      ['Total Loss KG', formatKg(bill.totalLossKg)],
      ['Labour / drying charges', formatMoney(bill.totalCharges, settings.currencySymbol)],
      ['Previous balance', formatMoney(bill.previousBalance, settings.currencySymbol)],
      ['Payments in period', formatMoney(bill.paymentsInPeriod, settings.currencySymbol)],
      ['Current bill amount', formatMoney(bill.currentBillAmount, settings.currencySymbol)],
      ['Paid on this bill', formatMoney(bill.amountPaidOnBill, settings.currencySymbol)],
      ['Final balance due', formatMoney(bill.finalBalance, settings.currencySymbol)],
      ['Status', `${bill.paymentStatus.toUpperCase()}  ·  ${bill.status.toUpperCase()}`],
    ],
    theme: 'plain',
    styles: { fontSize: 9, textColor: INK, cellPadding: 1.6 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 58 },
      1: { halign: 'right', cellWidth: 40 },
    },
    margin: { left: 100 },
    didParseCell: (data) => {
      if (data.section === 'body' && data.row.index === 6) {
        data.cell.styles.fontStyle = 'bold'
        data.cell.styles.textColor = FOREST
        data.cell.styles.fontSize = 10
      }
      if (data.section === 'body' && data.row.index === 8) {
        data.cell.styles.fontStyle = 'bold'
        data.cell.styles.textColor = GOLD
      }
    },
  })

  y = Math.max(doc.lastAutoTable.finalY + 16, 240)
  if (y > 265) {
    doc.addPage()
    y = 30
  }

  doc.setDrawColor(200, 210, 204)
  doc.setTextColor(...MUTED)
  doc.setFontSize(8)
  doc.text('Authorized Signature', 14, y)
  doc.line(14, y + 14, 78, y + 14)
  doc.text('Farmer Signature', 120, y)
  doc.line(120, y + 14, 186, y + 14)

  doc.setDrawColor(...GOLD)
  doc.setLineWidth(0.4)
  doc.line(14, 285, 196, 285)
  doc.setFontSize(7.5)
  doc.setTextColor(...MUTED)
  doc.text(settings.invoiceFooter || settings.businessName, 14, 291)
  doc.text('Generated for farmer records — Thayil Cardamom Spices', 196, 291, { align: 'right' })

  return doc
}

export async function savePdf(doc: jsPDF, filename: string) {
  const blob = doc.output('blob')
  const file = new File([blob], filename, { type: 'application/pdf' })
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename })
      return
    } catch {
      /* download */
    }
  }
  doc.save(filename)
}

export function printPdfDoc(doc: jsPDF) {
  doc.autoPrint()
  window.open(doc.output('bloburl'), '_blank')
}
