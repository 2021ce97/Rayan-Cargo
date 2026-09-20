import jsPDF from 'jspdf';
import html2canvas from 'html2canvas-pro';
import { Shipment, Branch } from '../types';

const PRINT_IFRAME_ID = 'rayan_print_iframe';
let isPrintInProgress = false;

function drawPageBorder(doc: jsPDF, pageWidth: number, pageHeight: number, inset = 4): void {
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.35);
  doc.rect(inset, inset, pageWidth - inset * 2, pageHeight - inset * 2, 'S');
}

async function waitForRenderedElement(element: HTMLElement): Promise<void> {
  if (document.fonts?.ready) {
    await document.fonts.ready;
  }

  await Promise.all(Array.from(element.querySelectorAll('img')).map(image => {
    if (image.complete) return Promise.resolve();
    return new Promise<void>(resolve => {
      image.addEventListener('load', () => resolve(), { once: true });
      image.addEventListener('error', () => resolve(), { once: true });
    });
  }));

  await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
}

async function waitForPrintDocument(doc: Document): Promise<void> {
  const stylesheets = Array.from(doc.querySelectorAll('link[rel="stylesheet"]'));
  await Promise.all(stylesheets.map(link => new Promise<void>(resolve => {
    if ((link as HTMLLinkElement).sheet) {
      resolve();
      return;
    }
    link.addEventListener('load', () => resolve(), { once: true });
    link.addEventListener('error', () => resolve(), { once: true });
    window.setTimeout(resolve, 2000);
  })));

  if (doc.fonts?.ready) await doc.fonts.ready;
  await Promise.all(Array.from(doc.images).map(image => {
    if (image.complete) return Promise.resolve();
    return new Promise<void>(resolve => {
      image.addEventListener('load', () => resolve(), { once: true });
      image.addEventListener('error', () => resolve(), { once: true });
    });
  }));

  await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
}

/**
 * Thermal drivers cannot reliably use `@page { size: 80mm auto }`.  `auto`
 * makes the driver fall back to its own (often 80 x 80mm) page size, which
 * can restart a receipt on every page.  Convert the rendered receipt height
 * to a concrete physical page height before opening the print dialog.
 */
function getThermalReceiptHeightMm(element: HTMLElement): number {
  const heightPx = Math.max(element.getBoundingClientRect().height, element.scrollHeight);
  const heightMm = (heightPx * 25.4) / 96;

  // Leave an adequate feed allowance for the printer's non-printable bottom edge and paper cut line.
  return Math.max(100, Math.ceil(heightMm + 10));
}

/**
 * Universal safe print utility that uses an isolated hidden iframe.
 * This completely avoids parent document clipping, sandbox issues, and prints ONLY the targeted element.
 * Specially calibrated for 80mm POS Thermal Roll printers (e.g. MG-820), 80x80mm labels, and standard A4 documents.
 */
export function printElementUsingIframe(
  element: HTMLElement, 
  titleOrFormat: string = 'Print Document', 
  formatArg: 'standard' | 'thermal' | 'thermal_80mm' | 'thermal_80x80' | 'thermal_4x6' = 'standard'
): boolean {
  if (isPrintInProgress) {
    // Ignore double-clicks while the native print dialog is opening. They
    // otherwise become separate jobs on Bluetooth receipt printers.
    return false;
  }

  isPrintInProgress = true;

  void (async () => {
    try {
      await waitForRenderedElement(element);
      if (!element.isConnected) throw new Error('Printable element is no longer connected');

    // Robust detection even if arguments are passed in reverse order (targetRef, format, title)
    let title = titleOrFormat;
    let format: 'standard' | 'thermal' | 'thermal_80mm' | 'thermal_80x80' | 'thermal_4x6' = formatArg;

    if (
      titleOrFormat === 'standard' || 
      titleOrFormat === 'thermal' || 
      titleOrFormat === 'thermal_80mm' || 
      titleOrFormat === 'thermal_80x80' ||
      titleOrFormat === 'thermal_4x6'
    ) {
      format = titleOrFormat;
      title = 'Print Document';
    } else if (formatArg === 'standard') {
      if (titleOrFormat.includes('80x80')) {
        format = 'thermal_80x80';
      } else if (titleOrFormat.includes('80mm')) {
        format = 'thermal_80mm';
      } else if (titleOrFormat.includes('4x6')) {
        format = 'thermal_4x6';
      }
    }

    // Remove any existing print iframes
    const oldIframe = document.getElementById(PRINT_IFRAME_ID);
    if (oldIframe) {
      document.body.removeChild(oldIframe);
    }

    const isThermal = format.startsWith('thermal');
    const isSquare80 = format === 'thermal_80x80';
    const is4x6 = format === 'thermal_4x6';
    const thermalReceiptHeightMm = isThermal && !isSquare80 && !is4x6
      ? getThermalReceiptHeightMm(element)
      : undefined;

    // Create an isolated hidden iframe with exact physical layout dimensions
    const iframe = document.createElement('iframe');
    iframe.id = PRINT_IFRAME_ID;
    iframe.style.position = 'fixed';
    iframe.style.top = '0';
    iframe.style.left = '0';
    iframe.style.width = is4x6 ? '100mm' : (isThermal ? '80mm' : '210mm');
    iframe.style.height = is4x6 
      ? '150mm' 
      : (isThermal
        ? (isSquare80 ? '80mm' : `${thermalReceiptHeightMm}mm`)
        : '297mm');
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';
    iframe.style.border = '0';
    iframe.style.zIndex = '-9999';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      isPrintInProgress = false;
      window.print();
      return false;
    }

    // Extract HTML content
    const htmlContent = element.outerHTML;
    
    // Grab all styles from the current document so Tailwind works inside the iframe
    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map(node => node.outerHTML)
      .join('\n');

    // A concrete height avoids the printer driver's short-page fallback and
    // produces one continuous 80mm receipt.
    const pageSizeCss = is4x6
      ? 'size: 100mm 150mm !important;'
      : (isThermal
        ? (isSquare80
          ? 'size: 80mm 80mm !important;'
          : `size: 80mm ${thermalReceiptHeightMm}mm !important;`)
        : 'size: A4 portrait !important;');

    const pageMarginCss = isThermal ? 'margin: 0mm !important;' : 'margin: 4mm 6mm !important;';

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <meta charset="utf-8" />
          ${styles}
          <style>
            @page {
              ${pageSizeCss}
              ${pageMarginCss}
            }
            * {
              box-sizing: border-box !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            html, body {
              background: #ffffff !important;
              color: #000000 !important;
              margin: 0 !important;
              padding: 0 !important;
              ${is4x6 ? `
                width: 96mm !important;
                max-width: 96mm !important;
                min-width: 96mm !important;
                margin: 0 auto !important;
                font-family: 'Vazirmatn', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              ` : isThermal ? `
                width: 72mm !important;
                max-width: 72mm !important;
                min-width: 72mm !important;
                margin: 0 auto !important;
                ${isSquare80 ? 'height: 80mm !important; max-height: 80mm !important; overflow: hidden !important;' : 'height: auto !important; overflow: visible !important;'}
                font-family: 'Vazirmatn', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                page-break-inside: auto !important;
                break-inside: auto !important;
              ` : `
                font-family: 'Vazirmatn', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                padding: 4px;
              `}
            }
            @media print {
              @page {
                ${pageSizeCss}
                ${pageMarginCss}
              }
              html, body {
                ${is4x6 ? `
                  width: 96mm !important;
                  max-width: 96mm !important;
                  min-width: 96mm !important;
                  margin: 0 auto !important;
                  padding: 2mm !important;
                  background: #ffffff !important;
                  color: #000000 !important;
                ` : isThermal ? `
                  width: 72mm !important;
                  max-width: 72mm !important;
                  min-width: 72mm !important;
                  ${isSquare80 ? 'height: 80mm !important; max-height: 80mm !important; overflow: hidden !important;' : 'height: auto !important; overflow: visible !important;'}
                  margin: 0 auto !important;
                  padding: 0 !important;
                  background: #ffffff !important;
                  color: #000000 !important;
                  page-break-inside: auto !important;
                  break-inside: auto !important;
                ` : `
                  height: 100% !important;
                  margin: 0 !important;
                  padding: 0 !important;
                `}
              }
              ${isThermal ? (isSquare80 ? `
                .thermal-label-container {
                  width: 80mm !important;
                  height: 80mm !important;
                  max-width: 80mm !important;
                  max-height: 80mm !important;
                  min-height: 80mm !important;
                  margin: 0 !important;
                  padding: 2.5mm 3mm !important;
                  border: none !important;
                  box-shadow: none !important;
                  box-sizing: border-box !important;
                  overflow: hidden !important;
                  page-break-inside: avoid !important;
                  break-inside: avoid !important;
                  display: flex !important;
                  flex-direction: column !important;
                  justify-content: space-between !important;
                }
              ` : `
                .thermal-receipt-container {
                  width: 72mm !important;
                  max-width: 72mm !important;
                  min-width: 72mm !important;
                  margin: 0 auto !important;
                  padding: 1.5mm 1mm 4mm 1mm !important;
                  border-left: none !important;
                  border-right: none !important;
                  box-shadow: none !important;
                  box-sizing: border-box !important;
                  page-break-inside: auto !important;
                  break-inside: auto !important;
                }
                .carton-sticker-80mm {
                  width: 72mm !important;
                  max-width: 72mm !important;
                  min-width: 72mm !important;
                  margin: 0 auto !important;
                  padding: 2mm !important;
                  border: 1.5px solid #000000 !important;
                  box-shadow: none !important;
                  box-sizing: border-box !important;
                  page-break-inside: avoid !important;
                  break-inside: avoid !important;
                }
              `) : `
                .printable-receipt {
                  page-break-inside: avoid !important;
                  break-inside: avoid !important;
                }
              `}
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

    const cleanup = () => {
      const activeIframe = document.getElementById(PRINT_IFRAME_ID);
      if (activeIframe === iframe) {
        iframe.remove();
      }
      isPrintInProgress = false;
    };

    iframe.contentWindow?.addEventListener('afterprint', cleanup, { once: true });

    // Trigger printing only after the isolated document has finished laying out.
    void waitForPrintDocument(doc).then(async () => {
      try {
        await new Promise(r => setTimeout(r, 150));
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.error('Iframe print error:', err);
        cleanup();
        window.print();
      }
    });

    // Some browser/driver combinations do not dispatch `afterprint` for an
    // iframe. Keep the duplicate-print guard from getting stuck in that case.
    window.setTimeout(cleanup, 60_000);
    } catch (err) {
      console.error('Direct print failed, using window.print fallback:', err);
      isPrintInProgress = false;
      window.print();
    }
  })();

  return true;
}

/**
 * Generates an ultra-high resolution (600 DPI equivalent) 80mm / 80x80 thermal PDF directly from
 * a rendered DOM element. Preserves exact Afghan Dari/Pashto fonts, table borders, and barcodes.
 */
export async function generateThermalPdfFromElement(
  element: HTMLElement,
  filename: string,
  widthMm: number = 80,
  fixedHeightMm?: number
): Promise<boolean> {
  try {
    await waitForRenderedElement(element);
    const isSquare = fixedHeightMm === 80 && widthMm === 80;

    const canvas = await html2canvas(element, {
      scale: 3, // 3x scale yields ~600 DPI crisp thermal printing
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      scrollX: 0,
      scrollY: 0,
    });

    if (isSquare) {
      // Create exact 80mm x 80mm PDF
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [80, 80],
        compress: true,
      });

      // Scale to comfortably occupy the 80x80 page with 1.5mm padding
      const targetDimension = 77;
      const offset = (80 - targetDimension) / 2; // 1.5mm margin

      const imgData = canvas.toDataURL('image/png');
      const sourceRatio = canvas.width / canvas.height;
      const targetWidth = sourceRatio >= 1 ? targetDimension : targetDimension * sourceRatio;
      const targetHeight = sourceRatio >= 1 ? targetDimension / sourceRatio : targetDimension;
      doc.addImage(
        imgData,
        'PNG',
        (80 - targetWidth) / 2,
        (80 - targetHeight) / 2,
        targetWidth,
        targetHeight
      );
      drawPageBorder(doc, 80, 80, 1.5);
      doc.save(filename);
      return true;
    }

    // Continuous 80mm Roll
    const printableWidthMm = widthMm - 4; // 76mm printable width on 80mm roll
    const calculatedHeightMm = (canvas.height * printableWidthMm) / canvas.width;
    const finalHeightMm = fixedHeightMm || Math.ceil(calculatedHeightMm) + 4;

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [widthMm, finalHeightMm],
      compress: true,
    });

    const xPos = (widthMm - printableWidthMm) / 2; // 2mm margin left
    const yPos = 2;

    const imgData = canvas.toDataURL('image/png');
    doc.addImage(imgData, 'PNG', xPos, yPos, printableWidthMm, calculatedHeightMm);
    drawPageBorder(doc, widthMm, finalHeightMm, 1.5);
    doc.save(filename);
    return true;
  } catch (err) {
    console.error('generateThermalPdfFromElement failed:', err);
    return false;
  }
}

