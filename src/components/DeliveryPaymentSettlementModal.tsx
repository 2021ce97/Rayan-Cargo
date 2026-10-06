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
  ArrowRight,
  Layers,
  ChevronDown,
  ChevronUp,
  Percent,
  Truck
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
    language,
    t,
    recordDeliveryPaymentSettlement,
    unlockDeliveryPaymentSettlement
  } = useApp();

  if (!shipment) return null;

  const l = (en: string, fa: string, ps?: string) => {
    if (language === 'fa') return fa;
    if (language === 'ps') return ps || fa;
    return en;
  };

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

  // Portion 1: Product Price State
  const [adjustmentType, setAdjustmentType] = useState<PriceAdjustmentType>('exact');
  const [adjustmentAmount, setAdjustmentAmount] = useState<number>(0);
  const [actualCollectedAmount, setActualCollectedAmount] = useState<number>(
    shipment.status === 'delivered' ? originalProductPrice : 0
  );
  const [reasonCategory, setReasonCategory] = useState<string>('exact_payment');
  const [reportNote, setReportNote] = useState<string>('');

  // Portion 2A: Destination Commission State
  const [commissionAdjustmentType, setCommissionAdjustmentType] = useState<PriceAdjustmentType>('exact');
  const [commissionAdjustmentAmount, setCommissionAdjustmentAmount] = useState<number>(0);
  const [commissionReasonCategory, setCommissionReasonCategory] = useState<string>('exact_commission');

  // Portion 2B: Service / Transportation Fee State
  const [serviceFeeAdjustmentType, setServiceFeeAdjustmentType] = useState<PriceAdjustmentType>('exact');
  const [serviceFeeAdjustmentAmount, setServiceFeeAdjustmentAmount] = useState<number>(0);
  const [serviceFeeReasonCategory, setServiceFeeReasonCategory] = useState<string>('exact_service_fee');

  // Toggle for collapsible fees portion
  const [showFeesPortion, setShowFeesPortion] = useState<boolean>(false);

  useEffect(() => {
    if (existingSettlement) {
      setAdjustmentType(existingSettlement.adjustmentType);
      setAdjustmentAmount(existingSettlement.adjustmentAmount);
      setActualCollectedAmount(existingSettlement.actualCollectedAmount);
      setReasonCategory(existingSettlement.reasonCategory || 'exact_payment');
      setReportNote(existingSettlement.reportNote || '');

      setCommissionAdjustmentType(existingSettlement.commissionAdjustmentType || 'exact');
      setCommissionAdjustmentAmount(existingSettlement.commissionAdjustmentAmount || 0);
      setCommissionReasonCategory(existingSettlement.commissionReasonCategory || 'exact_commission');

      setServiceFeeAdjustmentType(existingSettlement.serviceFeeAdjustmentType || 'exact');
      setServiceFeeAdjustmentAmount(existingSettlement.serviceFeeAdjustmentAmount || 0);
      setServiceFeeReasonCategory(existingSettlement.serviceFeeReasonCategory || 'exact_service_fee');

      if (
        (existingSettlement.commissionAdjustmentType && existingSettlement.commissionAdjustmentType !== 'exact') ||
        (existingSettlement.serviceFeeAdjustmentType && existingSettlement.serviceFeeAdjustmentType !== 'exact')
      ) {
        setShowFeesPortion(true);
      }
    } else if (shipment.status === 'delivered') {
      setAdjustmentType('exact');
      setAdjustmentAmount(0);
      setActualCollectedAmount(originalProductPrice);
      setReasonCategory('exact_payment');
      setReportNote('');

      setCommissionAdjustmentType('exact');
      setCommissionAdjustmentAmount(0);
      setCommissionReasonCategory('exact_commission');

      setServiceFeeAdjustmentType('exact');
      setServiceFeeAdjustmentAmount(0);
      setServiceFeeReasonCategory('exact_service_fee');
    } else {
      setAdjustmentType('less');
      setAdjustmentAmount(originalProductPrice);
      setActualCollectedAmount(0);
      setReasonCategory('returned_or_cancelled');
      setReportNote('');
    }
  }, [shipment.id, shipment.status, originalProductPrice, existingSettlement]);

  if (!isEligibleStatus) return null;

  // Reason catalogs with tri-lingual labels
  const reasonOptions = {
    product: {
      exact: [
        { id: 'exact_payment', label: l('Exact Waybill Product Price Collected', 'دریافت مبلغ دقیق بارنامه', 'د بارلیک دقیق رقم اخیستل شوی') }
      ],
      extra: [
        { id: 'seller_buyer_agreed_up', label: l('Agreed between Seller & Buyer on Phone', 'توافق تلفنی فروشنده و خریدار', 'د پلورونکي او اخیستونکي ترمنځ د ټیلیفون هوکړه') },
        { id: 'market_price_increased', label: l('Product Value / Market Rate Increased', 'افزایش قیمت جنس / نرخ روز', 'د جنس قیمت / د ورځې نرخ لوړ شوی') },
        { id: 'extra_item_added', label: l('Extra Product / Quantity Added', 'محصول یا تعداد اضافه شده', 'جنس یا شمیر زیات شوی') },
        { id: 'currency_rate_diff', label: l('Currency Exchange Rate Adjustment', 'تفاوت نرخ اسعار و صرافی', 'د اسعارو د تبادلې نرخ توپیر') },
        { id: 'other_extra', label: l('Other Reason for Extra Payment', 'سایر دلایل پرداخت بیشتر', 'د زیاتې تادیې نور لاملونه') }
      ],
      less: [
        { id: 'seller_discount_agreed', label: l('Discount Agreed by Seller on Phone', 'تخفیف با هماهنگی تلفنی فروشنده', 'د پلورونکي په ټیلیفوني هوکړه تخفیف') },
        { id: 'market_price_decreased', label: l('Product Value / Market Price Decreased', 'کاهش قیمت جنس', 'د جنس قیمت راټیټ شوی') },
        { id: 'partial_item_issue', label: l('Partial Item Missing or Minor Damage', 'کسری یا آسیب جزئی کالا', 'د جنس کموالی یا لږ زیان') },
        { id: 'currency_rate_diff_down', label: l('Currency Exchange Rate Adjustment', 'تفاوت نرخ اسعار و صرافی', 'د اسعارو د تبادلې نرخ توپیر') },
        { id: 'other_less', label: l('Other Reason for Less Payment', 'سایر دلایل پرداخت کمتر', 'د کمې تادیې نور لاملونه') }
      ],
      non_delivery: [
        { id: 'returned_or_cancelled', label: l(`Parcel ${shipment.status.toUpperCase()} — Product Not Taken by Receiver`, `بسته ${shipment.status} — عدم تحویل کالا به گیرنده`, `بسته ${shipment.status} — اخیستونکي ته نه ده سپارل شوې`) },
        { id: 'buyer_refused', label: l('Buyer Refused Order at Destination', 'رد سفارش توسط خریدار در مقصد', 'په مقصد کې د اخیستونکي لخوا رد شوی') },
        { id: 'sender_cancelled', label: l('Cancelled at Sender Request', 'لغو به درخواست فرستنده', 'د فرستونکي په غوښتنه لغوه شوی') }
      ]
    },
    commission: {
      exact: [
        { id: 'exact_commission', label: l('Standard Destination Commission Kept', 'کمیسیون استاندارد نمایندگی مقصد', 'د مقصد څانګې معیاري کمیشن') }
      ],
      extra: [
        { id: 'doorstep_remote_delivery', label: l('Doorstep Delivery / Remote Area (+ AFN)', 'توزیع درب منزل / ساحه دوردست (+ افغانی)', 'کور ته رسول / لیرې سیمه (+ افغانۍ)') },
        { id: 'heavy_stairs_lifting', label: l('Heavy Cargo / Upper Floors Stairs (+ AFN)', 'بار سنگین / انتقال به طبقات بالا (+ افغانی)', 'دروند بار / پورته پوړونو ته وړل (+ افغانۍ)') },
        { id: 'extended_storage', label: l('Extended Storage (>7 Days Hold) (+ AFN)', 'نگهداری طولانی در انبار (>۷ روز) (+ افغانی)', 'په ګودام کې اوږد ساتل (>۷ ورځې) (+ افغانۍ)') },
        { id: 'other_comm_extra', label: l('Other Commission Surcharge', 'سایر موارد کمیسیون اضافی', 'د کمیشن اضافه کولو نور لاملونه') }
      ],
      less: [
        { id: 'terminal_self_pickup', label: l('Consignee Picked up from Terminal (- AFN)', 'تحویل مستقیم گیرنده از ترمینال موترها (- افغانی)', 'له ترمینل څخه د اخیستونکي مستقیم اخیستل (- افغانۍ)') },
        { id: 'partner_branch_discount', label: l('Special Partner / Promotion Discount (- AFN)', 'تخفیف ویژه همکار / تبلیغاتی (- افغانی)', 'د همکار ځانګړی تخفیف (- افغانۍ)') },
        { id: 'other_comm_less', label: l('Other Commission Discount', 'سایر موارد کسر کمیسیون', 'د کمیشن کمښت نور لاملونه') }
      ]
    },
    serviceFee: {
      exact: [
        { id: 'exact_service_fee', label: l('Standard Freight / Service Fee', 'کرایه و هزینه خدمات استاندارد', 'معیاري کرایه او د خدماتو فیس') }
      ],
      extra: [
        { id: 'overweight_reweighed', label: l('Cargo Overweight / Re-weighed (+ AFN)', 'اضافه وزن در وزن‌کشی مجدد مقصد (+ افغانی)', 'په دوهم تللو کې زیات وزن (+ افغانۍ)') },
        { id: 'fragile_special_handling', label: l('Fragile Cargo Special Handling Surcharge (+ AFN)', 'هزینه بسته‌بندی و انتقال کالای حساس (+ افغانی)', 'د حساسو توکو ځانګړی مصارف (+ افغانۍ)') },
        { id: 'other_fee_extra', label: l('Other Freight Surcharge', 'سایر کرایه اضافی', 'نور اضافي کرایه') }
      ],
      less: [
        { id: 'sender_promo_discount', label: l('Sender Agreed Freight Discount (- AFN)', 'تخفیف کرایه با تایید فرستنده (- افغانی)', 'د فرستونکي په تایید د کرایې تخفیف (- افغانۍ)') },
        { id: 'loyalty_rate', label: l('Frequent Customer Loyalty Rate (- AFN)', 'نرخ تشویقی مشتری دایمی (- افغانی)', 'د داوامداره پیرودونکي تشویقي نرخ (- افغانۍ)') },
        { id: 'other_fee_less', label: l('Other Freight Discount', 'سایر تخفیف کرایه', 'نور د کرایې تخفیف') }
      ]
    }
  };

  // Product price calculations
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

  // Commission handlers
  const handleCommissionTypeSelect = (type: PriceAdjustmentType) => {
    setCommissionAdjustmentType(type);
    if (type === 'exact') {
      setCommissionAdjustmentAmount(0);
      setCommissionReasonCategory('exact_commission');
    } else if (type === 'extra') {
      const def = commissionAdjustmentAmount > 0 ? commissionAdjustmentAmount : 50;
      setCommissionAdjustmentAmount(def);
      setCommissionReasonCategory('doorstep_remote_delivery');
    } else if (type === 'less') {
      const def = commissionAdjustmentAmount > 0 ? commissionAdjustmentAmount : Math.min(30, fixedDestCommission);
      setCommissionAdjustmentAmount(def);
      setCommissionReasonCategory('terminal_self_pickup');
    }
  };

  // Service Fee handlers
  const handleServiceFeeTypeSelect = (type: PriceAdjustmentType) => {
    setServiceFeeAdjustmentType(type);
    if (type === 'exact') {
      setServiceFeeAdjustmentAmount(0);
      setServiceFeeReasonCategory('exact_service_fee');
    } else if (type === 'extra') {
      const def = serviceFeeAdjustmentAmount > 0 ? serviceFeeAdjustmentAmount : 100;
      setServiceFeeAdjustmentAmount(def);
      setServiceFeeReasonCategory('overweight_reweighed');
    } else if (type === 'less') {
      const def = serviceFeeAdjustmentAmount > 0 ? serviceFeeAdjustmentAmount : Math.min(50, fixedServiceFee);
      setServiceFeeAdjustmentAmount(def);
      setServiceFeeReasonCategory('sender_promo_discount');
    }
  };

  // Live Effective Financials
  let effectiveDestCommission = fixedDestCommission;
  if (commissionAdjustmentType === 'extra') {
    effectiveDestCommission = fixedDestCommission + commissionAdjustmentAmount;
  } else if (commissionAdjustmentType === 'less') {
    effectiveDestCommission = Math.max(0, fixedDestCommission - Math.min(fixedDestCommission, commissionAdjustmentAmount));
  }

  let effectiveServiceFee = fixedServiceFee;
  if (serviceFeeAdjustmentType === 'extra') {
    effectiveServiceFee = fixedServiceFee + serviceFeeAdjustmentAmount;
  } else if (serviceFeeAdjustmentType === 'less') {
    effectiveServiceFee = Math.max(0, fixedServiceFee - Math.min(fixedServiceFee, serviceFeeAdjustmentAmount));
  }

  const reconciledRemittanceDue = shipment.status === 'delivered'
    ? Math.max(0, actualCollectedAmount - effectiveDestCommission)
    : (actualCollectedAmount > 0 ? Math.max(0, actualCollectedAmount - effectiveDestCommission) : 0);

  const reconciledSellerPayout = shipment.status === 'delivered'
    ? Math.max(0, actualCollectedAmount - effectiveDestCommission - effectiveServiceFee + discountAmount)
    : 0;

  const activeProductReasons = shipment.status !== 'delivered'
    ? reasonOptions.product.non_delivery
    : adjustmentType === 'extra'
    ? reasonOptions.product.extra
    : adjustmentType === 'less'
    ? reasonOptions.product.less
    : reasonOptions.product.exact;

  const resolvedProductReasonLabel =
    activeProductReasons.find(r => r.id === reasonCategory)?.label ||
    (adjustmentType === 'exact' ? l('Exact Product Price Collected', 'دریافت مبلغ دقیق بارنامه') : l('Price Adjustment', 'تغییر قیمت کالا'));

  const activeCommissionReasons = commissionAdjustmentType === 'extra'
    ? reasonOptions.commission.extra
    : commissionAdjustmentType === 'less'
    ? reasonOptions.commission.less
    : reasonOptions.commission.exact;

  const resolvedCommissionReasonLabel =
    activeCommissionReasons.find(r => r.id === commissionReasonCategory)?.label ||
    (commissionAdjustmentType === 'exact' ? l('Standard Commission', 'کمیسیون استاندارد') : l('Commission Adjustment', 'تغییر کمیسیون'));

  const activeServiceFeeReasons = serviceFeeAdjustmentType === 'extra'
    ? reasonOptions.serviceFee.extra
    : serviceFeeAdjustmentType === 'less'
    ? reasonOptions.serviceFee.less
    : reasonOptions.serviceFee.exact;

  const resolvedServiceFeeReasonLabel =
    activeServiceFeeReasons.find(r => r.id === serviceFeeReasonCategory)?.label ||
    (serviceFeeAdjustmentType === 'exact' ? l('Standard Service Fee', 'کرایه استاندارد') : l('Service Fee Adjustment', 'تغییر کرایه'));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ok = recordDeliveryPaymentSettlement(shipment.id, {
      adjustmentType,
      adjustmentAmount,
      actualCollectedAmount,
      reasonCategory,
      reasonLabel: resolvedProductReasonLabel,
      reportNote: reportNote.trim() || undefined,
      commissionAdjustmentType,
      commissionAdjustmentAmount,
      commissionReasonCategory,
      commissionReasonLabel: resolvedCommissionReasonLabel,
      serviceFeeAdjustmentType,
      serviceFeeAdjustmentAmount,
      serviceFeeReasonCategory,
      serviceFeeReasonLabel: resolvedServiceFeeReasonLabel
    });
    if (ok) {
      if (onSuccess) onSuccess();
      onClose();
    }
  };

  const handleAdminUnlock = () => {
    const ok = unlockDeliveryPaymentSettlement(shipment.id, 'Admin unlocked for branch correction');
    if (ok) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in">
      <div 
        className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto max-h-[96vh] flex flex-col"
        dir={language === 'fa' || language === 'ps' ? 'rtl' : 'ltr'}
      >
        
        {/* Modal Top Header */}
        <div className={`p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between ${
          isLocked
            ? 'bg-gradient-to-r from-emerald-600/15 via-teal-500/10 to-slate-900/5'
            : 'bg-gradient-to-r from-amber-500/15 via-emerald-500/10 to-blue-500/10'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shrink-0 font-bold shadow-xs ${
              isLocked ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'
            }`}>
              {isLocked ? <Lock className="w-5 h-5 sm:w-6 sm:h-6" /> : <DollarSign className="w-5 h-5 sm:w-6 sm:h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-black text-xs sm:text-base text-slate-900 dark:text-white">
                  {isLocked
                    ? l('Locked Payment & Reconciliation Certificate', 'سند نهایی و قفل‌شده تسویه مالی و وصولی تحویل', 'د سپارلو او تصفیې قفل شوی سند')
                    : l('Delivery Payment Settlement & Price Adjustments', 'ثبت وصولی تحویل، تغییرات مالی و ارسال گزارش', 'د تحویلۍ پیسې ثبتول او د نرخ بدلون')}
                </h3>
                <span className={`px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase ${
                  shipment.status === 'delivered'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                }`}>
                  {shipment.status}
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {isLocked
                  ? l(`Reconciliation ID: #${existingSettlement?.reconciliationId} • Double-Payout Protection Active`, `کد رهگیری: #${existingSettlement?.reconciliationId} • قفل ضد تکرار پرداخت فعال است`, `د تصفیې کود: #${existingSettlement?.reconciliationId}`)
                  : l(`Report collected cash to ${origBranch?.name || 'Main / Sender Branch'} & auto-queue to Remittances`, `ارسال گزارش آنلاین به ${origBranch?.name || 'شعبه مبدا / مرکز'} و افزودن خودکار به حواله‌جات`, `اصلي څانګې ته راپور استول او حساب ته اضافه کول`)}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 flex items-center justify-center transition-colors cursor-pointer shrink-0"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Modal Content */}
        <div className="p-3 sm:p-5 space-y-4 overflow-y-auto text-xs">
          
          {/* Waybill & Route Info */}
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">{l('Waybill & Route', 'نمبر بارنامه و مسیر', 'د بارلیک شمیره او لاره')}</span>
              <div className="font-mono font-black text-red-600 dark:text-red-400 text-sm">{shipment.cnNumber}</div>
              <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1 mt-0.5">
                <span>{origBranch?.city || shipment.sender.city}</span>
                <ArrowRight className="w-3 h-3 text-slate-400 rtl:rotate-180" />
                <span>{destBranch?.city || shipment.receiver.city}</span>
              </div>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">{l('Sender (Seller)', 'فرستنده (فروشنده)', 'فرستونکی (پلورونکی)')}</span>
              <div className="font-bold text-slate-900 dark:text-white truncate">{shipment.sender.name}</div>
              <div className="font-mono text-[11px] text-slate-500" dir="ltr">{shipment.sender.phone}</div>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">{l('Receiver (Buyer)', 'گیرنده (خریدار)', 'اخیستونکی')}</span>
              <div className="font-bold text-slate-900 dark:text-white truncate">{shipment.receiver.name}</div>
              <div className="font-mono text-[11px] text-slate-500" dir="ltr">{shipment.receiver.phone}</div>
            </div>
          </div>

          {/* Reference Booked Baseline Cards */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2.5 sm:p-3 rounded-2xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-center">
              <span className="text-[9.5px] sm:text-[10px] font-bold text-slate-500 block">{l('Original Product Price', 'قیمت اولیه جنس', 'د توکو اصلي قیمت')}</span>
              <span className="font-mono font-black text-xs sm:text-base text-slate-900 dark:text-white">
                {originalProductPrice.toLocaleString()} AFN
              </span>
              <span className="text-[9px] text-slate-400 block">{l('Booked Value', 'مبلغ ثبت‌شده', 'ثبت شوی ارزښت')}</span>
            </div>

            <div className="p-2.5 sm:p-3 rounded-2xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-center">
              <span className="text-[9.5px] sm:text-[10px] font-bold text-slate-500 block">{l('Destination Commission', 'کمیسیون نمایندگی', 'د څانګې کمیشن')}</span>
              <span className="font-mono font-black text-xs sm:text-base text-slate-800 dark:text-slate-200">
                {fixedDestCommission.toLocaleString()} AFN
              </span>
              <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold block">
                {commissionAdjustmentType === 'exact' ? l('Standard Base', 'پایه استاندارد', 'معیاري پایه') : `${effectiveDestCommission.toLocaleString()} AFN (Adjusted)`}
              </span>
            </div>

            <div className="p-2.5 sm:p-3 rounded-2xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-center">
              <span className="text-[9.5px] sm:text-[10px] font-bold text-slate-500 block">{l('Freight / Service Fee', 'کرایه و خدمات شرکت', 'د کرایې فیس')}</span>
              <span className="font-mono font-black text-xs sm:text-base text-slate-800 dark:text-slate-200">
                {fixedServiceFee.toLocaleString()} AFN
              </span>
              <span className="text-[9px] text-blue-600 dark:text-blue-400 font-bold block">
                {serviceFeeAdjustmentType === 'exact' ? l('Standard Base', 'پایه استاندارد', 'معیاري پایه') : `${effectiveServiceFee.toLocaleString()} AFN (Adjusted)`}
              </span>
            </div>
          </div>

          {isLocked && existingSettlement ? (
            /* VIEW MODE: PERMANENT LOCKED RECONCILIATION CERTIFICATE */
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-emerald-50/90 dark:bg-emerald-950/30 border-2 border-emerald-300 dark:border-emerald-800 space-y-3">
                <div className="flex items-center justify-between border-b border-emerald-200 dark:border-emerald-800/80 pb-2.5">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    <div>
                      <div className="font-black text-emerald-950 dark:text-emerald-100 text-xs sm:text-sm">
                        {l(`Payment Reconciled & Reported to ${origBranch?.name || 'Main Branch'}`, `وصولی تسویه و به ${origBranch?.name || 'شعبه مبدا / مرکز'} گزارش شد`, `پیسې ثبت شوې او راپور ورکړل شو`)}
                      </div>
                      <div className="text-[10px] sm:text-[10.5px] text-emerald-700 dark:text-emerald-300 font-mono">
                        {l('Reconciliation Cert #', 'سند تصفیه #', 'د تصفیې سند #')}{existingSettlement.reconciliationId} • {new Date(existingSettlement.settledAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-600 text-white font-black text-[10px] flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    <span>{l('LOCKED', 'قفل شده', 'قفل شوی')}</span>
                  </span>
                </div>

                {/* 3 Outcome Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 font-bold block">{l('Actual Collected from Buyer', 'وصولی واقعی از گیرنده', 'له پیرودونکي څخه ترلاسه شوې')}</span>
                    <span className="text-sm font-mono font-black text-slate-900 dark:text-white">
                      {existingSettlement.actualCollectedAmount.toLocaleString()} AFN
                    </span>
                    <span className="text-[9px] text-slate-500 block mt-0.5">
                      {existingSettlement.adjustmentType === 'exact' ? l('Exact (=)', 'دقیق (=)') : existingSettlement.adjustmentType === 'extra' ? `+${existingSettlement.adjustmentAmount} Extra` : `-${existingSettlement.adjustmentAmount} Less`}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 font-bold block">{l('Destination Commission Kept', 'کمیسیون کسرشده نمایندگی', 'د مقصد څانګې پاتې کمیشن')}</span>
                    <span className="text-sm font-mono font-black text-emerald-600">
                      {existingSettlement.effectiveDestCommission ?? existingSettlement.fixedDestCommission} AFN
                    </span>
                    <span className="text-[9px] text-slate-500 block mt-0.5">
                      {existingSettlement.commissionAdjustmentType === 'extra' ? `+${existingSettlement.commissionAdjustmentAmount} Surcharge` : existingSettlement.commissionAdjustmentType === 'less' ? `-${existingSettlement.commissionAdjustmentAmount} Discount` : l('Standard', 'استاندارد')}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 font-bold block">{l('Transportation Fee', 'کرایه و مصارف انتقال', 'د کرایې مصارف')}</span>
                    <span className="text-sm font-mono font-black text-blue-600">
                      {existingSettlement.effectiveServiceFee ?? existingSettlement.fixedServiceFee} AFN
                    </span>
                    <span className="text-[9px] text-slate-500 block mt-0.5">
                      {existingSettlement.serviceFeeAdjustmentType === 'extra' ? `+${existingSettlement.serviceFeeAdjustmentAmount} Overweight` : existingSettlement.serviceFeeAdjustmentType === 'less' ? `-${existingSettlement.serviceFeeAdjustmentAmount} Promo` : l('Standard', 'استاندارد')}
                    </span>
                  </div>
                </div>

                {/* Final Reconciled Balances */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800/60">
                    <span className="text-[10px] text-slate-500 block font-bold">{l('Auto-Queued Remittance to HQ:', 'مبلغ ارسالی در حواله به مرکز/مبدا:', 'اصلي څانګې ته استول شوی رقم:')}</span>
                    <span className="font-mono font-black text-sm sm:text-base text-amber-600 dark:text-amber-400">
                      {existingSettlement.reconciledRemittanceDue.toLocaleString()} AFN
                    </span>
                    <span className="text-[9px] text-slate-400 block mt-0.5">
                      {l('Remittance Status: ', 'وضعیت حواله: ', 'د حوالې حالت: ')}{(shipment.remittanceStatus || 'pending').replace(/_/g, ' ').toUpperCase()}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800/60">
                    <span className="text-[10px] text-slate-500 block font-bold">{l('Reconciled Net Seller Cash Payout:', 'خالص پرداختی نهایی به مشتری فروشنده:', 'پلورونکي ته د تادیې خالص رقم:')}</span>
                    <span className="font-mono font-black text-sm sm:text-base text-emerald-600 dark:text-emerald-400">
                      {existingSettlement.reconciledSellerPayout.toLocaleString()} AFN
                    </span>
                    <span className="text-[9px] text-slate-400 block mt-0.5">
                      {l('Payout Status: ', 'وضعیت پرداخت: ', 'د تادیې حالت: ')}{(shipment.sellerPayoutStatus || 'ready_for_payout').replace(/_/g, ' ').toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Reasons Audit Box */}
                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1 text-[11px]">
                  <div className="font-bold text-slate-900 dark:text-white">
                    {l('Official Delivery Report: ', 'گزارش رسمی تحویل: ', 'د تحویلۍ رسمي راپور: ')}
                    <span className="text-slate-700 dark:text-slate-300 font-semibold">{existingSettlement.reasonLabel}</span>
                  </div>
                  {existingSettlement.commissionReasonLabel && existingSettlement.commissionAdjustmentType !== 'exact' && (
                    <div className="text-slate-600 dark:text-slate-400">
                      • {l('Commission Reason: ', 'علت تغییر کمیسیون: ', 'د کمیشن علت: ')}{existingSettlement.commissionReasonLabel}
                    </div>
                  )}
                  {existingSettlement.serviceFeeReasonLabel && existingSettlement.serviceFeeAdjustmentType !== 'exact' && (
                    <div className="text-slate-600 dark:text-slate-400">
                      • {l('Freight Reason: ', 'علت تغییر کرایه: ', 'د کرایې علت: ')}{existingSettlement.serviceFeeReasonLabel}
                    </div>
                  )}
                  {existingSettlement.reportNote && (
                    <div className="bg-slate-50 dark:bg-slate-800 p-2 rounded-lg font-medium text-slate-700 dark:text-slate-300 mt-1">
                      "{existingSettlement.reportNote}"
                    </div>
                  )}
                  <div className="text-[10px] text-slate-400 pt-1">
                    {l('Reported by: ', 'ثبت توسط: ', 'ثبت کوونکی: ')}<strong>{existingSettlement.settledByUserName}</strong> ({existingSettlement.settledByBranchName})
                  </div>
                </div>
              </div>

              {/* Admin Unlock or Close */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-800 flex-wrap">
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
                    <span>{l('Unlock for Correction (Super Admin)', 'باز کردن قفل جهت ویرایش (مدیر کل)', 'د سمون لپاره قفل خلاصول')}</span>
                  </button>
                ) : (
                  <span className="text-[10.5px] text-slate-400 flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    <span>{l('Protected by Double-Payout & Reconciliation System', 'محافظت‌شده توسط سیستم ضد تکرار پرداخت و تطبیق حساب', 'د دوه ځله تادیې مخنیوی فعال دی')}</span>
                  </span>
                )}

                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold rounded-xl text-xs cursor-pointer"
                >
                  {l('Close Report', 'بستن گزارش', 'راپور بندول')}
                </button>
              </div>
            </div>
          ) : (
            /* FORM MODE: RECORD PAYMENT, EXTRA/LESS ADJUSTMENTS & REPORT */
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* ========================================================= */}
              {/* PORTION 1: PRODUCT PRICE (COD) ADJUSTMENT                 */}
              {/* ========================================================= */}
              <div className="p-3 sm:p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-red-600 text-white font-black text-[11px] flex items-center justify-center">1</span>
                    <h4 className="font-black text-xs sm:text-sm text-slate-900 dark:text-white">
                      {l('Portion 1: Product Price / COD Collected from Buyer', 'بخش ۱: وصولی قیمت جنس (COD) از خریدار', 'لومړۍ برخه: له اخیستونکي څخه د جنس د قیمت وصولي')}
                    </h4>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {l('Booked: ', 'قیمت بارنامه: ', 'اصلي: ')}{originalProductPrice.toLocaleString()} AFN
                  </span>
                </div>

                {shipment.status === 'delivered' ? (
                  <>
                    <div className="grid grid-cols-3 gap-2">
                      {/* Button 1: Exact */}
                      <button
                        type="button"
                        onClick={() => handleSelectAdjustmentType('exact')}
                        className={`p-2.5 sm:p-3 rounded-2xl border-2 text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                          adjustmentType === 'exact'
                            ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/50 text-blue-900 dark:text-blue-100 shadow-sm ring-2 ring-blue-500/20'
                            : 'border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className={`w-6 h-6 rounded-xl flex items-center justify-center font-black ${
                          adjustmentType === 'exact' ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600'
                        }`}>
                          <Equal className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-black text-[11px] sm:text-xs">{l('Exact (=)', 'دقیق (=)', 'دقیق (=)')}</span>
                        <span className="text-[9.5px] opacity-75 font-mono">{originalProductPrice.toLocaleString()} AFN</span>
                      </button>

                      {/* Button 2: + Extra */}
                      <button
                        type="button"
                        onClick={() => handleSelectAdjustmentType('extra')}
                        className={`p-2.5 sm:p-3 rounded-2xl border-2 text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                          adjustmentType === 'extra'
                            ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-100 shadow-sm ring-2 ring-emerald-500/20'
                            : 'border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className={`w-6 h-6 rounded-xl flex items-center justify-center font-black ${
                          adjustmentType === 'extra' ? 'bg-emerald-600 text-white' : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600'
                        }`}>
                          <TrendingUp className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-black text-[11px] sm:text-xs">{l('+ Paid Extra', '+ پرداخت بیشتر', '+ زیاته تادیه')}</span>
                        <span className="text-[9.5px] opacity-75">{l('Price Raised', 'افزایش قیمت', 'نرخ پورته')}</span>
                      </button>

                      {/* Button 3: - Less */}
                      <button
                        type="button"
                        onClick={() => handleSelectAdjustmentType('less')}
                        className={`p-2.5 sm:p-3 rounded-2xl border-2 text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                          adjustmentType === 'less'
                            ? 'border-amber-600 bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-100 shadow-sm ring-2 ring-amber-500/20'
                            : 'border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className={`w-6 h-6 rounded-xl flex items-center justify-center font-black ${
                          adjustmentType === 'less' ? 'bg-amber-600 text-white' : 'bg-amber-100 dark:bg-amber-950 text-amber-600'
                        }`}>
                          <TrendingDown className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-black text-[11px] sm:text-xs">{l('- Paid Less', '- پرداخت کمتر', '- کمه تادیه')}</span>
                        <span className="text-[9.5px] opacity-75">{l('Price Dropped', 'کاهش / تخفیف', 'تخفیف')}</span>
                      </button>
                    </div>

                    {adjustmentType !== 'exact' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                        <div>
                          <label className="block text-[10.5px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                            {adjustmentType === 'extra' ? l('Extra Amount (+ AFN):', 'مبلغ اضافی (+ افغانی):') : l('Less Amount (- AFN):', 'مبلغ کسر شده (- افغانی):')}
                          </label>
                          <input
                            type="number"
                            min="0"
                            max={adjustmentType === 'less' ? originalProductPrice : undefined}
                            value={adjustmentAmount}
                            onChange={(e) => handleDiffChange(Number(e.target.value))}
                            className="w-full h-9 px-3 font-mono font-black text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[10.5px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                            {l('Total Product Cash Collected (AFN):', 'کل مبلغ وصولی نقدی کالا (افغانی):')}
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={actualCollectedAmount}
                            onChange={(e) => handleActualCollectedChange(Number(e.target.value))}
                            className="w-full h-9 px-3 font-mono font-black text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
                          />
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-[11px] space-y-1 text-red-900 dark:text-red-200">
                    <div className="font-bold flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                      <span>{l(`Parcel marked as ${shipment.status.toUpperCase()}`, `وضعیت بار: ${shipment.status}`, `د بار حالت: ${shipment.status}`)}</span>
                    </div>
                    <p>{l('Product COD defaults to 0 AFN since parcel was returned/cancelled.', 'چون بار برگشت/لغو شده، وصولی قیمت کالا صفر منظور می‌شود.', 'د جنس وصولي صفر کیږي.')}</p>
                  </div>
                )}

                {/* Reason Selection for Product Adjustment */}
                <div>
                  <label className="block text-[10.5px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    {l('Reason for Product Outcome (Reported to Origin/Main):', 'علت وضعیت قیمت کالا (گزارش به مبدا و مرکز):', 'د جنس د قیمت د بدلون لامل:')}
                  </label>
                  <select
                    value={reasonCategory}
                    onChange={(e) => setReasonCategory(e.target.value)}
                    className="w-full h-9 px-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    {activeProductReasons.map(r => (
                      <option key={r.id} value={r.id}>{r.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* ========================================================= */}
              {/* PORTION 2: COMMISSION & TRANSPORTATION FEE ADJUSTMENTS     */}
              {/* ========================================================= */}
              <div className="rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowFeesPortion(!showFeesPortion)}
                  className="w-full p-3 sm:p-4 flex items-center justify-between text-start cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-800/80 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-black text-[11px] flex items-center justify-center">2</span>
                    <div>
                      <h4 className="font-black text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span>{l('Portion 2: Commission & Freight Fee Adjustments', 'بخش ۲: تغییرات کمیسیون نمایندگی و کرایه انتقال', 'دویمه برخه: د کمیشن او د کرایې بدلونونه')}</span>
                        {(commissionAdjustmentType !== 'exact' || serviceFeeAdjustmentType !== 'exact') && (
                          <span className="px-2 py-0.2 rounded-full bg-emerald-600 text-white text-[9px] font-bold">
                            {l('Adjusted', 'تغییر یافته', 'بدل شوی')}
                          </span>
                        )}
                      </h4>
                      <p className="text-[10px] text-slate-500">
                        {l('Optional: Doorstep delivery surcharge, heavy cargo stairs, overweight freight, etc.', 'اختیاری: کرایه درب منزل، پله‌های طبقات، اضافه وزن، یا تخفیف ویژه', 'اختیاري: کور ته رسول، اضافي وزن، یا ځانګړی تخفیف')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-slate-400 font-bold text-xs">
                    <span>{showFeesPortion ? l('Hide', 'بستن', 'پټول') : l('Customize', 'تنظیم', 'تنظیمول')}</span>
                    {showFeesPortion ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </button>

                {showFeesPortion && (
                  <div className="p-3 sm:p-4 pt-1 border-t border-slate-200 dark:border-slate-700 space-y-4">
                    
                    {/* Portion 2A: Destination Commission Adjustment */}
                    <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1">
                          <Percent className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{l('2A. Destination Branch Commission (Retained by You):', '۲-الف. کمیسیون نمایندگی مقصد (سهم خود شعبه):', '۲-الف. د مقصد څانګې کمیشن (ستاسو برخه):')}</span>
                        </span>
                        <span className="font-mono font-bold text-emerald-600">
                          {effectiveDestCommission.toLocaleString()} AFN {effectiveDestCommission !== fixedDestCommission && `(${l('Base', 'پایه')}: ${fixedDestCommission})`}
                        </span>
                      </div>

                      {/* 3 Choice Buttons for Commission */}
                      <div className="grid grid-cols-3 gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleCommissionTypeSelect('exact')}
                          className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                            commissionAdjustmentType === 'exact'
                              ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100 font-black'
                              : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          <span className="block text-[11px]">{l('Standard Base', 'استاندارد', 'معیاري')}</span>
                          <span className="block text-[9.5px] font-mono opacity-75">{fixedDestCommission} AFN</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleCommissionTypeSelect('extra')}
                          className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                            commissionAdjustmentType === 'extra'
                              ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100 font-black'
                              : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          <span className="block text-[11px]">{l('+ Extra Comm', '+ کمیسیون اضافی', '+ اضافي کمیشن')}</span>
                          <span className="block text-[9.5px] opacity-75">{l('Doorstep / Stairs', 'درب منزل / طبقات', 'کور ته وړل')}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleCommissionTypeSelect('less')}
                          className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                            commissionAdjustmentType === 'less'
                              ? 'border-amber-600 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-100 font-black'
                              : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          <span className="block text-[11px]">{l('- Less Comm', '- کسر کمیسیون', '- کم کمیشن')}</span>
                          <span className="block text-[9.5px] opacity-75">{l('Pickup / Promo', 'تحویل ترمینال', 'ترمینل کې اخیستل')}</span>
                        </button>
                      </div>

                      {commissionAdjustmentType !== 'exact' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                              {commissionAdjustmentType === 'extra' ? l('Extra Commission (+ AFN):', 'مبلغ کمیسیون اضافی (+ افغانی):') : l('Commission Discount (- AFN):', 'مبلغ تخفیف کمیسیون (- افغانی):')}
                            </label>
                            <input
                              type="number"
                              min="0"
                              max={commissionAdjustmentType === 'less' ? fixedDestCommission : undefined}
                              value={commissionAdjustmentAmount}
                              onChange={(e) => setCommissionAdjustmentAmount(Math.max(0, Number(e.target.value) || 0))}
                              className="w-full h-8 px-2.5 font-mono font-black text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                              {l('Commission Reason:', 'علت تغییر کمیسیون:', 'د کمیشن د بدلون علت:')}
                            </label>
                            <select
                              value={commissionReasonCategory}
                              onChange={(e) => setCommissionReasonCategory(e.target.value)}
                              className="w-full h-8 px-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                            >
                              {activeCommissionReasons.map(r => (
                                <option key={r.id} value={r.id}>{r.label}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Portion 2B: Transportation / Service Fee Adjustment */}
                    <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1">
                          <Truck className="w-3.5 h-3.5 text-blue-600" />
                          <span>{l('2B. Transportation / Service Fee (Freight Earnings):', '۲-ب. کرایه انتقال و خدمات (سهم شبکه ترانسپورت):', '۲-ب. د کرایې او خدماتو فیس:')}</span>
                        </span>
                        <span className="font-mono font-bold text-blue-600">
                          {effectiveServiceFee.toLocaleString()} AFN {effectiveServiceFee !== fixedServiceFee && `(${l('Base', 'پایه')}: ${fixedServiceFee})`}
                        </span>
                      </div>

                      {/* 3 Choice Buttons for Service Fee */}
                      <div className="grid grid-cols-3 gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleServiceFeeTypeSelect('exact')}
                          className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                            serviceFeeAdjustmentType === 'exact'
                              ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100 font-black'
                              : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          <span className="block text-[11px]">{l('Standard Base', 'استاندارد', 'معیاري')}</span>
                          <span className="block text-[9.5px] font-mono opacity-75">{fixedServiceFee} AFN</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleServiceFeeTypeSelect('extra')}
                          className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                            serviceFeeAdjustmentType === 'extra'
                              ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100 font-black'
                              : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          <span className="block text-[11px]">{l('+ Extra Freight', '+ کرایه اضافی', '+ اضافي کرایه')}</span>
                          <span className="block text-[9.5px] opacity-75">{l('Overweight / Bulk', 'اضافه وزن / حجم', 'زیات وزن')}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleServiceFeeTypeSelect('less')}
                          className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                            serviceFeeAdjustmentType === 'less'
                              ? 'border-amber-600 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-100 font-black'
                              : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          <span className="block text-[11px]">{l('- Less Freight', '- تخفیف کرایه', '- د کرایې تخفیف')}</span>
                          <span className="block text-[9.5px] opacity-75">{l('Promotional / Rate', 'تخفیف مشتری', 'د مشتری تخفیف')}</span>
                        </button>
                      </div>

                      {serviceFeeAdjustmentType !== 'exact' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                              {serviceFeeAdjustmentType === 'extra' ? l('Extra Freight Fee (+ AFN):', 'کرایه اضافی انتقال (+ افغانی):') : l('Freight Discount (- AFN):', 'تخفیف کرایه انتقال (- افغانی):')}
                            </label>
                            <input
                              type="number"
                              min="0"
                              max={serviceFeeAdjustmentType === 'less' ? fixedServiceFee : undefined}
                              value={serviceFeeAdjustmentAmount}
                              onChange={(e) => setServiceFeeAdjustmentAmount(Math.max(0, Number(e.target.value) || 0))}
                              className="w-full h-8 px-2.5 font-mono font-black text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                              {l('Freight Reason:', 'علت تغییر کرایه:', 'د کرایې د بدلون علت:')}
                            </label>
                            <select
                              value={serviceFeeReasonCategory}
                              onChange={(e) => setServiceFeeReasonCategory(e.target.value)}
                              className="w-full h-8 px-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                            >
                              {activeServiceFeeReasons.map(r => (
                                <option key={r.id} value={r.id}>{r.label}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )}
                    </div>

                  </div>
                )}
              </div>

              {/* Note / Remarks for Main HQ & Sender */}
              <div>
                <label className="block text-[10.5px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  {l('Delivery & Financial Remarks (Reported to Origin Branch & HQ):', 'یادداشت و توضیحات تکمیلی (ارسال به شعبه مبدا و مرکز):', 'د تحویلۍ اضافي توضیحات:')}
                </label>
                <input
                  type="text"
                  value={reportNote}
                  onChange={(e) => setReportNote(e.target.value)}
                  placeholder={l('e.g. Delivered to receiver brother with phone confirmation', 'مثال: با هماهنگی تلفنی فرستنده تحویل برادر گیرنده شد', 'مثال: د فرستونکي په تایید د اخیستونکي ورور ته وسپارل شو')}
                  className="w-full h-9 px-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              {/* LIVE RECONCILIATION & AUTO-MATH CARD */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-900 text-white space-y-2.5">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 pb-1.5 border-b border-slate-800">
                  <span>{l('3. Live Financial Reconciled Breakdown', '۳. محاسبه خودکار و شفاف تسویه مالی', '۳. د مالي حساب اتومات محاسبه')}</span>
                  <span className="text-emerald-400 font-mono">{l('Auto-Split Active', 'تطبیق هوشمند', 'اتومات ویش')}</span>
                </div>

                <div className="flex justify-between text-white font-black text-xs sm:text-sm">
                  <span>{l('Total Cash Handover from Customer:', 'کل پول دریافت‌شده از مشتری گیرنده:', 'له اخیستونکي څخه ټوله ترلاسه شوې نغده پیسې:')}</span>
                  <span className="font-mono text-emerald-400">{actualCollectedAmount.toLocaleString()} AFN</span>
                </div>

                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>{l('Destination Commission (Retained in your cash drawer):', 'کمیسیون نمایندگی مقصد (سهم شعبه شما):', 'د مقصد څانګې پاتې کمیشن:')}</span>
                  <span className="font-mono text-slate-300">-{effectiveDestCommission.toLocaleString()} AFN</span>
                </div>

                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>{l('Transportation Fee (Company freight earnings):', 'کرایه انتقال و خدمات (سهم شبکه ترانسپورت):', 'د کرایې فیس:')}</span>
                  <span className="font-mono text-slate-300">-{effectiveServiceFee.toLocaleString()} AFN</span>
                </div>

                <div className="pt-2 border-t border-slate-800 grid grid-cols-2 gap-2 text-start">
                  <div className="p-2 sm:p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30">
                    <span className="text-[9.5px] sm:text-[10px] text-amber-300 font-bold block">
                      {l('Auto-Queued to Remittances (To HQ):', 'حواله به مرکز (در بخش انتقالات):', 'اصلي څانګې ته د حوالې رقم:')}
                    </span>
                    <span className="font-mono font-black text-xs sm:text-sm text-amber-300">
                      {reconciledRemittanceDue.toLocaleString()} AFN
                    </span>
                  </div>

                  <div className="p-2 sm:p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30">
                    <span className="text-[9.5px] sm:text-[10px] text-emerald-300 font-bold block">
                      {l('Reconciled Net Seller Cash Payout:', 'خالص پرداختی به مشتری فرستنده:', 'پلورونکي ته د تادیې خالص رقم:')}
                    </span>
                    <span className="font-mono font-black text-xs sm:text-sm text-emerald-300">
                      {reconciledSellerPayout.toLocaleString()} AFN
                    </span>
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
                  <span>{l('Confirm Payment, Report to Main Branch & Lock', 'تأیید وصولی، ارسال گزارش به مرکز و قفل کردن', 'تایید، اصلي څانګې ته راپور استول او قفل کول')}</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs cursor-pointer transition-colors"
                >
                  {l('Cancel', 'انصراف', 'لغوه کول')}
                </button>
              </div>

            </form>
          )}

        </div>
      </div>
    </div>
  );
};
