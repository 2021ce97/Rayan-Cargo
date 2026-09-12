import jsPDF from 'jspdf';
import { Shipment, Branch } from '../types';

/**
 * Universal safe print utility that uses an isolated hidden iframe.
 * This completely avoids parent document clipping, sandbox issues, and prints ONLY the targeted element.
 */
export function printElementUsingIframe(element: HTMLElement, title: string = 'Print Document', format: 'standard' | 'thermal' = 'standard'): boolean {
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
    
    // Grab all styles from the current document so Tailwind works inside the iframe
    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map(node => node.outerHTML)
      .join('\n');

    const pageStyle = format === 'thermal'
      ? `@page { size: 80mm auto; margin: 0; }`
      : `@page { size: A4; margin: 5mm; }`;

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <meta charset="utf-8" />
          ${styles}
          <style>
            ${pageStyle}
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
              padding: ${format === 'thermal' ? '0' : '10px'};
            }
            .no-print {
              display: none !important;
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
    // Using a slightly longer timeout to ensure external stylesheets (if any) load
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.error('Iframe print error:', err);
        window.print();
      }
    }, 450);

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
export function generateWaybillPdf(shipment: Shipment, originBranch?: Branch, destBranch?: Branch, receiptRole: 'buyer' | 'seller' = 'buyer'): boolean {
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
    const boxHeight = 36;

    // Sender Box
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.4);
    doc.rect(margin, y, colWidth, boxHeight);

    doc.setFillColor(15, 23, 42);
    doc.rect(margin, y, colWidth, 6, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('1. SENDER / SHIPPER (FROM)', margin + 3, y + 4.5);

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(shipment.sender.name, margin + 3, y + 11.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Phone: ${shipment.sender.phone}`, margin + 3, y + 17);
    if (shipment.sender.nationalId) {
      doc.text(`Tazkira / ID: ${shipment.sender.nationalId}`, margin + 3, y + 22.5);
    }
    doc.text(`Origin: ${originBranch?.city || shipment.sender.city} (${originBranch?.name || shipment.sender.province || 'AFG'})`, margin + 3, y + 28);
    doc.text(`Address: ${shipment.sender.address.substring(0, 36)}`, margin + 3, y + 33.5);

    // Receiver Box
    const rxX = margin + colWidth + 6;
    doc.rect(rxX, y, colWidth, boxHeight);
    doc.setFillColor(225, 29, 72);
    doc.rect(rxX, y, colWidth, 6, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('2. RECEIVER / CONSIGNEE (TO)', rxX + 3, y + 4.5);

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(shipment.receiver.name, rxX + 3, y + 11.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const rxPhoneLine = shipment.receiver.altPhone 
      ? `Phone: ${shipment.receiver.phone} / ${shipment.receiver.altPhone}`
      : `Phone: ${shipment.receiver.phone}`;
    doc.text(rxPhoneLine, rxX + 3, y + 17);

    const receiverTazkiraNumber = shipment.receiver.nationalId || shipment.sender.receiverTazkira;
    if (receiverTazkiraNumber) {
      doc.setFont('helvetica', 'bold');
      doc.text(`Receiver Tazkira: ${receiverTazkiraNumber}`, rxX + 3, y + 22.5);
      doc.setFont('helvetica', 'normal');
    }
    doc.text(`Destination: ${destBranch?.city || shipment.receiver.city} (${destBranch?.name || shipment.receiver.province || 'AFG'})`, rxX + 3, y + 28);
    doc.text(`Address: ${shipment.receiver.address.substring(0, 36)}`, rxX + 3, y + 33.5);

    y += boxHeight + 4;

    // PARCEL INFORMATION TABLE
    doc.setFillColor(15, 23, 42);
    doc.rect(margin, y, contentWidth, 6, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('3. CONSIGNMENT & FREIGHT SPECIFICATIONS', margin + 4, y + 4.2);

    y += 6;

    // Table Header
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, contentWidth, 6, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.rect(margin, y, contentWidth, 6, 'S');

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('Category', margin + 3, y + 4.2);
    doc.text('Description', margin + 42, y + 4.2);
    doc.text('Pieces', margin + 105, y + 4.2);
    doc.text('Weight (KG)', margin + 125, y + 4.2);
    doc.text('Declared Value', margin + 152, y + 4.2);

    y += 6;

    // Table Row
    doc.rect(margin, y, contentWidth, 7.5, 'S');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(shipment.packageInfo.category.toUpperCase(), margin + 3, y + 5.2);
    doc.text(shipment.packageInfo.description.substring(0, 32), margin + 42, y + 5.2);
    doc.text(`${shipment.packageInfo.pieces} pcs`, margin + 105, y + 5.2);
    doc.text(`${shipment.packageInfo.weightKg} KG`, margin + 125, y + 5.2);
    doc.text(``, margin + 152, y + 5.2);

    y += 10.5;

    // FINANCIAL SUMMARY & PAYMENT SECTION
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, y, contentWidth, 32, 2, 2, 'FD');

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('4. CHARGES & FINANCIAL SETTLEMENT', margin + 4, y + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    
    if (receiptRole === 'seller') {
      doc.text(`Product Selling Price: ${(shipment.financials.productPrice || 0).toLocaleString()} AFN`, margin + 4, y + 12.5);
      doc.text(`Service Fee (Deducted): -${(shipment.financials.serviceFee || 0).toLocaleString()} AFN`, margin + 4, y + 17.5);
      doc.text(`Dest. Commission (Deducted): -${(shipment.financials.destBranchCommission || 0).toLocaleString()} AFN`, margin + 4, y + 22.5);
      doc.text(`Net Seller Payout: ${(shipment.financials.sellerPayout || 0).toLocaleString()} AFN`, margin + 4, y + 27.5);
    } else {
      doc.text(`Product Price (COD): ${(shipment.financials.productPrice || 0).toLocaleString()} AFN`, margin + 4, y + 12.5);
      doc.text(`Freight Fees: Inclusive / Prepaid`, margin + 4, y + 17.5);
      doc.text(`Discount / Promo: ${(shipment.financials.discountAmount || 0).toLocaleString()} AFN`, margin + 4, y + 22.5);
      doc.text(`Total Payable by Receiver: ${(shipment.financials.totalAmount || 0).toLocaleString()} AFN`, margin + 4, y + 27.5);
    }

    // Total and Payment Status Banner Box
    const totalBoxX = margin + 90;
    const isPaid = shipment.financials.paymentStatus === 'paid';
    doc.setFillColor(isPaid ? 236 : 254, isPaid ? 253 : 243, isPaid ? 245 : 199);
    doc.setDrawColor(isPaid ? 16 : 217, isPaid ? 185 : 119, isPaid ? 129 : 6);
    doc.roundedRect(totalBoxX, y + 3.5, contentWidth - 94, 25, 2, 2, 'FD');

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('TOTAL AMOUNT:', totalBoxX + 4, y + 10.5);
    doc.setFontSize(13);
    doc.setTextColor(225, 29, 72);
    doc.text(`${shipment.financials.totalAmount.toLocaleString()} AFN`, totalBoxX + 4, y + 17.5);

    doc.setFontSize(8.5);
    doc.setTextColor(isPaid ? 22 : 180, isPaid ? 101 : 83, isPaid ? 52 : 9);
    doc.text(`PAYMENT STATUS: ${shipment.financials.paymentStatus.toUpperCase()}`, totalBoxX + 4, y + 24);

    y += 35.5;

    // BARCODE VISUAL RECTANGLE & TRACKING TEXT
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.3);
    doc.rect(margin, y, contentWidth, 14);
    
    // Draw simulated barcode lines
    doc.setFillColor(15, 23, 42);
    let barX = margin + 8;
    const barsPattern = [2, 1, 3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 1, 3, 1, 2, 3, 1, 2, 4, 1, 2, 3, 1, 4, 2, 1, 3, 2, 1, 3, 1, 2, 4, 1, 3, 2, 1, 4, 2];
    for (let i = 0; i < barsPattern.length; i++) {
      const w = barsPattern[i] * 0.6;
      doc.rect(barX, y + 1.5, w, 8, 'F');
      barX += w + 1.1;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`* ${shipment.cnNumber} *`, margin + 28, y + 12.5);

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.text('Scan barcode or enter CN on Armaghan Sadeq Transfers Portal to track live status in real time.', margin + 88, y + 5.5);
    const senderHubPhone = originBranch?.phone ? originBranch.phone : 'Hub Contact';
    doc.text(`Sender Hub: ${senderHubPhone} | Complaints Hotline: 0711299680 | Main HQ: 0774144004`, margin + 88, y + 10.5);

    y += 17;

    // Removed SIGNATURE & STAMP BOXES per user request to fit on one page

    // OFFICIAL RULES & LEGAL CONDITIONS BOX (شرایط، قوانین و مقررات بارنامه و انتقال امانات)
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, y, contentWidth, 44, 2, 2, 'FD');

    // Header strip for Rules
    doc.setFillColor(15, 23, 42); // Slate-900
    doc.roundedRect(margin, y, contentWidth, 5.5, 1.5, 1.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('5. OFFICIAL CARGO RULES & LEGAL CONDITIONS (شرایط و مقررات بارنامه و انتقال امانات)', margin + 3, y + 4);

    let ruleY = y + 9.5;
    doc.setFontSize(6.5);
    
    // Rule 1: Cargo Liability
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text('1. Cargo Liability (مسئولیت امانات):', margin + 3, ruleY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    doc.text('Carrier is not liable for undeclared cash, jewelry, gold, valuable documents, or perishables without prior declaration & insurance.', margin + 44, ruleY);
    ruleY += 6.5;

    // Rule 2: Claims Window
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text('2. Claim Window (مهلت ادعا و کسر):', margin + 3, ruleY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    doc.text('Any claim regarding shortage, damage, or discrepancy must be lodged within 48 hours accompanied by this original Consignment Note.', margin + 44, ruleY);
    ruleY += 6.5;

    // Rule 3: Prohibited Goods
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text('3. Prohibited Goods (اقلام ممنوعه):', margin + 3, ruleY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    doc.text('Transport of explosives, arms, ammunition, inflammable chemicals, or illicit substances is strictly forbidden; shipper bears 100% legal liability.', margin + 44, ruleY);
    ruleY += 6.5;

    // Rule 4: ID Verification
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text('4. ID & Handover (تثبیت هویت):', margin + 3, ruleY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    doc.text('Cargo is released strictly upon presentation of valid Tazkira / National ID, recipient signature, and official fingerprint recording.', margin + 44, ruleY);
    ruleY += 6.5;

    // Rule 5: Storage Demurrage
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text('5. Storage Policy (شرایط انبارداری):', margin + 3, ruleY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    doc.text('Consignments unclaimed after 30 days are subject to daily warehouse storage/demurrage fees and company retention policies.', margin + 44, ruleY);

    y += 47;

    // OFFICIAL 3 MANDATORY CONTACT NUMBERS STRIP AT BOTTOM OF PDF
    doc.setFillColor(248, 250, 252); // Slate-50
    doc.setDrawColor(203, 213, 225); // Slate-300
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, y, contentWidth, 11, 1.5, 1.5, 'FD');

    const colContactW = contentWidth / 3;

    // Contact 1: Sender Branch Phone (Added by Admin when creating the branch)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(225, 29, 72); // Red-600
    doc.text('1. SENDER BRANCH PHONE:', margin + 3, y + 3.8);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    const originContactStr = originBranch?.phone ? `${originBranch.phone} (${originBranch.city})` : 'Registered at Origin Hub';
    doc.text(originContactStr, margin + 3, y + 8.2);

    // Contact 2: Complaints Hotline (0711299680 - Global across all PDFs)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(180, 83, 9); // Amber-700
    doc.text('2. COMPLAINTS / SHIKAYAT:', margin + colContactW + 3, y + 3.8);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text('0711299680', margin + colContactW + 3, y + 8.2);

    // Contact 3: Main Office Contact (0774144004 - Global across all PDFs)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(30, 58, 138); // Blue-800
    doc.text('3. MAIN OFFICE (KABUL HQ):', margin + colContactW * 2 + 3, y + 3.8);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text('0774144004', margin + colContactW * 2 + 3, y + 8.2);

    // Footer with Rayan Tech Solutions Attribution
    y += 14;
    doc.setFontSize(6.5);
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

    // Summary & Legal Rules at bottom
    y = 172;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.rect(margin, y, contentWidth, 14, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(15, 23, 42);
    doc.text('CARGO RULES: 1. بل پس از یک ماه فاقد اعتبار است • 2. اموال غیرقانونی ممنوع بوده و مسئولیت به عهده فرستنده است • 3. اجناس مسترد حداکثر یک ماه نگهداری می‌شود.', margin + 3, y + 4.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(51, 65, 85);
    doc.text('Helplines: Complaints (شکایات): 0711299680 | Central Admin (دفتر مرکزی): 0774144004', margin + 3, y + 9.5);
    doc.text('Dispatch Officer: __________________   |   Driver: __________________   |   Receiving Hub Seal: __________________', margin + 115, y + 9.5);

    y += 16;
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

    // OFFICIAL 3 CARGO RULES & HELPLINE CONTACTS IN COMBINED CUSTOMER PDF
    y = Math.min(Math.max(y + 3, 196), 205);

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, y, contentWidth, 23, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text('OFFICIAL CARGO RULES & REGULATIONS (شرایط و مقررات بارنامه و انتقال امانات)', margin + 3, y + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(30, 41, 59);
    doc.text('1. بل پس از یک ماه فاقد اعتبار بوده و صحت معلومات درج‌شده در آن بر عهده فرستنده است.', margin + 3, y + 9.5);
    doc.text('2. ارسال اموال غیرقانونی ممنوع بوده و مسئولیت آن به عهده فرستنده می‌باشد؛ شرکت در برابر خسارات ناشی از حوادث مسئول نیست.', margin + 3, y + 14.5);
    doc.text('3. اجناس مستردشده حداکثر یک ماه نگهداری می‌شود. هنگام دریافت پول، ارائه بل الزامی است و بدون بل پرداخت صورت نمی‌گیرد.', margin + 3, y + 19.5);

    y += 25;

    // Contacts
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(margin, y, contentWidth, 8, 1, 1, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(15, 23, 42);
    doc.text('1. Origin Hub: Recorded on Issue', margin + 3, y + 5.2);
    doc.text('2. Complaints (شکایات): 0711299680', margin + 68, y + 5.2);
    doc.text('3. Main Office (دفتر مرکزی): 0774144004', margin + 128, y + 5.2);

    y += 11;

    // RECEIVER ACKNOWLEDGEMENT & HANDOVER CONFIRMATION
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, y, contentWidth, 18, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text('RECEIVER ACKNOWLEDGMENT & HANDOVER CONFIRMATION (اقرار خط و تسلیمی بسته ها)', margin + 4, y + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text(`I, ${customer.name}, hereby confirm that I have inspected and received the ${shipments.length} consignments listed above in good, sealed,`, margin + 4, y + 9.5);
    doc.text('and undamaged condition from Armaghan Sadeq Transfers. All freight charges / COD payments have been settled as recorded.', margin + 4, y + 14);

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

/**
 * Generates a thermal-printer friendly PDF shipping label (100x150mm) with barcode and complete consignment details.
 */
export function generateThermalLabelPdf(shipment: Shipment, originBranch?: Branch, destBranch?: Branch, receiptRole: 'buyer' | 'seller' = 'buyer'): boolean {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [100, 150], // Standard 4x6 inch thermal shipping label format
      compress: true,
    });

    const pageWidth = 100;
    const margin = 6;
    const contentWidth = pageWidth - margin * 2; // 88mm

    let y = margin;

    // Header Badge
    doc.setFillColor(15, 23, 42); // Slate-900
    doc.rect(margin, y, contentWidth, 14, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('ARMAGHAN SADEQ EXPRESS', margin + 4, y + 6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text('AFGHANISTAN NATIONWIDE LOGISTICS NETWORK', margin + 4, y + 11);

    y += 16;

    // CN Number & Barcode Area
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.5);
    doc.rect(margin, y, contentWidth, 22);

    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text('CONSIGNMENT NOTE (CN #)', margin + 4, y + 5);

    doc.setTextColor(225, 29, 72);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(shipment.cnNumber, margin + 4, y + 13);

    // Simulated vector barcode lines on the right side of CN box
    const barcodeX = margin + 50;
    const barcodeY = y + 4;
    doc.setFillColor(15, 23, 42);
    const barPattern = [2, 1, 3, 1, 1, 2, 4, 1, 2, 1, 3, 2, 1, 1, 3, 1, 2, 1, 4, 1];
    let bx = barcodeX;
    barPattern.forEach((w, i) => {
      if (i % 2 === 0) {
        doc.rect(bx, barcodeY, w * 1.2, 12, 'F');
      }
      bx += w * 1.2 + 1;
    });
    doc.setFont('courier', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`*${shipment.cnNumber}*`, barcodeX + 2, barcodeY + 16);

    y += 24;

    // ROUTE BOX (ORIGIN -> DESTINATION)
    doc.setFillColor(225, 29, 72);
    doc.rect(margin, y, contentWidth, 14, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('ROUTE / HUB DESTINATION', margin + 4, y + 4.5);
    doc.setFontSize(11);
    const originName = originBranch?.city || shipment.sender.city;
    const destName = destBranch?.city || shipment.receiver.city;
    doc.text(`${originName.toUpperCase()} ➔ ${destName.toUpperCase()}`, margin + 4, y + 11.5);

    y += 16;

    // SENDER & RECEIVER BOXES
    const boxH = 34;
    doc.setDrawColor(15, 23, 42);
    doc.rect(margin, y, contentWidth, boxH);

    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, contentWidth, 5, 'F');
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('SENDER (FROM)', margin + 3, y + 3.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(shipment.sender.name, margin + 3, y + 10);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(`Phone: ${shipment.sender.phone}`, margin + 3, y + 15);
    doc.text(`Address: ${shipment.sender.address.substring(0, 42)}`, margin + 3, y + 20);
    doc.text(`Province/City: ${shipment.sender.province} / ${shipment.sender.city}`, margin + 3, y + 25);
    doc.text(`Branch: ${originBranch?.name || 'Head Office'}`, margin + 3, y + 30);

    y += boxH + 3;

    doc.rect(margin, y, contentWidth, boxH);
    doc.setFillColor(225, 29, 72);
    doc.rect(margin, y, contentWidth, 5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('RECEIVER / CONSIGNEE (TO)', margin + 3, y + 3.5);

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(shipment.receiver.name, margin + 3, y + 10);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(`Phone: ${shipment.receiver.phone} ${shipment.receiver.altPhone ? `/ ${shipment.receiver.altPhone}` : ''}`, margin + 3, y + 15);
    doc.text(`Address: ${shipment.receiver.address.substring(0, 42)}`, margin + 3, y + 20);
    doc.text(`Province/City: ${shipment.receiver.province} / ${shipment.receiver.city}`, margin + 3, y + 25);
    doc.text(`Branch: ${destBranch?.name || 'Destination Hub'}`, margin + 3, y + 30);

    y += boxH + 3;

    // PACKAGE SPECIFICATIONS TABLE
    doc.setFillColor(15, 23, 42);
    doc.rect(margin, y, contentWidth, 5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('PARCEL SPECIFICATIONS & FINANCIALS', margin + 3, y + 3.5);

    y += 5;
    const specH = 20;
    doc.setDrawColor(15, 23, 42);
    doc.rect(margin, y, contentWidth, specH);

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(`Weight: ${shipment.packageInfo.weightKg} KG`, margin + 3, y + 5);
    doc.text(`Pieces: ${shipment.packageInfo.pieces || 1} Pcs`, margin + 45, y + 5);
    doc.text(`Service: ${shipment.packageInfo.serviceType.toUpperCase()}`, margin + 3, y + 10);
    
    if (receiptRole === 'seller') {
      doc.text(`Product Price: ${shipment.financials.productPrice?.toLocaleString()} AFN`, margin + 45, y + 10);
      doc.text(`Net Seller Payout: ${shipment.financials.sellerPayout?.toLocaleString()} AFN`, margin + 3, y + 15);
    } else {
      doc.text(`Payment: ${shipment.financials.paymentStatus.toUpperCase()} (${shipment.financials.totalAmount.toLocaleString()} AFN)`, margin + 3, y + 15);
    }

    y += specH + 3;

    // Footer info
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Booked: ${new Date(shipment.bookedAt).toLocaleString()} | By: ${shipment.bookedByUserName || 'Staff'}`, margin, y);
    doc.text('Armaghan Sadeq Transfers • Thermal Shipping Label', margin, y + 4);

    const filename = `Thermal_Label_${shipment.cnNumber}.pdf`;
    doc.save(filename);
    return true;
  } catch (err) {
    console.error('Error generating thermal shipping label PDF:', err);
    return false;
  }
}

