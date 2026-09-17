import React, { useState } from 'react';
import { 
  Package, 
  Plus, 
  Clock, 
  MapPin, 
  ArrowRight, 
  CheckCircle2, 
  Truck, 
  Calendar, 
  User, 
  Phone, 
  FileText, 
  Printer, 
  Search,
  Sparkles,
  Info,
  ShieldCheck,
  Scale,
  DollarSign,
  ChevronRight,
  MousePointerClick
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { CustomerPreBookingInput, ParcelCategory } from '../types';

export const CustomerPortal: React.FC = () => {
  const { 
    t, 
    currentUser, 
    branches, 
    customerShipments, 
    createCustomerPreBooking, 
    setActiveView,
    language,
    isRTL
  } = useApp();

  const [submittedCn, setSubmittedCn] = useState<string | null>(null);

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
  const [estimatedWeightKg, setEstimatedWeightKg] = useState<number>(5);
  const [pieces, setPieces] = useState<number>(1);
  const [productPriceAfn, setProductPriceAfn] = useState<number>(3000);
  const [description, setDescription] = useState('');
  const [isFragile, setIsFragile] = useState(false);
  const [paymentPreference, setPaymentPreference] = useState<'pay_at_branch' | 'pay_on_delivery'>('pay_at_branch');

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
    if (!receiverName || !receiverPhone || !senderName || !senderPhone) {
      alert('Please fill in sender and receiver contact details.');
      return;
    }

    const input: CustomerPreBookingInput = {
      originBranchId,
      destinationBranchId,
      senderName,
      senderPhone,
      senderEmail,
      senderAddress: senderAddress || `${senderCity} Central`,
      senderCity,
      senderProvince,
      receiverName,
      receiverPhone,
      receiverNationalId: receiverNationalId.trim() || undefined,
      receiverAddress: receiverAddress || `${receiverCity} Central`,
      receiverCity,
      receiverProvince,
      category,
      estimatedWeightKg: Number(estimatedWeightKg) || 1,
      pieces: Number(pieces) || 1,
      productPriceAfn: Number(productPriceAfn) || 0,
      description: description || `${category} - ${pieces} item(s)`,
      isFragile,
      paymentPreference: paymentPreference === 'pay_on_delivery' ? 'to_pay' : 'pay_at_branch'
    };

    const newBooking = createCustomerPreBooking(input);
    setSubmittedCn(newBooking.cnNumber);
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

  return (
    <div className="space-y-6 pb-12 font-sans" id="customer-portal-main">
      
      {/* Top Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 p-6 sm:p-8 text-white shadow-xl shadow-red-600/15">
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
            <button
              onClick={() => setActiveView('customer_history')}
              className="px-4 py-2.5 rounded-xl font-bold text-xs bg-white text-red-600 hover:bg-red-50 flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-black/10"
              title={language === 'fa' ? 'مشاهده تاریخچه تمام بسته‌ها' : 'View all parcel history'}
            >
              <FileText className="w-4 h-4 text-red-600" />
              <span>{language === 'fa' ? 'مشاهده تاریخچه تمام بسته‌ها' : language === 'ps' ? 'د ټولو بارونو تاریخچه' : 'View All Orders & History'} ({customerShipments.length})</span>
              <ChevronRight className="w-4 h-4 rtl:rotate-180" />
            </button>
            
            <button
              onClick={() => setActiveView('tracking')}
              className="px-4 py-2.5 rounded-xl font-bold text-xs bg-red-800/60 hover:bg-red-800 text-white flex items-center gap-2 transition-all cursor-pointer shadow-md border border-red-400/30"
            >
              <Search className="w-4 h-4 text-amber-300" />
              <span>{t('quick_track') || 'Live Tracking'}</span>
            </button>
          </div>
        </div>

        {/* 4-Step Process Guide */}
        <div className="mt-6 pt-6 border-t border-white/20 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="flex items-center gap-2.5 bg-white/10 backdrop-blur-xs p-2.5 rounded-xl">
            <div className="w-6 h-6 rounded-full bg-amber-400 text-slate-900 font-black flex items-center justify-center text-xs shrink-0">1</div>
            <div>
              <div className="font-bold text-white">{t('step_prebook_online')}</div>
              <div className="text-[10px] text-red-100">{t('step_prebook_online_desc')}</div>
            </div>
          </div>
          <div className="flex items-center gap-2.5 bg-white/10 backdrop-blur-xs p-2.5 rounded-xl">
            <div className="w-6 h-6 rounded-full bg-amber-400 text-slate-900 font-black flex items-center justify-center text-xs shrink-0">2</div>
            <div>
              <div className="font-bold text-white">{t('step_drop_branch')}</div>
              <div className="text-[10px] text-red-100">{t('step_drop_branch_desc')}</div>
            </div>
          </div>
          <div className="flex items-center gap-2.5 bg-white/10 backdrop-blur-xs p-2.5 rounded-xl">
            <div className="w-6 h-6 rounded-full bg-amber-400 text-slate-900 font-black flex items-center justify-center text-xs shrink-0">3</div>
            <div>
              <div className="font-bold text-white">{t('step_branch_pricing')}</div>
              <div className="text-[10px] text-red-100">{t('step_branch_pricing_desc')}</div>
            </div>
          </div>
          <div className="flex items-center gap-2.5 bg-white/10 backdrop-blur-xs p-2.5 rounded-xl">
            <div className="w-6 h-6 rounded-full bg-amber-400 text-slate-900 font-black flex items-center justify-center text-xs shrink-0">4</div>
            <div>
              <div className="font-bold text-white">{t('step_tracking_invoicing')}</div>
              <div className="text-[10px] text-red-100">{t('step_tracking_invoicing_desc')}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Submission Success Alert with direct redirect to History */}
      {submittedCn && (
        <div className="p-5 rounded-3xl bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border-2 border-emerald-300 text-emerald-900 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-600/20">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm font-black text-emerald-950">
                {t('order_confirmed_success') || 'Pre-Booking Successfully Registered!'}
              </div>
              <div className="text-xs text-emerald-800 mt-0.5">
                {t('your_cn_lbl') || 'Waybill CN'}: <span className="font-mono font-black text-slate-900 bg-white px-2 py-0.5 rounded-md border border-emerald-300">{submittedCn}</span>. {t('origin_drop_prompt')}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={() => setActiveView('customer_history')}
              className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>{language === 'fa' ? 'مشاهده در تاریخچه بسته‌ها' : language === 'ps' ? 'په تاریخچه کې کتل' : 'View in Parcel History'} ➔</span>
            </button>
            <button
              onClick={() => setSubmittedCn(null)}
              className="px-3 py-2 rounded-xl bg-white hover:bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-300 cursor-pointer"
            >
              {t('btn_close') || 'Close'}
            </button>
          </div>
        </div>
      )}

      {/* RECTANGULAR TABLE: CUSTOMER FINANCIAL & PARCEL SUMMARY (CLICKABLE TO OPEN HISTORY) */}
      {(() => {
        const totalMoneySpent = customerShipments.reduce((sum, s) => sum + (s.financials?.totalAmount || 0), 0);
        const totalParcelsCount = customerShipments.length;
        const totalParcelsValue = customerShipments.reduce((sum, s) => sum + (s.financials?.productPrice || 0), 0);
        const deliveredCount = customerShipments.filter(s => s.status === 'delivered').length;
        const activeCount = customerShipments.filter(s => s.status !== 'delivered' && s.status !== 'cancelled').length;

        return (
          <div 
            onClick={() => setActiveView('customer_history')}
            className="group relative bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-200 dark:border-slate-800 shadow-md hover:shadow-xl hover:border-red-500 dark:hover:border-red-600 transition-all cursor-pointer overflow-hidden transform active:scale-[0.99]"
            id="all-orders-summary-table"
            title={language === 'fa' ? 'برای مشاهده صفحه تاریخچه تمام بسته‌ها کلیک کنید' : 'Click to open all parcels history'}
          >
            {/* Attractive Colored Top Header Bar */}
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
                    {language === 'fa' ? 'خلاصه وضعیت مالی، تعداد بسته‌ها و ارزش اظهاری محموله‌ها (جهت مشاهده جزئیات کلیک کنید)' : language === 'ps' ? 'د ټولو فرمایشونو او بارونو لنډیز (د تفصیل لپاره کلیک کړئ)' : 'Summary of all orders, freight expenditure & cargo value (Click to open full archive)'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="px-3 py-1 rounded-full bg-red-600 text-white font-bold text-[11px] shadow-sm flex items-center gap-1.5 group-hover:bg-red-500 transition-colors">
                  <MousePointerClick className="w-3.5 h-3.5 animate-bounce" />
                  <span>{language === 'fa' ? 'کلیک کنید: مشاهده تمام بسته‌ها' : language === 'ps' ? 'کلیک وکړئ: د ټولو بارونو لیست' : 'Click to View All Orders'} ➔</span>
                </span>
              </div>
            </div>

            {/* The 3 Attractive Colored Rectangular Metric Cells */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="uppercase font-bold text-[11px]">
                    <th className="py-3 px-6 bg-gradient-to-r from-emerald-100/90 to-teal-50 border-b border-emerald-200 text-emerald-950 border-r border-emerald-200/80 w-1/3">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        <span>{t('customer_stats_total_spent')}</span>
                      </div>
                    </th>
                    <th className="py-3 px-6 bg-gradient-to-r from-indigo-100/90 to-blue-50 border-b border-indigo-200 text-indigo-950 border-r border-indigo-200/80 text-center w-1/3">
                      <div className="flex items-center justify-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                        <span>{t('customer_stats_total_parcels')}</span>
                      </div>
                    </th>
                    <th className="py-3 px-6 bg-gradient-to-r from-amber-100/90 to-orange-50 border-b border-amber-200 text-amber-950 text-end w-1/3">
                      <div className="flex items-center justify-end gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                        <span>{t('customer_stats_total_product_val') || 'Total Expected Payout'}</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {/* 1. Emerald Cell: Total Money Spent */}
                    <td className="py-5 px-6 bg-gradient-to-br from-emerald-50/70 via-teal-50/30 to-white dark:from-emerald-950/20 dark:to-slate-900 border-r border-emerald-200/70">
                      <div className="flex items-center gap-3.5">
                        <div className="p-3 rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20 shrink-0 group-hover:scale-110 transition-transform">
                          <DollarSign className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="text-2xl font-black text-emerald-800 dark:text-emerald-300 font-mono tracking-tight flex items-baseline gap-1.5">
                            <span>{totalMoneySpent.toLocaleString()}</span>
                            <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200 border border-emerald-200">AFN</span>
                          </div>
                          <div className="text-[11px] font-medium text-emerald-900/80 dark:text-emerald-400 mt-1">
                            {language === 'fa' ? 'مجموع مبالغ کرایه پرداخت‌شده و در انتظار وصول' : language === 'ps' ? 'ټول لګښت شوي پیسې د باربري لپاره' : 'Total freight expenditure across all bookings'}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* 2. Indigo Cell: Total Parcels Count */}
                    <td className="py-5 px-6 bg-gradient-to-br from-indigo-50/70 via-blue-50/30 to-white dark:from-indigo-950/20 dark:to-slate-900 border-r border-indigo-200/70 text-center">
                      <div className="inline-flex flex-col items-center">
                        <div className="p-2.5 rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20 mb-1.5 group-hover:scale-110 transition-transform">
                          <Package className="w-5 h-5" />
                        </div>
                        <div className="text-2xl font-black text-indigo-950 dark:text-indigo-200 font-mono tracking-tight flex items-baseline justify-center gap-1.5">
                          <span>{totalParcelsCount}</span>
                          <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-900 text-indigo-900 dark:text-indigo-200 border border-indigo-200">{t('pcs_unit') || 'Parcels'}</span>
                        </div>
                        <div className="text-[11px] font-medium text-indigo-900/80 dark:text-indigo-400 mt-1">
                          {language === 'fa' ? `${deliveredCount} تسلیم‌شده • ${activeCount} در جریان انتقال` : language === 'ps' ? `${deliveredCount} سپارل شوی • ${activeCount} په لاره` : `${deliveredCount} Delivered • ${activeCount} In-transit`}
                        </div>
                      </div>
                    </td>

                    {/* 3. Amber Cell: Declared Cargo Value */}
                    <td className="py-5 px-6 bg-gradient-to-br from-amber-50/70 via-orange-50/30 to-white dark:from-amber-950/20 dark:to-slate-900 text-end">
                      <div className="flex flex-col items-end">
                        <div className="p-2.5 rounded-2xl bg-amber-500 text-white shadow-md shadow-amber-500/20 mb-1.5 group-hover:scale-110 transition-transform">
                          <ShieldCheck className="w-5 h-5" />
                        </div>
                        <div className="text-2xl font-black text-amber-800 dark:text-amber-300 font-mono tracking-tight flex items-baseline justify-end gap-1.5">
                          <span>{totalParcelsValue.toLocaleString()}</span>
                          <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900 text-amber-900 dark:text-amber-200 border border-amber-200">AFN</span>
                        </div>
                        <div className="text-[11px] font-medium text-amber-900/80 dark:text-amber-400 mt-1">
                          {language === 'fa' ? 'مجموع ارزش اجناس برای دریافت' : language === 'ps' ? 'د توکو ټول ارزښت د ترلاسه کولو لپاره' : 'Total expected payout for sold products'}
                        </div>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Click CTA banner below table */}
            <div className="p-3 bg-gradient-to-r from-red-50 via-slate-50 to-amber-50 dark:from-slate-800 dark:to-slate-850 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
              <div className="flex items-center gap-2 text-red-600">
                <MousePointerClick className="w-4 h-4 animate-pulse" />
                <span>{language === 'fa' ? 'جهت مشاهده، چاپ بارنامه و پیگیری تمام سفارشات خود، روی این جدول کلیک کنید' : language === 'ps' ? 'د خپلو ټولو بارونو د چاپ او تعقیب لپاره دلته کلیک وکړئ' : 'Click anywhere on this table to open your comprehensive parcel archive & print waybills'}</span>
              </div>
              <span className="text-red-600 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                <span>{language === 'fa' ? 'مشاهده صفحه تاریخچه' : 'Open History'}</span>
                <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
              </span>
            </div>
          </div>
        );
      })()}

      {/* PRE-BOOKING FORM (DIRECTLY ON MAIN PAGE) */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Package className="w-5 h-5 text-red-600" />
              <span>{t('prebook_new_parcel')}</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {t('prebooking_notice')}
            </p>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800 text-amber-900 dark:text-amber-300 text-xs">
            <Scale className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{t('branch_eval_prompt')}</span>
          </div>
        </div>

        <form onSubmit={handlePreBookSubmit} className="space-y-6">
          
          {/* 1. Branch Routing Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-red-600" />
                <span>{t('origin_branch_drop')}</span>
              </label>
              <select
                value={originBranchId}
                onChange={(e) => handleOriginChange(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-red-500 focus:outline-none"
              >
                {branches.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.city} - {b.province})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-emerald-600" />
                <span>{t('destination_branch_dest')}</span>
              </label>
              <select
                value={destinationBranchId}
                onChange={(e) => handleDestChange(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-red-500 focus:outline-none"
              >
                {branches.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.city} - {b.province})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 2. Sender & Receiver Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Sender */}
            <div className="space-y-3 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-600" />
                <span>{t('sender_details')}</span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">{t('sender_name')}</label>
                <input
                  type="text"
                  required
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">{t('sender_phone')}</label>
                  <input
                    type="tel"
                    required
                    value={senderPhone}
                    onChange={(e) => setSenderPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-red-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">{t('sender_city')}</label>
                  <input
                    type="text"
                    value={senderCity}
                    onChange={(e) => setSenderCity(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">{t('sender_address')}</label>
                <input
                  type="text"
                  value={senderAddress}
                  onChange={(e) => setSenderAddress(e.target.value)}
                  placeholder="e.g. Mandawi Market, Kabul"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Receiver */}
            <div className="space-y-3 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
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

              <div className="grid grid-cols-2 gap-2">
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
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  {t('receiver_tazkira_nid') || 'Receiver Tazkira / National ID (Optional)'}
                </label>
                <input
                  type="text"
                  value={receiverNationalId}
                  onChange={(e) => setReceiverNationalId(e.target.value)}
                  placeholder="e.g. 1402-0987-12345"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
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

          {/* 3. Parcel Details */}
          <div className="space-y-4 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
            <div className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              {t('parcel_specs_product_val') || 'Product Details & Selling Price'}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">{t('category_lbl')}</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ParcelCategory)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:outline-none"
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
                  required
                  value={estimatedWeightKg}
                  onChange={(e) => setEstimatedWeightKg(parseFloat(e.target.value) || 1)}
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
                  onChange={(e) => setPieces(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">{t('goods_selling_price_afn') || 'Product Price (AFN)'}</label>
                <input
                  type="number"
                  min="0"
                  value={productPriceAfn}
                  onChange={(e) => setProductPriceAfn(parseFloat(e.target.value) || 0)}
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
                placeholder="e.g. 5 boxes of men's clothing items, high quality fabric"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={isFragile}
                  onChange={(e) => setIsFragile(e.target.checked)}
                  className="w-4 h-4 rounded text-red-600 focus:ring-red-500"
                />
                <span>{t('fragile_cargo_notice')}</span>
              </label>

              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{t('payment_preference_lbl')}:</span>
                <label className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="radio"
                    name="paypref"
                    checked={paymentPreference === 'pay_at_branch'}
                    onChange={() => setPaymentPreference('pay_at_branch')}
                    className="text-red-600"
                  />
                  <span>{t('pay_at_origin_branch')}</span>
                </label>
                <label className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="radio"
                    name="paypref"
                    checked={paymentPreference === 'pay_on_delivery'}
                    onChange={() => setPaymentPreference('pay_on_delivery')}
                    className="text-red-600"
                  />
                  <span>{t('receiver_pays_cod')}</span>
                </label>
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 rounded-2xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold text-xs shadow-lg shadow-red-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Package className="w-4 h-4" />
            <span>{t('submit_prebook_btn')}</span>
          </button>

        </form>
      </div>

    </div>
  );
};