/**
 * Dedicated Vector jsPDF generator for Receiver Receipt (Template 1).
 * Displays: Total Payable, Payment Method, and Delivery Collection Status.
 * Note: Service fee, destination commission, and discounts are strictly merchant/seller side and omitted for buyer.
 * Formatted strictly for a single A4 page with 3 Helpline Contacts shifted to the upper-middle page body.
 */

export async function generateA4PdfFromElement(
  element: HTMLElement,
  filename: string
): Promise<boolean> {
  try {
    await waitForRenderedElement(element);
    const canvas = await html2canvas(element, {
      scale: 3, // 3x scale yields ~600 DPI crisp A4 printing
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      windowWidth: 1024,
      windowHeight: element.scrollHeight,
    });

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const pageWidth = 210;
    const pageHeight = 297;
    const marginX = 6;
    const marginY = 6;
    const maxUsableWidth = pageWidth - marginX * 2;
    const maxUsableHeight = pageHeight - marginY * 2;
    
    // Scale canvas to strictly fit within 1 single A4 page
    let renderWidth = maxUsableWidth;
    let renderHeight = (canvas.height * renderWidth) / canvas.width;
    
    if (renderHeight > maxUsableHeight) {
      renderHeight = maxUsableHeight;
      renderWidth = (canvas.width * renderHeight) / canvas.height;
    }
    
    const xPos = (pageWidth - renderWidth) / 2;
    const yPos = marginY;
    
    const imgData = canvas.toDataURL('image/png');
    doc.addImage(imgData, 'PNG', xPos, yPos, renderWidth, renderHeight);
    drawPageBorder(doc, pageWidth, pageHeight, 4);
    doc.save(filename);
    return true;
  } catch (err) {
    console.error('generateA4PdfFromElement failed:', err);
    return false;
  }
}

