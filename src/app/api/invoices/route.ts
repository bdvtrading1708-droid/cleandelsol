import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { jsPDF } from 'jspdf'

// Clean Del Sol company details
const COMPANY = {
  name: 'CLEAN DEL SOL',
  nif: 'Z1812131N',
  address: 'Avenida las paredillas 44',
  city: '29130, Alhaurin de la torre',
  email: 'wecleandelsol@gmail.com',
  website: 'www.cleandelsol.com',
  phone: '689 73 18 07',
  iban: 'ES55 0182 7881 3002 0165 5546',
  paymentTerms: 'We kindly expect the payment to be received in our account within 7 days of the invoice date.',
}

function drawLogo(doc: jsPDF, x: number, y: number, scale: number = 1) {
  const s = scale
  const cx = x + 30 * s

  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(0.8 * s)

  // Fin
  doc.lines(
    [[0, -12 * s], [5 * s, -8 * s], [5 * s, 12 * s]],
    cx - 5 * s, y + 15 * s
  )

  // Wave 1
  doc.setLineCap('round')
  const w1y = y + 18 * s
  doc.line(cx - 20 * s, w1y, cx - 10 * s, w1y - 5 * s)
  doc.line(cx - 10 * s, w1y - 5 * s, cx, w1y)
  doc.line(cx, w1y, cx + 10 * s, w1y - 5 * s)
  doc.line(cx + 10 * s, w1y - 5 * s, cx + 20 * s, w1y)

  // Wave 2
  const w2y = y + 24 * s
  doc.line(cx - 24 * s, w2y, cx - 12 * s, w2y - 5 * s)
  doc.line(cx - 12 * s, w2y - 5 * s, cx, w2y)
  doc.line(cx, w2y, cx + 12 * s, w2y - 5 * s)
  doc.line(cx + 12 * s, w2y - 5 * s, cx + 24 * s, w2y)

  // Wave 3
  const w3y = y + 30 * s
  doc.line(cx - 28 * s, w3y, cx - 14 * s, w3y - 5 * s)
  doc.line(cx - 14 * s, w3y - 5 * s, cx, w3y)
  doc.line(cx, w3y, cx + 14 * s, w3y - 5 * s)
  doc.line(cx + 14 * s, w3y - 5 * s, cx + 28 * s, w3y)
}

function formatCurrency(amount: number): string {
  return `€${amount.toFixed(2).replace('.', ',')}`
}

