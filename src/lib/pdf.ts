import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatDate, formatKg, formatMoney } from './utils'
import type { BusinessSettings, Farmer, Invoice, Payment, Purchase, ReceivingRecord, DryingBatch } from '@/types'

type DocKind = 'invoice' | 'receiving' | 'purchase' | 'payment' | 'statement' | 'report'

function header(doc: jsPDF, settings: BusinessSettings, title: string) {
  doc.setFillColor(18, 59, 42)
  doc.rect(0, 0, 210, 28, 'F')
  doc.setTextColor(198, 164, 92)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text(settings.businessName, 14, 12)
  doc.setTextColor(234, 243, 237)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text([settings.address, `Phone: ${settings.phone || '—'}  WhatsApp: ${settings.whatsapp || '—'}`], 14, 19)
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text(title, 196, 16, { align: 'right' })
}

function footer(doc: jsPDF, settings: BusinessSettings) {
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setDrawColor(227, 234, 229)
    doc.line(14, 285, 196, 285)
    doc.setFontSize(8)
    doc.setTextColor(115, 128, 120)
    doc.text(settings.invoiceFooter || settings.businessName, 14, 291)
    doc.text(`Page ${i} of ${pageCount}`, 196, 291, { align: 'right' })
  }
}

function farmerBlock(doc: jsPDF, farmer: Farmer, y: number): number {
  doc.setTextColor(32, 42, 36)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('Farmer Details', 14, y)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(`${farmer.fullName}  (${farmer.farmerCode})`, 14, y + 6)
  doc.text(`Phone: ${farmer.phone}`, 14, y + 12)
  if (farmer.address) doc.text(`Address: ${farmer.address}`, 14, y + 18)
  return y + (farmer.address ? 26 : 20)
}

export function generateInvoicePdf(
  settings: BusinessSettings,
  farmer: Farmer,
  invoice: Invoice,
  items: { description: string; quantity: number; rate: number; amount: number }[],
  batches: DryingBatch[],
) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  header(doc, settings, 'INVOICE')
  let y = 36
  doc.setTextColor(32, 42, 36)
  doc.setFontSize(10)
  doc.text(`Invoice: ${invoice.invoiceCode}`, 14, y)
  doc.text(`Date: ${formatDate(invoice.invoiceDate)}`, 120, y)
  doc.text(`Status: ${invoice.status.toUpperCase()}`, 120, y + 6)
  y = farmerBlock(doc, farmer, y + 14)

  if (batches.length) {
    autoTable(doc, {
      startY: y,
      head: [['Batch', 'Green KG', 'Dry KG', 'Loss KG', 'Yield %']],
      body: batches.map((b) => [
        b.batchCode,
        formatKg(b.greenInputKg),
        formatKg(b.dryOutputKg),
        formatKg(b.dryingLossKg),
        `${b.yieldPercentage?.toFixed(1) ?? '—'}%`,
      ]),
      theme: 'grid',
      headStyles: { fillColor: [18, 59, 42] },
      styles: { fontSize: 9 },
    })
    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6
  }

  autoTable(doc, {
    startY: y,
    head: [['Description', 'Qty', 'Rate', 'Amount']],
    body: items.map((i) => [
      i.description,
      String(i.quantity),
      formatMoney(i.rate, settings.currencySymbol),
      formatMoney(i.amount, settings.currencySymbol),
    ]),
    theme: 'striped',
    headStyles: { fillColor: [22, 132, 91] },
    styles: { fontSize: 9 },
  })
  y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8

  const summary = [
    ['Previous Balance', formatMoney(invoice.previousBalance, settings.currencySymbol)],
    ['Drying Charges', formatMoney(invoice.dryingCharges, settings.currencySymbol)],
    ['Additional Charges', formatMoney(invoice.additionalCharges, settings.currencySymbol)],
    ['Purchase Amount', formatMoney(invoice.purchaseAmount, settings.currencySymbol)],
    ['Total', formatMoney(invoice.totalAmount, settings.currencySymbol)],
    ['Paid', formatMoney(invoice.paidAmount, settings.currencySymbol)],
    ['Balance Due', formatMoney(invoice.remainingBalance, settings.currencySymbol)],
  ]
  autoTable(doc, {
    startY: y,
    body: summary,
    theme: 'plain',
    styles: { fontSize: 10 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 }, 1: { halign: 'right' } },
    margin: { left: 110 },
  })

  y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20
  doc.setFontSize(9)
  doc.text('Authorized Signature', 14, y)
  doc.line(14, y + 12, 70, y + 12)
  doc.text('Farmer Signature', 130, y)
  doc.line(130, y + 12, 186, y + 12)

  footer(doc, settings)
  return doc
}

export function generateReceivingPdf(
  settings: BusinessSettings,
  farmer: Farmer,
  record: ReceivingRecord,
) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  header(doc, settings, 'RECEIVING RECEIPT')
  let y = 36
  doc.setFontSize(10)
  doc.setTextColor(32, 42, 36)
  doc.text(`Receipt: ${record.receiptCode}`, 14, y)
  doc.text(`Date: ${formatDate(record.receivedAt, true)}`, 120, y)
  y = farmerBlock(doc, farmer, y + 12)
  autoTable(doc, {
    startY: y,
    body: [
      ['Green Weight', `${formatKg(record.greenWeightKg)} KG`],
      ['Number of Bags', String(record.numberOfBags)],
      ['Quality', record.quality],
      ['Staff', record.staffName || '—'],
      ['Allocated', `${formatKg(record.allocatedKg)} KG`],
      ['Pending Allocation', `${formatKg(record.greenWeightKg - record.allocatedKg)} KG`],
      ['Notes', record.notes || '—'],
    ],
    theme: 'grid',
    styles: { fontSize: 10 },
    columnStyles: { 0: { fontStyle: 'bold', fillColor: [234, 243, 237], cellWidth: 55 } },
  })
  footer(doc, settings)
  return doc
}

