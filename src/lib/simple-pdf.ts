import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatDate, formatKg, formatMoney } from './utils'
import type { Bill, DailyEntry, SimpleFarmer, SimpleSettings } from '@/types/simple'
import { RATE_METHOD_LABELS } from './simple-defaults'

type Doc = jsPDF & { lastAutoTable: { finalY: number } }

export function generatePeriodBillPdf(
  settings: SimpleSettings,
  farmer: SimpleFarmer,
  bill: Bill,
  entries: DailyEntry[],
) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' }) as Doc
  doc.setFillColor(18, 59, 42)
  doc.rect(0, 0, 210, 28, 'F')
  doc.setTextColor(198, 164, 92)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text(settings.businessName, 14, 12)
  doc.setTextColor(234, 243, 237)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(
    [settings.address || '', `Phone: ${settings.phone || '—'}  WhatsApp: ${settings.whatsapp || '—'}`],
    14,
    19,
  )
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('BILL', 196, 16, { align: 'right' })

  let y = 36
  doc.setTextColor(32, 42, 36)
  doc.setFontSize(10)
  doc.text(`Bill: ${bill.billCode}`, 14, y)
  doc.text(`Date: ${formatDate(bill.billDate)}`, 120, y)
  doc.text(`Period: ${bill.periodFrom} → ${bill.periodTo} (${bill.periodType})`, 14, y + 6)
  doc.setFont('helvetica', 'bold')
  doc.text('Farmer', 14, y + 16)
  doc.setFont('helvetica', 'normal')
  doc.text(`${farmer.fullName} (${farmer.farmerCode})`, 14, y + 22)
  doc.text(`Phone: ${farmer.phone}`, 14, y + 28)

  autoTable(doc, {
    startY: y + 34,
    head: [['Date', 'Green KG', 'Dry KG', 'Loss', 'Rate', 'Charge']],
    body: entries.map((e) => [
      e.entryDate,
      formatKg(e.greenKg),
      formatKg(e.dryKg),
      formatKg(e.lossKg),
      `${formatMoney(e.rate, settings.currencySymbol)} (${RATE_METHOD_LABELS[e.rateMethod] ?? e.rateMethod})`,
      formatMoney(e.labourCharge, settings.currencySymbol),
    ]),
    theme: 'striped',
    headStyles: { fillColor: [18, 59, 42] },
    styles: { fontSize: 8 },
  })

  y = doc.lastAutoTable.finalY + 8
  autoTable(doc, {
    startY: y,
    body: [
      ['Total Green KG', formatKg(bill.totalGreenKg)],
      ['Total Dry KG', formatKg(bill.totalDryKg)],
      ['Total Loss KG', formatKg(bill.totalLossKg)],
      ['Total Charges', formatMoney(bill.totalCharges, settings.currencySymbol)],
      ['Previous Balance', formatMoney(bill.previousBalance, settings.currencySymbol)],
      ['Payments in Period', formatMoney(bill.paymentsInPeriod, settings.currencySymbol)],
      ['Current Bill', formatMoney(bill.currentBillAmount, settings.currencySymbol)],
      ['Paid on Bill', formatMoney(bill.amountPaidOnBill, settings.currencySymbol)],
      ['Final Balance', formatMoney(bill.finalBalance, settings.currencySymbol)],
      ['Status', `${bill.paymentStatus.toUpperCase()} · ${bill.status.toUpperCase()}`],
    ],
    theme: 'plain',
    styles: { fontSize: 10 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 55 }, 1: { halign: 'right' } },
    margin: { left: 100 },
  })

  y = doc.lastAutoTable.finalY + 18
  doc.setFontSize(9)
  doc.text('Authorized Signature', 14, y)
  doc.line(14, y + 12, 70, y + 12)
  doc.text('Farmer Signature', 130, y)
  doc.line(130, y + 12, 186, y + 12)

  doc.setDrawColor(227, 234, 229)
  doc.line(14, 285, 196, 285)
  doc.setFontSize(8)
  doc.setTextColor(115, 128, 120)
  doc.text(settings.invoiceFooter || settings.businessName, 14, 291)

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