function formatDateStr(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function calcHours(start?: string | null, end?: string | null, worked?: number | null): number {
  if (worked != null && worked > 0) return worked
  if (!start || !end) return 0
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  const diff = (eh * 60 + em) - (sh * 60 + sm)
  return diff > 0 ? diff / 60 : 0
}

function getJobRevenue(job: Record<string, unknown>): number {
  const pricingType = (job.pricing_type as string) || (job.property as Record<string, unknown>)?.pricing_type as string
  const clientPrice = (job.client_price as number) || 0
  const laundryCost = (job.laundry_cost as number) || 0

  if (pricingType === 'fixed') return clientPrice + laundryCost

  const cleaners = (job.job_cleaners as Array<Record<string, unknown>>) || []
  if (cleaners.length > 0) {
    const totalHours = cleaners.reduce((sum, jc) => sum + calcHours(jc.start_time as string, jc.end_time as string, jc.hours_worked as number), 0)
    return (totalHours > 0 ? clientPrice * totalHours : clientPrice) + laundryCost
  }

  const hours = calcHours(job.start_time as string, job.end_time as string, job.hours_worked as number)
  return (hours > 0 ? clientPrice * hours : clientPrice) + laundryCost
}

function getJobHours(job: Record<string, unknown>): number {
  const cleaners = (job.job_cleaners as Array<Record<string, unknown>>) || []
  if (cleaners.length > 0) {
    return cleaners.reduce((sum, jc) => sum + calcHours(jc.start_time as string, jc.end_time as string, jc.hours_worked as number), 0)
  }
  return calcHours(job.start_time as string, job.end_time as string, job.hours_worked as number)
}

export async function POST(req: NextRequest) {
  try {
    const { partner_id, job_ids } = await req.json() as { partner_id: string; job_ids: number[] }

    if (!partner_id || !job_ids?.length) {
      return NextResponse.json({ error: 'partner_id and job_ids required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Get partner
    const { data: partner, error: partnerErr } = await supabase
      .from('partners')
      .select('*')
      .eq('id', partner_id)
      .single()
    if (partnerErr || !partner) {
      return NextResponse.json({ error: 'Partner not found' }, { status: 404 })
    }

    // Get jobs with properties and cleaners
    const { data: jobs, error: jobsErr } = await supabase
      .from('jobs')
      .select('*, property:properties(*), job_cleaners(*, cleaner:users!job_cleaners_cleaner_id_fkey(id, name))')
      .in('id', job_ids)
      .order('date', { ascending: true })
    if (jobsErr || !jobs?.length) {
      return NextResponse.json({ error: 'Jobs not found' }, { status: 404 })
    }

    // Calculate next invoice number
    const { data: lastInvoice } = await supabase
      .from('invoices')
      .select('invoice_number')
      .order('id', { ascending: false })
      .limit(1)
      .single()

    let nextNumber = 2026277 // Starting number
    if (lastInvoice?.invoice_number) {
      const lastNum = parseInt(lastInvoice.invoice_number.replace('F', ''), 10)
      if (!isNaN(lastNum)) nextNumber = lastNum + 1
    }
    const invoiceNumber = `F${nextNumber}`

    // Calculate totals per job (excl. IVA)
    const IVA_RATE = 0.21
    const jobLines: { date: string; property: string; description: string; rate: number; hours: number; amount: number }[] = []

    for (const job of jobs) {
      const pricingType = (job.pricing_type as string) || (job.property as Record<string, unknown>)?.pricing_type as string
      const clientPrice = (job.client_price as number) || 0
      const laundryCost = (job.laundry_cost as number) || 0
      const propertyName = (job.property as Record<string, unknown>)?.name as string || job.custom_property_name || '—'
      const hours = getJobHours(job)
      const hasLaundry = laundryCost > 0

      if (pricingType === 'fixed') {
        // Fixed price: show as single line
        jobLines.push({
          date: job.date,
          property: propertyName,
          description: hasLaundry ? 'Cleaning + Laundry' : 'Cleaning',
          rate: clientPrice + laundryCost,
          hours: 0, // no hours for fixed
          amount: clientPrice + laundryCost,
        })
      } else {
        // Hourly: show rate × hours
        const baseAmount = hours > 0 ? clientPrice * hours : clientPrice
        jobLines.push({
          date: job.date,
          property: propertyName,
          description: 'Cleaning',
          rate: clientPrice,
          hours,
          amount: baseAmount,
        })
        // Laundry as separate line if applicable
        if (hasLaundry) {
          jobLines.push({
            date: job.date,
            property: propertyName,
            description: 'Laundry service',
            rate: laundryCost,
            hours: 0,
            amount: laundryCost,
          })
        }
      }
    }

    const subtotal = jobLines.reduce((sum, line) => sum + line.amount, 0)
    const ivaAmount = Math.round(subtotal * IVA_RATE * 100) / 100
    const totalAmount = subtotal + ivaAmount

    // Generate PDF
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pageWidth = 210
    const margin = 20
    const contentWidth = pageWidth - margin * 2
    let yPos = margin

    // --- HEADER: Logo + Company info ---
    drawLogo(doc, margin, yPos, 0.8)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(18)
    doc.setTextColor(0, 0, 0)
    doc.text('CLEAN DEL SOL', margin + 55, yPos + 18)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(100, 100, 100)
    const rightX = pageWidth - margin
    doc.text(COMPANY.nif, rightX, yPos + 8, { align: 'right' })
    doc.text(COMPANY.address, rightX, yPos + 13, { align: 'right' })
    doc.text(COMPANY.city, rightX, yPos + 18, { align: 'right' })
    doc.text(COMPANY.email, rightX, yPos + 23, { align: 'right' })
    doc.text(COMPANY.website, rightX, yPos + 28, { align: 'right' })
    doc.text(COMPANY.phone, rightX, yPos + 33, { align: 'right' })

    yPos += 45

    // Divider
    doc.setDrawColor(220, 220, 220)
    doc.setLineWidth(0.3)
    doc.line(margin, yPos, pageWidth - margin, yPos)
    yPos += 10

    // --- INVOICE TITLE ---
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(22)
    doc.setTextColor(0, 0, 0)
    doc.text('INVOICE', margin, yPos)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text(`Invoice number: ${invoiceNumber}`, rightX, yPos - 5, { align: 'right' })
    const today = new Date()
    const dateStr = today.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
    doc.text(`Date: ${dateStr}`, rightX, yPos + 1, { align: 'right' })

    yPos += 12

    // --- PARTNER DETAILS ---
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(100, 100, 100)
    doc.text('INVOICE TO:', margin, yPos)
    yPos += 6

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(0, 0, 0)
    doc.text(partner.name, margin, yPos)
    yPos += 5

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(60, 60, 60)
    if (partner.address) { doc.text(partner.address, margin, yPos); yPos += 4 }
    if (partner.postal_code || partner.city) {
      doc.text([partner.postal_code, partner.city].filter(Boolean).join(' '), margin, yPos)
      yPos += 4
    }
    if (partner.country) { doc.text(partner.country, margin, yPos); yPos += 4 }
    if (partner.tax_number) { doc.text(`NIF/CIF: ${partner.tax_number}`, margin, yPos); yPos += 4 }
    if (partner.email) { doc.text(partner.email, margin, yPos); yPos += 4 }
    if (partner.phone) { doc.text(partner.phone, margin, yPos); yPos += 4 }

    yPos += 8

    // --- JOB TABLE ---
    // Columns: DATUM | OMSCHRIJVING | TARIEF | UREN | BEDRAG
    const colDate = margin
    const colDesc = margin + 25
    const colRate = margin + 90
    const colHours = margin + 115
    const colAmount = pageWidth - margin

    doc.setFillColor(245, 245, 245)
    doc.rect(margin, yPos - 4, contentWidth, 8, 'F')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(100, 100, 100)
    doc.text('DATE', colDate, yPos)
    doc.text('DESCRIPTION', colDesc, yPos)
    doc.text('RATE', colRate, yPos)
    doc.text('HOURS', colHours, yPos)
    doc.text('AMOUNT', colAmount, yPos, { align: 'right' })

    yPos += 8

    // Table rows
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(30, 30, 30)

    for (const line of jobLines) {
      if (yPos > 250) {
        doc.addPage()
        yPos = margin
      }

      doc.text(formatDateStr(line.date), colDate, yPos)

      // Property + description
      const desc = `${line.property.substring(0, 28)} — ${line.description}`
      doc.text(desc, colDesc, yPos)

      if (line.hours > 0) {
        // Hourly: show rate, hours, and calculated amount
        doc.text(formatCurrency(line.rate), colRate, yPos)
        doc.text(line.hours.toFixed(1), colHours, yPos)
      } else {
        // Fixed price: show as "Vast" in rate column
        doc.text('Fixed', colRate, yPos)
        doc.text('—', colHours, yPos)
      }

      doc.text(formatCurrency(line.amount), colAmount, yPos, { align: 'right' })

      yPos += 6

      doc.setDrawColor(235, 235, 235)
      doc.setLineWidth(0.2)
      doc.line(margin, yPos - 2, pageWidth - margin, yPos - 2)
    }

    yPos += 6

    // --- TOTALS: Subtotaal, IVA 21%, Totaal ---
    const totalsX = margin + 90

    doc.setDrawColor(200, 200, 200)
    doc.setLineWidth(0.3)
    doc.line(totalsX, yPos, pageWidth - margin, yPos)
    yPos += 5

    // Subtotal
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(60, 60, 60)
    doc.text('Subtotal', totalsX, yPos)
    doc.text(formatCurrency(subtotal), colAmount, yPos, { align: 'right' })
    yPos += 5

    // IVA 21%
    doc.text('IVA 21%', totalsX, yPos)
    doc.text(formatCurrency(ivaAmount), colAmount, yPos, { align: 'right' })
    yPos += 6

    // Totaal incl. IVA
    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(0.5)
    doc.line(totalsX, yPos, pageWidth - margin, yPos)
    yPos += 6

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(0, 0, 0)
    doc.text('TOTAL INCL. IVA', totalsX, yPos)
    doc.text(formatCurrency(totalAmount), colAmount, yPos, { align: 'right' })

    yPos += 20

    // --- PAYMENT INFO ---
    if (yPos > 250) {
      doc.addPage()
      yPos = margin
    }

    doc.setDrawColor(220, 220, 220)
    doc.setLineWidth(0.3)
    doc.line(margin, yPos, pageWidth - margin, yPos)
    yPos += 8

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(80, 80, 80)
    doc.text(COMPANY.paymentTerms, margin, yPos, { maxWidth: contentWidth })
    yPos += 12

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(0, 0, 0)
    doc.text(`IBAN: ${COMPANY.iban}`, margin, yPos)

    // Generate PDF buffer
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'))

    // Upload to Supabase Storage
    const filePath = `invoices/${invoiceNumber}.pdf`
    const { error: uploadErr } = await supabase.storage
      .from('invoices')
      .upload(filePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      })

    let pdfUrl = ''
    if (!uploadErr) {
      const { data: urlData } = supabase.storage
        .from('invoices')
        .getPublicUrl(filePath)
      pdfUrl = urlData.publicUrl
    }

    // Create invoice record
    const { data: invoice, error: invoiceErr } = await supabase
      .from('invoices')
      .insert({
        invoice_number: invoiceNumber,
        partner_id,
        total_amount: totalAmount,
        pdf_url: pdfUrl,
        status: 'sent',
      })
      .select('id')
      .single()

    if (invoiceErr) {
      return NextResponse.json({ error: 'Failed to create invoice: ' + invoiceErr.message }, { status: 500 })
    }

    // Link jobs to invoice
    const invoiceJobRows = job_ids.map(job_id => ({
      invoice_id: invoice.id,
      job_id,
    }))
    await supabase.from('invoice_jobs').insert(invoiceJobRows)

    // Update job statuses to invoiced
    await supabase
      .from('jobs')
      .update({ status: 'invoiced' })
      .in('id', job_ids)

    // Return PDF as downloadable response + metadata
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${invoiceNumber}.pdf"`,
        'X-Invoice-Number': invoiceNumber,
        'X-Invoice-Id': String(invoice.id),
        'X-Pdf-Url': pdfUrl,
      },
    })
  } catch (err) {
    console.error('Invoice generation error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET: List invoices or get invoice by partner
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const partnerId = req.nextUrl.searchParams.get('partner_id')

    let query = supabase
      .from('invoices')
      .select('*, partner:partners(*)')
      .order('id', { ascending: false })

    if (partnerId) {
      query = query.eq('partner_id', partnerId)
    }

    const { data, error } = await query
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
