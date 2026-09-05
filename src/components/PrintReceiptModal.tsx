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
  Building2
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { BarcodeGenerator, QRCodeVisual } from './BarcodeGenerator';
import { generateWaybillPdf, printElementUsingIframe } from '../utils/pdfExport';

export const PrintReceiptModal: React.FC = () => {
  const { 
    selectedShipmentForReceipt, 
    setSelectedShipmentForReceipt, 
    branches, 
    t 
  } = useApp();

  const receiptRef = useRef<HTMLDivElement>(null);
  const thermalRef = useRef<HTMLDivElement>(null);
  const [printFormat, setPrintFormat] = useState<'standard' | 'thermal'>('standard');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  if (!selectedShipmentForReceipt) return null;

  const shipment = selectedShipmentForReceipt;
  const originBranch = branches.find(b => b.id === shipment.originBranchId);
  const destBranch = branches.find(b => b.id === shipment.destinationBranchId);

  const handlePrint = () => {
    const targetRef = printFormat === 'thermal' ? thermalRef.current : receiptRef.current;
    if (targetRef) {
      printElementUsingIframe(targetRef, `Receipt_${shipment.cnNumber}`);
    } else {
      window.print();
    }
  };

  const handleDownloadPdf = () => {
    setIsGeneratingPdf(true);
    setDownloadSuccess(false);

    try {
      const ok = generateWaybillPdf(shipment, originBranch, destBranch);
      if (ok) {
        setDownloadSuccess(true);
        setTimeout(() => setDownloadSuccess(false), 4000);
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
        printFormat === 'thermal' ? 'max-w-md' : 'max-w-3xl'
      }`}>
        
        {/* Modal Action Header (Excluded from Print) */}
        <div className="no-print p-4 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-bold text-sm text-slate-800">
            <Printer className="w-4 h-4 text-red-600" />
            <span>{t('receipt_title')}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-mono font-bold">
              {shipment.cnNumber}
            </span>
          </div>

          {/* Format Switch: Standard A4 vs Thermal POS */}
          <div className="flex items-center bg-slate-200/80 rounded-xl p-0.5 text-xs font-bold">
            <button
              onClick={() => setPrintFormat('standard')}
              className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all cursor-pointer ${
                printFormat === 'standard' ? 'bg-white text-red-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{t('print_format_a4')}</span>
            </button>
            <button
              onClick={() => setPrintFormat('thermal')}
              className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all cursor-pointer ${
                printFormat === 'thermal' ? 'bg-white text-red-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>{t('print_format_thermal')}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Download PDF button (For Standard A4) */}
            {printFormat === 'standard' && (
              <button
                onClick={handleDownloadPdf}
                disabled={isGeneratingPdf}
                id="btn-modal-download-pdf"
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Download PDF to computer/phone"
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
                    <span>PDF</span>
                  </>
                )}
              </button>
            )}

            {/* Print button */}
            <button
              onClick={handlePrint}
              id="btn-modal-print-receipt"
              className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Open print dialog"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{printFormat === 'thermal' ? 'Print Slip' : t('btn_print_pdf')}</span>
            </button>

            <button
              onClick={() => setSelectedShipmentForReceipt(null)}
              className="p-1.5 rounded-xl text-slate-500 hover:bg-slate-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 1. THERMAL POS RECEIPT FORMAT (58mm / 80mm POS Mini Printer) */}
        {printFormat === 'thermal' ? (
          <div 
            ref={thermalRef} 
            className="p-6 bg-white text-slate-950 font-mono text-[11px] leading-tight space-y-3 max-w-[340px] mx-auto border-x border-dashed border-slate-300 shadow-inner my-3"
            style={{ width: '100%', maxWidth: '340px' }}
          >
            {/* Thermal Slip Header */}
            <div className="text-center space-y-1 pb-2 border-b border-dashed border-slate-900">
              <div className="text-sm font-black tracking-tight">ARMAGHAN SADEQ TRANSFERS</div>
              <div className="text-[11px] font-bold">خدمات انتقالات ارمغان صادق</div>
              <div className="text-[9px] text-slate-600">Helpline: +93 799 123 456 | Central Hub Kabul</div>
              <div className="text-[10px] font-bold pt-1">*** OFFICIAL CONSIGNMENT SLIP ***</div>
            </div>

            {/* CN & Date */}
            <div className="space-y-0.5 text-[11px] pb-2 border-b border-dashed border-slate-900">
              <div className="flex justify-between font-bold">
                <span>CN NUMBER:</span>
                <span className="text-xs">{shipment.cnNumber}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span>DATE:</span>
                <span>{new Date(shipment.bookedAt).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span>SERVICE:</span>
                <span className="uppercase font-bold">{shipment.packageInfo.serviceType}</span>
              </div>
            </div>

            {/* Route */}
            <div className="space-y-1 py-1 border-b border-dashed border-slate-900">
              <div className="font-bold text-[10px] uppercase text-center bg-slate-100 py-0.5">
                {originBranch?.city?.toUpperCase() || 'ORIGIN'} ➔ {destBranch?.city?.toUpperCase() || 'DESTINATION'}
              </div>
              <div className="text-[10px]">
                <div><span className="font-bold">FROM:</span> {shipment.sender.name}</div>
                <div><span className="font-bold">TEL:</span> {shipment.sender.phone}</div>
                <div><span className="font-bold">CITY:</span> {shipment.sender.city}</div>
              </div>
              <div className="text-[10px] pt-1">
                <div><span className="font-bold">TO:</span> {shipment.receiver.name}</div>
                <div><span className="font-bold">TEL:</span> {shipment.receiver.phone}</div>
                {(shipment.receiver.nationalId || shipment.sender.receiverTazkira) && (
                  <div><span className="font-bold">TAZKIRA:</span> {shipment.receiver.nationalId || shipment.sender.receiverTazkira}</div>
                )}
                <div><span className="font-bold">DEST:</span> {shipment.receiver.city}</div>
              </div>
            </div>

            {/* Cargo Specs */}
            <div className="space-y-0.5 py-1 border-b border-dashed border-slate-900 text-[10px]">
              <div className="flex justify-between">
                <span>CATEGORY:</span>
                <span className="font-bold">{shipment.packageInfo.category}</span>
              </div>
              <div className="flex justify-between">
                <span>WEIGHT:</span>
                <span className="font-bold">{shipment.packageInfo.weightKg} KG</span>
              </div>
              <div className="flex justify-between">
                <span>PIECES:</span>
                <span className="font-bold">{shipment.packageInfo.pieces} PKG(S)</span>
              </div>
              {shipment.packageInfo.isFragile && (
                <div className="text-center font-bold text-[9px] bg-slate-200 py-0.5 mt-1">
                  * FRAGILE CARGO - HANDLE WITH CARE *
                </div>
              )}
            </div>

            {/* Charges Breakdown */}
            <div className="space-y-1 py-1 border-b border-dashed border-slate-900 text-[10px]">
              {shipment.status === 'pre_booked' || shipment.financials.totalAmount === 0 ? (
                <div className="text-center py-1 bg-amber-50 rounded border border-amber-200 text-amber-900">
                  <div className="font-bold text-[9px] uppercase">* PRE-BOOKING VOUCHER *</div>
                  <div className="text-[8px] text-amber-800">Final freight price will be added upon origin branch scale weighing.</div>
                </div>
              ) : (
                <>
                  <div className="flex justify-between">
                    <span>Base Booking Rate:</span>
                    <span>{shipment.financials.baseRate} AFN</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Weight Charge ({shipment.packageInfo.weightKg}kg):</span>
                    <span>{shipment.financials.weightCost} AFN</span>
                  </div>
                  {shipment.transportationFee && shipment.transportationFee > 0 && (
                    <div className="flex justify-between">
                      <span>Transportation Fee:</span>
                      <span>{shipment.transportationFee} AFN</span>
                    </div>
                  )}
                  {shipment.financials.discountAmount > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Discount:</span>
                      <span>-{shipment.financials.discountAmount} AFN</span>
                    </div>
                  )}
                  <div className="flex justify-between font-black text-xs pt-1 border-t border-slate-400">
                    <span>TOTAL AMOUNT:</span>
                    <span>{shipment.financials.totalAmount} AFN</span>
                  </div>
                  <div className="flex justify-between font-bold text-[10px]">
                    <span>PAYMENT STATUS:</span>
                    <span className="uppercase">
                      {shipment.financials.paymentStatus === 'to_pay' ? 'COD (TO PAY AT DEST)' : shipment.financials.paymentStatus.toUpperCase()}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Official 3 Helpline Contacts */}
            <div className="border-t border-b border-dashed border-slate-900 py-1.5 my-1 text-[9px] space-y-0.5">
              <div className="font-bold text-center uppercase tracking-wider text-[8.5px]">Official Helpline Contacts</div>
              <div className="flex justify-between">
                <span>1. Sender Hub:</span>
                <span className="font-bold font-mono">{originBranch?.phone || 'Origin Hub'}</span>
              </div>
              <div className="flex justify-between text-amber-900">
                <span className="font-bold">2. Complaints (شکایات):</span>
                <span className="font-bold font-mono text-[9.5px]">0711299680</span>
              </div>
              <div className="flex justify-between text-blue-900">
                <span className="font-bold">3. Main Office (مرکزی):</span>
                <span className="font-bold font-mono text-[9.5px]">0774144004</span>
              </div>
            </div>

            {/* Barcode & Footer Notice */}
            <div className="text-center space-y-2 pt-1">
              <div className="flex justify-center">
                <BarcodeGenerator value={shipment.cnNumber} width={1.4} height={35} displayValue={false} />
              </div>
              <div className="text-[9px] text-slate-600">
                Track live at www.armaghansadeq.af using CN #{shipment.cnNumber}
              </div>
              <div className="text-[8px] text-slate-500 pt-1 border-t border-dashed border-slate-400">
                Please present this slip at destination branch for parcel collection. Thank you for choosing Armaghan Sadeq Transfers!
              </div>
              <div className="text-[8px] text-slate-500 pt-0.5 font-medium">
                Developed by Rayan tech solutions | Rayan-Tech-Solution.tech
              </div>
              <div className="text-[7.5px] text-slate-400">
                سیستم توسعه یافته توسط خدمات تکنالوژی رایان
              </div>
              <div className="text-center text-[10px] font-bold text-slate-400">--------------------------------</div>
            </div>
          </div>
        ) : (
          /* 2. STANDARD A4 OFFICIAL CONSIGNMENT WAYBILL */
          <div ref={receiptRef} className="p-6 sm:p-8 bg-white text-slate-900 printable-receipt font-sans space-y-6">
            
            {/* Header */}
            <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4 gap-4">
              <div className="flex items-center gap-3">
                <div className="p-1 bg-white rounded-lg border border-amber-500/30 flex items-center justify-center shrink-0">
                  <img src="/logo.jpg" alt="Armaghan Sadeq Transfers" className="w-12 h-12 object-contain" />
                </div>
                <div>
                  <h1 className="text-xl font-black tracking-tight text-slate-900">
                    ARMAGHAN SADEQ TRANSFERS
                  </h1>
                  <p className="text-xs text-amber-700 font-bold">
                    خدمات انتقالات ارمغان صادق
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Afghanistan Nationwide Express Transfers & Freight Logistics
                  </p>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Helpline: +93 799 123 456 | info@armaghansadeq.af | Kabul HQ
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
                  <span>{shipment.sender.phone}</span>
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
                  <span>{shipment.receiver.phone}</span>
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
                    Alt Tel: {shipment.receiver.altPhone}
                  </div>
                )}
              </div>

            </div>

            {/* Cargo Details & Billing Breakdown */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-2.5 text-start">Cargo Description</th>
                    <th className="p-2.5 text-center">Category</th>
                    <th className="p-2.5 text-center">Weight</th>
                    <th className="p-2.5 text-center">Pieces</th>
                    <th className="p-2.5 text-end">Declared Value</th>
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
                    <td className="p-2.5 text-end font-mono">{shipment.packageInfo.declaredValueAfn.toLocaleString()} AFN</td>
                  </tr>
                </tbody>
              </table>

              {/* Financial Summary */}
              <div className="bg-slate-50 p-4 border-t border-slate-200 flex flex-wrap justify-between items-center gap-4">
                {shipment.status === 'pre_booked' || shipment.financials.totalAmount === 0 ? (
                  <div className="w-full p-3 rounded-lg bg-amber-50 border border-amber-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-amber-900">
                    <div>
                      <div className="font-bold text-xs uppercase flex items-center gap-1.5">
                        <span>Pre-Booking Status: Pending Origin Branch Scale Intake</span>
                      </div>
                      <div className="text-[11px] text-amber-700">
                        Official freight charges will be calculated and certified by the origin branch manager when the parcel is dropped off.
                      </div>
                    </div>
                    <div className="px-3 py-1 bg-amber-200/80 rounded-md font-mono font-bold text-xs text-amber-900 whitespace-nowrap">
                      PRICE PENDING
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="text-xs text-slate-600 space-y-1">
                      <div>Payment Method: <strong className="uppercase">{shipment.financials.paymentMethod}</strong></div>
                      <div>Payment Status: <strong className="uppercase text-emerald-700">{shipment.financials.paymentStatus}</strong></div>
                      <div>Booked By Officer: <strong>{shipment.bookedByUserName || 'Terminal Agent'}</strong></div>
                    </div>

                    <div className="text-end space-y-1">
                      <div className="text-xs text-slate-500">
                        Base ({shipment.financials.baseRate} AFN) + Weight ({shipment.financials.weightCost} AFN)
                        {shipment.transportationFee ? ` + Trans (${shipment.transportationFee} AFN)` : ''}
                        {shipment.financials.discountAmount > 0 ? ` - Disc (${shipment.financials.discountAmount} AFN)` : ''}
                      </div>
                      <div className="text-base font-black text-slate-900">
                        Total Charge: <span className="text-red-600 font-mono text-xl">{shipment.financials.totalAmount.toLocaleString()} AFN</span>
                      </div>
                      {shipment.financials.amountDue > 0 && (
                        <div className="text-xs font-bold text-amber-700">
                          Balance Due on Delivery: {shipment.financials.amountDue.toLocaleString()} AFN
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Trilingual Terms Notice */}
            <div className="p-2.5 bg-slate-100 rounded text-[10px] text-slate-600 leading-tight space-y-1">
              <div className="font-bold text-slate-700">TERMS & CONDITIONS (شرایط و مقررات):</div>
              <p><strong>EN:</strong> The carrier is not responsible for undeclared valuables or perishables. Claims must be submitted within 48 hours with original consignment receipt.</p>
              <p className="font-sans" dir="rtl"><strong>دری:</strong> شرکت در قبال اجناس فاسدشدنی یا بدون اظهارنامه مسئولیتی ندارد. هرگونه ادعا باید ظرف ۴۸ ساعت با ارائه اصل این بارنامه ثبت گردد.</p>
              <p className="font-sans" dir="rtl"><strong>پښتو:</strong> شرکت د غیر راجسټر شویو خرابیدونکو توکو مسؤلیت نه لري. شکایت باید تر ۴۸ ساعتونو پورې د اصلي رسید سره وشي.</p>
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-300 text-xs">
              <div className="text-center space-y-4">
                <div className="font-bold text-slate-800">Sender Signature</div>
                <div className="border-b border-slate-400 w-3/4 mx-auto pb-1" />
                <div className="text-[10px] text-slate-500">Shipper Acknowledgment</div>
              </div>

              <div className="text-center space-y-4">
                <div className="font-bold text-slate-800">Branch Officer Signature</div>
                <div className="border-b border-slate-400 w-3/4 mx-auto pb-1" />
                <div className="text-[10px] text-slate-500">{shipment.bookedByUserName || originBranch?.name || 'Officer Stamp'}</div>
              </div>

              <div className="text-center space-y-4">
                <div className="font-bold text-slate-800">Receiver Signature (POD)</div>
                <div className="border-b border-slate-400 w-3/4 mx-auto pb-1" />
                <div className="text-[10px] text-slate-500">(Sign upon handover)</div>
              </div>
            </div>

            {/* Official 3 Mandatory Helpline Contacts Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <div className="flex items-start gap-2.5">
                <div className="p-1.5 bg-red-100 text-red-700 rounded-lg shrink-0 mt-0.5">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 font-bold uppercase">1. Sender Branch Phone</div>
                  <div className="font-mono font-bold text-slate-900 text-xs">{originBranch?.phone || 'Origin Branch Hub'}</div>
                  <div className="text-[9.5px] text-slate-500">{originBranch?.name || 'Origin Hub'}</div>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="p-1.5 bg-amber-100 text-amber-800 rounded-lg shrink-0 mt-0.5">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 font-bold uppercase">2. Complaints Hotline (شکایات)</div>
                  <div className="font-mono font-bold text-amber-800 text-sm">0711299680</div>
                  <div className="text-[9.5px] text-amber-700 font-medium">Nationwide Complaint Centre</div>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="p-1.5 bg-blue-100 text-blue-800 rounded-lg shrink-0 mt-0.5">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 font-bold uppercase">3. Main Office Contact (دفتر مرکزی)</div>
                  <div className="font-mono font-bold text-blue-900 text-sm">0774144004</div>
                  <div className="text-[9.5px] text-blue-700 font-medium">Kabul Central HQ Office</div>
                </div>
              </div>
            </div>

            {/* Attribution Footer */}
            <div className="pt-3 border-t border-dashed border-slate-200 flex flex-col sm:flex-row justify-between items-center text-[10px] text-slate-400 gap-1">
              <span>Armaghan Sadeq Transfers • خدمات انتقالات ارمغان صادق</span>
              <span className="font-medium text-slate-500">
                Developed by Rayan tech solutions | Rayan-Tech-Solution.tech (سیستم توسعه یافته توسط خدمات تکنالوژی رایان)
              </span>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