export function generateReceiverReceiptPdf(shipment: Shipment, originBranch?: Branch, destBranch?: Branch): boolean {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const pageWidth = 210;
    const margin = 10;
    const contentWidth = pageWidth - margin * 2; // 190mm

    // 1. Header Background Accent (Slate-900 for Receiver Delivery)
    doc.setFillColor(15, 23, 42);
    doc.roundedRect(margin, 8, contentWidth, 18, 1.5, 1.5, 'F');

    // Header Text
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('ARMAGHAN SADEQ TRANSFERS', margin + 5, 14);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text('RECEIVER DELIVERY RECEIPT & CONSIGNMENT NOTE (رسید تحویلی گیرنده)', margin + 5, 19);
    doc.text('Fast, Secure Nationwide Courier & Freight Services | Kabul HQ', margin + 5, 23);

    // CN Number Box on Header Right
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(margin + contentWidth - 62, 10, 58, 14, 1.5, 1.5, 'F');
    doc.setTextColor(225, 29, 72);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text('WAYBILL / CN #', margin + contentWidth - 60, 13.5);
    doc.setFontSize(11.5);
    doc.text(shipment.cnNumber, margin + contentWidth - 60, 20.5);

    let y = 28;

    // 2. Sub-header Information Strip
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, contentWidth, 6.5, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.rect(margin, y, contentWidth, 6.5, 'S');

    doc.setTextColor(51, 65, 85);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text(`Booking Date: ${new Date(shipment.bookedAt).toLocaleDateString()} ${new Date(shipment.bookedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`, margin + 3, y + 4.5);
    doc.text(`Service: ${shipment.packageInfo.serviceType.toUpperCase().replace('_', ' ')}`, margin + 85, y + 4.5);
    doc.text(`Status: ${shipment.status.toUpperCase().replace(/_/g, ' ')}`, margin + contentWidth - 45, y + 4.5);

    y += 8.5;

    // 3. SENDER & RECEIVER TWO-COLUMN BOXES
    const colWidth = (contentWidth - 4) / 2; // 93mm each
    const boxHeight = 27;

    // Sender Box
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.3);
    doc.rect(margin, y, colWidth, boxHeight);

    doc.setFillColor(15, 23, 42);
    doc.rect(margin, y, colWidth, 5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('1. SENDER / SHIPPER (ارسال کننده)', margin + 3, y + 3.8);

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(shipment.sender.name, margin + 3, y + 9.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(`Phone: ${shipment.sender.phone}`, margin + 3, y + 14);
    if (shipment.sender.nationalId) {
      doc.text(`Tazkira / ID: ${shipment.sender.nationalId}`, margin + 3, y + 18.5);
    }
    doc.text(`Origin: ${originBranch?.city || shipment.sender.city} (${originBranch?.name || shipment.sender.province || 'AFG'})`, margin + 3, y + (shipment.sender.nationalId ? 22.5 : 18.5));
    doc.text(`Address: ${shipment.sender.address.substring(0, 36)}`, margin + 3, y + (shipment.sender.nationalId ? 26 : 22.5));

    // Receiver Box (Emerald Accent)
    const rxX = margin + colWidth + 4;
    doc.rect(rxX, y, colWidth, boxHeight);
    doc.setFillColor(16, 185, 129);
    doc.rect(rxX, y, colWidth, 5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('2. RECEIVER / CONSIGNEE (گیرنده محترم)', rxX + 3, y + 3.8);

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(shipment.receiver.name, rxX + 3, y + 9.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    const rxPhoneLine = shipment.receiver.altPhone 
      ? `Phone: ${shipment.receiver.phone} / ${shipment.receiver.altPhone}`
      : `Phone: ${shipment.receiver.phone}`;
    doc.text(rxPhoneLine, rxX + 3, y + 14);

    const receiverTazkiraNumber = shipment.receiver.nationalId || shipment.sender.receiverTazkira;
    if (receiverTazkiraNumber) {
      doc.setFont('helvetica', 'bold');
      doc.text(`Receiver Tazkira: ${receiverTazkiraNumber}`, rxX + 3, y + 18.5);
      doc.setFont('helvetica', 'normal');
    }
    doc.text(`Destination: ${destBranch?.city || shipment.receiver.city} (${destBranch?.name || shipment.receiver.province || 'AFG'})`, rxX + 3, y + (receiverTazkiraNumber ? 22.5 : 18.5));
    doc.text(`Address: ${shipment.receiver.address.substring(0, 36)}`, rxX + 3, y + (receiverTazkiraNumber ? 26 : 22.5));

    y += boxHeight + 3;

    // 4. PARCEL SPECIFICATIONS TABLE
    doc.setFillColor(15, 23, 42);
    doc.rect(margin, y, contentWidth, 5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('3. CONSIGNMENT & CARGO SPECIFICATIONS', margin + 3, y + 3.5);

    y += 5;

    // Table Header
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, contentWidth, 5, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.rect(margin, y, contentWidth, 5, 'S');

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text('Category', margin + 3, y + 3.5);
    doc.text('Description', margin + 42, y + 3.5);
    doc.text('Pieces', margin + 110, y + 3.5);
    doc.text('Weight (KG)', margin + 132, y + 3.5);
    doc.text('Service Mode', margin + 158, y + 3.5);

    y += 5;

    // Table Row
    doc.rect(margin, y, contentWidth, 6, 'S');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(shipment.packageInfo.category.toUpperCase(), margin + 3, y + 4.2);
    doc.text(shipment.packageInfo.description.substring(0, 35), margin + 42, y + 4.2);
    doc.text(`${shipment.packageInfo.pieces} pcs`, margin + 110, y + 4.2);
    doc.text(`${shipment.packageInfo.weightKg} KG`, margin + 132, y + 4.2);
    doc.text(shipment.packageInfo.serviceType.toUpperCase(), margin + 158, y + 4.2);

    y += 8.5;

    // 5. FINANCIAL SUMMARY & PAYMENT SECTION (RECEIVER BREAKDOWN)
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, y, contentWidth, 27, 1.5, 1.5, 'FD');

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('4. RECEIVER CHARGES & FINANCIAL BREAKDOWN (صورت حساب گیرنده)', margin + 3, y + 4.5);

    const totalPayableVal = shipment.financials.totalAmount || shipment.financials.productPrice || shipment.packageInfo?.declaredValueAfn || 3000;
    const isPaid = shipment.financials.paymentStatus === 'paid' || shipment.status === 'delivered';

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);
    doc.text(`• Payment Method (روش پرداخت):`, margin + 3, y + 10.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(shipment.financials.paymentMethod.toUpperCase(), margin + 55, y + 10.5);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    doc.text(`• Delivery Terms (شرایط تحویلی):`, margin + 3, y + 16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(isPaid ? 22 : 225, isPaid ? 101 : 29, isPaid ? 52 : 72);
    doc.text(isPaid ? 'Prepaid / Paid at Origin (قبلا پرداخت شده)' : 'COD Collection at Delivery (پرداخت هنگام تحویل)', margin + 55, y + 16);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(7);
    doc.text(`• Notice: Parcel handed over to consignee upon settlement of Total Payable.`, margin + 3, y + 21.5);

    // Total Payable Banner Box
    const totalBoxX = margin + 98;
    doc.setFillColor(isPaid ? 236 : 254, isPaid ? 253 : 242, isPaid ? 245 : 242);
    doc.setDrawColor(isPaid ? 16 : 225, isPaid ? 185 : 29, isPaid ? 129 : 72);
    doc.roundedRect(totalBoxX, y + 3, contentWidth - 101, 21, 1.5, 1.5, 'FD');

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('TOTAL PAYABLE (مجموع قابل پرداخت):', totalBoxX + 3, y + 8);
    doc.setFontSize(12.5);
    doc.setTextColor(225, 29, 72);
    doc.text(`${totalPayableVal.toLocaleString()} AFN`, totalBoxX + 3, y + 14.5);

    doc.setFontSize(7.5);
    doc.setTextColor(isPaid ? 22 : 180, isPaid ? 101 : 83, isPaid ? 52 : 9);
    doc.text(`STATUS: ${isPaid ? 'PAID / تحویل شده' : 'COD (TO PAY ON DELIVERY)'}`, totalBoxX + 3, y + 19.5);

    y += 29.5;

    // 6. BARCODE VISUAL RECTANGLE & TRACKING TEXT
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.3);
    doc.rect(margin, y, contentWidth, 11.5);
    
    doc.setFillColor(15, 23, 42);
    let barX = margin + 5;
    const barsPattern = [2, 1, 3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 1, 3, 1, 2, 3, 1, 2, 4, 1, 2, 3, 1, 4, 2, 1, 3, 2, 1, 3, 1, 2, 4, 1, 3, 2, 1, 4, 2];
    for (let i = 0; i < barsPattern.length; i++) {
      const w = barsPattern[i] * 0.55;
      doc.rect(barX, y + 1.2, w, 6.5, 'F');
      barX += w + 0.9;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`* ${shipment.cnNumber} *`, margin + 24, y + 10);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('Track live online using Consignment Note (CN #).', margin + 85, y + 4.5);
    const senderHubPhone = originBranch?.phone ? originBranch.phone : 'Hub Contact';
    doc.text(`Sender Hub: ${senderHubPhone} | Complaints: 0711299680 | Main HQ: 0774144004`, margin + 85, y + 8.5);

    y += 14;

    // 7. SHIFTED OFFICIAL 3 MANDATORY CONTACT NUMBERS STRIP (FIRMLY ON PAGE 1)
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, y, contentWidth, 11, 1.5, 1.5, 'FD');

    const colContactW = contentWidth / 3;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(225, 29, 72);
    doc.text('1. BRANCH CONTACT:', margin + 3, y + 3.8);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    const originContactStr = originBranch?.phone ? `${originBranch.phone} (${originBranch.city})` : 'Registered at Origin Hub';
    doc.text(originContactStr, margin + 3, y + 8.2);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(180, 83, 9);
    doc.text('2. COMPLAINTS / SHIKAYAT:', margin + colContactW + 3, y + 3.8);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text('0711299680', margin + colContactW + 3, y + 8.2);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(30, 58, 138);
    doc.text('3. MAIN OFFICE (KABUL HQ):', margin + colContactW * 2 + 3, y + 3.8);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text('0774144004', margin + colContactW * 2 + 3, y + 8.2);

    y += 13.5;

    // 8. OFFICIAL RULES & LEGAL CONDITIONS BOX
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, y, contentWidth, 24, 1.5, 1.5, 'FD');

    doc.setFillColor(15, 23, 42);
    doc.roundedRect(margin, y, contentWidth, 4.5, 1, 1, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.text('5. OFFICIAL RECEIVER CONDITIONS & REGULATIONS (شرایط و قوانین تحویلی امانات)', margin + 3, y + 3.2);

    let ruleY = y + 7.5;
    doc.setFontSize(6);
    
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text('1. ID Verification (تثبیت هویت):', margin + 3, ruleY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    doc.text('Consignment handed over strictly upon presentation of original Tazkira / ID and recipient signature.', margin + 38, ruleY);
    ruleY += 4.5;

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text('2. Package Inspection (بررسی بسته):', margin + 3, ruleY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    doc.text('Receiver must inspect outer condition before signing the electronic Proof of Delivery (POD).', margin + 38, ruleY);
    ruleY += 4.5;

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text('3. Claims Window (مهلت شکایت):', margin + 3, ruleY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    doc.text('Any discrepancy or claim must be reported to branch manager within 48 hours with original receipt.', margin + 38, ruleY);
    ruleY += 4.5;

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text('4. Storage Policy (نگهداری امانات):', margin + 3, ruleY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    doc.text('Uncollected parcels kept in warehouse up to 30 days before statutory return to origin.', margin + 38, ruleY);

    // 9. Signatures and Attribution Footer (Safely within single A4 page)
    y += 27;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Armaghan Sadeq Transfers | Receiver Delivery Receipt', margin, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(51, 65, 85);
    doc.text('Developed by Rayan tech solutions | Rayan-Tech-Solution.tech (سیستم توسعه یافته توسط خدمات تکنالوژی رایان)', margin + 60, y);

    const filename = `Receiver_Receipt_${shipment.cnNumber}.pdf`;
    drawPageBorder(doc, 210, 297);
    doc.save(filename);
    return true;
  } catch (err) {
    console.error('Error generating receiver receipt PDF:', err);
    return false;
  }
}

/**
 * Dedicated Vector jsPDF generator for Seller Receipt (Template 2).
 * Displays: Product Price, Service Fee, Destination Commission, Discount, and Net Seller Payout.
 * Formatted strictly for a single A4 page with 3 Helpline Contacts shifted to the upper-middle page body.
 */
export function generateSellerReceiptPdf(shipment: Shipment, originBranch?: Branch, destBranch?: Branch): boolean {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const pageWidth = 210;
    const margin = 10;
    const contentWidth = pageWidth - margin * 2; // 190mm

    // 1. Header Background Accent (Slate-800 for Merchant/Seller)
    doc.setFillColor(30, 41, 59);
    doc.roundedRect(margin, 8, contentWidth, 18, 1.5, 1.5, 'F');

    // Header Text
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('ARMAGHAN SADEQ TRANSFERS', margin + 5, 14);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text('SELLER BOOKING VOUCHER & PAYOUT STATEMENT (رسید و حساب فروشنده)', margin + 5, 19);
    doc.text('Merchant Remittance & Logistics Account Voucher | Origin Booking Copy', margin + 5, 23);

    // CN Number Box on Header Right
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(margin + contentWidth - 62, 10, 58, 14, 1.5, 1.5, 'F');
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text('MERCHANT BOOKING #', margin + contentWidth - 60, 13.5);
    doc.setFontSize(11.5);
    doc.text(shipment.cnNumber, margin + contentWidth - 60, 20.5);

    let y = 28;

    // 2. Sub-header Information Strip
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, contentWidth, 6.5, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.rect(margin, y, contentWidth, 6.5, 'S');

    doc.setTextColor(51, 65, 85);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text(`Booking Date: ${new Date(shipment.bookedAt).toLocaleDateString()} ${new Date(shipment.bookedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`, margin + 3, y + 4.5);
    doc.text(`Route: ${(originBranch?.city || shipment.sender.city).toUpperCase()} ➔ ${(destBranch?.city || shipment.receiver.city).toUpperCase()}`, margin + 85, y + 4.5);
    doc.text(`Officer: ${shipment.bookedByUserName || 'Origin Cashier'}`, margin + contentWidth - 45, y + 4.5);

    y += 8.5;

    // 3. SENDER (SELLER) & RECEIVER SUMMARY BOXES
    const colWidth = (contentWidth - 4) / 2; // 93mm each
    const boxHeight = 25;

    // Seller Box
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.3);
    doc.rect(margin, y, colWidth, boxHeight);

    doc.setFillColor(30, 41, 59);
    doc.rect(margin, y, colWidth, 5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('SELLER / MERCHANT ACCOUNT (فروشنده / فرستنده)', margin + 3, y + 3.8);

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(shipment.sender.name, margin + 3, y + 9.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(`Phone: ${shipment.sender.phone}`, margin + 3, y + 14);
    doc.text(`Origin Hub: ${originBranch?.name || shipment.sender.city}`, margin + 3, y + 18.5);
    doc.text(`Address: ${shipment.sender.address.substring(0, 36)}`, margin + 3, y + 22.5);

    // Receiver Summary Box
    const rxX = margin + colWidth + 4;
    doc.rect(rxX, y, colWidth, boxHeight);
    doc.setFillColor(71, 85, 105);
    doc.rect(rxX, y, colWidth, 5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('CONSIGNEE / DESTINATION (گیرنده)', rxX + 3, y + 3.8);

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(shipment.receiver.name, rxX + 3, y + 9.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(`Phone: ${shipment.receiver.phone}`, rxX + 3, y + 14);
    doc.text(`Destination Hub: ${destBranch?.name || shipment.receiver.city}`, rxX + 3, y + 18.5);
    doc.text(`Address: ${shipment.receiver.address.substring(0, 36)}`, rxX + 3, y + 22.5);

    y += boxHeight + 3;

    // 4. PARCEL SPECIFICATIONS TABLE
    doc.setFillColor(30, 41, 59);
    doc.rect(margin, y, contentWidth, 5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('CONSIGNMENT SPECIFICATIONS & WEIGHT', margin + 3, y + 3.5);

    y += 5;

    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, contentWidth, 5, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.rect(margin, y, contentWidth, 5, 'S');

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text('Category', margin + 3, y + 3.5);
    doc.text('Description', margin + 42, y + 3.5);
    doc.text('Pieces', margin + 110, y + 3.5);
    doc.text('Weight (KG)', margin + 132, y + 3.5);
    doc.text('Service Mode', margin + 158, y + 3.5);

    y += 5;

    doc.rect(margin, y, contentWidth, 6, 'S');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(shipment.packageInfo.category.toUpperCase(), margin + 3, y + 4.2);
    doc.text(shipment.packageInfo.description.substring(0, 35), margin + 42, y + 4.2);
    doc.text(`${shipment.packageInfo.pieces} pcs`, margin + 110, y + 4.2);
    doc.text(`${shipment.packageInfo.weightKg} KG`, margin + 132, y + 4.2);
    doc.text(shipment.packageInfo.serviceType.toUpperCase(), margin + 158, y + 4.2);

    y += 8.5;

    // 5. SIMPLIFIED FINANCIAL STATEMENT (SELLER PAYOUT BREAKDOWN)
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, y, contentWidth, 29, 1.5, 1.5, 'FD');

    doc.setFillColor(30, 41, 59);
    doc.roundedRect(margin, y, contentWidth, 5, 1, 1, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('MERCHANT SETTLEMENT & COMMISSION STATEMENT (صورت حساب و کمیسیون فروشنده)', margin + 3, y + 3.6);

    const productPriceVal = shipment.financials.productPrice || shipment.packageInfo?.declaredValueAfn || shipment.financials.totalAmount || 3000;
    const serviceFeeVal = typeof shipment.financials.serviceFee === 'number' && shipment.financials.serviceFee > 0 ? shipment.financials.serviceFee : (shipment.packageInfo?.isFragile ? 200 : 150);
    const destCommVal = typeof shipment.financials.destBranchCommission === 'number' && shipment.financials.destBranchCommission > 0 ? shipment.financials.destBranchCommission : (shipment.destBranchCommission || 70);
    const discountVal = shipment.financials.discountAmount || 0;
    const sellerPayoutVal = (typeof shipment.financials.sellerPayout === 'number' && shipment.financials.sellerPayout > 0)
      ? shipment.financials.sellerPayout
      : Math.max(0, productPriceVal - serviceFeeVal - destCommVal + discountVal);

    let statY = y + 9.5;
    doc.setFontSize(7.5);

    // Line 1: Product Price
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    doc.text('1. Product Selling Price (قیمت فروش جنس):', margin + 3, statY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`${productPriceVal.toLocaleString()} AFN`, margin + 65, statY);

    // Line 2: Service Fee
    statY += 4.5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    doc.text('2. Service & Handling Fee (هزینه ارسال کسر شده):', margin + 3, statY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(225, 29, 72);
    doc.text(`-${serviceFeeVal.toLocaleString()} AFN`, margin + 65, statY);

    // Line 3: Destination Commission
    statY += 4.5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    doc.text('3. Dest. Branch Commission (کمیسیون مقصد کسر شده):', margin + 3, statY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(225, 29, 72);
    doc.text(`-${destCommVal.toLocaleString()} AFN`, margin + 65, statY);

    // Line 4: Discount
    statY += 4.5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    doc.text('4. Fee Discount Applied (تخفیف اعمال شده):', margin + 3, statY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(discountVal > 0 ? 22 : 15, discountVal > 0 ? 163 : 23, discountVal > 0 ? 74 : 42);
    doc.text(discountVal > 0 ? `+${discountVal.toLocaleString()} AFN` : `0 AFN`, margin + 65, statY);

    // Net Seller Payout Banner Box on the Right
    const payoutBoxX = margin + 98;
    doc.setFillColor(236, 253, 245);
    doc.setDrawColor(16, 185, 129);
    doc.roundedRect(payoutBoxX, y + 6.5, contentWidth - 101, 21, 1.5, 1.5, 'FD');

    doc.setTextColor(6, 78, 59);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('NET SELLER PAYOUT (مبلغ قابل تادیه):', payoutBoxX + 3, y + 11.5);

    doc.setFontSize(12.5);
    doc.setTextColor(5, 150, 105);
    doc.text(`${sellerPayoutVal.toLocaleString()} AFN`, payoutBoxX + 3, y + 18);

    doc.setFontSize(6.5);
    doc.setTextColor(51, 65, 85);
    doc.text(`Remittance: Via Sarafi / Origin Branch Cash`, payoutBoxX + 3, y + 23.5);

    y += 31.5;

    // 6. BARCODE VISUAL RECTANGLE
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.3);
    doc.rect(margin, y, contentWidth, 11.5);
    
    doc.setFillColor(15, 23, 42);
    let barX = margin + 5;
    const barsPattern = [2, 1, 3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 1, 3, 1, 2, 3, 1, 2, 4, 1, 2, 3, 1, 4, 2, 1, 3, 2, 1, 3, 1, 2, 4, 1, 3, 2, 1, 4, 2];
    for (let i = 0; i < barsPattern.length; i++) {
      const w = barsPattern[i] * 0.55;
      doc.rect(barX, y + 1.2, w, 6.5, 'F');
      barX += w + 0.9;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`* ${shipment.cnNumber} *`, margin + 24, y + 10);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('Seller portal tracking & payment status available.', margin + 85, y + 4.5);
    const senderHubPhone = originBranch?.phone ? originBranch.phone : 'Hub Contact';
    doc.text(`Sender Hub: ${senderHubPhone} | Complaints: 0711299680 | Main HQ: 0774144004`, margin + 85, y + 8.5);

    y += 14;

    // 7. SHIFTED OFFICIAL 3 MANDATORY CONTACT NUMBERS STRIP (FIRMLY ON PAGE 1)
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, y, contentWidth, 11, 1.5, 1.5, 'FD');

    const colContactW = contentWidth / 3;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(225, 29, 72);
    doc.text('1. BRANCH CONTACT:', margin + 3, y + 3.8);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    const originContactStr = originBranch?.phone ? `${originBranch.phone} (${originBranch.city})` : 'Registered at Origin Hub';
    doc.text(originContactStr, margin + 3, y + 8.2);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(180, 83, 9);
    doc.text('2. COMPLAINTS / SHIKAYAT:', margin + colContactW + 3, y + 3.8);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text('0711299680', margin + colContactW + 3, y + 8.2);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(30, 58, 138);
    doc.text('3. MAIN OFFICE (KABUL HQ):', margin + colContactW * 2 + 3, y + 3.8);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text('0774144004', margin + colContactW * 2 + 3, y + 8.2);

    y += 13.5;

    // 8. SELLER REMITTANCE TERMS & NOTES
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, y, contentWidth, 23, 1.5, 1.5, 'FD');

    doc.setFillColor(30, 41, 59);
    doc.roundedRect(margin, y, contentWidth, 4.5, 1, 1, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.text('MERCHANT REMITTANCE POLICY & NOTES (شرایط تسویه حساب و پرداخت پول فروشنده)', margin + 3, y + 3.2);

    let noteY = y + 7.5;
    doc.setFontSize(6);
    
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text('1. Payout Disbursement (تادیه وجوه):', margin + 3, noteY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    doc.text('Net seller funds payable at origin branch or via Sarafi immediately after receiver collection confirmation.', margin + 40, noteY);
    noteY += 4.5;

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text('2. Receipt Requirement (ارائه رسید):', margin + 3, noteY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    doc.text('Presenting this original booking slip or valid CN code is mandatory for receiving merchant remittance.', margin + 40, noteY);
    noteY += 4.5;

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text('3. Returned Parcels (اجناس مسترد شده):', margin + 3, noteY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    doc.text('If parcel rejected by receiver, return freight settled per standard merchant terms and parcel returned to origin.', margin + 40, noteY);

    // 9. Attribution Footer (Guaranteed single page)
    y += 26;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Armaghan Sadeq Transfers | Seller Payout Voucher', margin, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(51, 65, 85);
    doc.text('Developed by Rayan tech solutions | Rayan-Tech-Solution.tech (سیستم توسعه یافته توسط خدمات تکنالوژی رایان)', margin + 60, y);

    const filename = `Seller_Receipt_${shipment.cnNumber}.pdf`;
    drawPageBorder(doc, 210, 297);
    doc.save(filename);
    return true;
  } catch (err) {
    console.error('Error generating seller receipt PDF:', err);
    return false;
  }
}

/**
 * Direct Vector jsPDF generator for Official Rayan Cargo Consignment Note / Waybill.
 * Dispatches to either receiver or seller template based on role.
 */
export function generateWaybillPdf(shipment: Shipment, originBranch?: Branch, destBranch?: Branch, receiptRole: 'buyer' | 'seller' = 'buyer'): boolean {
  if (receiptRole === 'seller') {
    return generateSellerReceiptPdf(shipment, originBranch, destBranch);
  }
  return generateReceiverReceiptPdf(shipment, originBranch, destBranch);
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
    drawPageBorder(doc, 297, 210);
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
    drawPageBorder(doc, 210, 297);
    doc.save(filename);
    return true;
  } catch (err) {
    console.error('Error generating combined customer PDF:', err);
    return false;
  }
}

export interface BranchBulkDispatchInfo {
  batchNumber: string;
  originBranch?: Branch;
  destinationBranch?: Branch;
  driverName?: string;
  driverPhone?: string;
  vehiclePlate?: string;
  sealNumber?: string;
  notes?: string;
  dispatchDate?: string;
}

/**
 * Direct Vector jsPDF generator for Official Branch Bulk Parcel Dispatch Manifest (Waybill).
 * Generated when dispatching multiple parcels from origin branch to a target destination branch.
 */
export function generateBranchBulkDispatchPdf(
  dispatchInfo: BranchBulkDispatchInfo,
  shipments: Shipment[],
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

    // Header Background Accent (Slate-900 with Crimson Top Stripe)
    doc.setFillColor(15, 23, 42);
    doc.rect(margin, margin, contentWidth, 24, 'F');
    doc.setFillColor(225, 29, 72);
    doc.rect(margin, margin, contentWidth, 3, 'F');

    // Header Title
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('ARMAGHAN SADEQ TRANSFERS', margin + 6, margin + 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text('BRANCH BULK PARCEL DISPATCH MANIFEST (بارنامه رسمی ارسال تجمیعی به نمایندگی)', margin + 6, margin + 16.5);
    doc.text('Helplines: 0711299680 / 0774144004 / 0799001122 | Inter-Branch Highway Logistics Network', margin + 6, margin + 21.5);

    // Dispatch Batch Voucher Box
    const batchNo = dispatchInfo.batchNumber || `AST-DSP-${Date.now().toString().slice(-6)}`;
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(margin + contentWidth - 62, margin + 5.5, 58, 15, 2, 2, 'F');
    doc.setTextColor(225, 29, 72);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('DISPATCH BATCH #', margin + contentWidth - 60, margin + 10);
    doc.setFontSize(10.5);
    doc.text(batchNo, margin + contentWidth - 60, margin + 17);

    let y = margin + 27;

    // ROUTING & VEHICLE HANDOVER INFO CARD
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, y, contentWidth, 23, 2, 2, 'FD');

    doc.setFillColor(225, 29, 72);
    doc.rect(margin, y, contentWidth, 5.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('BRANCH ROUTE & VEHICLE TRANSIT MANIFEST (مشخصات مسیر و موتر انتقال)', margin + 4, y + 4);

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(`Origin Branch: ${dispatchInfo.originBranch?.name || 'Kabul Central HQ'} (${dispatchInfo.originBranch?.code || 'HQ'})`, margin + 4, y + 10.5);
    doc.text(`Destination Branch: ${dispatchInfo.destinationBranch?.name || 'Target Branch'} (${dispatchInfo.destinationBranch?.code || 'DEST'})`, margin + 4, y + 15.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Dispatch Date: ${dispatchInfo.dispatchDate || new Date().toLocaleString()}`, margin + 4, y + 20.5);

    doc.setFont('helvetica', 'bold');
    doc.text(`Driver / Courier: ${dispatchInfo.driverName || 'Designated Driver'}`, margin + 100, y + 10.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`Vehicle / Plate: ${dispatchInfo.vehiclePlate || 'Transit Vehicle'}`, margin + 100, y + 15.5);
    doc.text(`Seal / Bag No: ${dispatchInfo.sealNumber || 'N/A'}`, margin + 100, y + 20.5);

    y += 26;

    // CONSOLIDATED TOTALS BAR
    const totalPcs = shipments.reduce((sum, s) => sum + (s.packageInfo.pieces || 1), 0);
    const totalWeight = shipments.reduce((sum, s) => sum + (s.packageInfo.weightKg || 0), 0);
    const totalFreight = shipments.reduce((sum, s) => sum + (s.financials.totalAmount || 0), 0);
    const totalProductVal = shipments.reduce((sum, s) => sum + (s.packageInfo.declaredValueAfn || 0), 0);
    const totalPaid = shipments.reduce((sum, s) => sum + (s.financials.paymentStatus === 'paid' ? s.financials.totalAmount : (s.financials.amountPaid || 0)), 0);
    const totalCodDue = shipments.reduce((sum, s) => sum + (s.financials.paymentStatus === 'to_pay' ? s.financials.totalAmount : (s.financials.amountDue || 0)), 0);

    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, contentWidth, 12, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.rect(margin, y, contentWidth, 12, 'S');

    doc.setTextColor(51, 65, 85);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(`Total Parcels: ${shipments.length} Pkgs`, margin + 4, y + 4.5);
    doc.text(`Total Pieces: ${totalPcs} Boxes`, margin + 46, y + 4.5);
    doc.text(`Total Scale Wt: ${totalWeight} KG`, margin + 92, y + 4.5);
    doc.text(`Product Value: ${totalProductVal.toLocaleString()} AFN`, margin + 138, y + 4.5);

    doc.setFontSize(8.5);
    doc.text(`Freight Fee: ${totalFreight.toLocaleString()} AFN`, margin + 4, y + 9.5);
    doc.setTextColor(22, 163, 74);
    doc.text(`Prepaid (Origin): ${totalPaid.toLocaleString()} AFN`, margin + 46, y + 9.5);
    doc.setTextColor(225, 29, 72);
    doc.text(`TOTAL COD TO COLLECT (DEST): ${totalCodDue.toLocaleString()} AFN`, margin + 102, y + 9.5);

    y += 15;

    // ITEMIZATION TABLE HEADER
    doc.setFillColor(15, 23, 42);
    doc.rect(margin, y, contentWidth, 6.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('#', margin + 2, y + 4.5);
    doc.text('CN Number', margin + 8, y + 4.5);
    doc.text('Sender (Origin)', margin + 34, y + 4.5);
    doc.text('Receiver (Destination)', margin + 74, y + 4.5);
    doc.text('Description / Pcs / Wt', margin + 118, y + 4.5);
    doc.text('Freight Fee', margin + 154, y + 4.5);
    doc.text('Payment', margin + 172, y + 4.5);

    y += 6.5;

    // ITEMIZATION ROWS
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(15, 23, 42);

    shipments.slice(0, 16).forEach((s, idx) => {
      const isCod = s.financials.paymentStatus === 'to_pay';

      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y, contentWidth, 6, 'F');
      }
      doc.setDrawColor(226, 232, 240);
      doc.rect(margin, y, contentWidth, 6, 'S');

      doc.text(`${idx + 1}`, margin + 2, y + 4.2);
      doc.setFont('helvetica', 'bold');
      doc.text(s.cnNumber, margin + 8, y + 4.2);
      doc.setFont('helvetica', 'normal');
      doc.text(`${s.sender.name.substring(0, 16)} (${s.sender.phone.slice(-7)})`, margin + 34, y + 4.2);
      doc.text(`${s.receiver.name.substring(0, 16)} (${s.receiver.phone.slice(-7)})`, margin + 74, y + 4.2);
      doc.text(`${(s.packageInfo.description || s.packageInfo.category).substring(0, 15)} • ${s.packageInfo.pieces}p/${s.packageInfo.weightKg}k`, margin + 118, y + 4.2);
      doc.setFont('helvetica', 'bold');
      doc.text(`${s.financials.totalAmount} AFN`, margin + 154, y + 4.2);
      doc.setTextColor(isCod ? 225 : 22, isCod ? 29 : 163, isCod ? 72 : 74);
      doc.text(isCod ? 'TO PAY' : 'PAID', margin + 172, y + 4.2);
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'normal');

      y += 6;
    });

    if (shipments.length > 16) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(`... and ${shipments.length - 16} more parcels included in this consolidated batch manifest.`, margin + 4, y + 4);
      y += 6;
    }

    // OFFICIAL 3 SIGNATURES & HANDOVER AUDIT
    y = Math.max(y + 3, 218);

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, y, contentWidth, 38, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text('OFFICIAL THREE-PARTY CUSTODY & HANDOVER VERIFICATION (تأییدیه تسلیمی سه‌جانبه)', margin + 3, y + 4.5);

    // 3 Columns: Origin Dispatcher, Driver Transit, Destination Receiver
    const colW = (contentWidth - 6) / 3;

    // Col 1: Origin Dispatcher
    doc.setFillColor(255, 255, 255);
    doc.rect(margin + 2, y + 7, colW, 28, 'FD');
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.text('1. Origin Dispatch Officer', margin + 4, y + 11.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.text(`Hub: ${dispatchInfo.originBranch?.name || 'Origin Hub'}`, margin + 4, y + 16);
    doc.text('Sign / Stamp: ___________________', margin + 4, y + 31);

    // Col 2: Driver
    doc.rect(margin + 2 + colW + 1, y + 7, colW, 28, 'FD');
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.text('2. Highway Driver / Courier', margin + 2 + colW + 3, y + 11.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.text(`Name: ${dispatchInfo.driverName || 'Designated Driver'}`, margin + 2 + colW + 3, y + 16);
    doc.text(`Vehicle: ${dispatchInfo.vehiclePlate || 'Highway Van'}`, margin + 2 + colW + 3, y + 20.5);
    doc.text('Sign / Thumb: ___________________', margin + 2 + colW + 3, y + 31);

    // Col 3: Dest Receiver
    doc.rect(margin + 2 + colW * 2 + 2, y + 7, colW, 28, 'FD');
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.text('3. Destination Receiving Officer', margin + 2 + colW * 2 + 4, y + 11.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.text(`Terminal: ${dispatchInfo.destinationBranch?.name || 'Dest Terminal'}`, margin + 2 + colW * 2 + 4, y + 16);
    doc.text('Received in Good Condition: [ ]', margin + 2 + colW * 2 + 4, y + 20.5);
    doc.text('Sign / Stamp: ___________________', margin + 2 + colW * 2 + 4, y + 31);

    // Footer Credits
    y = 268;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Armaghan Sadeq Transfers • خدمات انتقالات ارمغان صادق | Nationwide Inter-Branch Cargo Network', margin + 4, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(51, 65, 85);
    doc.text('Developed by Rayan tech solutions | Rayan-Tech-Solution.tech (سیستم توسعه یافته توسط خدمات تکنالوژی رایان)', margin + 60, y);

    const filename = `Branch_Dispatch_${batchNo}_${new Date().toISOString().split('T')[0]}.pdf`;
    drawPageBorder(doc, 210, 297);
    doc.save(filename);
    return true;
  } catch (err) {
    console.error('Error generating branch bulk dispatch PDF:', err);
    return false;
  }
}

/**
 * Direct Vector jsPDF generator for Stickable Master Bag / Carton Label.
 * High-contrast, bold formatting to paste or stick directly on the master shipment sack/pallet.
 */
export function generateBranchBagStickerPdf(
  dispatchInfo: BranchBulkDispatchInfo,
  shipments: Shipment[]
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

    // STICKER CONTAINER CARD (With High-Visibility Thick Border)
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(1.2);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(margin, margin, contentWidth, 260, 3, 3, 'FD');

    // Bold Top Header
    doc.setFillColor(225, 29, 72); // Crimson Red
    doc.rect(margin, margin, contentWidth, 24, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('ARMAGHAN SADEQ TRANSFERS • خدمات انتقالات ارمغان صادق', margin + 6, margin + 10);
    doc.setFontSize(9);
    doc.text('CONSOLIDATED MASTER SHIPMENT BAG / PALLET STICKER (برچسب بوجی و بسته تجمیعی)', margin + 6, margin + 17);

    // GIANT DESTINATION BRANCH BANNER (Super High Visibility)
    let y = margin + 26;
    doc.setFillColor(15, 23, 42); // Deep Slate
    doc.rect(margin + 2, y, contentWidth - 4, 30, 'F');

    doc.setTextColor(248, 250, 252);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('DESTINATION TERMINAL / نمایندگی مقصد:', margin + 6, y + 8);

    const destName = dispatchInfo.destinationBranch?.name || 'DESTINATION BRANCH';
    const destCode = dispatchInfo.destinationBranch?.code || 'DEST';
    const destCity = dispatchInfo.destinationBranch?.city || '';

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text(`${destName.toUpperCase()} (${destCode})`, margin + 6, y + 20);

    doc.setFontSize(11);
    doc.setTextColor(253, 224, 71); // Yellow accent
    doc.text(`PROVINCE / CITY: ${destCity.toUpperCase()}`, margin + 6, y + 26);

    y += 34;

    // ORIGIN & BATCH BARCODE CARD
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.4);
    doc.roundedRect(margin + 2, y, contentWidth - 4, 26, 2, 2, 'FD');

    const batchNo = dispatchInfo.batchNumber || `AST-DSP-${Date.now().toString().slice(-6)}`;
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(`ORIGIN HUB: ${dispatchInfo.originBranch?.name || 'Kabul Central HQ'}`, margin + 6, y + 7);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Driver / Courier: ${dispatchInfo.driverName || 'Designated Driver'} (${dispatchInfo.vehiclePlate || 'Transit Van'})`, margin + 6, y + 13);
    doc.text(`Date & Time: ${dispatchInfo.dispatchDate || new Date().toLocaleString()}`, margin + 6, y + 19);
    doc.text(`Master Seal / Bag #: ${dispatchInfo.sealNumber || 'SEAL-OK'}`, margin + 6, y + 24);

    // Batch Badge on right
    doc.setFillColor(225, 29, 72);
    doc.roundedRect(margin + contentWidth - 65, y + 3, 60, 20, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('BATCH REFERENCE #', margin + contentWidth - 62, y + 9);
    doc.setFontSize(11);
    doc.text(batchNo, margin + contentWidth - 62, y + 17);

    y += 30;

    // KEY BULK METRICS HIGHLIGHT BOX (Huge Bold Numbers)
    const totalPcs = shipments.reduce((sum, s) => sum + (s.packageInfo.pieces || 1), 0);
    const totalWeight = shipments.reduce((sum, s) => sum + (s.packageInfo.weightKg || 0), 0);
    const totalCodDue = shipments.reduce((sum, s) => sum + (s.financials.paymentStatus === 'to_pay' ? s.financials.totalAmount : (s.financials.amountDue || 0)), 0);

    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.6);
    doc.roundedRect(margin + 2, y, contentWidth - 4, 28, 2, 2, 'FD');

    const mColW = (contentWidth - 4) / 3;

    // Metric 1: Parcels
    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('TOTAL CONSIGNMENTS', margin + 6, y + 7);
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(16);
    doc.text(`${shipments.length} PARCELS`, margin + 6, y + 18);
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`(${totalPcs} Total Boxes / Packages)`, margin + 6, y + 24);

    // Metric 2: Weight
    doc.setTextColor(71, 85, 105);
    doc.setFontSize(8);
    doc.text('TOTAL SCALE WEIGHT', margin + 2 + mColW + 4, y + 7);
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(16);
    doc.text(`${totalWeight} KG`, margin + 2 + mColW + 4, y + 18);
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Weighed at Origin Scale', margin + 2 + mColW + 4, y + 24);

    // Metric 3: COD
    doc.setTextColor(71, 85, 105);
    doc.setFontSize(8);
    doc.text('TOTAL COD TO COLLECT', margin + 2 + mColW * 2 + 4, y + 7);
    doc.setTextColor(225, 29, 72);
    doc.setFontSize(15);
    doc.text(`${totalCodDue.toLocaleString()} AFN`, margin + 2 + mColW * 2 + 4, y + 18);
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Settlement at Destination', margin + 2 + mColW * 2 + 4, y + 24);

    y += 33;

    // INVENTORY CHECKLIST TABLE INSIDE BAG
    doc.setFillColor(15, 23, 42);
    doc.rect(margin + 2, y, contentWidth - 4, 6, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('CONTAINED PARCEL CHECKLIST (لیست بارنامه‌های داخل بوجی)', margin + 4, y + 4.2);

    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(15, 23, 42);

    shipments.slice(0, 14).forEach((s, idx) => {
      const isCod = s.financials.paymentStatus === 'to_pay';
      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin + 2, y, contentWidth - 4, 5.5, 'F');
      }
      doc.setDrawColor(226, 232, 240);
      doc.rect(margin + 2, y, contentWidth - 4, 5.5, 'S');

      doc.text(`[ ] #${idx + 1}`, margin + 4, y + 4);
      doc.setFont('helvetica', 'bold');
      doc.text(s.cnNumber, margin + 16, y + 4);
      doc.setFont('helvetica', 'normal');
      doc.text(`Rec: ${s.receiver.name.substring(0, 18)} (${s.receiver.phone.slice(-7)})`, margin + 48, y + 4);
      doc.text(`${(s.packageInfo.description || s.packageInfo.category).substring(0, 18)} • ${s.packageInfo.pieces}p/${s.packageInfo.weightKg}k`, margin + 110, y + 4);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(isCod ? 225 : 22, isCod ? 29 : 163, isCod ? 72 : 74);
      doc.text(isCod ? `COD: ${s.financials.totalAmount} AFN` : 'PAID', margin + 152, y + 4);
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'normal');

      y += 5.5;
    });

    // Warning & Instructions footer inside sticker
    y = Math.max(y + 2, 242);
    doc.setFillColor(254, 242, 242);
    doc.setDrawColor(252, 165, 165);
    doc.roundedRect(margin + 2, y, contentWidth - 4, 18, 2, 2, 'FD');

    doc.setTextColor(153, 27, 27);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('IMPORTANT SECURITY NOTICE & HANDLING INSTRUCTIONS (دستورالعمل مهم حمل و نقل)', margin + 5, y + 4.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.text('• Do not open or tear master seal until arrival and verification at destination branch terminal.', margin + 5, y + 8.5);
    doc.text('• In case of seal breakage, count contained CN parcels against this manifest immediately and contact Central HQ.', margin + 5, y + 12.5);
    doc.text('• Hotline: 0711299680 / 0774144004 | Developed by Rayan tech solutions (Rayan-Tech-Solution.tech)', margin + 5, y + 16.5);

    const filename = `Bag_Sticker_${destCode}_${batchNo}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
    return true;
  } catch (err) {
    console.error('Error generating branch bag sticker PDF:', err);
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
    drawPageBorder(doc, 210, 297);
    doc.save(filename);
    return true;
  } catch (err) {
    console.error('Error generating executive report PDF:', err);
    return false;
  }
}

/**
 * Generates a thermal-printer friendly PDF receipt or label calibrated for 80mm POS printers (e.g. MG-820)
 * or 80x80mm square labels.
 */
export function generateThermalLabelPdf(
  shipment: Shipment, 
  originBranch?: Branch, 
  destBranch?: Branch, 
  receiptRole: 'buyer' | 'seller' = 'buyer',
  thermalSize: '80mm' | '80x80' | '100x150' = '80mm'
): boolean {
  try {
    const originName = originBranch?.city || shipment.sender.city || 'Origin';
    const destName = destBranch?.city || shipment.receiver.city || 'Destination';
    const thermalPrice = shipment.financials.productPrice || shipment.packageInfo?.declaredValueAfn || shipment.financials.totalAmount || 3000;
    const thermalServiceFee = typeof shipment.financials.serviceFee === 'number' && shipment.financials.serviceFee > 0 ? shipment.financials.serviceFee : 150;
    const thermalDestComm = typeof shipment.financials.destBranchCommission === 'number' && shipment.financials.destBranchCommission > 0 ? shipment.financials.destBranchCommission : 70;
    const thermalPayout = (typeof shipment.financials.sellerPayout === 'number' && shipment.financials.sellerPayout > 0)
      ? shipment.financials.sellerPayout
      : Math.max(0, thermalPrice - thermalServiceFee - thermalDestComm);

    // ==========================================
    // 1. STANDARD 80MM CONTINUOUS ROLL (MG-820)
    // ==========================================
    if (thermalSize === '80mm') {
      const pageWidth = 80;
      const margin = 4;
      const contentWidth = pageWidth - margin * 2; // 72mm printable area
      const pageHeight = 155; // Slightly taller to fit all info

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [pageWidth, pageHeight],
        compress: true,
      });

      let y = margin;

      // Header Banner (Black)
      doc.setFillColor(15, 23, 42); // Navy/Black
      doc.rect(margin, y, contentWidth, 12, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('ARMAGHAN SADEQ TRANSFERS', margin + contentWidth / 2, y + 5, { align: 'center' });
      doc.setFontSize(6.5);
      doc.text('CENTRAL LOGISTICS HUB KABUL • OFFICIAL POS SLIP', margin + contentWidth / 2, y + 9.5, { align: 'center' });

      y += 14;

      // CN Number Box (Bordered)
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.4);
      doc.rect(margin, y, contentWidth, 20);
      
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(7);
      doc.text('CONSIGNMENT NOTE (CN #)', margin + 3, y + 4.5);
      
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(14);
      doc.text(shipment.cnNumber, margin + 3, y + 12);
      
      doc.setFontSize(7);
      doc.text(`*${shipment.cnNumber}*`, margin + contentWidth / 2, y + 18, { align: 'center' });

      y += 22;

      // Route Box (Black)
      doc.setFillColor(0, 0, 0);
      doc.rect(margin, y, contentWidth, 9, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.text(`${originName.toUpperCase()} ➔ ${destName.toUpperCase()}`, margin + contentWidth / 2, y + 6, { align: 'center' });

      y += 11;

      // SENDER & RECEIVER SIDE-BY-SIDE
      const colW = contentWidth / 2 - 1.5;
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.2);
      
      // Sender Box
      doc.rect(margin, y, colW, 22);
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, colW, 4, 'F');
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(6.5);
      doc.text('FROM (SENDER):', margin + 1.5, y + 3);
      
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.text(shipment.sender.name.substring(0, 20), margin + 1.5, y + 8);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.text(`Tel: ${shipment.sender.phone}`, margin + 1.5, y + 13);
      doc.setFontSize(6.5);
      doc.text(`Origin: ${originName}`, margin + 1.5, y + 18);

      // Receiver Box
      doc.rect(margin + colW + 3, y, colW, 22);
      doc.setFillColor(248, 250, 252);
      doc.rect(margin + colW + 3, y, colW, 4, 'F');
      doc.setFontSize(6.5);
      doc.text('TO (CONSIGNEE):', margin + colW + 4.5, y + 3);
      
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.text(shipment.receiver.name.substring(0, 20), margin + colW + 4.5, y + 8);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.text(`Tel: ${shipment.receiver.phone}`, margin + colW + 4.5, y + 13);
      doc.setFontSize(6.5);
      doc.text(`Dest: ${destName}`, margin + colW + 4.5, y + 18);

      y += 24;

      // SPECS (Weight, Pieces, Category, Service)
      doc.setLineWidth(0.2);
      doc.rect(margin, y, contentWidth, 12);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.text(`Weight: ${shipment.packageInfo.weightKg} KG`, margin + 2, y + 4.5);
      doc.text(`Pieces: ${shipment.packageInfo.pieces} PKG`, margin + 38, y + 4.5);
      doc.setFont('helvetica', 'normal');
      doc.text(`Category: ${shipment.packageInfo.category}`, margin + 2, y + 9.5);
      doc.text(`Service: ${shipment.packageInfo.serviceType.toUpperCase()}`, margin + 38, y + 9.5);

      y += 14;

      // FINANCIAL BOX
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, contentWidth, 18, 'FD');
      
      if (receiptRole === 'seller') {
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.text('SELLER PAYOUT (AFTER DEDUCTIONS)', margin + 3, y + 5);
        
        doc.setTextColor(22, 163, 74); // Emerald-600
        doc.setFontSize(12);
        doc.text(`${thermalPayout.toLocaleString()} AFN`, margin + 3, y + 11.5);
        
        doc.setTextColor(100, 116, 139);
        doc.setFontSize(6);
        doc.setFont('helvetica', 'normal');
        doc.text(`Item: ${thermalPrice} | Fee: ${thermalServiceFee} | Comm: ${thermalDestComm}`, margin + 3, y + 15.5);
      } else {
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.text('TOTAL PAYABLE (COD / RECEIVER COPY)', margin + 3, y + 5);
        
        doc.setFontSize(13);
        doc.text(`${thermalPrice.toLocaleString()} AFN`, margin + 3, y + 12);
        
        doc.setTextColor(220, 38, 38); // Red-600
        doc.setFontSize(7);
        const statusText = shipment.financials.paymentStatus === 'paid' ? 'PAID / COLLECTED' : 'COD (TO PAY AT DESTINATION)';
        doc.text(statusText, margin + 3, y + 16);
      }

      y += 21;

      // FOOTER
      doc.setDrawColor(203, 213, 225);
      doc.setLineDashPattern([1, 1], 0);
      doc.line(margin, y, margin + contentWidth, y);
      doc.setLineDashPattern([], 0);

      y += 4;
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.text('Helplines: +93 79 900 1122 | Complaints: 0711299680', margin + contentWidth / 2, y, { align: 'center' });
      doc.text('Main Kabul: 0774144004', margin + contentWidth / 2, y + 4.5, { align: 'center' });
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.setTextColor(100, 116, 139);
      doc.text(`Printed: ${new Date().toLocaleDateString()} | Rayan Tech Solutions`, margin + contentWidth / 2, y + 9, { align: 'center' });

      const filename = `Thermal_Receipt_${shipment.cnNumber}_80mm.pdf`;
      doc.save(filename);
      return true;
    }

    // ==========================================
    // 2. 80MM X 80MM SQUARE LABEL FORMAT (80/80)
    // ==========================================
    if (thermalSize === '80x80') {
      const size = 80;
      const margin = 3;
      const contentWidth = size - margin * 2; // 74mm

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [size, size],
        compress: true,
      });

      let y = margin;

      // Header
      doc.setFillColor(15, 23, 42);
      doc.rect(margin, y, contentWidth, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('ARMAGHAN SADEQ TRANSFERS', margin + contentWidth / 2, y + 5, { align: 'center' });

      y += 10;

      // CN & Date Info Strip
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(`CN: ${shipment.cnNumber}`, margin, y + 3);
      doc.setFontSize(8);
      doc.text(new Date(shipment.bookedAt).toLocaleDateString(), margin + contentWidth, y + 3, { align: 'right' });

      y += 6;

      // Route Banner
      doc.setFillColor(0, 0, 0);
      doc.rect(margin, y, contentWidth, 7, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8.5);
      doc.text(`${originName.toUpperCase()} ➔ ${destName.toUpperCase()}`, margin + contentWidth / 2, y + 4.8, { align: 'center' });

      y += 10;

      // SENDER & RECEIVER SIDE-BY-SIDE
      const colW = contentWidth / 2 - 1.5;
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.2);
      
      // Borders for parties
      doc.rect(margin, y, colW, 20);
      doc.rect(margin + colW + 3, y, colW, 20);

      doc.setTextColor(100, 116, 139);
      doc.setFontSize(6);
      doc.text('SENDER:', margin + 1.5, y + 4);
      doc.text('RECEIVER:', margin + colW + 4.5, y + 4);

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(8.5);
      doc.text(shipment.sender.name.substring(0, 16), margin + 1.5, y + 9);
      doc.text(shipment.receiver.name.substring(0, 16), margin + colW + 4.5, y + 9);

      doc.setFontSize(7.5);
      doc.text(shipment.sender.phone, margin + 1.5, y + 14);
      doc.text(shipment.receiver.phone, margin + colW + 4.5, y + 14);

      y += 23;

      // Specs & COD
      doc.setFillColor(245, 245, 245);
      doc.rect(margin, y, contentWidth, 8, 'F');
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(7.5);
      doc.text(`${shipment.packageInfo.pieces} PKG | ${shipment.packageInfo.weightKg} KG`, margin + 2, y + 5.2);
      
      doc.setFontSize(9);
      const isPaid = shipment.financials.paymentStatus === 'paid';
      
      let amountText = '';
      if (receiptRole === 'buyer') {
        amountText = isPaid ? 'PAID' : `COD: ${thermalPrice.toLocaleString()}`;
      } else {
        amountText = `PAYOUT: ${thermalPayout.toLocaleString()}`;
      }
      doc.text(amountText, margin + contentWidth - 2, y + 5.2, { align: 'right' });

      y += 12;

      // Footer
      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(`Helplines: +93 79 900 1122 | complaints: 0711299680`, margin + contentWidth / 2, y, { align: 'center' });
      doc.text('Receipt valid 30 days.', margin + contentWidth / 2, y + 3.5, { align: 'center' });

      const filename = `Thermal_Label_${shipment.cnNumber}_80x80.pdf`;
      doc.save(filename);
      return true;
    }

    // ==========================================
    // 3. 100X150MM SHIPPING LABEL (4x6 INCH)
    // ==========================================
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [100, 150],
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
    doc.text('KABUL CARGO EXPRESS', margin + 4, y + 6);
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

    // Vector barcode lines
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

    // ROUTE BOX
    doc.setFillColor(225, 29, 72);
    doc.rect(margin, y, contentWidth, 14, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('ROUTE / HUB DESTINATION', margin + 4, y + 4.5);
    doc.setFontSize(11);
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
      doc.text(`Product Price: ${thermalPrice.toLocaleString()} AFN`, margin + 45, y + 10);
      doc.text(`Net Seller Payout: ${thermalPayout.toLocaleString()} AFN`, margin + 3, y + 15);
    } else {
      doc.text(`Payment: ${(shipment.financials.paymentStatus || 'to_pay').toUpperCase()} (${thermalPrice.toLocaleString()} AFN)`, margin + 3, y + 15);
    }

    y += specH + 3;

    // Footer info
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Booked: ${new Date(shipment.bookedAt).toLocaleString()} | By: ${shipment.bookedByUserName || 'Staff'}`, margin, y);
    doc.text('Armaghan Sadeq Transfers • Thermal Shipping Label', margin, y + 4);

    const filename = `Thermal_Label_${shipment.cnNumber}.pdf`;
    drawPageBorder(doc, pageWidth, 150, 2.5);
    doc.save(filename);
    return true;
  } catch (err) {
    console.error('Error generating thermal shipping label PDF:', err);
    return false;
  }
}

