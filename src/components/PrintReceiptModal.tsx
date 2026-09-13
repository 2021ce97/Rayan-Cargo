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
  Languages
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
    printElementUsingIframe(targetRef, formatArg, shipment.cnNumber);
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
          <div className="p-4 bg-slate-200 overflow-y-auto max-h-[78vh] flex flex-col items-center flex-1">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
              <span className="w-8 h-px bg-slate-300"></span>
              Print Preview (80mm)
              <span className="w-8 h-px bg-slate-300"></span>
            </div>
            
            <div 
              ref={thermal80mmRef} 
              className="thermal-receipt-container bg-white text-black font-sans text-sm leading-tight space-y-2.5 mx-auto shadow-xl select-text print:shadow-none print:border-none"
              style={{ 
                width: '80mm', 
                maxWidth: '80mm',
                padding: '12px 10px',
                boxSizing: 'border-box'
              }}
              dir={language === 'dari' ? 'rtl' : 'ltr'}
            >
              {/* Header */}
              <div className="text-center space-y-1 pb-1.5 border-b-2 border-black">
                <div className="text-[14px] font-black tracking-tight uppercase text-black" dir="ltr">ARMAGHAN SADEQ TRANSFERS</div>
                <div className="text-[13px] font-bold text-black">{l('Armaghan Sadeq Transfer Services', 'خدمات انتقالات ارمغان صادق')}</div>
                <div className="text-[11px] font-semibold text-neutral-800" dir="ltr">Central Hub Kabul</div>
                <div className="text-[11px] font-black pt-1 border-t border-dashed border-black tracking-wider uppercase">
                  {l('*** OFFICIAL RECEIPT ***', '*** رسید رسمی محموله ***')}
                </div>
              </div>

              {/* CN & Date */}
              <div className="space-y-0.5 text-sm pb-1.5 border-b border-black">
                <div className="flex justify-between items-baseline font-bold">
                  <span className="text-[12px] text-neutral-800">{l('Consignment No:', 'نمبر بارنامه (CN):')}</span>
                  <span className="text-[16px] font-black font-mono tracking-wider text-black">{shipment.cnNumber}</span>
                </div>
                <div className="flex justify-between text-[12px] text-neutral-900">
                  <span className="font-semibold">{l('Date:', 'تاریخ:')}</span>
                  <span dir="ltr">{new Date(shipment.bookedAt).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}</span>
                </div>
                <div className="flex justify-between text-[12px] text-neutral-900">
                  <span className="font-semibold">{l('Type:', 'نوعیت:')}</span>
                  <span className="uppercase font-black">{shipment.packageInfo.serviceType.replace('_', ' ')}</span>
                </div>
              </div>

              {/* Route */}
              <div className="space-y-1.5 py-1 border-b border-black">
                <div className="font-black text-[13px] uppercase text-center bg-black text-white py-1 px-2 rounded-xs tracking-wide" dir="ltr">
                  {originBranch?.city?.toUpperCase() || 'ORIGIN'} ➔ {destBranch?.city?.toUpperCase() || 'DESTINATION'}
                </div>
                <div className="text-[12px] space-y-0.5 text-black">
                  <div><span className="font-black">{l('Sender:', 'فرستنده:')}</span> <span className="font-bold">{shipment.sender.name}</span></div>
                  <div><span className="font-black">{l('Phone:', 'تماس:')}</span> <span className="font-mono font-bold" dir="ltr">{shipment.sender.phone}</span></div>
                  <div><span className="font-semibold">{l('City:', 'شهر:')}</span> {shipment.sender.city} ({originBranch?.name || 'Main'})</div>
                </div>
                <div className="text-[12px] space-y-0.5 pt-1 border-t border-dashed border-neutral-300 text-black">
                  <div><span className="font-black">{l('Receiver:', 'گیرنده:')}</span> <span className="font-bold">{shipment.receiver.name}</span></div>
                  <div><span className="font-black">{l('Phone:', 'تماس:')}</span> <span className="font-mono font-bold" dir="ltr">{shipment.receiver.phone}</span></div>
                  {(shipment.receiver.nationalId || shipment.sender.receiverTazkira) && (
                    <div><span className="font-black">{l('ID:', 'تذکره:')}</span> <span className="font-bold">{shipment.receiver.nationalId || shipment.sender.receiverTazkira}</span></div>
                  )}
                  <div><span className="font-semibold">{l('Dest:', 'مقصد:')}</span> {shipment.receiver.city} ({destBranch?.name || 'Destination'})</div>
                </div>
              </div>

              {/* Cargo Specs */}
              <div className="space-y-0.5 py-1 border-b border-black text-[12px] text-black">
                <div className="flex justify-between">
                  <span className="font-semibold">{l('Category:', 'دسته بندی:')}</span>
                  <span className="font-black">{shipment.packageInfo.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold">{l('Weight:', 'وزن:')}</span>
                  <span className="font-black">{shipment.packageInfo.weightKg} KG</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold">{l('Pieces:', 'تعداد:')}</span>
                  <span className="font-black">{shipment.packageInfo.pieces} PKG(S)</span>
                </div>
                {shipment.packageInfo.isFragile && (
                  <div className="text-center font-black text-[11px] border border-black py-0.5 mt-1 bg-neutral-100">
                    {l('* FRAGILE - HANDLE WITH CARE *', '* جنس شکستنی - با احتیاط انتقال یابد *')}
                  </div>
                )}
              </div>

              {/* Charges Breakdown */}
              <div className="space-y-1.5 py-1 border-b border-black text-[12px]">
                {shipment.status === 'pre_booked' && (
                  <div className="text-center py-1 bg-neutral-100 border border-black text-black mb-1">
                    <div className="font-black text-[11px] uppercase">{l('* PRE-BOOKING ESTIMATE *', '* تخمین پیش‌ثبت‌نام *')}</div>
                    <div className="text-[10px]">{l('Final weight and price confirmed at drop-off.', 'وزن و قیمت نهایی پس از تحویل در نمایندگی تایید می‌گردد.')}</div>
                  </div>
                )}
                {receiptRole === 'seller' ? (
                  <div className="space-y-1 text-black">
                    <div className="flex justify-between">
                      <span className="font-semibold">{l('Item Value:', 'قیمت فروش جنس:')}</span>
                      <span className="font-bold">{priceVal.toLocaleString()} AFN</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold">{l('Service Fee:', 'فیس خدمات (کسر شده):')}</span>
                      <span className="font-bold">-{sFeeVal.toLocaleString()} AFN</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold">{l('Dest Comm:', 'کمیسیون مقصد:')}</span>
                      <span className="font-bold">-{dCommVal.toLocaleString()} AFN</span>
                    </div>
                    {discountVal > 0 && (
                      <div className="flex justify-between">
                        <span className="font-semibold">{l('Discount:', 'تخفیف:')}</span>
                        <span className="font-bold">+{discountVal.toLocaleString()} AFN</span>
                      </div>
                    )}
                    <div className="p-1.5 bg-neutral-100 border-2 border-black mt-1 text-center">
                      <div className="text-[11px] font-bold uppercase text-neutral-800" dir="ltr">NET PAYOUT TO SELLER</div>
                      <div className="text-[17px] font-black font-mono text-black">{payoutVal.toLocaleString()} AFN</div>
                    </div>
                  </div>
                ) : (
                  <div className="p-1.5 bg-neutral-100 border-2 border-black text-center space-y-0.5">
                    <div className="text-[11px] font-black uppercase text-black">{l('TOTAL PAYABLE', 'TOTAL PAYABLE (مجموع قابل پرداخت)')}</div>
                    <div className="text-[19px] font-black font-mono text-black">{totalDueVal.toLocaleString()} AFN</div>
                  </div>
                )}
                <div className="flex justify-between font-black text-[12px] pt-1 border-t border-dashed border-neutral-300">
                  <span>{l('Payment Status:', 'وضعیت پرداخت:')}</span>
                  <span className="uppercase" dir="ltr">
                    {isPaid ? 'PAID' : 'COD (COLLECT AT DEST)'}
                  </span>
                </div>
              </div>

              {/* Rules & Footer */}
              <div className="border-b border-black py-1.5 text-[10px] leading-snug space-y-1 text-black">
                <div className="font-black text-center uppercase tracking-wider text-[10.5px] bg-neutral-100 py-0.5 border-y border-black mb-1">
                  {l('Terms & Conditions', 'شرایط، قوانین و مقررات بارنامه')}
                </div>
                <div className="space-y-1 font-sans pr-1">
                  <div><span className="font-black">1. </span> {l('Receipt valid for 30 days. Sender is responsible for correct info.', 'بل پس از یک ماه فاقد اعتبار بوده و صحت معلومات بر عهده فرستنده است.')}</div>
                  <div><span className="font-black">2. </span> {l('Illegal items are strictly prohibited.', 'ارسال اموال غیرقانونی ممنوع است.')}</div>
                  <div><span className="font-black">3. </span> {l('Original receipt required for payout.', 'هنگام دریافت پول، ارائه بل اصلی الزامی است.')}</div>
                </div>
              </div>

              {/* Official Contacts */}
              <div className="border-b border-black py-1.5 text-[11px] space-y-1 text-black">
                <div className="font-black text-center uppercase tracking-wider text-[10.5px]">{l('Official Contacts', 'شماره‌های تماس رسمی')}</div>
                <div className="flex justify-between"><span className="font-bold">{l('Origin:', 'مرکز مبدأ:')}</span><span className="font-black font-mono" dir="ltr">{originBranch?.phone || '0799123456'}</span></div>
                <div className="flex justify-between"><span className="font-bold">{l('Complaints:', 'شکایات:')}</span><span className="font-black font-mono text-[11px]" dir="ltr">0711299680</span></div>
              </div>

              <div className="text-center space-y-1 pt-2 pb-2">
                <BarcodeGenerator value={shipment.cnNumber} width={1.8} height={40} />
                <div className="text-[9px] font-bold text-neutral-800" dir="ltr">www.armaghansadeq.af</div>
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
              className="thermal-label-container bg-white text-black font-sans text-sm mx-auto shadow-xl select-text overflow-hidden relative print:shadow-none print:border-none"
              style={{ 
                width: '80mm', 
                height: '80mm',
                padding: '8px',
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column'
              }}
              dir={language === 'dari' ? 'rtl' : 'ltr'}
            >
              <div className="flex justify-between items-start border-b-2 border-black pb-1 mb-1">
                <div>
                  <div className="text-[12px] font-black tracking-tight" dir="ltr">ARMAGHAN SADEQ</div>
                  <div className="text-[10px] font-semibold text-neutral-600">{l('Logistics Services', 'خدمات باربری')}</div>
                </div>
                <div className="text-right">
                  <div className="text-[14px] font-black font-mono">{shipment.cnNumber}</div>
                  <div className="text-[9px] font-bold" dir="ltr">{new Date(shipment.bookedAt).toLocaleDateString('en-GB')}</div>
                </div>
              </div>
              
              <div className="text-center my-1 bg-black text-white font-black py-0.5 text-[14px] uppercase" dir="ltr">
                {originBranch?.city?.substring(0,3)} ➔ {destBranch?.city?.substring(0,3)}
              </div>
              
              <div className="flex-1 flex flex-col justify-center space-y-1 text-[12px]">
                <div className="border border-black p-1 rounded-sm">
                  <div className="text-[9px] text-neutral-500 font-bold mb-0.5">{l('SENDER', 'فرستنده (SENDER)')}</div>
                  <div className="font-black text-[13px]">{shipment.sender.name}</div>
                  <div className="font-mono font-bold text-[11px]" dir="ltr">{shipment.sender.phone}</div>
                </div>
                <div className="border-2 border-black p-1 rounded-sm bg-neutral-100">
                  <div className="text-[9px] text-neutral-800 font-bold mb-0.5">{l('RECEIVER', 'گیرنده (RECEIVER)')}</div>
                  <div className="font-black text-[14px]">{shipment.receiver.name}</div>
                  <div className="font-mono font-black text-[12px]" dir="ltr">{shipment.receiver.phone}</div>
                  <div className="text-[11px] font-bold mt-0.5"><MapPin className="w-3 h-3 inline mr-0.5"/> {shipment.receiver.city}</div>
                </div>
              </div>
              
              <div className="flex justify-between items-end mt-1 pt-1 border-t border-black">
                <div className="text-[10px] font-bold">
                  <div>{shipment.packageInfo.pieces} PCS | {shipment.packageInfo.weightKg} KG</div>
                  <div className="uppercase">{shipment.packageInfo.serviceType.replace('_', ' ')}</div>
                </div>
                <div className="text-right">
                   <BarcodeGenerator value={shipment.cnNumber} width={1.2} height={25} />
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
              className="bg-white text-slate-900 border border-slate-200 shadow-xl overflow-hidden print:shadow-none print:border-0 relative font-sans select-text"
              style={{ width: '794px', minHeight: '1123px', padding: '40px' }}
              dir={language === 'dari' ? 'rtl' : 'ltr'}
            >
              {/* Decorative Header Banner */}
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-red-600 to-red-800"></div>

              {/* Header */}
              <div className="flex justify-between items-start border-b-2 border-red-800 pb-6 mb-6 pt-2">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-3 text-red-700">
                    <Building2 className="w-10 h-10" />
                    <div>
                      <h1 className="text-3xl font-black tracking-tight">{l('Armaghan Sadeq', 'ارمغان صادق')}</h1>
                      <div className="text-sm font-bold tracking-widest text-red-600/80 uppercase" dir="ltr">Armaghan Sadeq Transfers</div>
                    </div>
                  </div>
                  <div className="text-sm font-medium text-slate-600 mt-2 max-w-xs">
                    {l('Fast, secure and professional logistics services across Afghanistan.', 'خدمات باربری و انتقالات سریع، مطمئن و مسلکی در سراسر افغانستان.')}
                  </div>
                </div>

                <div className="text-left flex flex-col items-end">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{l('Consignment Number (CN)', 'نمبر بارنامه (CN)')}</div>
                  <div className="text-4xl font-black font-mono tracking-tighter text-slate-900 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
                    {shipment.cnNumber}
                  </div>
                  <div className="mt-3">
                    <BarcodeGenerator value={shipment.cnNumber} width={1.5} height={40} />
                  </div>
                </div>
              </div>

              {/* Meta Info Bar */}
              <div className="grid grid-cols-3 gap-4 bg-slate-50 border border-slate-200 p-4 rounded-xl mb-6 text-sm">
                <div>
                  <div className="text-slate-500 text-xs mb-0.5">{l('Registration Date', 'تاریخ ثبت')}</div>
                  <div className="font-bold">{new Date(shipment.bookedAt).toLocaleString(language === 'dari' ? 'fa-AF' : 'en-US', { dateStyle: 'long', timeStyle: 'short' })}</div>
                </div>
                <div>
                  <div className="text-slate-500 text-xs mb-0.5">{l('Service Type', 'نوعیت خدمات')}</div>
                  <div className="font-black uppercase text-red-700">{shipment.packageInfo.serviceType.replace('_', ' ')}</div>
                </div>
                <div>
                  <div className="text-slate-500 text-xs mb-0.5">{l('Payment Status', 'وضعیت پرداخت')}</div>
                  <div className="font-bold uppercase flex items-center gap-1.5">
                    {isPaid ? (
                      <span className="text-emerald-600 flex items-center gap-1"><FileCheck className="w-4 h-4"/> PAID {l('', '(تحویل داده شد)')}</span>
                    ) : (
                      <span className="text-orange-600 flex items-center gap-1"><AlertCircle className="w-4 h-4"/> COD {l('', '(پرداخت در مقصد)')}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Sender & Receiver Boxes (Two-Column Layout) */}
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div className="border-2 border-slate-100 rounded-2xl p-5 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-blue-50 rounded-bl-full -z-10"></div>
                  <div className="flex items-center gap-2 text-blue-800 font-black mb-4">
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">1</div>
                    {l('Sender Details', 'مشخصات فرستنده (Sender)')}
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <span className="text-slate-500">{l('Name:', 'اسم:')}</span>
                      <span className="font-bold text-lg text-slate-900">{shipment.sender.name}</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <span className="text-slate-500">{l('Phone:', 'شماره تماس:')}</span>
                      <span className="font-bold font-mono text-base" dir="ltr">{shipment.sender.phone}</span>
                    </div>
                    <div className="flex items-center justify-between pb-1">
                      <span className="text-slate-500">{l('City/Branch:', 'ولایت / شهر:')}</span>
                      <span className="font-bold flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-slate-400" />
                        {shipment.sender.city} ({originBranch?.name})
                      </span>
                    </div>
                  </div>
                </div>

                <div className="border-2 border-slate-100 rounded-2xl p-5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-50 rounded-bl-full -z-10"></div>
                  <div className="flex items-center gap-2 text-emerald-800 font-black mb-4">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">2</div>
                    {l('Receiver Details', 'مشخصات گیرنده (Receiver)')}
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <span className="text-slate-500">{l('Name:', 'اسم:')}</span>
                      <span className="font-bold text-lg text-slate-900">{shipment.receiver.name}</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <span className="text-slate-500">{l('Phone:', 'شماره تماس:')}</span>
                      <span className="font-bold font-mono text-base" dir="ltr">{shipment.receiver.phone}</span>
                    </div>
                    <div className="flex items-center justify-between pb-1">
                      <span className="text-slate-500">{l('Dest/City:', 'مقصد / شهر:')}</span>
                      <span className="font-bold flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-slate-400" />
                        {shipment.receiver.city} ({destBranch?.name})
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Cargo Details Grid */}
              <div className="mb-6 border-2 border-slate-900 rounded-2xl overflow-hidden">
                <div className="bg-slate-900 text-white px-5 py-2.5 font-bold flex items-center gap-2">
                  <Package className="w-4 h-4 text-red-400" />
                  {l('Cargo Details', 'مشخصات محموله (Cargo Details)')}
                </div>
                <div className="p-5">
                  <div className="grid grid-cols-4 gap-4 mb-4">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <div className="text-xs text-slate-500 mb-1">{l('Category', 'دسته بندی')}</div>
                      <div className="font-bold">{shipment.packageInfo.category}</div>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <div className="text-xs text-slate-500 mb-1">{l('Total Pieces', 'تعداد پارسل')}</div>
                      <div className="font-black text-lg">{shipment.packageInfo.pieces} <span className="text-xs font-normal text-slate-400">PCS</span></div>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <div className="text-xs text-slate-500 mb-1">{l('Total Weight', 'وزن مجموعی')}</div>
                      <div className="font-black text-lg">{shipment.packageInfo.weightKg} <span className="text-xs font-normal text-slate-400">KG</span></div>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <div className="text-xs text-slate-500 mb-1">{l('Contents', 'محتویات')}</div>
                      <div className="font-bold break-words whitespace-pre-wrap text-[13px] leading-tight">{shipment.packageInfo.description || l('Unspecified', 'نامشخص')}</div>
                    </div>
                  </div>
                  
                  {shipment.packageInfo.isFragile && (
                    <div className="bg-red-50 text-red-700 p-3 rounded-xl border border-red-100 flex items-center gap-2 font-bold text-sm">
                      <AlertCircle className="w-5 h-5" />
                      {l('This cargo is fragile. Please handle with care. (FRAGILE CARGO)', 'این محموله شکستنی است. لطفاً با احتیاط کامل انتقال داده شود. (FRAGILE CARGO)')}
                    </div>
                  )}
                </div>
              </div>

              {/* Financials & Signatures */}
              <div className="grid grid-cols-2 gap-8 mb-8">
                {/* Signatures */}
                <div className="flex flex-col justify-end space-y-8 pb-2">
                  <div className="flex justify-between items-end border-b-2 border-dashed border-slate-300 pb-2">
                    <span className="text-slate-400 font-bold">{l('Sender Signature:', 'امضای فرستنده (Sender):')}</span>
                    <span className="w-32"></span>
                  </div>
                  <div className="flex justify-between items-end border-b-2 border-dashed border-slate-300 pb-2">
                    <span className="text-slate-400 font-bold">{l('Receiver Signature:', 'امضای گیرنده (Receiver):')}</span>
                    <span className="w-32"></span>
                  </div>
                  <div className="flex justify-between items-end border-b-2 border-dashed border-slate-300 pb-2">
                    <span className="text-slate-400 font-bold">{l('Company Stamp:', 'مهر نماینده شرکت:')}</span>
                    <span className="w-32"></span>
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
                  <div className="font-black text-lg border-b border-slate-200 pb-3 mb-3">{l('Financials', 'تفصیلات مالی (Financials)')}</div>
                  
                  {receiptRole === 'seller' ? (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">{l('Item Value:', 'قیمت فروش جنس:')}</span>
                        <span className="font-bold">{priceVal.toLocaleString()} AFN</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">{l('Service Fee (Freight):', 'فیس خدمات (کرایه):')}</span>
                        <span className="font-bold text-red-600">-{sFeeVal.toLocaleString()} AFN</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">{l('Destination Comm:', 'کمیسیون مقصد:')}</span>
                        <span className="font-bold text-red-600">-{dCommVal.toLocaleString()} AFN</span>
                      </div>
                      {discountVal > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">{l('Discount:', 'تخفیف:')}</span>
                          <span className="font-bold text-emerald-600">+{discountVal.toLocaleString()} AFN</span>
                        </div>
                      )}
                      <div className="pt-3 mt-3 border-t-2 border-slate-200">
                        <div className="flex justify-between items-center">
                          <span className="font-black text-slate-800">{l('Payable to Seller:', 'مبلغ قابل پرداخت به فروشنده:')}</span>
                          <span className="text-2xl font-black font-mono text-emerald-700">{payoutVal.toLocaleString()} AFN</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col h-full justify-between">
                      <div className="text-center text-slate-500 text-sm mb-4">
                        {l('You are viewing the receiver copy. Commission deductions are hidden.', 'شما در حال مشاهده رسید گیرنده هستید. کسر کمیسیون‌ها در این رسید نمایش داده نمی‌شود.')}
                      </div>
                      <div className="bg-slate-900 rounded-xl p-4 text-center">
                        <div className="text-slate-400 font-bold text-xs uppercase mb-1">{l('Total Payable', 'مجموع قابل پرداخت (Total Payable)')}</div>
                        <div className="text-3xl font-black font-mono text-white">{totalDueVal.toLocaleString()} AFN</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Rules & Footer */}
              <div className="border-t-2 border-red-800 pt-4 mt-auto">
                <div className="grid grid-cols-4 gap-6">
                  <div className="col-span-3 text-[10px] text-slate-500 space-y-1.5 leading-relaxed">
                    <div className="font-bold text-slate-700 text-xs">{l('Terms & Conditions:', 'شرایط و مقررات:')}</div>
                    <p>{l('1. Receipt is valid for one month. The sender is responsible for the accuracy of information.', '۱. بل پس از یک ماه فاقد اعتبار بوده و صحت معلومات درج‌شده بر عهده فرستنده است.')}</p>
                    <p>{l('2. Sending illegal items is prohibited; the company is not responsible for natural disasters and fire.', '۲. ارسال اموال غیرقانونی ممنوع است؛ شرکت در برابر حوادث طبیعی و آتش‌سوزی مسئول نمی‌باشد.')}</p>
                    <p>{l('3. Original receipt is mandatory when collecting money.', '۳. هنگام دریافت پول، ارائه بل اصلی الزامی است.')}</p>
                  </div>
                  <div className="flex flex-col items-end justify-center">
                    <QRCodeVisual value={`https://armaghansadeq.af/track/${shipment.cnNumber}`} size={64} />
                    <div className="text-[9px] font-bold mt-1 text-slate-400 tracking-wider">SCAN TO TRACK</div>
                  </div>
                </div>
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
