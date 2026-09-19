import React, { useRef, useState, useEffect } from 'react';
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
  Tag,
  Package,
  Languages,
  HelpCircle,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { BarcodeGenerator, QRCodeVisual } from './BarcodeGenerator';
import { 
  generateA4PdfFromElement, 
  generateThermalLabelPdf, 
  generateThermalPdfFromElement, 
  printElementUsingIframe 
} from '../utils/pdfExport';
import { usePrintQueue } from '../hooks/usePrintQueue';
import { Save } from 'lucide-react';

export const PrintReceiptModal: React.FC = () => {
  const { 
    selectedShipmentForReceipt, 
    setSelectedShipmentForReceipt, 
    branches, 
    t,
    showToast,
    receiptPrintMode,
    currentUser
  } = useApp();

  const receiptRef = useRef<HTMLDivElement>(null);
  const thermal80mmRef = useRef<HTMLDivElement>(null);
  const thermal80x80Ref = useRef<HTMLDivElement>(null);

  const getEffectivePrintMode = () => {
    const userPref = currentUser.preferences?.receiptPrintMode;
    if (userPref && userPref !== 'auto') {
      return userPref;
    }
    return receiptPrintMode;
  };

  const [printFormat, setPrintFormat] = useState<'standard' | 'thermal_80mm' | 'thermal_80x80'>(
    getEffectivePrintMode() === 'thermal' ? 'thermal_80mm' : 'standard'
  );
  const [receiptRole, setReceiptRole] = useState<'buyer' | 'seller'>('buyer');
  const [language, setLanguage] = useState<'dari' | 'en'>('dari');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [showPrinterGuide, setShowPrinterGuide] = useState(false);
  
  // Sync if setting changes
  useEffect(() => {
    setPrintFormat(getEffectivePrintMode() === 'thermal' ? 'thermal_80mm' : 'standard');
  }, [receiptPrintMode, currentUser.preferences?.receiptPrintMode, selectedShipmentForReceipt]);

  const { enqueue } = usePrintQueue();

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

  const handleAddToQueue = () => {
    enqueue({
      cnNumber: shipment.cnNumber,
      format: printFormat,
      role: receiptRole,
      shipmentId: shipment.id
    });
    showToast('✓ Added to Offline Print Queue!');
  };

  const handlePrint = () => {
    let targetRef: HTMLElement | null = null;
    let formatArg: 'standard' | 'thermal_80mm' | 'thermal_80x80' = 'standard';
    
    if (printFormat === 'standard') {
      targetRef = receiptRef.current;
      formatArg = 'standard';
    } else if (printFormat === 'thermal_80mm') {
      targetRef = thermal80mmRef.current;
      formatArg = 'thermal_80mm';
    } else {
      targetRef = thermal80x80Ref.current;
      formatArg = 'thermal_80x80';
    }

    if (!targetRef) return;
    printElementUsingIframe(targetRef, `Receipt_${shipment.cnNumber}`, formatArg);
  };

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    setDownloadSuccess(false);

    try {
      if (printFormat === 'standard') {
        if (receiptRef.current) {
          const ok = await generateA4PdfFromElement(receiptRef.current, `Receipt_${shipment.cnNumber}.pdf`);
          if (ok) {
            setDownloadSuccess(true);
            setTimeout(() => setDownloadSuccess(false), 4000);
          }
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
    } catch (error) {
      console.error('PDF Generation error:', error);
      showToast('Error generating PDF', 'error');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Translation helpers
  const l = (enText: string, dariText: string) => language === 'dari' ? dariText : enText;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-5xl flex flex-col max-h-full border border-slate-200 dark:border-slate-800">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 rounded-t-3xl shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">Print Receipt / Waybill</h2>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 font-mono tracking-wider">CN: {shipment.cnNumber}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl mr-2">
              <button 
                onClick={() => setReceiptRole('buyer')}
                className={`px-3 py-1.5 text-[10px] font-black rounded-lg transition-all ${receiptRole === 'buyer' ? 'bg-white dark:bg-slate-700 text-red-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {l('Receiver Copy', 'کاپی گیرنده')}
              </button>
              <button 
                onClick={() => setReceiptRole('seller')}
                className={`px-3 py-1.5 text-[10px] font-black rounded-lg transition-all ${receiptRole === 'seller' ? 'bg-white dark:bg-slate-700 text-red-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {l('Sender Copy', 'کاپی فرستنده')}
              </button>
            </div>
            <button 
              onClick={() => setShowPrinterGuide(!showPrinterGuide)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                showPrinterGuide 
                  ? 'bg-amber-500 text-white shadow-md' 
                  : 'bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/40 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300'
              }`}
              title="Printer Setup Guide (MY-P80 / 80mm)"
            >
              <HelpCircle className="w-4 h-4" />
              <span>{language === 'dari' ? 'راهنمای چاپ ۸۰' : '80mm Guide'}</span>
            </button>
            <button 
              onClick={() => setLanguage(lang => lang === 'dari' ? 'en' : 'dari')}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-colors"
            >
              <Languages className="w-4 h-4" />
              <span>{language === 'dari' ? 'EN' : 'دری'}</span>
            </button>
            <button onClick={handleAddToQueue} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors" title="Add to Offline Queue">
              <Save className="w-5 h-5" />
            </button>
            <button onClick={() => setSelectedShipmentForReceipt(null)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 1. THERMAL POS RECEIPT FORMAT (80MM CONTINUOUS ROLL)     */}
        {/* ======================================================== */}
        {printFormat === 'thermal_80mm' && (
          <div className="p-4 bg-slate-200 dark:bg-slate-900 overflow-y-auto max-h-[78vh] flex flex-col items-center flex-1">
            {/* 80mm Printer Setup Help Panel */}
            {showPrinterGuide && (
              <div className="w-full max-w-md bg-amber-50 dark:bg-amber-950/60 border-2 border-amber-400 rounded-2xl p-4 mb-4 text-xs shadow-lg animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center justify-between font-black text-amber-900 dark:text-amber-200 text-sm border-b border-amber-300 pb-2 mb-2">
                  <div className="flex items-center gap-2">
                    <Printer className="w-4 h-4 text-amber-700" />
                    <span>{language === 'dari' ? 'تنظیمات پرینتر حرارتی ۸۰ میلی‌متر (MY-P80 / POS-80)' : 'Thermal Printer 80mm Setup (MY-P80)'}</span>
                  </div>
                  <button onClick={() => setShowPrinterGuide(false)} className="text-amber-700 hover:text-amber-950 font-bold p-1">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-2 text-neutral-800 dark:text-neutral-200">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">{language === 'dari' ? '۱. انتخاب پرینتر:' : '1. Destination:'}</span>{' '}
                      {language === 'dari' ? 'نام پرینتر خود (مثل MY-P80 یا POS-80) را انتخاب کنید.' : 'Select your thermal printer (MY-P80 / POS-80).'}
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">{language === 'dari' ? '۲. اندازه کاغذ (Paper Size):' : '2. Paper Size:'}</span>{' '}
                      <span className="bg-amber-200 dark:bg-amber-900 px-1 py-0.5 rounded font-mono font-bold">80 x 297 mm</span> {language === 'dari' ? 'یا Roll Paper 80mm انتخاب شود (روی A4 نباشد).' : 'or 80mm Roll (do not use A4).'}
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">{language === 'dari' ? '۳. حاشیه‌ها (Margins):' : '3. Margins:'}</span>{' '}
                      <span className="bg-amber-200 dark:bg-amber-900 px-1 py-0.5 rounded font-mono font-bold">None (هیچ)</span> {language === 'dari' ? 'تا متن از دو طرف بریده نشود.' : 'to prevent clipping.'}
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">{language === 'dari' ? '۴. گرافیک پس‌زمینه (Background Graphics):' : '4. Background Graphics:'}</span>{' '}
                      {language === 'dari' ? 'تیک آن را روشن (فعال) کنید تا خطوط و کادرها با وضوح چاپ شوند.' : 'Turn ON to ensure crisp borders.'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
              <span className="w-8 h-px bg-slate-300"></span>
              {language === 'dari' ? 'پیش‌نمایش چاپ رول حرارتی (۷۲mm / ۸۰mm)' : 'Print Preview (80mm Roll)'}
              <span className="w-8 h-px bg-slate-300"></span>
            </div>
            
            <div 
              ref={thermal80mmRef} 
              className="thermal-receipt-container bg-white text-black font-sans text-xs leading-normal space-y-1 mx-auto shadow-xl select-text print:shadow-none print:border-none p-1"
              style={{ 
                width: '72mm', 
                maxWidth: '72mm',
                minWidth: '72mm',
                padding: '4mm 3mm',
                boxSizing: 'border-box'
              }}
              dir={language === 'dari' ? 'rtl' : 'ltr'}
            >
              {/* Tight Header */}
              <div className="text-center bg-[#0f172a] text-white p-2 mb-1.5">
                <h2 className="text-[13px] font-black leading-none uppercase tracking-tighter">{l('ARMAGHAN SADEQ TRANSFERS', 'انتقالات ارمغان صادق')}</h2>
                <p className="text-[7.5px] font-bold mt-1 uppercase tracking-widest">{l('CENTRAL LOGISTICS HUB KABUL • OFFICIAL POS SLIP', 'مرکز لوجستیکی کابل • فیش رسمی')}</p>
              </div>

              {/* CN Number Box */}
              <div className="border border-black p-1.5 mb-1.5">
                <div className="text-[8.5px] font-bold text-slate-500 uppercase">{l('CONSIGNMENT NOTE (CN #)', 'نمبر بارنامه (CN)')}</div>
                <div className="text-[18px] font-black font-mono leading-none mt-1">{shipment.cnNumber}</div>
                <div className="text-[8px] font-bold mt-1 text-center border-t border-black/10 pt-1 tracking-[0.2em]">*{shipment.cnNumber}*</div>
              </div>

              {/* Compact Route Info */}
              <div className="text-center bg-black text-white font-black py-1 text-[11px] mb-1.5 uppercase tracking-wider" dir="ltr">
                {originBranch?.city?.toUpperCase() || 'KABUL'} ➔ {destBranch?.city?.toUpperCase() || 'DESTINATION'}
              </div>

              {/* Sender & Receiver Side-by-Side Table */}
              <div className="grid grid-cols-2 gap-1 mb-1.5">
                <div className="border border-black p-1.5 flex flex-col justify-between min-h-[45px]">
                  <div className="text-[8.5px] font-bold border-b border-black/10 pb-0.5 mb-1 text-slate-500 uppercase">{l('FROM (SENDER):', 'فرستنده:')}</div>
                  <div className="font-black text-[11px] leading-tight break-words">{shipment.sender.name}</div>
                  <div className="text-[9px] font-medium mt-0.5">{l('Tel:', 'تلفن:')} <span className="font-mono">{shipment.sender.phone}</span></div>
                  <div className="text-[8px] text-slate-600 mt-0.5">{l('Origin:', 'مبدأ:')} {originBranch?.city} ({originBranch?.name})</div>
                </div>
                <div className="border border-black p-1.5 flex flex-col justify-between min-h-[45px]">
                  <div className="text-[8.5px] font-bold border-b border-black/10 pb-0.5 mb-1 text-slate-500 uppercase">{l('TO (CONSIGNEE):', 'گیرنده:')}</div>
                  <div className="font-black text-[11px] leading-tight break-words">{shipment.receiver.name}</div>
                  <div className="text-[9px] font-medium mt-0.5">{l('Tel:', 'تلفن:')} <span className="font-mono">{shipment.receiver.phone}</span></div>
                  <div className="text-[8px] text-slate-600 mt-0.5">{l('Dest:', 'مقصد:')} {destBranch?.city} ({destBranch?.name})</div>
                </div>
              </div>

              {/* Package Specs */}
              <div className="grid grid-cols-2 gap-x-2 gap-y-1 border border-black p-1.5 mb-1.5 font-bold text-[9.5px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">{l('Weight:', 'وزن:')}</span>
                  <span>{shipment.packageInfo.weightKg} KG</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{l('Pieces:', 'تعداد:')}</span>
                  <span>{shipment.packageInfo.pieces} PKG</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{l('Category:', 'نوعیت:')}</span>
                  <span className="truncate">{shipment.packageInfo.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{l('Service:', 'خدمات:')}</span>
                  <span>{shipment.packageInfo.serviceType.toUpperCase()}</span>
                </div>
              </div>

              {/* Financial Box */}
              <div className="border border-black p-2 mb-2 bg-slate-50">
                {receiptRole === 'buyer' ? (
                  <>
                    <div className="text-[9px] font-black text-slate-900 uppercase">{l('TOTAL PAYABLE (COD / RECEIVER COPY)', 'مجموع قابل تادیه (کاپی گیرنده)')}</div>
                    <div className="text-[18px] font-black mt-0.5">{totalDueVal.toLocaleString()} AFN</div>
                    <div className="text-[8.5px] font-bold text-red-600 uppercase mt-1">
                      {isPaid ? l('PAID / DELIVERED', 'تحویل داده شد') : l('COD (TO PAY AT DESTINATION)', 'پرداخت در مقصد (COD)')}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-[9px] font-black text-slate-900 uppercase">{l('SELLER PAYOUT (AFTER DEDUCTIONS)', 'پرداختی فروشنده (بعد از وضع مصارف)')}</div>
                    <div className="text-[18px] font-black text-emerald-600 mt-0.5">{payoutVal.toLocaleString()} AFN</div>
                    <div className="text-[8.5px] font-bold text-slate-500 mt-1">
                      {l(`Item: ${priceVal} | Fee: ${sFeeVal} | Comm: ${dCommVal}`, `قیمت: ${priceVal} | محصول: ${sFeeVal} | کمیشن: ${dCommVal}`)}
                    </div>
                  </>
                )}
              </div>

              {/* Footer with Contacts */}
              <div className="text-center pt-1 border-t border-dotted border-black/30 space-y-1">
                <div className="text-[8.5px] font-black leading-tight">
                  {l('Helplines: +93 79 900 1122 | Complaints: 0711299680', 'شماره تماس: ۰۷۹۹۰۰۱۱۲۲ | شکایات: ۰۷۱۱۲۹۹۶۸۰')}
                </div>
                <div className="text-[8.5px] font-black leading-tight">
                  {l('Main Kabul: 0774144004 | Track: www.armaghansadeq.af', 'مرکز کابل: ۰۷۷۴۱۴۴۰۰۴ | رهگیری: www.armaghansadeq.af')}
                </div>
                <div className="text-[7.5px] text-slate-500 mt-1">
                  Printed: {new Date().toLocaleDateString()} | Rayan Tech Solutions
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ======================================================== */}
        {/* 2. THERMAL LABEL FORMAT (80x80 SQUARE STICKER)           */}
        {/* ======================================================== */}
        {printFormat === 'thermal_80x80' && (
          <div className="p-4 bg-slate-200 overflow-y-auto max-h-[78vh] flex flex-col items-center flex-1">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
              <span className="w-8 h-px bg-slate-300"></span>
              Print Preview (80x80 Label)
              <span className="w-8 h-px bg-slate-300"></span>
            </div>
            
            <div 
              ref={thermal80x80Ref} 
              className="thermal-label-container bg-white text-black font-sans text-xs mx-auto shadow-xl select-text overflow-hidden relative print:shadow-none print:border-none"
              style={{ 
                width: '80mm', 
                height: '80mm',
                maxWidth: '80mm',
                maxHeight: '80mm',
                padding: '6px 7px',
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
              dir={language === 'dari' ? 'rtl' : 'ltr'}
            >
              {/* Header: Company & Consignment No */}
              <div className="flex justify-between items-start border-b-2 border-black pb-1">
                <div>
                  <div className="text-[11.5px] font-black tracking-tight leading-none uppercase" dir="ltr">ARMAGHAN SADEQ</div>
                  <div className="text-[8.5px] font-bold text-neutral-700 leading-tight mt-0.5 tracking-tighter uppercase">{l('EXPRESS TRANSFERS', 'انتقالات ارمغان صادق')}</div>
                </div>
                <div className="text-right">
                  <div className="text-[12px] font-black font-mono leading-none">{shipment.cnNumber}</div>
                  <div className="text-[8px] font-bold text-neutral-600 mt-0.5" dir="ltr">{new Date(shipment.bookedAt).toLocaleDateString('en-GB')}</div>
                </div>
              </div>
              
              {/* Route Banner */}
              <div className="text-center bg-black text-white font-black py-1 text-[11px] uppercase tracking-wide rounded-xs my-1" dir="ltr">
                {(originBranch?.city || shipment.sender.city || 'KABUL').toUpperCase()} ➔ {(destBranch?.city || shipment.receiver.city || 'DESTINATION').toUpperCase()}
              </div>
              
              {/* Parties Box Side-by-Side */}
              <div className="grid grid-cols-2 gap-1.5 my-1">
                {/* Sender */}
                <div className="border border-black p-1.5 rounded-xs bg-neutral-50/50 min-h-[42px] flex flex-col justify-between">
                  <div className="text-[7.5px] font-black text-neutral-500 uppercase border-b border-neutral-200 pb-0.5 mb-1">{l('FROM', 'فرستنده')}</div>
                  <div className="font-black text-[10.5px] leading-tight truncate">{shipment.sender.name}</div>
                  <div className="font-mono font-bold text-[8.5px]" dir="ltr">{shipment.sender.phone}</div>
                </div>
                {/* Receiver */}
                <div className="border-2 border-black p-1.5 rounded-xs bg-neutral-50 min-h-[42px] flex flex-col justify-between">
                  <div className="text-[7.5px] font-black text-black uppercase border-b border-neutral-300 pb-0.5 mb-1">{l('TO', 'گیرنده')}</div>
                  <div className="font-black text-[10.5px] leading-tight truncate">{shipment.receiver.name}</div>
                  <div className="font-mono font-black text-[8.5px]" dir="ltr">{shipment.receiver.phone}</div>
                </div>
              </div>

              {/* Cargo Specs & Payment Status Strip */}
              <div className="flex items-center justify-between border border-black px-2 py-1.5 text-[9px] bg-neutral-100 font-bold">
                <div>
                  <span>{shipment.packageInfo.pieces} PKG</span>
                  <span className="mx-1.5">•</span>
                  <span>{shipment.packageInfo.weightKg} KG</span>
                </div>
                <div className="text-right uppercase font-black text-[9.5px]">
                  {receiptRole === 'buyer' ? (
                    isPaid ? <span className="text-black">{l('PAID', 'تحویل')}</span> : <span className="text-black">COD: {totalDueVal.toLocaleString()}</span>
                  ) : (
                    <span className="text-emerald-600">PAYOUT: {payoutVal.toLocaleString()}</span>
                  )}
                </div>
              </div>
              
              {/* Footer: Contacts & Conditions */}
              <div className="pt-1 border-t border-black mt-1 space-y-0.5 text-center">
                <div className="text-[7.5px] font-black leading-tight">
                  {l('Helplines: +93 79 900 1122 | complaints: 0711299680', 'تماس: ۰۷۹۹۰۰۱۱۲۲ | شکایات: ۰۷۱۱۲۹۹۶۸۰')}
                </div>
                <div className="text-[7px] italic text-neutral-600 leading-tight">
                  {l('Receipt valid 30 days. www.armaghansadeq.af', 'بل تا ۳۰ روز معتبر است. www.armaghansadeq.af')}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 3. STANDARD A4 PRINT FORMAT (FULL RECEIPT/WAYBILL)       */}
        {/* ======================================================== */}
        {printFormat === 'standard' && (
          <div className="p-4 bg-slate-200 overflow-y-auto max-h-[78vh] flex flex-col items-center flex-1">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="w-12 h-px bg-slate-300"></span>
              Print Preview (A4)
              <span className="w-12 h-px bg-slate-300"></span>
            </div>
            
            <div 
              ref={receiptRef} 
              className="bg-white text-slate-900 border border-slate-200 shadow-xl overflow-hidden print:shadow-none print:border-0 relative font-sans select-text printable-receipt"
              style={{ width: '794px', minHeight: '1020px', maxHeight: '1120px', padding: '28px 36px', boxSizing: 'border-box' }}
              dir={language === 'dari' ? 'rtl' : 'ltr'}
            >
              {/* Decorative Header Banner */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-600 to-red-800"></div>

              {/* Header */}
              <div className="flex justify-between items-start border-b-2 border-red-800 pb-4 mb-4 pt-1">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-3 text-red-700">
                    <Building2 className="w-9 h-9 shrink-0" />
                    <div>
                      <h1 className="text-2xl font-black tracking-tight">{l('Armaghan Sadeq Transfers', 'انتقالات ارمغان صادق')}</h1>
                      <div className="text-xs font-bold tracking-widest text-red-600/80 uppercase" dir="ltr">Armaghan Sadeq Transfers</div>
                    </div>
                  </div>
                  <div className="text-xs font-medium text-slate-600 mt-1 max-w-xs">
                    {l('Fast, secure and professional logistics services across Afghanistan.', 'خدمات باربری و انتقالات سریع، مطمئن و مسلکی در سراسر افغانستان.')}
                  </div>
                </div>

                <div className="text-left flex flex-col items-end">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">{l('Consignment Number (CN)', 'نمبر بارنامه (CN)')}</div>
                  <div className="text-3xl font-black font-mono tracking-tighter text-slate-900 bg-slate-100 px-3 py-0.5 rounded-lg border border-slate-200">
                    {shipment.cnNumber}
                  </div>
                  <div className="mt-2">
                    <BarcodeGenerator value={shipment.cnNumber} width={1.4} height={34} />
                  </div>
                </div>
              </div>

              {/* Meta Info Bar */}
              <div className="grid grid-cols-3 gap-3 bg-slate-50 border border-slate-200 p-2.5 rounded-xl mb-4 text-xs">
                <div>
                  <div className="text-slate-500 text-[10px] mb-0.5">{l('Registration Date', 'تاریخ ثبت')}</div>
                  <div className="font-bold">{new Date(shipment.bookedAt).toLocaleString(language === 'dari' ? 'fa-AF' : 'en-US', { dateStyle: 'long', timeStyle: 'short' })}</div>
                </div>
                <div>
                  <div className="text-slate-500 text-[10px] mb-0.5">{l('Service Type', 'نوعیت خدمات')}</div>
                  <div className="font-black uppercase text-red-700">{shipment.packageInfo.serviceType.replace('_', ' ')}</div>
                </div>
                <div>
                  <div className="text-slate-500 text-[10px] mb-0.5">{l('Payment Status', 'وضعیت پرداخت')}</div>
                  <div className="font-bold uppercase flex items-center gap-1.5">
                    {isPaid ? (
                      <span className="text-emerald-600 flex items-center gap-1"><FileCheck className="w-3.5 h-3.5"/> PAID {l('', '(تحویل داده شد)')}</span>
                    ) : (
                      <span className="text-orange-600 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5"/> COD {l('', '(پرداخت در مقصد)')}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Sender & Receiver Boxes (Two-Column Layout) */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="border border-slate-200 rounded-xl p-3.5 relative overflow-hidden bg-slate-50/50">
                  <div className="flex items-center gap-2 text-blue-800 font-black mb-2.5 text-xs">
                    <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-[11px]">1</div>
                    {l('Sender Details', 'مشخصات فرستنده (Sender)')}
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between border-b border-slate-200/60 pb-1.5">
                      <span className="text-slate-500">{l('Name:', 'اسم:')}</span>
                      <span className="font-bold text-slate-900">{shipment.sender.name}</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-slate-200/60 pb-1.5">
                      <span className="text-slate-500">{l('Phone:', 'شماره تماس:')}</span>
                      <span className="font-bold font-mono" dir="ltr">{shipment.sender.phone}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">{l('City/Branch:', 'ولایت / شهر:')}</span>
                      <span className="font-bold flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {shipment.sender.city} ({originBranch?.name})
                      </span>
                    </div>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl p-3.5 relative overflow-hidden bg-slate-50/50">
                  <div className="flex items-center gap-2 text-emerald-800 font-black mb-2.5 text-xs">
                    <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-[11px]">2</div>
                    {l('Receiver Details', 'مشخصات گیرنده (Receiver)')}
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between border-b border-slate-200/60 pb-1.5">
                      <span className="text-slate-500">{l('Name:', 'اسم:')}</span>
                      <span className="font-bold text-slate-900">{shipment.receiver.name}</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-slate-200/60 pb-1.5">
                      <span className="text-slate-500">{l('Phone:', 'شماره تماس:')}</span>
                      <span className="font-bold font-mono" dir="ltr">{shipment.receiver.phone}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">{l('Dest/City:', 'مقصد / شهر:')}</span>
                      <span className="font-bold flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {shipment.receiver.city} ({destBranch?.name})
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Cargo Details Grid */}
              <div className="mb-4 border border-slate-900 rounded-xl overflow-hidden">
                <div className="bg-slate-900 text-white px-4 py-2 font-bold text-xs flex items-center gap-2">
                  <Package className="w-3.5 h-3.5 text-red-400" />
                  {l('Cargo Details', 'مشخصات محموله (Cargo Details)')}
                </div>
                <div className="p-3.5">
                  <div className="grid grid-cols-4 gap-3">
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <div className="text-[10px] text-slate-500 mb-0.5">{l('Category', 'دسته بندی')}</div>
                      <div className="font-bold text-xs">{shipment.packageInfo.category}</div>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <div className="text-[10px] text-slate-500 mb-0.5">{l('Total Pieces', 'تعداد پارسل')}</div>
                      <div className="font-black text-sm">{shipment.packageInfo.pieces} <span className="text-[10px] font-normal text-slate-400">PCS</span></div>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <div className="text-[10px] text-slate-500 mb-0.5">{l('Total Weight', 'وزن مجموعی')}</div>
                      <div className="font-black text-sm">{shipment.packageInfo.weightKg} <span className="text-[10px] font-normal text-slate-400">KG</span></div>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <div className="text-[10px] text-slate-500 mb-0.5">{l('Contents', 'محتویات')}</div>
                      <div className="font-bold break-words whitespace-pre-wrap text-xs leading-tight">{shipment.packageInfo.description || l('Unspecified', 'نامشخص')}</div>
                    </div>
                  </div>
                  
                  {shipment.packageInfo.isFragile && (
                    <div className="bg-red-50 text-red-700 p-2 rounded-lg border border-red-100 flex items-center gap-1.5 font-bold text-xs mt-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {l('Fragile cargo. Please handle with care.', 'این محموله شکستنی است. لطفاً با احتیاط کامل انتقال داده شود.')}
                    </div>
                  )}
                </div>
              </div>

              {/* Financials on one side & Rules/Conditions + QR on the other side (NO SIGNATURES - 1-PAGE GUARANTEED) */}
              <div className="grid grid-cols-2 gap-4 mb-3">
                {/* Financial Summary */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col justify-between">
                  <div>
                    <div className="font-black text-xs border-b border-slate-200 pb-2 mb-2">{l('Financials', 'تفصیلات مالی (Financials)')}</div>
                    
                    {receiptRole === 'seller' ? (
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-500">{l('Item Value:', 'قیمت فروش جنس:')}</span>
                          <span className="font-bold">{priceVal.toLocaleString()} AFN</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">{l('Freight Fee:', 'فیس خدمات (کرایه):')}</span>
                          <span className="font-bold text-red-600">-{sFeeVal.toLocaleString()} AFN</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">{l('Destination Comm:', 'کمیسیون مقصد:')}</span>
                          <span className="font-bold text-red-600">-{dCommVal.toLocaleString()} AFN</span>
                        </div>
                        {discountVal > 0 && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">{l('Discount:', 'تخفیف:')}</span>
                            <span className="font-bold text-emerald-600">+{discountVal.toLocaleString()} AFN</span>
                          </div>
                        )}
                        <div className="pt-2 mt-2 border-t border-slate-200">
                          <div className="flex justify-between items-center">
                            <span className="font-black text-slate-800 text-xs">{l('Payable to Seller:', 'قابل پرداخت به فروشنده:')}</span>
                            <span className="text-lg font-black font-mono text-emerald-700">{payoutVal.toLocaleString()} AFN</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col justify-between space-y-2">
                        <div className="text-slate-500 text-[11px] leading-tight">
                          {l('You are viewing the receiver copy. Commission deductions are hidden.', 'شما در حال مشاهده رسید گیرنده هستید. کسر کمیسیون‌ها در این رسید نمایش داده نمی‌شود.')}
                        </div>
                        <div className="bg-slate-900 rounded-lg p-2.5 text-center mt-1">
                          <div className="text-slate-400 font-bold text-[10px] uppercase mb-0.5">{l('Total Payable', 'مجموع قابل پرداخت (Total Payable)')}</div>
                          <div className="text-2xl font-black font-mono text-white">{totalDueVal.toLocaleString()} AFN</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Rules & Conditions & QR Code (Shifted directly onto the First Page) */}
                <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/70 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <div className="font-bold text-slate-800 text-xs flex items-center justify-between border-b border-slate-200 pb-1.5">
                      <span>{l('Terms & Conditions:', 'شرایط و مقررات:')}</span>
                      <span className="text-[10px] text-red-600 font-mono font-bold">ARMAGHAN SADEQ</span>
                    </div>
                    <div className="text-[10px] text-slate-600 space-y-1 leading-relaxed">
                      <p>{l('1. Receipt is valid for 1 month. Shipper is responsible for cargo accuracy.', '۱. بل پس از یک ماه فاقد اعتبار بوده و صحت معلومات بر عهده فرستنده است.')}</p>
                      <p>{l('2. Illegal items strictly prohibited; company not liable for force majeure.', '۲. ارسال اموال غیرقانونی ممنوع است؛ شرکت در برابر حوادث طبیعی مسئول نمی‌باشد.')}</p>
                      <p>{l('3. Original receipt mandatory for collecting payment.', '۳. هنگام دریافت پول، ارائه بل اصلی الزامی است.')}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200 mt-2">
                    <div className="text-[9px] text-slate-500 font-medium">
                      <p>{l('Kabul HQ: 0774144004 | Support: 0711299680', 'مرکز کابل: 0774144004 | شکایات: 0711299680')}</p>
                      <p className="font-mono text-slate-400 text-[8px]">www.armaghansadeq.af</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="text-[8px] font-bold text-slate-400 text-end">
                        SCAN<br/>TRACK
                      </div>
                      <QRCodeVisual value={`https://armaghansadeq.af/track/${shipment.cnNumber}`} size={42} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Subtle Footer / Watermark */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[9px] text-slate-400">
                <span>{l('Armaghan Sadeq Transfers Cargo Network', 'شبکه ترانسپورتی و انتقالات ارمغان صادق')}</span>
                <span>{shipment.cnNumber} • {new Date(shipment.bookedAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        )}

        {/* Controls and Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 rounded-b-3xl shrink-0">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            
            {/* Controls: Role and Thermal Format Switcher */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Receiver vs Seller Copy Switcher */}
              <div className="flex items-center bg-slate-200/90 dark:bg-slate-800 rounded-xl p-0.5 text-xs font-bold">
                <button
                  onClick={() => setReceiptRole('buyer')}
                  className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all cursor-pointer ${
                    receiptRole === 'buyer' ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-400 shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="Receiver Copy (Without internal commission/discount)"
                >
                  <span>{l('Receiver Copy', 'رسید گیرنده')}</span>
                </button>
                <button
                  onClick={() => setReceiptRole('seller')}
                  className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all cursor-pointer ${
                    receiptRole === 'seller' ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-400 shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="Seller Copy (With commission, fee deductions, and net payout)"
                >
                  <span>{l('Seller Copy', 'رسید فروشنده')}</span>
                </button>
              </div>
              
              {/* Format Selector: 80mm Roll vs 80x80 Square vs A4 */}
              <div className="flex items-center bg-slate-200/90 dark:bg-slate-800 rounded-xl p-0.5 text-xs font-bold">
                <button
                  onClick={() => setPrintFormat('thermal_80mm')}
                  className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all cursor-pointer ${
                    printFormat === 'thermal_80mm' ? 'bg-white dark:bg-slate-700 text-red-600 dark:text-red-400 shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="80mm Thermal POS Roll (Standard for MG-820 thermal printer)"
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>{l('80mm Roll', '80mm Roll')}</span>
                </button>
                <button
                  onClick={() => setPrintFormat('thermal_80x80')}
                  className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all cursor-pointer ${
                    printFormat === 'thermal_80x80' ? 'bg-white dark:bg-slate-700 text-red-600 dark:text-red-400 shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="80mm x 80mm Square Label (Square sticker format)"
                >
                  <Tag className="w-3.5 h-3.5" />
                  <span>{l('80/80 Label', '80/80 Label')}</span>
                </button>
                <button
                  onClick={() => setPrintFormat('standard')}
                  className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all cursor-pointer ${
                    printFormat === 'standard' ? 'bg-white dark:bg-slate-700 text-red-600 dark:text-red-400 shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="Standard A4 Document"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>{l('A4', 'A4')}</span>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Download PDF button */}
              <button
                onClick={handleDownloadPdf}
                disabled={isGeneratingPdf}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isGeneratingPdf ? (
                  <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
                ) : downloadSuccess ? (
                  <FileCheck className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">
                  {isGeneratingPdf ? l('Generating...', 'در حال ساخت...') : downloadSuccess ? l('Downloaded!', 'دانلود شد!') : l('Download PDF', 'دانلود PDF')}
                </span>
              </button>

              {/* Print button */}
              <button
                onClick={handlePrint}
                disabled={isGeneratingPdf}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Printer className="w-5 h-5" />
                <span>{l('Print', 'Print (چاپ)')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
