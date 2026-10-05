import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  Lock,
  Unlock,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Equal,
  Send,
  ShieldCheck,
  AlertTriangle,
  X,
  Building2,
  User,
  Phone,
  FileText,
  Clock,
  ArrowRight
} from 'lucide-react';
import { Shipment, PriceAdjustmentType } from '../types';
import { useApp } from '../context/AppContext';

interface DeliveryPaymentSettlementModalProps {
  shipment: Shipment | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export const DeliveryPaymentSettlementModal: React.FC<DeliveryPaymentSettlementModalProps> = ({
  shipment,
  onClose,
  onSuccess
}) => {
  const {
    branches,
    currentUser,
    recordDeliveryPaymentSettlement,
    unlockDeliveryPaymentSettlement
  } = useApp();

  if (!shipment) return null;

  // Strictly only available for delivered, returned, or cancelled
  const isEligibleStatus =
    shipment.status === 'delivered' ||
    shipment.status === 'returned' ||
    shipment.status === 'cancelled';

  const existingSettlement = shipment.paymentSettlement || shipment.financials?.paymentSettlement;
  const isLocked = Boolean(existingSettlement?.locked);

  const origBranch = branches.find(b => b.id === shipment.originBranchId);
  const destBranch = branches.find(b => b.id === shipment.destinationBranchId);

  const originalProductPrice = Number(
    shipment.financials?.originalProductPrice ??
    existingSettlement?.originalProductPrice ??
    shipment.packageInfo?.declaredValueAfn ??
    shipment.financials?.productPrice ??
    shipment.financials?.totalAmount ??
    0
  );
  const fixedServiceFee = Number(shipment.financials?.serviceFee ?? shipment.transportationFee ?? 150);
  const fixedDestCommission = Number(shipment.destBranchCommission ?? shipment.financials?.destBranchCommission ?? 70);
  const discountAmount = Number(shipment.financials?.discountAmount ?? 0);

  const [adjustmentType, setAdjustmentType] = useState<PriceAdjustmentType>('exact');
  const [adjustmentAmount, setAdjustmentAmount] = useState<number>(0);
  const [actualCollectedAmount, setActualCollectedAmount] = useState<number>(
    shipment.status === 'delivered' ? originalProductPrice : 0
  );
  const [reasonCategory, setReasonCategory] = useState<string>('exact_payment');
  const [reportNote, setReportNote] = useState<string>('');

  useEffect(() => {
    if (existingSettlement) {
      setAdjustmentType(existingSettlement.adjustmentType);
      setAdjustmentAmount(existingSettlement.adjustmentAmount);
      setActualCollectedAmount(existingSettlement.actualCollectedAmount);
      setReasonCategory(existingSettlement.reasonCategory || 'exact_payment');
      setReportNote(existingSettlement.reportNote || '');
    } else if (shipment.status === 'delivered') {
      setAdjustmentType('exact');
      setAdjustmentAmount(0);
      setActualCollectedAmount(originalProductPrice);
      setReasonCategory('exact_payment');
      setReportNote('');
    } else {
      setAdjustmentType('less');
      setAdjustmentAmount(originalProductPrice);
      setActualCollectedAmount(0);
      setReasonCategory('returned_or_cancelled');
      setReportNote('');
    }
  }, [shipment.id, shipment.status, originalProductPrice, existingSettlement]);

  if (!isEligibleStatus) {
    return null;
  }

  const reasonOptions = {
    exact: [
      { id: 'exact_payment', label: 'Exact Waybill Product Price Collected (دریافت مبلغ دقیق بارنامه)' }
    ],
    extra: [
      { id: 'seller_buyer_agreed_up', label: 'Agreed between Seller & Buyer on Phone (توافق فروشنده و خریدار)' },
      { id: 'market_price_increased', label: 'Product Value / Market Rate Increased (افزایش قیمت محصول / نرخ روز)' },
      { id: 'extra_item_added', label: 'Extra Product / Quantity Added (اضافه شدن محصول یا تعداد)' },
      { id: 'currency_rate_diff', label: 'Currency Exchange Rate Adjustment (تفاوت نرخ اسعار)' },
      { id: 'other_extra', label: 'Other Reason for Extra Payment (سایر دلایل پرداخت بیشتر)' }
    ],
    less: [
      { id: 'seller_discount_agreed', label: 'Discount Agreed by Seller on Phone (تخفیف با تایید تلفنی فروشنده)' },
      { id: 'market_price_decreased', label: 'Product Value / Market Price Decreased (کاهش قیمت محصول)' },
      { id: 'partial_item_issue', label: 'Partial Item Missing or Minor Damage (کسری یا آسیب جزئی کالا)' },
      { id: 'currency_rate_diff_down', label: 'Currency Exchange Rate Adjustment (تفاوت نرخ اسعار)' },
      { id: 'other_less', label: 'Other Reason for Less Payment (سایر دلایل پرداخت کمتر)' }
    ],
    non_delivery: [
      { id: 'returned_or_cancelled', label: `Parcel ${shipment.status.toUpperCase()} — Product Not Taken by Receiver (عدم تحویل کالا به گیرنده)` },
      { id: 'buyer_refused', label: 'Buyer Refused Order at Destination (رد سفارش توسط خریدار)' },
      { id: 'sender_cancelled', label: 'Cancelled at Sender Request (لغو به درخواست فرستنده)' }
    ]
  };

  const handleSelectAdjustmentType = (type: PriceAdjustmentType) => {
    setAdjustmentType(type);
    if (type === 'exact') {
      setAdjustmentAmount(0);
      setActualCollectedAmount(originalProductPrice);
      setReasonCategory('exact_payment');
    } else if (type === 'extra') {
      const defaultExtra = adjustmentAmount > 0 ? adjustmentAmount : 100;
      setAdjustmentAmount(defaultExtra);
      setActualCollectedAmount(originalProductPrice + defaultExtra);
      setReasonCategory('seller_buyer_agreed_up');
    } else if (type === 'less') {
      const defaultLess = adjustmentAmount > 0 && adjustmentAmount <= originalProductPrice ? adjustmentAmount : Math.min(100, originalProductPrice);
      setAdjustmentAmount(defaultLess);
      setActualCollectedAmount(Math.max(0, originalProductPrice - defaultLess));
      setReasonCategory('seller_discount_agreed');
    }
  };

  const handleDiffChange = (val: number) => {
    const cleanDiff = Math.max(0, Math.round(val || 0));
    if (adjustmentType === 'extra') {
      setAdjustmentAmount(cleanDiff);
      setActualCollectedAmount(originalProductPrice + cleanDiff);
    } else if (adjustmentType === 'less') {
      const cappedDiff = Math.min(originalProductPrice, cleanDiff);
      setAdjustmentAmount(cappedDiff);
      setActualCollectedAmount(Math.max(0, originalProductPrice - cappedDiff));
    }
  };

  const handleActualCollectedChange = (val: number) => {
    const cleanTotal = Math.max(0, Math.round(val || 0));
    setActualCollectedAmount(cleanTotal);
    if (shipment.status === 'delivered') {
      if (cleanTotal === originalProductPrice) {
        setAdjustmentType('exact');
        setAdjustmentAmount(0);
        setReasonCategory('exact_payment');
      } else if (cleanTotal > originalProductPrice) {
        setAdjustmentType('extra');
        setAdjustmentAmount(cleanTotal - originalProductPrice);
        if (reasonCategory === 'exact_payment' || reasonCategory.includes('less') || reasonCategory.includes('discount')) {
          setReasonCategory('seller_buyer_agreed_up');
        }
      } else {
        setAdjustmentType('less');
        setAdjustmentAmount(originalProductPrice - cleanTotal);
        if (reasonCategory === 'exact_payment' || reasonCategory.includes('up') || reasonCategory.includes('extra')) {
          setReasonCategory('seller_discount_agreed');
        }
      }
    }
  };

  // Live Reconciled Calculations (Service Fee & Destination Commission stay FIXED)
  const reconciledRemittanceDue = shipment.status === 'delivered'
    ? Math.max(0, actualCollectedAmount - fixedDestCommission)
    : (actualCollectedAmount > 0 ? Math.max(0, actualCollectedAmount - fixedDestCommission) : 0);

  const reconciledSellerPayout = shipment.status === 'delivered'
    ? Math.max(0, actualCollectedAmount - fixedDestCommission - fixedServiceFee + discountAmount)
    : 0;

  const originalExpectedRemittance = Math.max(0, originalProductPrice - fixedDestCommission);
  const originalExpectedSellerPayout = Math.max(0, originalProductPrice - fixedDestCommission - fixedServiceFee + discountAmount);

  const activeReasonList = shipment.status !== 'delivered'
    ? reasonOptions.non_delivery
    : adjustmentType === 'extra'
    ? reasonOptions.extra
    : adjustmentType === 'less'
    ? reasonOptions.less
    : reasonOptions.exact;

  const resolvedReasonLabel =
    activeReasonList.find(r => r.id === reasonCategory)?.label ||
    (adjustmentType === 'exact' ? 'Exact Product Price Collected' : 'Delivery Price Adjustment');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ok = recordDeliveryPaymentSettlement(shipment.id, {
      adjustmentType,
      adjustmentAmount,
      actualCollectedAmount,
      reasonCategory,
      reasonLabel: resolvedReasonLabel,
      reportNote: reportNote.trim() || undefined
    });
    if (ok) {
      if (onSuccess) onSuccess();
      onClose();
    }
  };

