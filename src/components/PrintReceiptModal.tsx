import React, { useRef, useState } from 'react';
import { 
  Printer, 
  X, 
  MapPin, 
  Download,
  Loader2,
  FileCheck,
  Receipt,
  FileText,
  Phone,
  AlertCircle,
  Building2,
  Tag
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { BarcodeGenerator, QRCodeVisual } from './BarcodeGenerator';
import { 
  generateWaybillPdf, 
  generateThermalLabelPdf, 
  generateThermalPdfFromElement, 
  printElementUsingIframe 
} from '../utils/pdfExport';

export const PrintReceiptModal: React.FC = () => {
  const { 
    selectedShipmentForReceipt, 
    setSelectedShipmentForReceipt, 
    branches, 
    t,
    showToast,
    receiptPrintMode
  } = useApp();

  const receiptRef = useRef<HTMLDivElement>(null);
  const thermal80mmRef = useRef<HTMLDivElement>(null);
  const thermal80x80Ref = useRef<HTMLDivElement>(null);
  const [printFormat, setPrintFormat] = useState<'standard' | 'thermal_80mm' | 'thermal_80x80'>(
    receiptPrintMode === 'thermal' ? 'thermal_80mm' : 'thermal_80mm'
  );
  const [receiptRole, setReceiptRole] = useState<'buyer' | 'seller'>('buyer');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  if (!selectedShipmentForReceipt) return null;

  const shipment = selectedShipmentForReceipt;
  const originBranch = branches.find(b => b.id === shipment.originBranchId);
  const destBranch = branches.find(b => b.id === shipment.destinationBranchId);

  const priceVal = Number(shipment.financials?.productPrice) || Number(shipment.packageInfo?.declaredValueAfn) || Number(shipment.financials?.totalAmount) || 3000;
  const sFeeVal = typeof shipment.financials?.serviceFee === 'number' && shipment.financials.serviceFee > 0 ? shipment.financials.serviceFee : (shipment.packageInfo?.isFragile ? 200 : 150);
  const dCommVal = typeof shipment.financials?.destBranchCommission === 'number' && shipment.financials.destBranchCommission > 0 ? shipment.financials.destBranchCommission : (shipment.destBranchCommission || 70);
  const discountVal = Number(shipment.financials?.discountAmount) || 0;
  const payoutVal = (typeof shipment.financials?.sellerPayout === 'number' && shipment.financials.sellerPayout > 0)
    ? shipment.financials.sellerPayout
    : Math.max(0, priceVal - sFeeVal - dCommVal + discountVal);
  const totalDueVal = Number(shipment.financials?.totalAmount) || priceVal;
  const isPaid = shipment.financials?.paymentStatus === 'paid' || shipment.status === 'delivered';

  const handlePrint = () => {
    let targetRef: HTMLElement | null = null;
    let formatArg: 'standard' | 'thermal_80mm' | 'thermal_80x80' = 'standard';

    if (printFormat === 'standard') {
      targetRef = receiptRef.current;
      formatArg = 'standard';
    } else if (printFormat === 'thermal_80x80') {
      targetRef = thermal80x80Ref.current;
      formatArg = 'thermal_80x80';
    } else {
      targetRef = thermal80mmRef.current;
      formatArg = 'thermal_80mm';
    }

    if (targetRef) {
      printElementUsingIframe(targetRef, `Receipt_${shipment.cnNumber}`, formatArg);
    } else {
      window.print();
    }
    showToast(`✓ Print job sent to printer for CN #${shipment.cnNumber}!`);
  };

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    setDownloadSuccess(false);

    try {
      if (printFormat === 'standard') {
        const ok = generateWaybillPdf(shipment, originBranch, destBranch, receiptRole);
        if (ok) {
          setDownloadSuccess(true);
          setTimeout(() => setDownloadSuccess(false), 4000);
        }
      } else {
        const isSquare = printFormat === 'thermal_80x80';
        const targetElement = isSquare ? thermal80x80Ref.current : thermal80mmRef.current;
        const filename = `Receipt_${shipment.cnNumber}_${isSquare ? '80x80mm' : '80mm'}.pdf`;

        // 1. High-resolution DOM-to-PDF capture (600 DPI equivalent with authentic Afghan Dari script)
        if (targetElement) {
          const ok = await generateThermalPdfFromElement(
            targetElement,
            filename,
            80,
            isSquare ? 80 : undefined
          );
          if (ok) {
            setDownloadSuccess(true);
            setTimeout(() => setDownloadSuccess(false), 4000);
            return;
          }
        }

        // 2. Vector jsPDF fallback
        const ok = generateThermalLabelPdf(
          shipment,
          originBranch,
          destBranch,
          receiptRole,
          isSquare ? '80x80' : '80mm'
        );
        if (ok) {
          setDownloadSuccess(true);
          setTimeout(() => setDownloadSuccess(false), 4000);
        }
      }
    } catch (err) {
      console.error('PDF error:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className={`bg-white rounded-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 ${
        printFormat === 'standard' ? 'max-w-3xl' : 'max-w-md'
      }`}>
        
        {/* Modal Action Header (Excluded from Print) */}
        <div className="no-print p-3 sm:p-4 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 font-bold text-sm text-slate-800">
            <Printer className="w-4 h-4 text-red-600" />
            <span>{t('receipt_title')}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-mono font-bold">
              {shipment.cnNumber}
            </span>
          </div>

          {/* Controls: Role and Thermal Format Switcher */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Receiver vs Seller Copy Switcher */}
            <div className="flex items-center bg-slate-200/90 rounded-xl p-0.5 text-xs font-bold">
              <button
                onClick={() => setReceiptRole('buyer')}
                className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all cursor-pointer ${
                  receiptRole === 'buyer' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Receiver Copy (Without internal commission/discount)"
              >
                <span>Receiver (رسید گیرنده)</span>
              </button>
              <button
                onClick={() => setReceiptRole('seller')}
                className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all cursor-pointer ${
                  receiptRole === 'seller' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Seller Copy (With commission, fee deductions, and net payout)"
              >
                <span>Seller (رسید فروشنده)</span>
              </button>
            </div>
            
            {/* Format Selector: 80mm Roll vs 80x80 Square vs A4 */}
            <div className="flex items-center bg-slate-200/90 rounded-xl p-0.5 text-xs font-bold">
              <button
                onClick={() => setPrintFormat('thermal_80mm')}
                className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all cursor-pointer ${
                  printFormat === 'thermal_80mm' ? 'bg-white text-red-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="80mm Thermal POS Roll (Standard for MG-820 thermal printer)"
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>80mm Roll</span>
              </button>
              <button
                onClick={() => setPrintFormat('thermal_80x80')}
                className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all cursor-pointer ${
                  printFormat === 'thermal_80x80' ? 'bg-white text-red-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="80mm x 80mm Square Label (Square sticker format)"
              >
                <Tag className="w-3.5 h-3.5" />
                <span>80/80 Label</span>
              </button>
              <button
                onClick={() => setPrintFormat('standard')}
                className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all cursor-pointer ${
                  printFormat === 'standard' ? 'bg-white text-red-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Standard A4 Document"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>A4</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Download PDF button */}
            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              id="btn-modal-download-pdf"
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              title={printFormat === 'standard' ? 'Download A4 PDF' : 'Download 80mm Thermal PDF (Perfect for MG-820)'}
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{t('generating_pdf')}</span>
                </>
              ) : downloadSuccess ? (
                <>
                  <FileCheck className="w-3.5 h-3.5 text-emerald-200" />
                  <span>{t('pdf_downloaded_success')}</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>{printFormat === 'standard' ? 'A4 PDF' : '80mm PDF'}</span>
                </>
              )}
            </button>

            {/* Direct Print button */}
            <button
              onClick={handlePrint}
              id="btn-modal-print-receipt"
              className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Send directly to thermal printer (MG-820)"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{printFormat === 'standard' ? t('btn_print_pdf') : 'Print 80mm'}</span>
            </button>

            <button
              onClick={() => setSelectedShipmentForReceipt(null)}
              className="p-1.5 rounded-xl text-slate-500 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 1. THERMAL POS RECEIPT FORMAT (80MM CONTINUOUS ROLL)     */}
        {/* ======================================================== */}
        {printFormat === 'thermal_80mm' && (
          <div className="p-3 bg-slate-50 overflow-y-auto max-h-[78vh]">
            <div 
              ref={thermal80mmRef} 
              className="thermal-receipt-container bg-white text-black font-sans text-xs leading-tight space-y-2.5 mx-auto border border-dashed border-slate-300 shadow-sm my-1 select-text"
              style={{ 
                width: '300px', 
                maxWidth: '300px',
                padding: '12px 10px',
                boxSizing: 'border-box'
              }}
            >
              {/* Header */}
              <div className="text-center space-y-1 pb-1.5 border-b-2 border-black">
                <div className="text-[13px] font-black tracking-tight uppercase text-black">ARMAGHAN SADEQ TRANSFERS</div>
                <div className="text-[12px] font-bold text-black">خدمات انتقالات ارمغان صادق</div>
                <div className="text-[10px] font-semibold text-neutral-800">مرکز کابل • Central Hub Kabul</div>
                <div className="text-[10.5px] font-black pt-1 border-t border-dashed border-black tracking-wider uppercase">
                  *** OFFICIAL CONSIGNMENT SLIP ***
                </div>
              </div>

              {/* CN & Date */}
              <div className="space-y-0.5 text-xs pb-1.5 border-b border-black">
                <div className="flex justify-between items-baseline font-bold">
                  <span className="text-[11px] text-neutral-800">CN NUMBER:</span>
                  <span className="text-[15px] font-black font-mono tracking-wider text-black">{shipment.cnNumber}</span>
                </div>
                <div className="flex justify-between text-[11px] text-neutral-900">
                  <span className="font-semibold">DATE:</span>
                  <span>{new Date(shipment.bookedAt).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-[11px] text-neutral-900">
                  <span className="font-semibold">SERVICE:</span>
                  <span className="uppercase font-black">{shipment.packageInfo.serviceType}</span>
                </div>
              </div>

              {/* Route */}
              <div className="space-y-1.5 py-1 border-b border-black">
                <div className="font-black text-[12px] uppercase text-center bg-black text-white py-1 px-2 rounded-xs tracking-wide">
                  {originBranch?.city?.toUpperCase() || 'ORIGIN'} ➔ {destBranch?.city?.toUpperCase() || 'DESTINATION'}
                </div>
                <div className="text-[11px] space-y-0.5 text-black">
                  <div><span className="font-black">FROM:</span> <span className="font-bold">{shipment.sender.name}</span></div>
                  <div><span className="font-black">TEL:</span> <span className="font-mono font-bold" dir="ltr">{shipment.sender.phone}</span></div>
                  <div><span className="font-semibold">CITY:</span> {shipment.sender.city} ({originBranch?.name || 'Main'})</div>
                </div>
                <div className="text-[11px] space-y-0.5 pt-1 border-t border-dashed border-neutral-300 text-black">
                  <div><span className="font-black">TO:</span> <span className="font-bold">{shipment.receiver.name}</span></div>
                  <div><span className="font-black">TEL:</span> <span className="font-mono font-bold" dir="ltr">{shipment.receiver.phone}</span></div>
                  {(shipment.receiver.nationalId || shipment.sender.receiverTazkira) && (
                    <div><span className="font-black">TAZKIRA:</span> <span className="font-bold">{shipment.receiver.nationalId || shipment.sender.receiverTazkira}</span></div>
                  )}
                  <div><span className="font-semibold">DEST:</span> {shipment.receiver.city} ({destBranch?.name || 'Destination'})</div>
                </div>
              </div>

              {/* Cargo Specs */}
              <div className="space-y-0.5 py-1 border-b border-black text-[11px] text-black">
                <div className="flex justify-between">
                  <span className="font-semibold">CATEGORY:</span>
                  <span className="font-black">{shipment.packageInfo.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold">WEIGHT:</span>
                  <span className="font-black">{shipment.packageInfo.weightKg} KG</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold">PIECES:</span>
                  <span className="font-black">{shipment.packageInfo.pieces} PKG(S)</span>
                </div>
                {shipment.packageInfo.isFragile && (
                  <div className="text-center font-black text-[10px] border border-black py-0.5 mt-1 bg-neutral-100">
                    * FRAGILE CARGO - HANDLE WITH CARE *
                  </div>
                )}
              </div>

              {/* Charges Breakdown */}
              <div className="space-y-1.5 py-1 border-b border-black text-[11px]">
                {shipment.status === 'pre_booked' && (
                  <div className="text-center py-1 bg-neutral-100 border border-black text-black mb-1">
                    <div className="font-black text-[10px] uppercase">* PRE-BOOKING ESTIMATE *</div>
                    <div className="text-[9px]">Final weight & price verified upon branch drop-off.</div>
                  </div>
                )}
                {receiptRole === 'seller' ? (
                  <div className="space-y-1 text-black">
                    <div className="flex justify-between">
                      <span className="font-semibold">Product Selling Price:</span>
                      <span className="font-bold">{priceVal.toLocaleString()} AFN</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold">Service Fee (Deducted):</span>
                      <span className="font-bold">-{sFeeVal.toLocaleString()} AFN</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold">Dest. Comm. (Deducted):</span>
                      <span className="font-bold">-{dCommVal.toLocaleString()} AFN</span>
                    </div>
                    {discountVal > 0 && (
                      <div className="flex justify-between">
                        <span className="font-semibold">Fee Discount:</span>
                        <span className="font-bold">+{discountVal.toLocaleString()} AFN</span>
                      </div>
                    )}
                    <div className="p-1.5 bg-neutral-100 border-2 border-black mt-1 text-center">
                      <div className="text-[10px] font-bold uppercase text-neutral-800">NET PAYOUT TO SELLER (پرداخت خالص به فروشنده)</div>
                      <div className="text-[16px] font-black font-mono text-black">{payoutVal.toLocaleString()} AFN</div>
                    </div>
                  </div>
                ) : (
                  <div className="p-1.5 bg-neutral-100 border-2 border-black text-center space-y-0.5">
                    <div className="text-[10.5px] font-black uppercase text-black">TOTAL PAYABLE (مجموع قابل پرداخت)</div>
                    <div className="text-[18px] font-black font-mono text-black">{totalDueVal.toLocaleString()} AFN</div>
                  </div>
                )}
                <div className="flex justify-between font-black text-[11px] pt-1 border-t border-dashed border-neutral-300">
                  <span>PAYMENT STATUS:</span>
                  <span className="uppercase">
                    {isPaid ? 'PAID / تحویل داده شد' : 'COD (COLLECT AT DEST)'}
                  </span>
                </div>
              </div>

              {/* 3 Official Cargo Rules & Legal Conditions in Dari */}
              <div className="border-b border-black py-1.5 text-[9px] leading-snug space-y-1 text-black text-right" dir="rtl">
                <div className="font-black text-center uppercase tracking-wider text-[9.5px] bg-neutral-100 py-0.5 border-y border-black">
                  شرایط، قوانین و مقررات بارنامه
                </div>
                <div className="space-y-1 pt-0.5 font-sans">
                  <div>
                    <span className="font-black">۱. </span> بل پس از یک ماه فاقد اعتبار بوده و صحت معلومات درج‌شده در آن بر عهده فرستنده است.
                  </div>
                  <div>
                    <span className="font-black">۲. </span> ارسال اموال غیرقانونی ممنوع بوده و مسئولیت آن به عهده فرستنده می‌باشد؛ شرکت در برابر خسارات ناشی از حوادث طبیعی، آتش‌سوزی و تصادم مسئول نیست.
                  </div>
                  <div>
                    <span className="font-black">۳. </span> اجناس مستردشده حداکثر یک ماه نگهداری می‌شود. هنگام دریافت پول، ارائه بل الزامی است و بدون بل پرداخت صورت نمی‌گیرد.
                  </div>
                </div>
              </div>

              {/* Official 3 Helpline Contacts */}
              <div className="border-b border-black py-1.5 text-[10px] space-y-1 text-black">
                <div className="font-black text-center uppercase tracking-wider text-[9.5px]">شماره‌های تماس رسمی و شکایات</div>
                <div className="flex justify-between">
                  <span className="font-bold">1. مرکز مبدأ (Sender Hub):</span>
                  <span className="font-black font-mono" dir="ltr">{originBranch?.phone || '0799123456'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold">2. شکایات (Complaints):</span>
                  <span className="font-black font-mono text-[10.5px]">0711299680</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold">3. دفتر مرکزی (Main Office):</span>
                  <span className="font-black font-mono text-[10.5px]">0774144004</span>
                </div>
              </div>

              {/* Barcode & Footer Notice */}
              <div className="text-center space-y-1.5 pt-1">
                <div className="flex justify-center">
                  <BarcodeGenerator value={shipment.cnNumber} width={1.6} height={38} displayValue={false} />
                </div>
                <div className="font-mono font-black text-[12px] tracking-widest text-black">
                  *{shipment.cnNumber}*
                </div>
                <div className="text-[10px] font-bold text-black">
                  Track live: www.armaghansadeq.af
                </div>
                <div className="text-[8.5px] text-neutral-600 pt-0.5">
                  Developed by Rayan tech solutions | سیستم توسعه یافته توسط خدمات تکنالوژی رایان
                </div>
                <div className="text-center text-[10px] font-bold text-neutral-400">--------------------------------</div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 2. THERMAL 80X80MM SQUARE LABEL FORMAT                   */}
        {/* ======================================================== */}
        {printFormat === 'thermal_80x80' && (
          <div className="p-3 bg-slate-50 overflow-y-auto max-h-[78vh] flex items-center justify-center">
            <div 
              ref={thermal80x80Ref} 
              className="thermal-receipt-container bg-white text-black font-sans leading-tight mx-auto border-2 border-black shadow-sm my-1 select-text"
              style={{ 
                width: '300px', 
                height: '300px', 
                maxWidth: '300px',
                maxHeight: '300px',
                padding: '12px',
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                overflow: 'hidden'
              }}
            >
              {/* Top Header */}
              <div>
                <div className="flex justify-between items-center border-b border-black pb-0.5">
                  <div className="text-[10.5px] font-black uppercase text-black">ARMAGHAN SADEQ</div>
                  <div className="text-[9px] font-bold text-neutral-800">80x80 LABEL</div>
                </div>

                {/* CN & Route */}
                <div className="flex justify-between items-center pt-1 pb-1">
                  <div>
                    <div className="text-[7.5px] font-bold text-neutral-700">CONSIGNMENT NOTE</div>
                    <div className="text-[13px] font-black font-mono leading-none text-black">{shipment.cnNumber}</div>
                  </div>
                  <div className="bg-black text-white text-[9.5px] font-black py-0.5 px-1.5 rounded-xs uppercase">
                    {originBranch?.city?.substring(0, 6)?.toUpperCase() || 'ORIGIN'} ➔ {destBranch?.city?.substring(0, 6)?.toUpperCase() || 'DEST'}
                  </div>
                </div>

                {/* Barcode */}
                <div className="flex justify-center py-0.5">
                  <BarcodeGenerator value={shipment.cnNumber} width={1.4} height={24} displayValue={false} />
                </div>
              </div>

              {/* Sender & Receiver Compact */}
              <div className="border border-black p-1 text-[9.5px] space-y-0.5 leading-tight">
                <div><span className="font-black">FROM:</span> {shipment.sender.name} • <span className="font-mono" dir="ltr">{shipment.sender.phone}</span></div>
                <div><span className="font-black">TO:</span> <span className="font-bold">{shipment.receiver.name}</span> • <span className="font-mono font-bold" dir="ltr">{shipment.receiver.phone}</span></div>
                <div><span className="font-bold">DEST:</span> {shipment.receiver.city} ({destBranch?.name || 'Hub'})</div>
                <div className="text-[8.5px] text-neutral-800 font-semibold pt-0.5 border-t border-dashed border-neutral-300">
                  {shipment.packageInfo.weightKg} KG • {shipment.packageInfo.pieces || 1} PKG • {shipment.packageInfo.serviceType.toUpperCase()}
                </div>
              </div>

              {/* Bottom Financial / COD Box */}
              <div>
                <div className="p-1 bg-neutral-100 border border-black text-center font-black text-[11px] leading-tight text-black">
                  {isPaid ? 'PAID / تحویل داده شد' : `COLLECT COD: ${totalDueVal.toLocaleString()} AFN`}
                </div>
                <div className="flex justify-between items-center text-[7.5px] text-neutral-700 pt-0.5">
                  <span>Helpline: 0774144004</span>
                  <span>www.armaghansadeq.af</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 3. STANDARD A4 OFFICIAL CONSIGNMENT WAYBILL              */}
        {/* ======================================================== */}
        {printFormat === 'standard' && (
          <div ref={receiptRef} className="p-4 sm:p-5 bg-white text-slate-900 printable-receipt font-sans space-y-2.5 max-w-3xl mx-auto">
            <style>{`
              @media print {
                @page {
                  size: A4 portrait;
                  margin: 4mm 6mm;
                }
                body {
                  margin: 0 !important;
                  padding: 0 !important;
                }
                .printable-receipt {
                  page-break-inside: avoid !important;
                  break-inside: avoid !important;
                  max-height: 282mm !important;
                }
              }
            `}</style>
            
            {/* Header */}
            <div className="flex items-start justify-between border-b-2 border-slate-900 pb-2 gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-1 bg-white rounded-lg border border-amber-500/30 flex items-center justify-center shrink-0">
                  <img src="/logo.jpg" alt="Armaghan Sadeq Transfers" className="w-10 h-10 object-contain" />
                </div>
                <div>
                  <h1 className="text-lg font-black tracking-tight text-slate-900">
                    ARMAGHAN SADEQ TRANSFERS
                  </h1>
                  <p className="text-xs text-amber-700 font-bold">
                    خدمات انتقالات ارمغان صادق
                  </p>
                  <p className="text-[9.5px] text-slate-500">
                    Afghanistan Nationwide Express Transfers & Freight Logistics
                  </p>
                  <div className="text-[9px] text-slate-500 mt-0.5">
                    Helpline: 0711299680 / 0774144004 | info@armaghansadeq.af | Kabul HQ
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end text-end">
                <div className="text-[11px] font-mono font-bold text-slate-500">
                  WAYBILL / CONSIGNMENT NOTE
                </div>
                <div className="text-xl font-mono font-black text-red-600 tracking-wider">
                  {shipment.cnNumber}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Date: {new Date(shipment.bookedAt).toLocaleString()}
                </div>
              </div>
            </div>

            {/* Barcode & QR Code Section */}
            <div className="flex flex-wrap items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200 gap-4">
              <div className="flex items-center gap-6">
                <BarcodeGenerator value={shipment.cnNumber} width={1.8} height={50} />
                <div>
                  <div className="text-xs font-mono font-bold text-slate-700">
                    SERVICE: {shipment.packageInfo.serviceType.toUpperCase()}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    CATEGORY: {shipment.packageInfo.category.toUpperCase()}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    WEIGHT: {shipment.packageInfo.weightKg} KG • PIECES: {shipment.packageInfo.pieces}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-end">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    STATUS
                  </div>
                  <div className="font-black text-sm text-emerald-600 uppercase">
                    {shipment.status.replace(/_/g, ' ')}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    {shipment.financials.paymentStatus.toUpperCase()}
                  </div>
                </div>
                <QRCodeVisual value={`https://rayancargo.af/track/${shipment.cnNumber}`} size={55} />
              </div>
            </div>

            {/* Route & Sender/Receiver Table */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Sender / Origin */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-red-600 uppercase tracking-wider pb-1 border-b border-slate-200">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Sender (Origin)</span>
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">
                    {originBranch?.code || 'ORIGIN'} HUB
                  </span>
                </div>
                <div className="font-bold text-sm text-slate-900">{shipment.sender.name}</div>
                <div className="text-xs font-mono text-slate-700 flex items-center gap-1.5">
                  <span dir="ltr">{shipment.sender.phone}</span>
                </div>
                <div className="text-xs text-slate-600">
                  {shipment.sender.address}, {shipment.sender.city}, {shipment.sender.province}
                </div>
                {shipment.sender.nationalId && (
                  <div className="text-[11px] font-mono text-slate-500">
                    Tazkira / ID: {shipment.sender.nationalId}
                  </div>
                )}
                {shipment.sender.receiverTazkira && (
                  <div className="text-[11px] font-mono text-slate-500">
                    Receiver Tazkira recorded: {shipment.sender.receiverTazkira}
                  </div>
                )}
              </div>

              {/* Receiver / Destination */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-emerald-600 uppercase tracking-wider pb-1 border-b border-slate-200">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Receiver (Destination)</span>
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">
                    {destBranch?.code || 'DEST'} HUB
                  </span>
                </div>
                <div className="font-bold text-sm text-slate-900">{shipment.receiver.name}</div>
                <div className="text-xs font-mono text-slate-700 flex items-center gap-1.5">
                  <span dir="ltr">{shipment.receiver.phone}</span>
                </div>
                <div className="text-xs text-slate-600">
                  {shipment.receiver.address}, {shipment.receiver.city}, {shipment.receiver.province}
                </div>
                {(shipment.receiver.nationalId || shipment.sender.receiverTazkira) && (
                  <div className="text-[11px] font-mono font-semibold text-emerald-700">
                    Receiver Tazkira / ID: {shipment.receiver.nationalId || shipment.sender.receiverTazkira}
                  </div>
                )}
                {shipment.receiver.altPhone && (
                  <div className="text-[11px] font-mono text-slate-500">
                    Alt Tel: <span dir="ltr">{shipment.receiver.altPhone}</span>
                  </div>
                )}
              </div>

            </div>

            {/* Cargo Details & Billing Breakdown */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-2.5 text-start">{t('description') || 'Cargo Description'}</th>
                    <th className="p-2.5 text-center">{t('category_lbl') || 'Category'}</th>
                    <th className="p-2.5 text-center">{t('weight_lbl') || 'Weight'}</th>
                    <th className="p-2.5 text-center">{t('pieces_lbl') || 'Pieces'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="p-2.5 font-medium text-slate-900">
                      {shipment.packageInfo.description || 'General Cargo Shipment'}
                      {shipment.packageInfo.isFragile && (
                        <span className="ms-2 px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-100 text-rose-700">
                          FRAGILE
                        </span>
                      )}
                    </td>
                    <td className="p-2.5 text-center capitalize">{shipment.packageInfo.category}</td>
                    <td className="p-2.5 text-center font-mono font-bold">{shipment.packageInfo.weightKg} KG</td>
                    <td className="p-2.5 text-center">{shipment.packageInfo.pieces} Box(es)</td>
                  </tr>
                </tbody>
              </table>

              {/* Financial Summary */}
              <div className="bg-slate-50 p-4 border-t border-slate-200 flex flex-wrap justify-between items-center gap-4">
                {shipment.status === 'pre_booked' && (
                  <div className="w-full p-2.5 rounded-lg bg-amber-50 border border-amber-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-amber-900 mb-2">
                    <div className="text-xs">
                      <strong className="uppercase">Pre-Booking Estimate:</strong> Final dimensions and pricing certified upon origin branch drop-off.
                    </div>
                    <div className="px-2.5 py-0.5 bg-amber-200/80 rounded font-mono font-bold text-[10px] text-amber-900 whitespace-nowrap">
                      PRE-BOOKING
                    </div>
                  </div>
                )}

                <div className="text-xs text-slate-600 space-y-1">
                  <div>Payment Method: <strong className="uppercase">{shipment.financials.paymentMethod}</strong></div>
                  <div>Payment Status: <strong className="uppercase text-emerald-700">{isPaid ? 'PAID / COLLECTED' : 'COD (TO PAY AT DEST)'}</strong></div>
                  <div>Booked By Officer: <strong>{shipment.bookedByUserName || 'Terminal Agent'}</strong></div>
                </div>

                <div className="text-end space-y-1">
                  {receiptRole === 'seller' ? (
                    <>
                      <div className="text-xs text-slate-600 flex flex-wrap justify-end gap-x-3 gap-y-0.5">
                        <span>Product Price: <strong>{priceVal.toLocaleString()} AFN</strong></span>
                        <span className="text-rose-600">Service Fee (Deducted): <strong>-{sFeeVal.toLocaleString()} AFN</strong></span>
                        <span className="text-rose-600">Dest. Commission (Deducted): <strong>-{dCommVal.toLocaleString()} AFN</strong></span>
                        {discountVal > 0 && (
                          <span className="text-emerald-600">Discount: <strong>+{discountVal.toLocaleString()} AFN</strong></span>
                        )}
                      </div>
                      <div className="text-base font-black text-slate-900 pt-1">
                        Net Seller Payout (مبلغ قابل تادیه به فروشنده): <span className="text-emerald-700 font-mono text-lg font-black">{payoutVal.toLocaleString()} AFN</span>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-0.5">
                      <div className="text-base font-black text-slate-900">
                        Total Payable (مجموع قابل پرداخت): <span className="text-rose-600 font-mono text-xl font-black">{totalDueVal.toLocaleString()} AFN</span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium">
                        {isPaid ? 'Payment Confirmed / Paid at Origin' : 'Cash on Delivery (COD) to be collected upon handover'}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Official 3 Cargo Rules & Conditions in Dari (RTL) */}
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[9px] text-slate-800 leading-normal space-y-1" dir="rtl">
              <div className="font-bold text-slate-900 uppercase tracking-wider text-[9.5px] flex items-center justify-between border-b border-slate-200 pb-1">
                <span>شرایط، قوانین و مقررات بارنامه و انتقال امانات</span>
                <span className="text-[8.5px] text-slate-500 font-mono" dir="ltr">ARMAGHAN SADEQ TRANSFERS</span>
              </div>
              <div className="space-y-1 text-right font-sans">
                <div>
                  <strong className="text-slate-950 font-bold">۱. </strong> بل پس از یک ماه فاقد اعتبار بوده و صحت معلومات درج‌شده در آن بر عهده فرستنده است.
                </div>
                <div>
                  <strong className="text-slate-950 font-bold">۲. </strong> ارسال اموال غیرقانونی ممنوع بوده و مسئولیت آن به عهده فرستنده می‌باشد؛ شرکت در برابر خسارات ناشی از حوادث طبیعی، آتش‌سوزی و تصادم مسئول نیست.
                </div>
                <div>
                  <strong className="text-slate-950 font-bold">۳. </strong> اجناس مستردشده حداکثر یک ماه نگهداری می‌شود. هنگام دریافت پول، ارائه بل الزامی است و بدون بل پرداخت صورت نمی‌گیرد.
                </div>
              </div>
            </div>

            {/* Official 3 Mandatory Helpline Contacts Strip & Attribution Footer */}
            <div className="flex flex-col gap-1.5 pt-0.5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                <div className="flex items-start gap-2">
                  <div className="p-1 bg-red-100 text-red-700 rounded shrink-0 mt-0.5">
                    <Phone className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-[9px] text-slate-500 font-bold uppercase">1. Sender Branch Phone</div>
                    <div className="font-mono font-bold text-slate-900 text-xs" dir="ltr">{originBranch?.phone || 'Origin Hub'}</div>
                    <div className="text-[9px] text-slate-500">{originBranch?.name || 'Origin Hub'}</div>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <div className="p-1 bg-amber-100 text-amber-800 rounded shrink-0 mt-0.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-[9px] text-slate-500 font-bold uppercase">2. Complaints Hotline (شکایات)</div>
                    <div className="font-mono font-bold text-amber-800 text-xs" dir="ltr">0711299680</div>
                    <div className="text-[9px] text-amber-700 font-medium">Nationwide Complaint Centre</div>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <div className="p-1 bg-blue-100 text-blue-800 rounded shrink-0 mt-0.5">
                    <Building2 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-[9px] text-slate-500 font-bold uppercase">3. Main Office Contact (دفتر مرکزی)</div>
                    <div className="font-mono font-bold text-blue-900 text-xs" dir="ltr">0774144004</div>
                    <div className="text-[9px] text-blue-700 font-medium">Kabul Central HQ Office</div>
                  </div>
                </div>
              </div>

              {/* Attribution Footer Centered */}
              <div className="text-center text-[8.5px] text-slate-400 font-medium pb-0.5">
                Developed by Rayan tech solutions | Rayan-Tech-Solution.tech (سیستم توسعه یافته توسط خدمات تکنالوژی رایان)
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
