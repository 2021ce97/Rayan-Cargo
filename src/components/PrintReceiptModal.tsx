import React, { useRef, useState } from 'react';
import { 
  Printer, 
  X, 
  Package, 
  Building2, 
  MapPin, 
  Phone, 
  Calendar, 
  CheckCircle, 
  ShieldCheck,
  Download,
  Loader2,
  FileCheck
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { BarcodeGenerator, QRCodeVisual } from './BarcodeGenerator';
import { generateWaybillPdf, printElementUsingIframe } from '../utils/pdfExport';

export const PrintReceiptModal: React.FC = () => {
  const { 
    selectedShipmentForReceipt, 
    setSelectedShipmentForReceipt, 
    branches, 
    t, 
    language 
  } = useApp();

  const receiptRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  if (!selectedShipmentForReceipt) return null;

  const shipment = selectedShipmentForReceipt;
  const originBranch = branches.find(b => b.id === shipment.originBranchId);
  const destBranch = branches.find(b => b.id === shipment.destinationBranchId);

  const handlePrint = () => {
    if (receiptRef.current) {
      printElementUsingIframe(receiptRef.current, `Waybill_${shipment.cnNumber}`);
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
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95">
        
        {/* Modal Action Header (Excluded from Print) */}
        <div className="no-print p-4 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-sm text-slate-800">
            <Printer className="w-4 h-4 text-red-600" />
            <span>{t('receipt_title')}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-mono font-bold">
              {shipment.cnNumber}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Download PDF button */}
            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              id="btn-modal-download-pdf"
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Download PDF to computer/phone"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{t('generating_pdf')}</span>
                </>
              ) : downloadSuccess ? (
                <>
                  <FileCheck className="w-4 h-4 text-emerald-200" />
                  <span>{t('pdf_downloaded_success')}</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>{t('btn_download_pdf')}</span>
                </>
              )}
            </button>

            {/* Print button */}
            <button
              onClick={handlePrint}
              id="btn-modal-print-receipt"
              className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Open print dialog"
            >
              <Printer className="w-4 h-4" />
              <span>{t('btn_print_pdf')}</span>
            </button>

            <button
              onClick={() => setSelectedShipmentForReceipt(null)}
              className="p-2 rounded-xl text-slate-500 hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Official Consignment Note (Clean High-Contrast Waybill) */}
        <div ref={receiptRef} className="p-6 sm:p-8 bg-white text-slate-900 printable-receipt font-sans space-y-6">
          
          {/* Header */}
          <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-red-600 text-white flex items-center justify-center font-black text-2xl tracking-tighter">
                RYN
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight text-slate-900">
                  RAYAN CARGO DB & LOGISTICS
                </h1>
                <p className="text-xs text-slate-600 font-semibold">
                  Nationwide Express Waybill & Freight Delivery Network
                </p>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Helpline: +93 79 123 4567 | info@rayancargo.af | www.rayancargo.af
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
          <div className="flex flex-wrap items-center justify-between gap-4 p-3 bg-slate-50 border border-slate-300 rounded-lg">
            <div className="flex-1 min-w-[200px]">
              <BarcodeGenerator value={shipment.cnNumber} height={40} className="text-slate-900" />
            </div>
            <div className="flex items-center gap-4 text-xs font-mono">
              <div className="space-y-0.5">
                <div>ORIGIN: <strong>{originBranch?.code || 'KBL'} ({originBranch?.city || shipment.sender.city})</strong></div>
                <div>DESTINATION: <strong className="text-red-600">{destBranch?.code || 'HRT'} ({destBranch?.city || shipment.receiver.city})</strong></div>
                <div>SERVICE: <strong>{shipment.packageInfo.serviceType.toUpperCase()}</strong></div>
              </div>
              <QRCodeVisual value={shipment.cnNumber} size={64} />
            </div>
          </div>

          {/* Sender & Receiver Info Boxes */}
          <div className="grid grid-cols-2 gap-4">
            
            {/* Sender Box */}
            <div className="border border-slate-300 rounded-lg p-3.5 space-y-1.5 bg-slate-50/50">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 pb-1 flex justify-between">
                <span>1. SENDER / SHIPPER (فرستنده)</span>
                <span>ORIGIN: {originBranch?.name || shipment.sender.city}</span>
              </div>
              <div className="text-xs font-bold text-slate-900">{shipment.sender.name}</div>
              <div className="text-xs text-slate-700">Phone: <strong className="font-mono">{shipment.sender.phone}</strong></div>
              {shipment.sender.nationalId && (
                <div className="text-[11px] text-slate-600">ID/Tazkira: {shipment.sender.nationalId}</div>
              )}
              <div className="text-xs text-slate-600 leading-tight">
                {shipment.sender.address}, {shipment.sender.city}, {shipment.sender.province}
              </div>
            </div>

            {/* Receiver Box */}
            <div className="border border-slate-300 rounded-lg p-3.5 space-y-1.5 bg-slate-50/50">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 pb-1 flex justify-between">
                <span>2. RECEIVER / CONSIGNEE (گیرنده)</span>
                <span className="text-red-600 font-bold">DEST: {destBranch?.name || shipment.receiver.city}</span>
              </div>
              <div className="text-xs font-bold text-slate-900">{shipment.receiver.name}</div>
              <div className="text-xs text-slate-700">Phone: <strong className="font-mono">{shipment.receiver.phone}</strong></div>
              {shipment.receiver.altPhone && (
                <div className="text-[11px] text-slate-600">Alt Phone: {shipment.receiver.altPhone}</div>
              )}
              <div className="text-xs text-slate-600 leading-tight">
                {shipment.receiver.address}, {shipment.receiver.city}, {shipment.receiver.province}
              </div>
            </div>

          </div>

          {/* Package Specs Table */}
          <table className="w-full text-xs border border-slate-300 rounded-lg overflow-hidden">
            <thead className="bg-slate-100 font-bold text-slate-700 text-start border-b border-slate-300">
              <tr>
                <th className="p-2 text-start">Category</th>
                <th className="p-2 text-center">Pieces</th>
                <th className="p-2 text-center">Actual Weight</th>
                <th className="p-2 text-center">Dimensions</th>
                <th className="p-2 text-center">Declared Value</th>
                <th className="p-2 text-center">Fragile / Special</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              <tr>
                <td className="p-2 font-semibold capitalize">{shipment.packageInfo.category}</td>
                <td className="p-2 text-center font-bold">{shipment.packageInfo.pieces}</td>
                <td className="p-2 text-center font-bold text-red-600">{shipment.packageInfo.weightKg} KG</td>
                <td className="p-2 text-center font-mono">{shipment.packageInfo.dimensions || 'N/A'}</td>
                <td className="p-2 text-center font-mono">{shipment.packageInfo.declaredValueAfn.toLocaleString()} AFN</td>
                <td className="p-2 text-center font-semibold">
                  {shipment.packageInfo.isFragile ? '⚠️ FRAGILE / HANDLE WITH CARE' : 'Standard'}
                </td>
              </tr>
              <tr>
                <td colSpan={6} className="p-2 text-slate-600 bg-slate-50/50">
                  <strong>Description:</strong> {shipment.packageInfo.description}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Billing & Financial Breakdown */}
          <div className="grid grid-cols-2 gap-4 border border-slate-300 rounded-lg p-3.5 bg-slate-50">
            <div className="space-y-1 text-xs">
              <div className="font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                Payment Terms
              </div>
              <div className="flex items-center gap-2">
                <span>Payment Mode:</span>
                <strong className="uppercase">{shipment.financials.paymentMethod}</strong>
              </div>
              <div className="flex items-center gap-2">
                <span>Payment Status:</span>
                <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                  shipment.financials.paymentStatus === 'paid' ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'
                }`}>
                  {shipment.financials.paymentStatus.toUpperCase()}
                </span>
              </div>
              {shipment.financials.discountReason && (
                <div className="text-[11px] text-emerald-700">
                  Discount applied: {shipment.financials.discountReason}
                </div>
              )}
            </div>

            <div className="space-y-1 text-xs text-end">
              <div className="flex justify-between">
                <span className="text-slate-500">Base Freight Fare:</span>
                <span>{shipment.financials.baseRate} AFN</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Weight Charge:</span>
                <span>{shipment.financials.weightCost} AFN</span>
              </div>
              {shipment.financials.serviceFee > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Handling / Insurance:</span>
                  <span>{shipment.financials.serviceFee} AFN</span>
                </div>
              )}
              {shipment.financials.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Discount:</span>
                  <span>- {shipment.financials.discountAmount} AFN</span>
                </div>
              )}
              <div className="flex justify-between border-t border-slate-300 pt-1 text-sm font-black text-slate-900">
                <span>Total Amount:</span>
                <span className="text-red-600">{shipment.financials.totalAmount.toLocaleString()} AFN</span>
              </div>
            </div>
          </div>

          {/* Trilingual Terms Notice */}
          <div className="p-2.5 bg-slate-100 rounded text-[10px] text-slate-600 leading-tight space-y-1">
            <div className="font-bold text-slate-700">TERMS & CONDITIONS (شرایط و مقررات):</div>
            <p><strong>EN:</strong> The carrier is not responsible for undeclared valuables or perishables. Claims must be submitted within 48 hours with original consignment receipt.</p>
            <p className="font-sans" dir="rtl"><strong>دری:</strong> شرکت در قبال اجناس فاسدشدنی یا بدون اظهارنامه مسئولیتی ندارد. هرگونه ادعا باید ظرف ۴۸ ساعت با ارائه اصل این بارنامه ثبت گردد.</p>
            <p className="font-sans" dir="rtl"><strong>پښتو:</strong> شرکت د غیر راجسټر شویو خرابیدونکو توکو مسؤلیت نه لري. شکایت باید تر ۴۸ ساعتونو پورې د اصلي رسید سره وشي.</p>
          </div>

          {/* Signatures & Stamp Blocks */}
          <div className="grid grid-cols-3 gap-4 pt-4 text-center text-xs">
            
            <div className="border-t border-slate-400 pt-2">
              <div className="h-12 flex items-center justify-center font-signature text-slate-500 italic text-sm">
                {shipment.sender.name.split(' ')[0]}
              </div>
              <div className="font-bold text-slate-700">{t('sender_signature')}</div>
              <div className="text-[10px] text-slate-400">Shipper Acknowledgment</div>
            </div>

            <div className="border-t border-slate-400 pt-2">
              <div className="h-12 flex items-center justify-center font-signature text-slate-500 italic text-sm">
                {shipment.bookedByUserName || 'Officer Stamp'}
              </div>
              <div className="font-bold text-slate-700">{t('authorized_stamp')}</div>
              <div className="text-[10px] text-slate-400">{originBranch?.name || 'Head Office'}</div>
            </div>

            <div className="border-t border-slate-400 pt-2">
              <div className="h-12 flex items-center justify-center text-slate-300 text-xs">
                (Sign upon delivery)
              </div>
              <div className="font-bold text-slate-700">{t('receiver_signature')}</div>
              <div className="text-[10px] text-slate-400">Receiver / POD</div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
