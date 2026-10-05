import React, { useState } from 'react';
import { 
  Package, 
  PlusCircle, 
  MapPin, 
  ArrowRight, 
  CheckCircle2, 
  Truck, 
  User, 
  FileText, 
  Wallet, 
  Search,
  Sparkles,
  ShieldCheck,
  Scale,
  DollarSign,
  ChevronRight,
  MousePointerClick,
  X,
  Boxes,
  AlertTriangle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useApp } from '../context/AppContext';
import { useI18n } from '../context/I18nContext';
import { CustomerPreBookingInput, ParcelCategory } from '../types';
import { BranchSearchSelect } from './BranchSearchSelect';

export const CustomerPortal: React.FC = () => {
  const { 
    t, 
    currentUser, 
    branches, 
    customerShipments, 
    createCustomerPreBooking, 
    setActiveView,
    trackByCnNumber,
    language
  } = useApp();

  const { getLocalizedBranchName } = useI18n();

  // Deduplicate and sanitize branches
  const sanitizedBranches = React.useMemo(() => {
    const seen = new Set<string>();
    return branches.filter(b => {
      const key = b.id || b.code;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [branches]);

  const [submittedCn, setSubmittedCn] = useState<string | null>(null);
  const [isAddOrderOpen, setIsAddOrderOpen] = useState(false);

  // Pre-booking form state
  const [originBranchId, setOriginBranchId] = useState(branches[0]?.id || 'br_kabul');
  const [destinationBranchId, setDestinationBranchId] = useState(branches[1]?.id || 'br_herat');
  const [senderName, setSenderName] = useState(currentUser.name || '');
  const [senderPhone, setSenderPhone] = useState(currentUser.phone || '');
  const [senderEmail, setSenderEmail] = useState(currentUser.email || '');
  const [senderAddress, setSenderAddress] = useState('');
  const [senderCity, setSenderCity] = useState('Kabul');
  const [senderProvince, setSenderProvince] = useState('Kabul');

  const [receiverName, setReceiverName] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [receiverNationalId, setReceiverNationalId] = useState('');
  const [receiverAddress, setReceiverAddress] = useState('');
  const [receiverCity, setReceiverCity] = useState('Herat');
  const [receiverProvince, setReceiverProvince] = useState('Herat');

  const [category, setCategory] = useState<ParcelCategory>('general');
  const [estimatedWeightKg, setEstimatedWeightKg] = useState<number | "">("");
  const [pieces, setPieces] = useState<number | "">("");
  const [productPriceAfn, setProductPriceAfn] = useState<number | "">("");
  const [description, setDescription] = useState('');
  const [isFragile, setIsFragile] = useState(false);
  const [paymentPreference, setPaymentPreference] = useState<'pay_at_branch' | 'pay_on_delivery'>('pay_at_branch');

  // Reset form inputs after booking
  const resetForm = () => {
    setReceiverName('');
    setReceiverPhone('');
    setReceiverNationalId('');
    setReceiverAddress('');
    setEstimatedWeightKg('');
    setPieces('');
    setProductPriceAfn('');
    setDescription('');
    setIsFragile(false);
    setPaymentPreference('pay_at_branch');
  };

  // Handle origin branch change
  const handleOriginChange = (branchId: string) => {
    setOriginBranchId(branchId);
    const br = branches.find(b => b.id === branchId);
    if (br) {
      setSenderCity(br.city);
      setSenderProvince(br.province);
    }
  };

  // Handle destination branch change
  const handleDestChange = (branchId: string) => {
    setDestinationBranchId(branchId);
    const br = branches.find(b => b.id === branchId);
    if (br) {
      setReceiverCity(br.city);
      setReceiverProvince(br.province);
    }
  };

  const handlePreBookSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiverName.trim() || !receiverPhone.trim()) {
      alert(t('fill_contacts_warning') || 'Please fill in receiver contact details.');
      return;
    }

    const input: CustomerPreBookingInput = {
      originBranchId,
      destinationBranchId,
      senderName: currentUser?.name || 'Customer',
      senderPhone: currentUser?.phone || '0700000000',
      senderEmail: currentUser?.email || '',
      senderNationalId: currentUser?.nationalId || '',
      senderAddress: currentUser?.address || `${currentUser?.city || 'Kabul'} Central`,
      senderCity: currentUser?.city || 'Kabul',
      senderProvince: currentUser?.city || 'Kabul',
      receiverName,
      receiverPhone,
      receiverAddress: receiverAddress || `${receiverCity} Central`,
      receiverCity,
      receiverProvince,
      category,
      estimatedWeightKg: Number(estimatedWeightKg) || 1,
      pieces: Number(pieces) || 1,
      productPriceAfn: Number(productPriceAfn) || 0,
      description: description || `${category} - ${pieces || 1} item(s)`,
      isFragile,
      paymentPreference: paymentPreference === 'pay_on_delivery' ? 'to_pay' : 'pay_at_branch'
    };

    const newBooking = createCustomerPreBooking(input);
    setSubmittedCn(newBooking.cnNumber);
    
    // Reset form fields
    resetForm();

    // Immediately close the order entry page/modal so user is not confused and cannot double-submit
    setIsAddOrderOpen(false);

    try {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 }
      });
    } catch {
      // safe fallback
    }
  };

  const categoryOptions: { value: ParcelCategory; label: string }[] = [
    { value: 'general', label: 'Commercial & General Goods' },
    { value: 'garments', label: 'Clothing & Textiles' },
    { value: 'electronics', label: 'Electronics & IT Gadgets' },
    { value: 'foodstuff', label: 'Dry Fruits, Saffron & Foodstuff' },
    { value: 'document', label: 'Documents, Passports & Papers' },
    { value: 'machinery', label: 'Auto Parts & Machinery' },
    { value: 'fragile', label: 'Fragile & Glass Items' }
  ];

  // Financial overview metrics
  const totalMoneySpent = customerShipments.reduce((sum, s) => sum + (s.financials?.totalAmount || 0), 0);
  const totalParcelsCount = customerShipments.length;
  const totalParcelsValue = customerShipments.reduce((sum, s) => sum + (s.financials?.productPrice || 0), 0);
  const deliveredCount = customerShipments.filter(s => s.status === 'delivered').length;
  const activeCount = customerShipments.filter(s => s.status !== 'delivered' && s.status !== 'cancelled').length;

  return (
    <div className="space-y-6 pb-12 font-sans" id="customer-portal-main">
      
      {/* Top Banner with Action Buttons */}
      <div className="rounded-3xl bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 p-5 sm:p-8 text-white shadow-xl shadow-red-600/15">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>{language === 'fa' ? 'سیستم ثبت بار و پیش‌خرید آنلاین' : language === 'ps' ? 'د بار ثبت او پرلیکه سیستم' : 'Customer Self-Service Terminal'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              {t('customer_portal_title')}
            </h1>
            <p className="text-xs sm:text-sm text-red-100 max-w-2xl leading-relaxed">
              {t('customer_portal_subtitle')}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Primary Action Button: Opens the Order Entry Modal */}
            <button
              onClick={() => {
                setIsAddOrderOpen(true);
              }}
              type="button"
              className="px-4 py-2.5 rounded-xl font-bold text-xs bg-white text-red-600 hover:bg-amber-300 hover:text-slate-900 flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-black/10 active:scale-95"
              id="customer-portal-book-new-order-btn"
            >
              <PlusCircle className="w-4 h-4 text-red-600" />
              <span>{language === 'fa' ? 'ثبت سفارش و بسته جدید' : language === 'ps' ? 'د نوي بار ثبتول' : 'Book New Parcel'}</span>
            </button>

            <button
              onClick={() => setActiveView('customer_finances')}
              type="button"
              className="px-4 py-2.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-2 transition-all cursor-pointer shadow-md border border-emerald-400/40"
              title={language === 'fa' ? 'امور مالی و تسویه‌حساب فروشات' : 'Financial Clearance & Payouts'}
            >
              <Wallet className="w-4 h-4 text-emerald-200" />
              <span>{language === 'fa' ? 'امور مالی و تسویه‌حساب' : language === 'ps' ? 'مالي حساب او تصفیه' : 'Financial Clearance'}</span>
            </button>

            <button
              onClick={() => setActiveView('customer_history')}
              type="button"
              className="px-4 py-2.5 rounded-xl font-bold text-xs bg-red-800/60 hover:bg-red-800 text-white flex items-center gap-2 transition-all cursor-pointer shadow-md border border-red-400/30"
              title={language === 'fa' ? 'مشاهده تاریخچه تمام بسته‌ها' : 'View all parcel history'}
            >
              <FileText className="w-4 h-4 text-amber-300" />
              <span>{language === 'fa' ? 'تاریخچه بسته‌ها' : language === 'ps' ? 'د ټولو بارونو تاریخچه' : 'Orders History'} ({customerShipments.length})</span>
              <ChevronRight className="w-4 h-4 rtl:rotate-180" />
            </button>
            
            <button
              onClick={() => setActiveView('tracking')}
              type="button"
              className="px-3.5 py-2.5 rounded-xl font-bold text-xs bg-red-900/40 hover:bg-red-900/70 text-white flex items-center gap-2 transition-all cursor-pointer border border-white/20"
            >
              <Search className="w-4 h-4 text-white" />
              <span>{t('quick_track') || 'Track'}</span>
            </button>
          </div>
        </div>

        {/* 4-Step Process Guide */}
        <div className="mt-6 pt-6 border-t border-white/20 grid grid-cols-2 md:grid-cols-4 gap-2.5 text-xs">
          <div className="flex items-center gap-2.5 bg-white/10 backdrop-blur-xs p-2.5 rounded-xl">
            <div className="w-6 h-6 rounded-full bg-amber-400 text-slate-900 font-black flex items-center justify-center text-xs shrink-0">1</div>
            <div>
              <div className="font-bold text-white text-[11px] sm:text-xs">{t('step_prebook_online')}</div>
              <div className="text-[10px] text-red-100 hidden sm:block">{t('step_prebook_online_desc')}</div>
            </div>
          </div>
          <div className="flex items-center gap-2.5 bg-white/10 backdrop-blur-xs p-2.5 rounded-xl">
            <div className="w-6 h-6 rounded-full bg-amber-400 text-slate-900 font-black flex items-center justify-center text-xs shrink-0">2</div>
            <div>
              <div className="font-bold text-white text-[11px] sm:text-xs">{t('step_drop_branch')}</div>
              <div className="text-[10px] text-red-100 hidden sm:block">{t('step_drop_branch_desc')}</div>
            </div>
          </div>
          <div className="flex items-center gap-2.5 bg-white/10 backdrop-blur-xs p-2.5 rounded-xl">
            <div className="w-6 h-6 rounded-full bg-amber-400 text-slate-900 font-black flex items-center justify-center text-xs shrink-0">3</div>
            <div>
              <div className="font-bold text-white text-[11px] sm:text-xs">{t('step_branch_pricing')}</div>
              <div className="text-[10px] text-red-100 hidden sm:block">{t('step_branch_pricing_desc')}</div>
            </div>
          </div>
          <div className="flex items-center gap-2.5 bg-white/10 backdrop-blur-xs p-2.5 rounded-xl">
            <div className="w-6 h-6 rounded-full bg-amber-400 text-slate-900 font-black flex items-center justify-center text-xs shrink-0">4</div>
            <div>
              <div className="font-bold text-white text-[11px] sm:text-xs">{t('step_tracking_invoicing')}</div>
              <div className="text-[10px] text-red-100 hidden sm:block">{t('step_tracking_invoicing_desc')}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Submission Success Alert */}
      {submittedCn && (
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border-2 border-emerald-400 text-emerald-950 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-600/20">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm sm:text-base font-black text-emerald-950">
                {t('order_confirmed_success') || 'Order Registered Successfully! (سفارش شما موفقانه ثبت گردید)'}
              </div>
              <div className="text-xs text-emerald-900 mt-1 flex flex-wrap items-center gap-2">
                <span>{t('your_cn_lbl') || 'Waybill CN'}:</span>
                <span className="font-mono font-black text-slate-900 bg-white px-2.5 py-0.5 rounded-lg border border-emerald-300 text-sm shadow-xs">
                  {submittedCn}
                </span>
                <span className="text-emerald-800">
                  • {language === 'fa' ? 'صفحه ثبت سفارش بسته شد. محموله در جدول زیر درج گردید.' : 'Order saved and form closed. Parcel is visible in list below.'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={() => {
                trackByCnNumber(submittedCn);
                setActiveView('tracking');
              }}
              type="button"
              className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" />
              <span>{language === 'fa' ? 'پیگیری زنده' : language === 'ps' ? 'ژوندۍ څارنه' : 'Live Tracking'}</span>
            </button>
            <button
              onClick={() => setIsAddOrderOpen(true)}
              type="button"
              className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-900 text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>{language === 'fa' ? 'ثبت بار دیگر' : language === 'ps' ? 'بل بار ثبتول' : 'Book Another'}</span>
            </button>
            <button
              onClick={() => setSubmittedCn(null)}
              type="button"
              className="px-2.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-300 cursor-pointer"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* CUSTOMER FINANCIAL & PARCEL SUMMARY MATRIX */}
      <div 
        className="group relative bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-200 dark:border-slate-800 shadow-md hover:shadow-xl hover:border-red-500 dark:hover:border-red-600 transition-all overflow-hidden"
        id="all-orders-summary-table"
      >
        {/* Top Header Bar */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 border-b border-indigo-900/50">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-amber-400/20 text-amber-400 border border-amber-400/30">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <span className="font-black text-xs uppercase tracking-wider text-amber-300 block">
                {t('customer_stats_table_title') || 'All Orders & Financial Matrix'}
              </span>
              <span className="text-[10px] text-slate-300 block -mt-0.5">
                {language === 'fa' ? 'خلاصه وضعیت مالی و تعداد بسته‌های شما' : 'Summary of all orders, freight expenditure & cargo value'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAddOrderOpen(true)}
              type="button"
              className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold text-xs shadow-sm flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>{language === 'fa' ? 'ثبت بار' : 'Add Order'}</span>
            </button>
            <button
              onClick={() => setActiveView('customer_history')}
              type="button"
              className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <MousePointerClick className="w-3.5 h-3.5 animate-bounce" />
              <span>{language === 'fa' ? 'مشاهده تاریخچه' : 'All Orders'} ➔</span>
            </button>
          </div>
        </div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x sm:rtl:divide-x-reverse divide-slate-200 dark:divide-slate-800">
          {/* 1. Total Freight Spent */}
          <div className="p-4 sm:p-5 bg-emerald-50/50 dark:bg-emerald-950/20">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20 shrink-0">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[11px] font-bold text-emerald-900 dark:text-emerald-300 uppercase">
                  {t('customer_stats_total_spent')}
                </div>
                <div className="text-xl sm:text-2xl font-black text-emerald-950 dark:text-emerald-200 font-mono tracking-tight mt-0.5">
                  {totalMoneySpent.toLocaleString()} <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">AFN</span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Total Parcels Count */}
          <div className="p-4 sm:p-5 bg-indigo-50/50 dark:bg-indigo-950/20">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20 shrink-0">
                <Boxes className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[11px] font-bold text-indigo-900 dark:text-indigo-300 uppercase">
                  {t('customer_stats_total_parcels')}
                </div>
                <div className="text-xl sm:text-2xl font-black text-indigo-950 dark:text-indigo-200 font-mono tracking-tight mt-0.5">
                  {totalParcelsCount} <span className="text-xs font-bold text-indigo-700 dark:text-indigo-400">{t('pcs_unit') || 'Parcels'}</span>
                </div>
                <div className="text-[10px] text-indigo-800 dark:text-indigo-400 font-medium mt-0.5">
                  {deliveredCount} {language === 'fa' ? 'تحویل' : 'Delivered'} • {activeCount} {language === 'fa' ? 'در جریان' : 'Active'}
                </div>
              </div>
            </div>
          </div>

          {/* 3. Total Declared / COD Value */}
          <div className="p-4 sm:p-5 bg-amber-50/50 dark:bg-amber-950/20">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-amber-500 text-white shadow-md shadow-amber-500/20 shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[11px] font-bold text-amber-900 dark:text-amber-300 uppercase">
                  {t('customer_stats_total_product_val') || 'Total Declared Value'}
                </div>
                <div className="text-xl sm:text-2xl font-black text-amber-950 dark:text-amber-200 font-mono tracking-tight mt-0.5">
                  {totalParcelsValue.toLocaleString()} <span className="text-xs font-bold text-amber-700 dark:text-amber-400">AFN</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RECENT ORDERS LIST */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden" id="customer-dashboard-all-orders">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-red-600 text-white flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-sm text-slate-900 dark:text-white">
                {language === 'fa' ? 'سفارشات و بسته‌های شما' : language === 'ps' ? 'ستاسو ټول فرمایشونه او بارونه' : 'Your Consignments & Orders'}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {language === 'fa' ? 'برای مشاهده جزئیات و پیگیری وضعیت زنده روی هر بار کلیک کنید' : 'Click on any parcel to check real-time status & details'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsAddOrderOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>{language === 'fa' ? 'ثبت بار جدید' : 'New Order'}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveView('customer_history')}
              className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>{language === 'fa' ? 'مشاهده آرشیو کامل' : 'Full Archive'}</span>
              <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
            </button>
          </div>
        </div>

        {customerShipments.length === 0 ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <Package className="w-6 h-6" />
            </div>
            <div className="text-sm font-bold text-slate-700 dark:text-slate-300">
              {language === 'fa' ? 'هنوز بسته‌ای ثبت نکرده‌اید' : 'No consignments booked yet'}
            </div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {language === 'fa' ? 'با کلیک بر روی دکمه زیر می‌توانید اولین سفارش خود را ثبت نمایید.' : 'Click the button below to pre-book your first consignment.'}
            </p>
            <button
              onClick={() => setIsAddOrderOpen(true)}
              type="button"
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{language === 'fa' ? 'ثبت اولین بسته' : 'Book First Parcel'}</span>
            </button>
          </div>
        ) : (
          <>
            {/* Mobile Cards View (Visible on screens < 640px) */}
            <div className="block sm:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {customerShipments.map((s) => {
                const destBranch = branches.find(b => b.id === s.destinationBranchId);
                const origBranch = branches.find(b => b.id === s.originBranchId);
                return (
                  <div
                    key={s.id}
                    onClick={() => {
                      trackByCnNumber(s.cnNumber);
                      setActiveView('tracking');
                    }}
                    className="p-4 space-y-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-red-600 dark:text-red-400 text-xs">
                          {s.cnNumber}
                        </span>
                        {s.deliveryIssue && s.status !== 'delivered' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            <span>{s.deliveryIssue.reasonText || 'Delivery Issue'}</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {s.status}
                          </span>
                        )}
                      </div>
                      <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                        {(s.financials?.totalAmount || 0).toLocaleString()} AFN
                      </span>
                    </div>

                    <div className="text-xs text-slate-700 dark:text-slate-300">
                      <span className="font-semibold text-slate-500">{language === 'fa' ? 'گیرنده: ' : 'Receiver: '}</span>
                      <span className="font-bold text-slate-900 dark:text-white">{s.receiver?.name}</span>
                      <span className="text-[11px] text-slate-400 font-mono ms-1.5">({s.receiver?.phone})</span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                      <div className="flex items-center gap-1">
                        <span>{getLocalizedBranchName(origBranch) || s.sender?.city}</span>
                        <ArrowRight className="w-3 h-3 text-red-500 rtl:rotate-180" />
                        <span className="font-semibold text-slate-900 dark:text-white">{getLocalizedBranchName(destBranch) || s.receiver?.city}</span>
                      </div>
                      <span className="font-mono text-[11px] font-medium">
                        {s.packageInfo?.weightKg} kg • {s.packageInfo?.pieces || 1} pcs
                      </span>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/80" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => {
                          trackByCnNumber(s.cnNumber);
                          setActiveView('tracking');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs font-bold flex items-center gap-1.5 cursor-pointer hover:bg-red-100"
                      >
                        <Search className="w-3.5 h-3.5" />
                        <span>{language === 'fa' ? 'پیگیری زنده' : language === 'ps' ? 'ژوندۍ څارنه' : 'Live Tracking'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View (Visible on screens >= 640px) */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-xs text-start">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                    <th className="py-3 px-4 text-start">#</th>
                    <th className="py-3 px-4 text-start">{t('your_cn_lbl') || 'Waybill CN'}</th>
                    <th className="py-3 px-4 text-start">{language === 'fa' ? 'گیرنده' : 'Receiver'}</th>
                    <th className="py-3 px-4 text-start">{language === 'fa' ? 'مسیر (مبدأ ➔ مقصد)' : 'Route'}</th>
                    <th className="py-3 px-4 text-center">{t('table_weight') || 'Weight'}</th>
                    <th className="py-3 px-4 text-end">{language === 'fa' ? 'مبلغ کرایه' : 'Freight'}</th>
                    <th className="py-3 px-4 text-center">{language === 'fa' ? 'وضعیت' : 'Status'}</th>
                    <th className="py-3 px-4 text-center">{language === 'fa' ? 'عملیات' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {customerShipments.map((s, idx) => {
                    const destBranch = branches.find(b => b.id === s.destinationBranchId);
                    const origBranch = branches.find(b => b.id === s.originBranchId);
                    return (
                      <tr
                        key={s.id}
                        onClick={() => {
                          trackByCnNumber(s.cnNumber);
                          setActiveView('tracking');
                        }}
                        className="hover:bg-red-50/50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer group"
                        title={language === 'fa' ? 'کلیک جهت پیگیری و مشاهده جزئیات' : 'Click to track & view details'}
                      >
                        <td className="py-3 px-4 font-mono text-slate-400 font-bold">{idx + 1}</td>
                        <td className="py-3 px-4">
                          <span className="font-mono font-black text-red-600 dark:text-red-400 group-hover:underline">
                            {s.cnNumber}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                          {s.receiver?.name}
                          <span className="block text-[10px] font-normal text-slate-400 font-mono">{s.receiver?.phone}</span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                          <div className="flex items-center gap-1 font-medium">
                            <span>{getLocalizedBranchName(origBranch) || s.sender?.city}</span>
                            <ArrowRight className="w-3 h-3 text-red-500 rtl:rotate-180" />
                            <span className="font-bold text-slate-900 dark:text-white">{getLocalizedBranchName(destBranch) || s.receiver?.city}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                          {s.packageInfo?.weightKg} kg
                        </td>
                        <td className="py-3 px-4 text-end font-mono font-bold text-slate-900 dark:text-white">
                          {(s.financials?.totalAmount || 0).toLocaleString()} AFN
                        </td>
                        <td className="py-3 px-4 text-center">
                          {s.deliveryIssue && s.status !== 'delivered' ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 border border-amber-300 dark:border-amber-800 inline-flex items-center gap-1" title={s.deliveryIssue.reasonText || 'Delivery Issue'}>
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              <span>{s.deliveryIssue.reasonText || 'Delivery Issue'}</span>
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                              {s.status}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                trackByCnNumber(s.cnNumber);
                                setActiveView('tracking');
                              }}
                              className="px-2.5 py-1 rounded-lg bg-red-50 dark:bg-red-950/40 hover:bg-red-600 hover:text-white text-red-600 dark:text-red-400 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                              title={language === 'fa' ? 'پیگیری زنده' : 'Live Tracking'}
                            >
                              <Search className="w-3.5 h-3.5" />
                              <span>{language === 'fa' ? 'پیگیری' : 'Track'}</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* DEDICATED PRE-BOOKING MODAL DIALOG (OPENS UPON CLICK, AND CLOSES AUTOMATICALLY ON SAVE) */}
      {isAddOrderOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/75 backdrop-blur-sm overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl sm:max-w-3xl rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col min-w-0">
            
            {/* Modal Header */}
            <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/70 shrink-0">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-red-600 text-white flex items-center justify-center shadow-md shadow-red-600/20 shrink-0">
                  <Package className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm sm:text-lg font-black text-slate-900 dark:text-white truncate">
                    {t('prebook_new_parcel')}
                  </h2>
                  <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
                    {language === 'fa' ? 'اطلاعات مرسوله را وارد کنید؛ پس از ذخیره فرم بسته خواهد شد.' : 'Enter consignment details; the page will close automatically upon saving.'}
                  </p>
                </div>
              </div>

              {/* Close (X) Button */}
              <button
                type="button"
                onClick={() => setIsAddOrderOpen(false)}
                className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                title={t('btn_close') || 'Close'}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handlePreBookSubmit} className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 sm:space-y-5 min-w-0">
              
              {/* 1. Branch Routing Selection */}
              <div className="p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 space-y-3 min-w-0">
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-red-600" />
                  <span>{language === 'fa' ? 'انتخاب مسیر انتقال و شعبات' : 'Route & Branch Assignment'}</span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <BranchSearchSelect
                      branches={sanitizedBranches}
                      selectedBranchId={originBranchId}
                      onChange={handleOriginChange}
                      label={t('origin_branch_drop')}
                      placeholder={language === 'fa' ? 'جستجو و انتخاب نمایندگی مبدأ...' : 'Search & select origin branch...'}
                    />
                  </div>

                  <div>
                    <BranchSearchSelect
                      branches={sanitizedBranches}
                      selectedBranchId={destinationBranchId}
                      onChange={handleDestChange}
                      label={t('destination_branch_dest')}
                      placeholder={language === 'fa' ? 'جستجو و انتخاب نمایندگی مقصد...' : 'Search & select destination branch...'}
                    />
                  </div>
                </div>
              </div>

              {/* 2. Sender Account Auto-Attached & Receiver Details */}
              <div className="space-y-3 sm:space-y-4 min-w-0">
                
                {/* Sender Auto-Attached Info Banner */}
                <div className="p-3 sm:p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 text-xs min-w-0">
                  <div className="flex items-start sm:items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black shrink-0 text-xs sm:text-sm">
                      ✓
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-blue-900 dark:text-blue-100">
                        {language === 'fa' ? 'اطلاعات فرستنده (حساب شما):' : language === 'ps' ? 'د استوونکي معلومات (ستاسو حساب):' : 'Sender Details (Your Account):'}
                      </div>
                      <div className="text-blue-700 dark:text-blue-300 font-medium mt-0.5 break-words">
                        <strong>{currentUser?.name}</strong> • {currentUser?.phone} {currentUser?.nationalId ? `• Tazkira: ${currentUser.nationalId}` : ''} ({currentUser?.city || 'Kabul'})
                      </div>
                    </div>
                  </div>
                  <span className="self-start sm:self-center px-2.5 py-0.5 rounded-full bg-blue-200/80 dark:bg-blue-800 text-blue-900 dark:text-blue-100 font-bold text-[10px] uppercase shrink-0">
                    {language === 'fa' ? 'خودکار ضمیمه شد' : 'Auto-Attached'}
                  </span>
                </div>

                {/* Receiver Details */}
                <div className="space-y-3 p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 min-w-0">
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{t('receiver_details')}</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">{t('receiver_name')}</label>
                    <input
                      type="text"
                      required
                      value={receiverName}
                      onChange={(e) => setReceiverName(e.target.value)}
                      placeholder="Receiver's full name"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">{t('receiver_phone')}</label>
                      <input
                        type="tel"
                        required
                        value={receiverPhone}
                        onChange={(e) => setReceiverPhone(e.target.value)}
                        placeholder="07xxxxxxxx"
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-red-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">{t('receiver_city')}</label>
                      <input
                        type="text"
                        value={receiverCity}
                        onChange={(e) => setReceiverCity(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">{t('receiver_address_lbl')}</label>
                    <input
                      type="text"
                      value={receiverAddress}
                      onChange={(e) => setReceiverAddress(e.target.value)}
                      placeholder="e.g. Chowk Gulha, Herat City"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:outline-none"
                    />
                  </div>
                </div>

              </div>

              {/* 3. Parcel Details & Price */}
              <div className="space-y-3 sm:space-y-4 p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 min-w-0">
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  {t('parcel_specs_product_val') || 'Product Details & Selling Price'}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">{t('category_lbl')}</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as ParcelCategory)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:outline-none cursor-pointer"
                    >
                      {categoryOptions.map(c => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">{t('estimated_weight_kg')}</label>
                    <input
                      type="number"
                      min="0.5"
                      step="0.5"
                      placeholder="Optional (e.g. 2.5)"
                      value={estimatedWeightKg}
                      onChange={(e) => setEstimatedWeightKg(e.target.value === "" ? "" : parseFloat(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-red-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">{t('pieces_boxes_count')}</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={pieces}
                      onChange={(e) => setPieces(e.target.value === "" ? "" : parseInt(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-red-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">{t('goods_selling_price_afn') || 'Product Price (AFN)'}</label>
                    <input
                      type="number"
                      min="0"
                      value={productPriceAfn}
                      onChange={(e) => setProductPriceAfn(e.target.value === "" ? "" : parseFloat(e.target.value))}
                      placeholder="e.g. 2500"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-red-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">{t('contents_desc_notes')}</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. 5 boxes of clothing, fragile electronics"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:outline-none"
                  />
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={isFragile}
                      onChange={(e) => setIsFragile(e.target.checked)}
                      className="w-4 h-4 rounded text-red-600 focus:ring-red-500 cursor-pointer"
                    />
                    <span>{t('fragile_cargo_notice')}</span>
                  </label>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 shrink-0">{t('payment_preference_lbl')}:</span>
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                        <input
                          type="radio"
                          name="paypref"
                          checked={paymentPreference === 'pay_at_branch'}
                          onChange={() => setPaymentPreference('pay_at_branch')}
                          className="text-red-600 cursor-pointer"
                        />
                        <span>{t('pay_at_origin_branch')}</span>
                      </label>
                      <label className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                        <input
                          type="radio"
                          name="paypref"
                          checked={paymentPreference === 'pay_on_delivery'}
                          onChange={() => setPaymentPreference('pay_on_delivery')}
                          className="text-red-600 cursor-pointer"
                        />
                        <span>{t('receiver_pays_cod')}</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddOrderOpen(false)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors cursor-pointer text-center"
                >
                  {t('btn_cancel') || 'Cancel'}
                </button>

                <button
                  type="submit"
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold text-xs shadow-lg shadow-red-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Package className="w-4 h-4" />
                  <span>{t('submit_prebook_btn') || 'Save & Book Consignment'}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
