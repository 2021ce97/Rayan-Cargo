import jsPDF from 'jspdf';
import { Shipment, Branch } from '../types';

/**
 * Universal safe print utility that uses an isolated hidden iframe.
 * This completely avoids parent document clipping, sandbox issues, and prints ONLY the targeted element.
 */
export function printElementUsingIframe(element: HTMLElement, title: string = 'Print Document'): boolean {
  try {
    // Remove any existing print iframes
    const oldIframe = document.getElementById('rayan_print_iframe');
    if (oldIframe) {
      document.body.removeChild(oldIframe);
    }

    // Create a hidden iframe
    const iframe = document.createElement('iframe');
    iframe.id = 'rayan_print_iframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.zIndex = '-9999';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      window.print();
      return false;
    }

    // Extract HTML content
    const htmlContent = element.outerHTML;

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <meta charset="utf-8" />
          <style>
            @page {
              size: A4;
              margin: 10mm;
            }
            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              background: #ffffff !important;
              color: #0f172a !important;
              margin: 0;
              padding: 10px;
            }
            .no-print {
              display: none !important;
            }
            table {
              border-collapse: collapse;
              width: 100%;
            }
            th, td {
              border: 1px solid #cbd5e1;
              padding: 6px 8px;
              text-align: left;
            }
            th {
              background-color: #f1f5f9 !important;
              color: #0f172a !important;
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          ${htmlContent}
        </body>
      </html>
    `);
    doc.close();

    // Trigger printing once content is ready
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.error('Iframe print error:', err);
        window.print();
      }
    }, 350);

    return true;
  } catch (err) {
    console.error('Direct print failed, using window.print fallback:', err);
    window.print();
    return false;
  }
}

/**
 * Direct Vector jsPDF generator for Official Rayan Cargo Consignment Note / Waybill.
 * Highly robust, zero CORS dependencies, vector-sharp graphics, downloads 100% reliably.
 */
export function generateWaybillPdf(shipment: Shipment, originBranch?: Branch, destBranch?: Branch): boolean {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const pageWidth = 210;
    const margin = 12;
    const contentWidth = pageWidth - margin * 2; // 186mm

    // Header Background Accent
    doc.setFillColor(225, 29, 72); // Red-600
    doc.rect(margin, margin, contentWidth, 24, 'F');

    // Header Text
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('ARMAGHAN SADEQ TRANSFERS', margin + 6, margin + 9);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text('AFGHANISTAN NATIONWIDE EXPRESS TRANSFERS & FREIGHT NETWORK', margin + 6, margin + 15);
    doc.text('Kabul HQ | 34 Provinces Connected | Fast & Secure Delivery', margin + 6, margin + 20);

    // CN Number Box on Header Right
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(margin + contentWidth - 62, margin + 3.5, 58, 17, 2, 2, 'F');
    doc.setTextColor(225, 29, 72);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('CONSIGNMENT NOTE #', margin + contentWidth - 60, margin + 8);
    doc.setFontSize(13);
    doc.text(shipment.cnNumber, margin + contentWidth - 60, margin + 16);

    let y = margin + 30;

    // Sub-header Information Strip
    doc.setFillColor(241, 245, 249); // Slate-100
    doc.rect(margin, y, contentWidth, 8, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.rect(margin, y, contentWidth, 8, 'S');

    doc.setTextColor(51, 65, 85);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(`Booking Date: ${new Date(shipment.bookedAt).toLocaleDateString()} ${new Date(shipment.bookedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`, margin + 4, y + 5.5);
    doc.text(`Service Mode: ${shipment.packageInfo.serviceType.toUpperCase().replace('_', ' ')}`, margin + 90, y + 5.5);
    doc.text(`Status: ${shipment.status.toUpperCase().replace(/_/g, ' ')}`, margin + contentWidth - 48, y + 5.5);

    y += 13;

    // SENDER (SHIPPER) & RECEIVER (CONSIGNEE) TWO-COLUMN BOXES
    const colWidth = (contentWidth - 6) / 2; // 90mm each
    const boxHeight = 44;

    // Sender Box
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.4);
    doc.rect(margin, y, colWidth, boxHeight);

    doc.setFillColor(15, 23, 42);
    doc.rect(margin, y, colWidth, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('1. SENDER / SHIPPER (FROM)', margin + 3, y + 5);

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text(shipment.sender.name, margin + 3, y + 13);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(`Phone: ${shipment.sender.phone}`, margin + 3, y + 19);
    if (shipment.sender.nationalId) {
      doc.text(`Tazkira / National ID: ${shipment.sender.nationalId}`, margin + 3, y + 25);
    }
    doc.text(`Origin City: ${originBranch?.city || shipment.sender.city} (${shipment.sender.province || 'AFG'})`, margin + 3, y + 31);
    doc.text(`Address: ${shipment.sender.address.substring(0, 38)}`, margin + 3, y + 37);

    // Receiver Box
    const rxX = margin + colWidth + 6;
    doc.rect(rxX, y, colWidth, boxHeight);
    doc.setFillColor(225, 29, 72);
    doc.rect(rxX, y, colWidth, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('2. RECEIVER / CONSIGNEE (TO)', rxX + 3, y + 5);

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text(shipment.receiver.name, rxX + 3, y + 13);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    const rxPhoneLine = shipment.receiver.altPhone 
      ? `Phone: ${shipment.receiver.phone} / ${shipment.receiver.altPhone}`
      : `Phone: ${shipment.receiver.phone}`;
    doc.text(rxPhoneLine, rxX + 3, y + 19);

    const receiverTazkiraNumber = shipment.receiver.nationalId || shipment.sender.receiverTazkira;
    if (receiverTazkiraNumber) {
      doc.setFont('helvetica', 'bold');
      doc.text(`Receiver Tazkira: ${receiverTazkiraNumber}`, rxX + 3, y + 25);
      doc.setFont('helvetica', 'normal');
    }
    doc.text(`Destination City: ${destBranch?.city || shipment.receiver.city} (${shipment.receiver.province || 'AFG'})`, rxX + 3, y + 31);
    doc.text(`Address: ${shipment.receiver.address.substring(0, 38)}`, rxX + 3, y + 37);

    y += boxHeight + 6;

    // PARCEL INFORMATION TABLE
    doc.setFillColor(15, 23, 42);
    doc.rect(margin, y, contentWidth, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('3. CONSIGNMENT & FREIGHT SPECIFICATIONS', margin + 4, y + 5);

    y += 7;

    // Table Header
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, contentWidth, 7, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.rect(margin, y, contentWidth, 7, 'S');

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('Category', margin + 3, y + 4.8);
    doc.text('Description', margin + 42, y + 4.8);
    doc.text('Pieces', margin + 105, y + 4.8);
    doc.text('Weight (KG)', margin + 125, y + 4.8);
    doc.text('Declared Value', margin + 152, y + 4.8);

    y += 7;

    // Table Row
    doc.rect(margin, y, contentWidth, 9, 'S');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(shipment.packageInfo.category.toUpperCase(), margin + 3, y + 6);
    doc.text(shipment.packageInfo.description.substring(0, 32), margin + 42, y + 6);
    doc.text(`${shipment.packageInfo.pieces} pcs`, margin + 105, y + 6);
    doc.text(`${shipment.packageInfo.weightKg} KG`, margin + 125, y + 6);
    doc.text(`${(shipment.packageInfo.declaredValueAfn || 0).toLocaleString()} AFN`, margin + 152, y + 6);

    y += 14;

    // FINANCIAL SUMMARY & PAYMENT SECTION
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, y, contentWidth, 38, 2, 2, 'FD');

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('4. CHARGES & FINANCIAL SETTLEMENT', margin + 4, y + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    const baseAndWeight = (shipment.financials.baseRate || 0) + (shipment.financials.weightCost || 0);
    doc.text(`Base & Weight Freight: ${baseAndWeight.toLocaleString()} AFN`, margin + 4, y + 14);
    doc.text(`Service Fee: ${(shipment.financials.serviceFee || 0).toLocaleString()} AFN`, margin + 4, y + 20);
    doc.text(`Tax / Surcharge: ${(shipment.financials.tax || 0).toLocaleString()} AFN`, margin + 4, y + 26);
    doc.text(`Discount / Promo: ${(shipment.financials.discountAmount || 0).toLocaleString()} AFN`, margin + 4, y + 32);

    // Total and Payment Status Banner Box
    const totalBoxX = margin + 90;
    const isPaid = shipment.financials.paymentStatus === 'paid';
    doc.setFillColor(isPaid ? 236 : 254, isPaid ? 253 : 243, isPaid ? 245 : 199);
    doc.setDrawColor(isPaid ? 16 : 217, isPaid ? 185 : 119, isPaid ? 129 : 6);
    doc.roundedRect(totalBoxX, y + 4, contentWidth - 94, 28, 2, 2, 'FD');

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('TOTAL AMOUNT:', totalBoxX + 4, y + 12);
    doc.setFontSize(14);
    doc.setTextColor(225, 29, 72);
    doc.text(`${shipment.financials.totalAmount.toLocaleString()} AFN`, totalBoxX + 4, y + 20);

    doc.setFontSize(9);
    doc.setTextColor(isPaid ? 22 : 180, isPaid ? 101 : 83, isPaid ? 52 : 9);
    doc.text(`PAYMENT STATUS: ${shipment.financials.paymentStatus.toUpperCase()}`, totalBoxX + 4, y + 27);

    y += 44;

    // BARCODE VISUAL RECTANGLE & TRACKING TEXT
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.3);
    doc.rect(margin, y, contentWidth, 18);
    
    // Draw simulated barcode lines
    doc.setFillColor(15, 23, 42);
    let barX = margin + 12;
    const barsPattern = [2, 1, 3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 1, 3, 1, 2, 3, 1, 2, 4, 1, 2, 3, 1, 4, 2, 1, 3, 2, 1, 3, 1, 2, 4, 1, 3, 2, 1, 4, 2];
    for (let i = 0; i < barsPattern.length; i++) {
      const w = barsPattern[i] * 0.7;
      doc.rect(barX, y + 2, w, 10, 'F');
      barX += w + 1.2;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(`* ${shipment.cnNumber} *`, margin + 35, y + 15.5);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Scan barcode or enter CN on Armaghan Sadeq Transfers Portal to track live status in real time.', margin + 95, y + 7);
    const senderHubPhone = originBranch?.phone ? originBranch.phone : 'Hub Contact';
    doc.text(`Helplines: Sender Hub: ${senderHubPhone} | Complaints: 0711299680 | Main HQ: 0774144004`, margin + 95, y + 13);

    y += 24;

    // SIGNATURE & STAMP BOXES
    const sigColWidth = (contentWidth - 8) / 3;
    const sigHeight = 24;

    // 1. Shipper Signature
    doc.rect(margin, y, sigColWidth, sigHeight);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('Sender Signature & Verification', margin + 3, y + 4.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text('I confirm package contents comply with cargo laws.', margin + 3, y + 8.5);
    doc.text('Signature: ____________________', margin + 3, y + 20.5);

    // 2. Consignee Signature
    const sig2X = margin + sigColWidth + 4;
    doc.rect(sig2X, y, sigColWidth, sigHeight);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('Receiver Signature / Fingerprint', sig2X + 3, y + 4.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text('Received package in sealed & good condition.', sig2X + 3, y + 8.5);
    doc.text('Sign / Thumb: _________________', sig2X + 3, y + 20.5);

    // 3. Authorized Stamp
    const sig3X = sig2X + sigColWidth + 4;
    doc.rect(sig3X, y, sigColWidth, sigHeight);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('Branch Authorized Stamp', sig3X + 3, y + 4.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(`Origin: ${originBranch?.name || shipment.originBranchId}`, sig3X + 3, y + 8.5);
    doc.text('Official Seal: [ VERIFIED ]', sig3X + 3, y + 20.5);

    // OFFICIAL 3 MANDATORY CONTACT NUMBERS STRIP AT BOTTOM OF PDF
    y += sigHeight + 3;
    doc.setFillColor(248, 250, 252); // Slate-50
    doc.setDrawColor(203, 213, 225); // Slate-300
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, y, contentWidth, 12, 1.5, 1.5, 'FD');

    const colContactW = contentWidth / 3;

    // Contact 1: Sender Branch Phone (Added by Admin when creating the branch)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(225, 29, 72); // Red-600
    doc.text('1. SENDER BRANCH PHONE:', margin + 3, y + 4.2);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    const originContactStr = originBranch?.phone ? `${originBranch.phone} (${originBranch.city})` : 'Registered at Origin Hub';
    doc.text(originContactStr, margin + 3, y + 9);

    // Contact 2: Complaints Hotline (0711299680 - Global across all PDFs)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(180, 83, 9); // Amber-700
    doc.text('2. COMPLAINTS / SHIKAYAT:', margin + colContactW + 3, y + 4.2);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text('0711299680', margin + colContactW + 3, y + 9);

    // Contact 3: Main Office Contact (0774144004 - Global across all PDFs)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(30, 58, 138); // Blue-800
    doc.text('3. MAIN OFFICE (KABUL HQ):', margin + colContactW * 2 + 3, y + 4.2);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text('0774144004', margin + colContactW * 2 + 3, y + 9);

    // Footer with Rayan Tech Solutions Attribution
    y += 15;
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text('Armaghan Sadeq Transfers | Official Afghanistan Freight Consignment Document', margin, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(51, 65, 85);
    doc.text('Developed by Rayan tech solutions | Rayan-Tech-Solution.tech (سیستم توسعه یافته توسط خدمات تکنالوژی رایان)', margin + 68, y);

    // Save and download PDF directly
    const filename = `Armaghan_Sadeq_Waybill_${shipment.cnNumber}.pdf`;
    doc.save(filename);
    return true;
  } catch (err) {
    console.error('Error generating direct waybill PDF:', err);
    return false;
  }
}

/**
 * Direct Vector jsPDF generator for Official Cargo Dispatch Manifest.
 */
export function generateDispatchManifestPdf(
  manifestNumber: string,
  branchName: string,
  driver: string,
  vehicle: string,
  parcels: Shipment[],
  branches: Branch[] = []
): boolean {
  try {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const pageWidth = 297;
    const margin = 10;
    const contentWidth = pageWidth - margin * 2; // 277mm

    // Header
    doc.setFillColor(15, 23, 42); // Slate-900
    doc.rect(margin, margin, contentWidth, 18, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('ARMAGHAN SADEQ TRANSFERS — OFFICIAL CARGO DISPATCH & TRANSIT MANIFEST', margin + 6, margin + 8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(`Manifest #: ${manifestNumber} | Origin Hub: ${branchName} | Dispatch Date: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`, margin + 6, margin + 14);

    let y = margin + 22;

    // Driver & Vehicle Bar
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, contentWidth, 8, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.rect(margin, y, contentWidth, 8, 'S');

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(`Assigned Driver: ${driver}`, margin + 4, y + 5.5);
    doc.text(`Vehicle Plate: ${vehicle}`, margin + 85, y + 5.5);
    doc.text(`Total Consignments: ${parcels.length} Parcels`, margin + 160, y + 5.5);
    const totalWt = parcels.reduce((acc, p) => acc + p.packageInfo.weightKg, 0);
    doc.text(`Total Weight: ${totalWt} KG`, margin + 225, y + 5.5);

    y += 12;

    // Table Header
    doc.setFillColor(225, 29, 72);
    doc.rect(margin, y, contentWidth, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('#', margin + 2, y + 5);
    doc.text('CN Number', margin + 10, y + 5);
    doc.text('Route (Origin ➔ Destination)', margin + 42, y + 5);
    doc.text('Shipper (Sender)', margin + 105, y + 5);
    doc.text('Consignee (Receiver)', margin + 155, y + 5);
    doc.text('Pcs / Wt', margin + 205, y + 5);
    doc.text('Payment', margin + 228, y + 5);
    doc.text('COD Due', margin + 250, y + 5);
    doc.text('Sign', margin + 268, y + 5);

    y += 7;

    // Table Rows
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);

    parcels.slice(0, 18).forEach((p, idx) => {
      const orig = branches.find(b => b.id === p.originBranchId);
      const dest = branches.find(b => b.id === p.destinationBranchId);
      const cod = p.financials.paymentStatus === 'to_pay' ? p.financials.amountDue : 0;

      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y, contentWidth, 6.5, 'F');
      }
      doc.setDrawColor(226, 232, 240);
      doc.rect(margin, y, contentWidth, 6.5, 'S');

      doc.text(`${idx + 1}`, margin + 2, y + 4.5);
      doc.setFont('helvetica', 'bold');
      doc.text(p.cnNumber, margin + 10, y + 4.5);
      doc.setFont('helvetica', 'normal');
      doc.text(`${orig?.city || p.sender.city} -> ${dest?.city || p.receiver.city}`, margin + 42, y + 4.5);
      doc.text(`${p.sender.name.substring(0, 18)} (${p.sender.phone})`, margin + 105, y + 4.5);
      doc.text(`${p.receiver.name.substring(0, 18)} (${p.receiver.phone})`, margin + 155, y + 4.5);
      doc.text(`${p.packageInfo.pieces} pcs / ${p.packageInfo.weightKg}kg`, margin + 205, y + 4.5);
      doc.text(p.financials.paymentStatus.toUpperCase(), margin + 228, y + 4.5);
      doc.setFont('helvetica', 'bold');
      doc.text(cod > 0 ? `${cod.toLocaleString()} AFN` : 'PAID', margin + 250, y + 4.5);
      doc.setFont('helvetica', 'normal');
      doc.text('______', margin + 268, y + 4.5);

      y += 6.5;
    });

    // Summary & Signatures at bottom
    y = 170;
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.3);
    doc.line(margin, y, margin + contentWidth, y);

    y += 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('Dispatch Officer Signature: _______________________', margin + 4, y + 5);
    doc.text('Transit Driver Signature: _______________________', margin + 100, y + 5);
    doc.text('Receiving Hub Seal & Sign: _______________________', margin + 195, y + 5);

    y += 11;
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Armaghan Sadeq Transfers Express Logistics Network | Afghanistan Nationwide Operations', margin + 4, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(51, 65, 85);
    doc.text('Developed by Rayan tech solutions | Rayan-Tech-Solution.tech (سیستم توسعه یافته توسط خدمات تکنالوژی رایان)', margin + 140, y);

    const filename = `Armaghan_Sadeq_Manifest_${manifestNumber}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
    return true;
  } catch (err) {
    console.error('Error generating dispatch manifest PDF:', err);
    return false;
  }
}

/**
 * Direct Vector jsPDF generator for Combined Multi-Parcel Customer Waybill / Delivery Note.
 * Generates an official consolidated delivery note for a single receiver (Person A) receiving multiple parcels
 * sent from different origin branches.
 */
export function generateCombinedCustomerPdf(
  customer: {
    name: string;
    phone: string;
    address?: string;
    city?: string;
    province?: string;
    nationalId?: string;
    receiverTazkira?: string;
  },
  shipments: Shipment[],
  destBranch?: Branch,
  branches: Branch[] = []
): boolean {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const pageWidth = 210;
    const margin = 12;
    const contentWidth = pageWidth - margin * 2; // 186mm

    // Header Background Accent (Deep Blue & Red)
    doc.setFillColor(15, 23, 42); // Slate-900
    doc.rect(margin, margin, contentWidth, 24, 'F');

    // Decorative top stripe
    doc.setFillColor(225, 29, 72); // Red-600
    doc.rect(margin, margin, contentWidth, 3, 'F');

    // Header Title
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('ARMAGHAN SADEQ TRANSFERS', margin + 6, margin + 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('CONSOLIDATED MULTI-PARCEL DELIVERY NOTE (سند تحویلی بسته های همزمان)', margin + 6, margin + 16);
    doc.text('Helplines: 0711299680 / 0774144004 / 0799001122 | Kabul Central HQ & Nationwide Hubs', margin + 6, margin + 21);

    // Voucher Number Box
    const voucherNo = `COMB-${Date.now().toString().slice(-6)}`;
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(margin + contentWidth - 60, margin + 5.5, 56, 15, 2, 2, 'F');
    doc.setTextColor(225, 29, 72);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('DELIVERY BATCH #', margin + contentWidth - 58, margin + 10);
    doc.setFontSize(11);
    doc.text(voucherNo, margin + contentWidth - 58, margin + 17);

    let y = margin + 28;

    // RECEIVER / CONSIGNEE (PERSON A) PROFILE CARD
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, y, contentWidth, 24, 2, 2, 'FD');

    doc.setFillColor(225, 29, 72);
    doc.rect(margin, y, contentWidth, 6, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('CONSIGNEE (RECEIVER) PROFILE — PERSON A', margin + 4, y + 4.2);

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(customer.name, margin + 4, y + 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(`Phone: ${customer.phone}`, margin + 4, y + 17);
    doc.text(`City / Address: ${customer.city || destBranch?.city || 'Afghanistan'}, ${customer.address || 'Local Address'}`, margin + 4, y + 22);

    const tazkiraVal = customer.receiverTazkira || customer.nationalId;
    doc.setFont('helvetica', 'bold');
    doc.text(`Tazkira / ID: ${tazkiraVal || 'Recorded on Delivery'}`, margin + 100, y + 12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Destination Hub: ${destBranch?.name || customer.city || 'Destination Branch'}`, margin + 100, y + 17);
    doc.text(`Delivery Date: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`, margin + 100, y + 22);

    y += 28;

    // CONSOLIDATED TOTALS BAR
    const totalPcs = shipments.reduce((sum, s) => sum + (s.packageInfo.pieces || 1), 0);
    const totalWeight = shipments.reduce((sum, s) => sum + (s.packageInfo.weightKg || 0), 0);
    const totalFreight = shipments.reduce((sum, s) => sum + (s.financials.totalAmount || 0), 0);
    const totalPaid = shipments.reduce((sum, s) => sum + (s.financials.paymentStatus === 'paid' ? s.financials.totalAmount : (s.financials.amountPaid || 0)), 0);
    const totalDue = shipments.reduce((sum, s) => sum + (s.financials.paymentStatus === 'to_pay' ? s.financials.totalAmount : (s.financials.amountDue || 0)), 0);

    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, contentWidth, 12, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.rect(margin, y, contentWidth, 12, 'S');

    doc.setTextColor(51, 65, 85);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(`Total Consignments: ${shipments.length} Parcels`, margin + 4, y + 4.5);
    doc.text(`Total Pieces: ${totalPcs} Pkgs`, margin + 52, y + 4.5);
    doc.text(`Total Weight: ${totalWeight} KG`, margin + 98, y + 4.5);

    doc.setFontSize(8.5);
    doc.text(`Total Freight: ${totalFreight.toLocaleString()} AFN`, margin + 4, y + 9.5);
    doc.setTextColor(22, 163, 74);
    doc.text(`Paid: ${totalPaid.toLocaleString()} AFN`, margin + 52, y + 9.5);
    doc.setTextColor(225, 29, 72);
    doc.text(`NET COD TO COLLECT: ${totalDue.toLocaleString()} AFN`, margin + 98, y + 9.5);

    y += 16;

    // ITEMIZATION TABLE HEADER
    doc.setFillColor(15, 23, 42);
    doc.rect(margin, y, contentWidth, 6.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('#', margin + 2, y + 4.5);
    doc.text('CN Number', margin + 8, y + 4.5);
    doc.text('Origin Branch (Sender)', margin + 34, y + 4.5);
    doc.text('Description / Category', margin + 84, y + 4.5);
    doc.text('Pcs/Wt', margin + 128, y + 4.5);
    doc.text('Freight Amount', margin + 148, y + 4.5);
    doc.text('Payment', margin + 170, y + 4.5);

    y += 6.5;

    // ITEMIZATION ROWS
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);

    shipments.slice(0, 14).forEach((s, idx) => {
      const orig = branches.find(b => b.id === s.originBranchId);
      const isCod = s.financials.paymentStatus === 'to_pay';

      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y, contentWidth, 6.5, 'F');
      }
      doc.setDrawColor(226, 232, 240);
      doc.rect(margin, y, contentWidth, 6.5, 'S');

      doc.text(`${idx + 1}`, margin + 2, y + 4.5);
      doc.setFont('helvetica', 'bold');
      doc.text(s.cnNumber, margin + 8, y + 4.5);
      doc.setFont('helvetica', 'normal');
      doc.text(`${orig?.name || s.sender.city} (${s.sender.name.substring(0, 14)})`, margin + 34, y + 4.5);
      doc.text(`${(s.packageInfo.description || s.packageInfo.category).substring(0, 22)}`, margin + 84, y + 4.5);
      doc.text(`${s.packageInfo.pieces}p / ${s.packageInfo.weightKg}k`, margin + 128, y + 4.5);
      doc.setFont('helvetica', 'bold');
      doc.text(`${s.financials.totalAmount} AFN`, margin + 148, y + 4.5);
      doc.setTextColor(isCod ? 225 : 22, isCod ? 29 : 163, isCod ? 72 : 74);
      doc.text(isCod ? 'TO PAY' : 'PAID', margin + 170, y + 4.5);
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'normal');

      y += 6.5;
    });

    // RECEIVER ACKNOWLEDGEMENT & SIGNATURE SECTION
    y = Math.max(y + 6, 215);

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, y, contentWidth, 42, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text('RECEIVER ACKNOWLEDGMENT & HANDOVER CONFIRMATION (اقرار خط و تسلیمی بسته ها)', margin + 4, y + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`I, ${customer.name}, hereby confirm that I have inspected and received the ${shipments.length} consignments listed above in good, sealed,`, margin + 4, y + 10);
    doc.text('and undamaged condition from Armaghan Sadeq Transfers. All freight charges / COD payments have been settled as recorded.', margin + 4, y + 14);

    // Signatures row
    const sigY = y + 26;
    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.3);
    doc.line(margin + 4, sigY, margin + 54, sigY);
    doc.line(margin + 66, sigY, margin + 116, sigY);
    doc.line(margin + 128, sigY, margin + 180, sigY);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text('Receiver (Person A) Signature', margin + 4, sigY + 4);
    doc.text('Verified Tazkira / ID #', margin + 66, sigY + 4);
    doc.text('Branch Delivery Officer Stamp', margin + 128, sigY + 4);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, margin + 4, sigY + 8);
    doc.text(`${tazkiraVal || 'Checked & Stamped'}`, margin + 66, sigY + 8);
    doc.text(`${destBranch?.name || 'Destination Hub'}`, margin + 128, sigY + 8);

    // Footer Credits
    y = 268;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Armaghan Sadeq Transfers • خدمات انتقالات ارمغان صادق | Nationwide Express Network', margin + 4, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(51, 65, 85);
    doc.text('Developed by Rayan tech solutions | Rayan-Tech-Solution.tech (سیستم توسعه یافته توسط خدمات تکنالوژی رایان)', margin + 60, y);

    const filename = `Armaghan_Sadeq_Combined_${customer.name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
    return true;
  } catch (err) {
    console.error('Error generating combined customer PDF:', err);
    return false;
  }
}

/**
 * Direct Vector jsPDF generator for Executive Financial & Volume Reports.
 */
export function generateExecutiveReportPdf(
  dateRange: string,
  branchName: string,
  totalRev: number,
  totalParcels: number,
  deliveredCount: number,
  inTransitCount: number,
  codCollected: number
): boolean {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const pageWidth = 210;
    const margin = 12;
    const contentWidth = pageWidth - margin * 2;

    // Header
    doc.setFillColor(225, 29, 72);
    doc.rect(margin, margin, contentWidth, 22, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('ARMAGHAN SADEQ TRANSFERS — EXECUTIVE AUDIT REPORT', margin + 6, margin + 9);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(`Branch: ${branchName} | Period: ${dateRange.toUpperCase()} | Generated: ${new Date().toLocaleString()}`, margin + 6, margin + 16);

    let y = margin + 30;

    // Metric Summary Cards
    const cardW = (contentWidth - 6) / 2;
    const cardH = 22;

    // Revenue Card
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, y, cardW, cardH, 2, 2, 'FD');
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(8);
    doc.text('TOTAL REVENUE BOOKED', margin + 4, y + 6);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(225, 29, 72);
    doc.text(`${totalRev.toLocaleString()} AFN`, margin + 4, y + 16);

    // Total Parcels Card
    const card2X = margin + cardW + 6;
    doc.roundedRect(card2X, y, cardW, cardH, 2, 2, 'FD');
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(8);
    doc.text('TOTAL CONSIGNMENTS', card2X + 4, y + 6);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text(`${totalParcels} Parcels`, card2X + 4, y + 16);

    y += cardH + 6;

    // Delivered & COD Cards
    doc.roundedRect(margin, y, cardW, cardH, 2, 2, 'FD');
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(8);
    doc.text('DELIVERED CONSIGNMENTS', margin + 4, y + 6);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(22, 163, 74); // Green
    doc.text(`${deliveredCount} (${totalParcels > 0 ? Math.round((deliveredCount/totalParcels)*100) : 0}%)`, margin + 4, y + 16);

    doc.roundedRect(card2X, y, cardW, cardH, 2, 2, 'FD');
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(8);
    doc.text('IN TRANSIT / ON ROUTE', card2X + 4, y + 6);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(79, 70, 229);
    doc.text(`${inTransitCount} Parcels`, card2X + 4, y + 16);

    y += cardH + 12;

    // Audit Statements
    doc.setFillColor(15, 23, 42);
    doc.rect(margin, y, contentWidth, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('EXECUTIVE COMPLIANCE & FINANCIAL AUDIT SUMMARY', margin + 4, y + 5);

    y += 10;
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text('• All branch cash collections and COD payouts have been synchronized with the centralized logistics database.', margin + 4, y);
    doc.text(`• Total Cash On Delivery (COD) settlements recorded: ${codCollected.toLocaleString()} AFN.`, margin + 4, y + 6);
    doc.text('• Inter-provincial waybills adhere to Afghanistan Ministry of Transport and Cargo regulations.', margin + 4, y + 12);
    doc.text('• Confidential internal document. Unauthorized reproduction is strictly prohibited.', margin + 4, y + 18);

    y += 24;
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Armaghan Sadeq Transfers • خدمات انتقالات ارمغان صادق', margin + 4, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(51, 65, 85);
    doc.text('Developed by Rayan tech solutions | Rayan-Tech-Solution.tech (سیستم توسعه یافته توسط خدمات تکنالوژی رایان)', margin + 70, y);

    const filename = `Armaghan_Sadeq_Executive_Report_${dateRange}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
    return true;
  } catch (err) {
    console.error('Error generating executive report PDF:', err);
    return false;
  }
}