  const handleAdminUnlock = () => {
    const ok = unlockDeliveryPaymentSettlement(shipment.id, 'Admin unlocked for branch correction');
    if (ok) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto max-h-[94vh] flex flex-col">
        
        {/* Top Header */}
        <div className={`p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between ${
          isLocked
            ? 'bg-gradient-to-r from-emerald-600/15 via-teal-500/10 to-slate-900/5'
            : 'bg-gradient-to-r from-amber-500/15 via-emerald-500/10 to-blue-500/10'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 font-bold shadow-xs ${
              isLocked
                ? 'bg-emerald-600 text-white'
                : 'bg-amber-500 text-white'
            }`}>
              {isLocked ? <Lock className="w-5 h-5" /> : <DollarSign className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white">
                  {isLocked
                    ? 'Locked Payment & Reconciliation Report'
                    : 'Record Payment, Price Adjustment & Report'}
                </h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                  shipment.status === 'delivered'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                }`}>
                  {shipment.status}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {isLocked
                  ? `Reconciliation ID: #${existingSettlement?.reconciliationId} • Protected by Double-Payout Lock`
                  : `Report collected money to ${origBranch?.name || 'Main / Sender Branch'} & auto-add to Remittance`}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto text-xs">
          
          {/* Consignment Route & Parties Strip */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Waybill & Route</span>
              <div className="font-mono font-black text-red-600 dark:text-red-400 text-sm">{shipment.cnNumber}</div>
              <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1 mt-0.5">
                <span>{origBranch?.city || shipment.sender.city}</span>
                <ArrowRight className="w-3 h-3 text-slate-400" />
                <span>{destBranch?.city || shipment.receiver.city}</span>
              </div>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Sender (Seller)</span>
              <div className="font-bold text-slate-900 dark:text-white truncate">{shipment.sender.name}</div>
              <div className="font-mono text-[11px] text-slate-500">{shipment.sender.phone}</div>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Receiver (Buyer)</span>
              <div className="font-bold text-slate-900 dark:text-white truncate">{shipment.receiver.name}</div>
              <div className="font-mono text-[11px] text-slate-500">{shipment.receiver.phone}</div>
            </div>
          </div>

          {/* Original Booking Price & Fixed Fees Reference */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="p-3 rounded-2xl bg-slate-100/80 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center">
              <span className="text-[10px] font-bold text-slate-500 block">Original Product Price</span>
              <span className="font-mono font-black text-sm sm:text-base text-slate-900 dark:text-white">
                {originalProductPrice.toLocaleString()} AFN
              </span>
              <span className="text-[9.5px] text-slate-400 block">Booked Value</span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-100/80 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center">
              <span className="text-[10px] font-bold text-slate-500 block">Service Fee (Fixed)</span>
              <span className="font-mono font-black text-sm sm:text-base text-slate-800 dark:text-slate-200">
                {fixedServiceFee.toLocaleString()} AFN
              </span>
              <span className="text-[9.5px] text-emerald-600 dark:text-emerald-400 font-bold block">🔒 Stays Fixed</span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-100/80 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center">
              <span className="text-[10px] font-bold text-slate-500 block">Dest. Comm (Fixed)</span>
              <span className="font-mono font-black text-sm sm:text-base text-slate-800 dark:text-slate-200">
                {fixedDestCommission.toLocaleString()} AFN
              </span>
              <span className="text-[9.5px] text-emerald-600 dark:text-emerald-400 font-bold block">🔒 Stays Fixed</span>
            </div>
          </div>

          {isLocked && existingSettlement ? (
            /* VIEW MODE: LOCKED RECONCILIATION CERTIFICATE */
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-emerald-50/90 dark:bg-emerald-950/30 border-2 border-emerald-300 dark:border-emerald-800 space-y-3">
                <div className="flex items-center justify-between border-b border-emerald-200 dark:border-emerald-800/80 pb-2.5">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    <div>
                      <div className="font-black text-emerald-950 dark:text-emerald-100 text-xs sm:text-sm">
                        Payment Locked & Reported to {origBranch?.name || 'Main Branch'}
                      </div>
                      <div className="text-[10.5px] text-emerald-700 dark:text-emerald-300 font-mono">
                        Reconciliation Cert: #{existingSettlement.reconciliationId} • {new Date(existingSettlement.settledAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-600 text-white font-black text-[10px] flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    <span>LOCKED</span>
                  </span>
                </div>

                {/* Adjustment Highlight Banner */}
                <div className={`p-3 rounded-xl border flex items-center justify-between ${
                  existingSettlement.adjustmentType === 'extra'
                    ? 'bg-emerald-100/80 dark:bg-emerald-900/40 border-emerald-300 text-emerald-900 dark:text-emerald-100'
                    : existingSettlement.adjustmentType === 'less'
                    ? 'bg-amber-100/80 dark:bg-amber-900/40 border-amber-300 text-amber-900 dark:text-amber-100'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white'
                }`}>
                  <div>
                    <div className="text-[10px] uppercase font-bold opacity-75">Customer Payment Outcome</div>
                    <div className="font-black text-sm mt-0.5">
                      {existingSettlement.adjustmentType === 'exact' && 'Exact Amount Paid by Customer (=)'}
                      {existingSettlement.adjustmentType === 'extra' && `Customer Paid EXTRA (+${existingSettlement.adjustmentAmount.toLocaleString()} AFN)`}
                      {existingSettlement.adjustmentType === 'less' && `Customer Paid LESS (-${existingSettlement.adjustmentAmount.toLocaleString()} AFN)`}
                    </div>
                  </div>
                  <div className="text-end font-mono">
                    <div className="text-[10px] opacity-75">Actual Collected</div>
                    <div className="text-base font-black">{existingSettlement.actualCollectedAmount.toLocaleString()} AFN</div>
                  </div>
                </div>

                {/* Reconciled Numbers Table */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800/60">
                    <span className="text-[10px] text-slate-500 block font-semibold">Auto-Queued Remittance to HQ/Sender:</span>
                    <span className="font-mono font-black text-sm text-amber-600 dark:text-amber-400">
                      {existingSettlement.reconciledRemittanceDue.toLocaleString()} AFN
                    </span>
                    <span className="text-[9.5px] text-slate-400 block">
                      Status: {(shipment.remittanceStatus || 'pending').replace(/_/g, ' ').toUpperCase()}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800/60">
                    <span className="text-[10px] text-slate-500 block font-semibold">Reconciled Net Seller Payout:</span>
                    <span className="font-mono font-black text-sm text-emerald-600 dark:text-emerald-400">
                      {existingSettlement.reconciledSellerPayout.toLocaleString()} AFN
                    </span>
                    <span className="text-[9.5px] text-slate-400 block">
                      Payout: {(shipment.sellerPayoutStatus || 'ready_for_payout').replace(/_/g, ' ').toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Reason & Note Reported to Main/Sender Branch */}
                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">
                    Official Report Sent to {origBranch?.name || 'Main / Sender Branch'}:
                  </div>
                  <div className="font-bold text-slate-900 dark:text-white">
                    {existingSettlement.reasonLabel}
                  </div>
                  {existingSettlement.reportNote && (
                    <div className="text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 p-2 rounded-lg font-medium mt-1">
                      "{existingSettlement.reportNote}"
                    </div>
                  )}
                  <div className="text-[10px] text-slate-400 pt-1">
                    Reported by: <strong>{existingSettlement.settledByUserName}</strong> ({existingSettlement.settledByBranchName})
                  </div>
                </div>
              </div>

              {/* Admin Unlock Option (if Super Admin and not yet remitted/disbursed) */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                {currentUser.role === 'super_admin' &&
                  shipment.remittanceStatus !== 'submitted_to_headoffice' &&
                  shipment.remittanceStatus !== 'settled' &&
                  shipment.sellerPayoutStatus !== 'disbursed_by_branch' &&
                  shipment.sellerPayoutStatus !== 'confirmed_by_customer' ? (
                  <button
                    type="button"
                    onClick={handleAdminUnlock}
                    className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Unlock className="w-3.5 h-3.5" />
                    <span>Unlock for Correction (Super Admin)</span>
                  </button>
                ) : (
                  <span className="text-[10.5px] text-slate-400 flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    <span>Protected by Double-Payout & Reconciliation System</span>
                  </span>
                )}

                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold rounded-xl text-xs cursor-pointer"
                >
                  Close Report
                </button>
              </div>
            </div>
          ) : (
            /* FORM MODE: RECORD PAYMENT, EXTRA/LESS ADJUSTMENT & REPORT */
            <form onSubmit={handleSubmit} className="space-y-4">
              {shipment.status === 'delivered' ? (
                <>
                  {/* 3-Button Choice: Exact / + Paid Extra / - Paid Less */}
                  <div>
                    <label className="block text-xs font-black text-slate-800 dark:text-slate-200 mb-2">
                      1. How much product money did the customer pay at delivery?
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {/* Button 1: Exact */}
                      <button
                        type="button"
                        onClick={() => handleSelectAdjustmentType('exact')}
                        className={`p-3 rounded-2xl border-2 text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                          adjustmentType === 'exact'
                            ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/50 text-blue-900 dark:text-blue-100 shadow-sm ring-2 ring-blue-500/20'
                            : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className={`w-7 h-7 rounded-xl flex items-center justify-center font-black ${
                          adjustmentType === 'exact' ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600'
                        }`}>
                          <Equal className="w-4 h-4" />
                        </div>
                        <span className="font-black text-xs">Exact Amount</span>
                        <span className="text-[10px] opacity-75 font-mono">{originalProductPrice.toLocaleString()} AFN</span>
                      </button>

                      {/* Button 2: + Paid Extra */}
                      <button
                        type="button"
                        onClick={() => handleSelectAdjustmentType('extra')}
                        className={`p-3 rounded-2xl border-2 text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                          adjustmentType === 'extra'
                            ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-100 shadow-sm ring-2 ring-emerald-500/20'
                            : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className={`w-7 h-7 rounded-xl flex items-center justify-center font-black ${
                          adjustmentType === 'extra' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600'
                        }`}>
                          <TrendingUp className="w-4 h-4" />
                        </div>
                        <span className="font-black text-xs">+ Paid Extra</span>
                        <span className="text-[10px] opacity-75">Price Went Up</span>
                      </button>

                      {/* Button 3: - Paid Less */}
                      <button
                        type="button"
                        onClick={() => handleSelectAdjustmentType('less')}
                        className={`p-3 rounded-2xl border-2 text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                          adjustmentType === 'less'
                            ? 'border-amber-600 bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-100 shadow-sm ring-2 ring-amber-500/20'
                            : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className={`w-7 h-7 rounded-xl flex items-center justify-center font-black ${
                          adjustmentType === 'less' ? 'bg-amber-600 text-white' : 'bg-amber-50 dark:bg-amber-950 text-amber-600'
                        }`}>
                          <TrendingDown className="w-4 h-4" />
                        </div>
                        <span className="font-black text-xs">- Paid Less</span>
                        <span className="text-[10px] opacity-75">Price Went Down</span>
                      </button>
                    </div>
                  </div>

                  {/* Dynamic Money Input Box */}
                  {adjustmentType !== 'exact' ? (
                    <div className={`p-3.5 rounded-2xl border-2 space-y-3 ${
                      adjustmentType === 'extra'
                        ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800'
                        : 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800'
                    }`}>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-black text-slate-800 dark:text-slate-200 mb-1">
                            {adjustmentType === 'extra'
                              ? 'Extra Money Paid by Customer (+ AFN):'
                              : 'Less Money Paid by Customer (- AFN):'}
                          </label>
                          <div className="relative">
                            <span className={`absolute start-3 top-1/2 -translate-y-1/2 font-mono font-black text-sm ${
                              adjustmentType === 'extra' ? 'text-emerald-600' : 'text-amber-600'
                            }`}>
                              {adjustmentType === 'extra' ? '+' : '-'}
                            </span>
                            <input
                              type="number"
                              min="0"
                              max={adjustmentType === 'less' ? originalProductPrice : undefined}
                              value={adjustmentAmount}
                              onChange={(e) => handleDiffChange(Number(e.target.value))}
                              className="w-full h-10 ps-7 pe-12 font-mono font-black text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                            />
                            <span className="absolute end-3 top-1/2 -translate-y-1/2 text-[10px] font-mono font-bold text-slate-400">
                              AFN
                            </span>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-black text-slate-800 dark:text-slate-200 mb-1">
                            Final Total Collected from Customer (AFN):
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              min="0"
                              value={actualCollectedAmount}
                              onChange={(e) => handleActualCollectedChange(Number(e.target.value))}
                              className="w-full h-10 ps-3 pe-12 font-mono font-black text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                            />
                            <span className="absolute end-3 top-1/2 -translate-y-1/2 text-[10px] font-mono font-bold text-slate-400">
                              AFN
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 flex items-center justify-between">
                      <span className="font-bold text-blue-900 dark:text-blue-200">
                        Actual Cash Collected from Customer:
                      </span>
                      <span className="font-mono font-black text-sm text-blue-700 dark:text-blue-300">
                        {actualCollectedAmount.toLocaleString()} AFN (Exact Match)
                      </span>
                    </div>
                  )}
                </>
              ) : (
                /* Returned or Cancelled Settlement Box */
                <div className="p-3.5 rounded-2xl bg-red-50/70 dark:bg-red-950/30 border border-red-200 dark:border-red-800 space-y-2.5">
                  <div className="font-black text-red-900 dark:text-red-200 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    <span>Parcel Marked as {shipment.status.toUpperCase()}</span>
                  </div>
                  <p className="text-[11px] text-red-700 dark:text-red-300">
                    Since the parcel was {shipment.status}, product money collected from the receiver defaults to 0 AFN. Confirming this locks the parcel so it cannot be accidentally paid out to the seller.
                  </p>
                  <div className="flex items-center justify-between pt-1">
                    <span className="font-bold text-slate-700 dark:text-slate-300">Amount Collected at Destination (AFN):</span>
                    <input
                      type="number"
                      min="0"
                      value={actualCollectedAmount}
                      onChange={(e) => handleActualCollectedChange(Number(e.target.value))}
                      className="w-32 h-9 px-3 font-mono font-black text-right bg-white dark:bg-slate-900 border border-red-300 dark:border-red-700 rounded-xl"
                    />
                  </div>
                </div>
              )}

              {/* Reason & Report to Main / Sender Branch */}
              <div className="space-y-2.5">
                <label className="block text-xs font-black text-slate-800 dark:text-slate-200">
                  2. Report Reason to {origBranch?.name || 'Main / Sender Branch'}:
                </label>
                <select
                  value={reasonCategory}
                  onChange={(e) => setReasonCategory(e.target.value)}
                  className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  {activeReasonList.map(r => (
                    <option key={r.id} value={r.id}>{r.label}</option>
                  ))}
                </select>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Explanation / Report Note for Main Branch & Sender Branch:
                  </label>
                  <input
                    type="text"
                    value={reportNote}
                    onChange={(e) => setReportNote(e.target.value)}
                    placeholder={
                      adjustmentType === 'extra'
                        ? 'e.g. Customer paid +200 AFN extra as agreed with seller on phone'
                        : adjustmentType === 'less'
                        ? 'e.g. Seller agreed to 150 AFN discount for buyer at delivery'
                        : 'Optional delivery payment remark for Main Branch...'
                    }
                    className="w-full h-9.5 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              {/* Live Financial Reconciliation Breakdown */}
              <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-2.5">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 pb-1.5 border-b border-slate-800">
                  <span>3. Automatic Reconciliation & Lock Preview</span>
                  <span className="text-emerald-400 font-mono">Fixed Fees Protected</span>
                </div>

                <div className="flex justify-between text-slate-300">
                  <span>Original Product Price:</span>
                  <span className="font-mono font-bold">{originalProductPrice.toLocaleString()} AFN</span>
                </div>

                {shipment.status === 'delivered' && adjustmentType !== 'exact' && (
                  <div className={`flex justify-between font-bold ${
                    adjustmentType === 'extra' ? 'text-emerald-400' : 'text-amber-400'
                  }`}>
                    <span>{adjustmentType === 'extra' ? 'Customer Paid Extra (+):' : 'Customer Paid Less (-):'}</span>
                    <span className="font-mono">
                      {adjustmentType === 'extra' ? `+${adjustmentAmount.toLocaleString()}` : `-${adjustmentAmount.toLocaleString()}`} AFN
                    </span>
                  </div>
                )}

                <div className="flex justify-between text-white font-black pt-1 border-t border-slate-800">
                  <span>Actual Cash Collected from Customer:</span>
                  <span className="font-mono text-sm">{actualCollectedAmount.toLocaleString()} AFN</span>
                </div>

                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>Destination Branch Commission (Fixed — Kept by {destBranch?.city || 'Dest'}):</span>
                  <span className="font-mono">-{fixedDestCommission.toLocaleString()} AFN</span>
                </div>

                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>Service & Handling Fee (Fixed — Origin/HQ):</span>
                  <span className="font-mono">-{fixedServiceFee.toLocaleString()} AFN</span>
                </div>

                <div className="pt-2 border-t border-slate-800 grid grid-cols-2 gap-2.5">
                  <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30">
                    <span className="text-[10px] text-amber-300 font-bold block">
                      Auto-Added to Remittance (To HQ):
                    </span>
                    <span className="font-mono font-black text-sm text-amber-300">
                      {reconciledRemittanceDue.toLocaleString()} AFN
                    </span>
                    {reconciledRemittanceDue !== originalExpectedRemittance && (
                      <span className="text-[9.5px] text-slate-400 block font-mono">
                        Was: {originalExpectedRemittance.toLocaleString()} AFN
                      </span>
                    )}
                  </div>

                  <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30">
                    <span className="text-[10px] text-emerald-300 font-bold block">
                      Updated Net Seller Payout:
                    </span>
                    <span className="font-mono font-black text-sm text-emerald-300">
                      {reconciledSellerPayout.toLocaleString()} AFN
                    </span>
                    {reconciledSellerPayout !== originalExpectedSellerPayout && (
                      <span className="text-[9.5px] text-slate-400 block font-mono">
                        Was: {originalExpectedSellerPayout.toLocaleString()} AFN
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <Lock className="w-4 h-4" />
                  <span>Confirm Payment, Report to Main Branch & Lock</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs cursor-pointer transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};