export function generatePurchasePdf(
  settings: BusinessSettings,
  farmer: Farmer,
  purchase: Purchase,
) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  header(doc, settings, 'PURCHASE RECEIPT')
  let y = 36
  doc.setFontSize(10)
  doc.setTextColor(32, 42, 36)
  doc.text(`Purchase: ${purchase.purchaseCode}`, 14, y)
  doc.text(`Date: ${formatDate(purchase.purchaseDate)}`, 120, y)
  y = farmerBlock(doc, farmer, y + 12)
  autoTable(doc, {
    startY: y,
    body: [
      ['Type', purchase.type.toUpperCase()],
      ['Quantity', `${formatKg(purchase.quantityKg)} KG`],
      ['Rate / KG', formatMoney(purchase.ratePerKg, settings.currencySymbol)],
      ['Gross Amount', formatMoney(purchase.grossAmount, settings.currencySymbol)],
      ['Deductions', formatMoney(purchase.deductions, settings.currencySymbol)],
      ['Net Payable', formatMoney(purchase.netPayable, settings.currencySymbol)],
      ['Paid', formatMoney(purchase.paidAmount, settings.currencySymbol)],
      ['Status', purchase.paymentStatus],
    ],
    theme: 'grid',
    styles: { fontSize: 10 },
    columnStyles: { 0: { fontStyle: 'bold', fillColor: [234, 243, 237], cellWidth: 55 } },
  })
  footer(doc, settings)
  return doc
}

export function generatePaymentPdf(
  settings: BusinessSettings,
  farmer: Farmer,
  payment: Payment,
) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  header(doc, settings, 'PAYMENT RECEIPT')
  let y = 36
  doc.setFontSize(10)
  doc.setTextColor(32, 42, 36)
  doc.text(`Payment: ${payment.paymentCode}`, 14, y)
  doc.text(`Date: ${formatDate(payment.paymentDate)}`, 120, y)
  y = farmerBlock(doc, farmer, y + 12)
  autoTable(doc, {
    startY: y,
    body: [
      ['Amount', formatMoney(payment.amount, settings.currencySymbol)],
      ['Method', payment.method.replace('_', ' ').toUpperCase()],
      ['Reference', payment.transactionRef || '—'],
      ['Notes', payment.notes || '—'],
    ],
    theme: 'grid',
    styles: { fontSize: 10 },
    columnStyles: { 0: { fontStyle: 'bold', fillColor: [234, 243, 237], cellWidth: 55 } },
  })
  footer(doc, settings)
  return doc
}

export function generateFarmerStatementPdf(
  settings: BusinessSettings,
  farmer: Farmer,
  stats: {
    lifetimeGreenKg: number
    lifetimeDryKg: number
    totalDryingLoss: number
    totalDryingCharges: number
    totalPurchaseAmount: number
    totalPayments: number
    outstandingBalance: number
  },
  ledger: { entryDate: string; description: string; entryType: string; amount: number; balanceAfter: number }[],
) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  header(doc, settings, 'FARMER STATEMENT')
  let y = farmerBlock(doc, farmer, 36)
  autoTable(doc, {
    startY: y,
    head: [['Metric', 'Value']],
    body: [
      ['Lifetime Green KG', formatKg(stats.lifetimeGreenKg)],
      ['Lifetime Dry KG', formatKg(stats.lifetimeDryKg)],
      ['Total Drying Loss', formatKg(stats.totalDryingLoss)],
      ['Total Drying Charges', formatMoney(stats.totalDryingCharges, settings.currencySymbol)],
      ['Total Purchases', formatMoney(stats.totalPurchaseAmount, settings.currencySymbol)],
      ['Total Payments', formatMoney(stats.totalPayments, settings.currencySymbol)],
      ['Outstanding Balance', formatMoney(stats.outstandingBalance, settings.currencySymbol)],
    ],
    theme: 'grid',
    headStyles: { fillColor: [18, 59, 42] },
  })
  y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8
  autoTable(doc, {
    startY: y,
    head: [['Date', 'Description', 'Type', 'Amount', 'Balance']],
    body: ledger.map((e) => [
      formatDate(e.entryDate),
      e.description,
      e.entryType,
      formatMoney(e.amount, settings.currencySymbol),
      formatMoney(e.balanceAfter, settings.currencySymbol),
    ]),
    theme: 'striped',
    headStyles: { fillColor: [22, 132, 91] },
    styles: { fontSize: 8 },
  })
  footer(doc, settings)
  return doc
}

export function generateReportPdf(
  settings: BusinessSettings,
  title: string,
  columns: string[],
  rows: (string | number)[][],
) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  header(doc, settings, title.toUpperCase())
  autoTable(doc, {
    startY: 36,
    head: [columns],
    body: rows,
    theme: 'striped',
    headStyles: { fillColor: [18, 59, 42] },
    styles: { fontSize: 8 },
  })
  footer(doc, settings)
  return doc
}

export async function saveOrSharePdf(doc: jsPDF, filename: string, kind: DocKind = 'invoice') {
  const blob = doc.output('blob')
  const file = new File([blob], filename, { type: 'application/pdf' })
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename, text: `Thayil ${kind}` })
      return
    } catch {
      // fall through to download
    }
  }
  doc.save(filename)
}

export function printPdf(doc: jsPDF) {
  doc.autoPrint()
  window.open(doc.output('bloburl'), '_blank')
}
