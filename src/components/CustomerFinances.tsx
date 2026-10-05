import React, { useState, useMemo } from 'react';
import { 
  DollarSign, 
  Wallet, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Search, 
  ShieldCheck, 
  Scale, 
  Sparkles, 
  Layers, 
  Filter, 
  AlertTriangle,
  Send,
  HelpCircle,
  Eye,
  Check,
  X,
  CreditCard,
  Building2,
  PhoneCall,
  CheckCheck
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Shipment, SellerPayoutStatus } from '../types';

export const CustomerFinances: React.FC = () => {
  const { 
    t, 
    currentUser, 
    branches, 
    customerShipments, 
    setActiveView, 
    trackByCnNumber,
    confirmSellerPayoutReceived,
    disputeSellerPayout,
    language 
  } = useApp();

  const [activeFilter, setActiveFilter] = useState<'all' | 'ready' | 'disbursed' | 'confirmed' | 'in_transit' | 'disputed'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Dispute modal state
  const [disputeShipment, setDisputeShipment] = useState<Shipment | null>(null);
  const [disputeReason, setDisputeReason] = useState('');
  const [isSubmittingDispute, setIsSubmittingDispute] = useState(false);

  // Helper to get localized branch name
  const getBranchName = (branchId: string | undefined) => {
    if (!branchId) return 'Hub';
    const b = branches.find(branch => branch.id === branchId);
    if (!b) return 'Hub';
    if (language === 'fa' && b.nameFa) return b.nameFa;
    if (language === 'ps' && b.namePs) return b.namePs;
    return b.name;
  };

  // Helper to get net seller payout for a parcel
  const getNetSellerPayout = (s: Shipment): number => {
    if (typeof s.financials?.sellerPayout === 'number' && s.financials.sellerPayout > 0) {
      return s.financials.sellerPayout;
    }
    const productPrice = s.financials?.productPrice || s.packageInfo?.declaredValueAfn || 0;
    const destComm = s.destBranchCommission !== undefined ? s.destBranchCommission : (s.financials?.destBranchCommission || 70);
    const serviceFee = s.financials?.serviceFee || s.transportationFee || 150;
    const discount = s.financials?.discountAmount || 0;
    return Math.max(0, productPrice - destComm - serviceFee + discount);
  };

  // Resolve payout status for a parcel
  const getPayoutStatus = (s: Shipment): SellerPayoutStatus => {
    if (s.sellerPayoutStatus) return s.sellerPayoutStatus;
    if (s.status === 'delivered') return 'ready_for_payout';
    return 'pending_delivery';
  };

  // High-Level Financial Metrics
  const financialStats = useMemo(() => {
    let totalSoldProductAfn = 0;
    let totalDeliveredCount = 0;

    let inTransitExpectedAfn = 0;
    let inTransitCount = 0;

    let totalDestCommissionAfn = 0;
    let totalServiceFeesAfn = 0;
    let totalDiscountsAfn = 0;

    let totalNetEligibleAfn = 0;
    let totalPaidToCustomerAfn = 0;
    let totalPendingCollectionAfn = 0;
    let pendingParcelsCount = 0;

    customerShipments.forEach(s => {
      const pPrice = s.financials?.productPrice || s.packageInfo?.declaredValueAfn || 0;
      const destComm = s.destBranchCommission !== undefined ? s.destBranchCommission : (s.financials?.destBranchCommission || 70);
      const serviceFee = s.financials?.serviceFee || s.transportationFee || 150;
      const discount = s.financials?.discountAmount || 0;
      const netPayout = getNetSellerPayout(s);

      totalDestCommissionAfn += destComm;
      totalServiceFeesAfn += serviceFee;
      totalDiscountsAfn += discount;

      const pStatus = getPayoutStatus(s);

      if (s.status === 'delivered') {
        totalSoldProductAfn += pPrice;
        totalDeliveredCount += 1;
        totalNetEligibleAfn += netPayout;

        if (pStatus === 'confirmed_by_customer') {
          totalPaidToCustomerAfn += netPayout;
        } else if (pStatus === 'disbursed_by_branch') {
          // Disbursed by branch, awaiting customer receipt confirmation
          totalPaidToCustomerAfn += netPayout;
        } else {
          // Ready for payout at branch
          totalPendingCollectionAfn += netPayout;
          pendingParcelsCount += 1;
        }
      } else {
        // In transit / moving
        inTransitExpectedAfn += netPayout;
        inTransitCount += 1;
      }
    });

    return {
      totalSoldProductAfn,
      totalDeliveredCount,
      inTransitExpectedAfn,
      inTransitCount,
      totalDestCommissionAfn,
      totalServiceFeesAfn,
      totalDiscountsAfn,
      totalNetEligibleAfn,
      totalPaidToCustomerAfn,
      totalPendingCollectionAfn,
      pendingParcelsCount,
      totalRemainingUncollectedAfn: totalPendingCollectionAfn + inTransitExpectedAfn
    };
  }, [customerShipments]);

  // Filtered shipments list
  const filteredShipments = useMemo(() => {
    return customerShipments.filter(s => {
      const pStatus = getPayoutStatus(s);

      if (activeFilter === 'ready' && pStatus !== 'ready_for_payout') return false;
      if (activeFilter === 'disbursed' && pStatus !== 'disbursed_by_branch') return false;
      if (activeFilter === 'confirmed' && pStatus !== 'confirmed_by_customer') return false;
      if (activeFilter === 'in_transit' && pStatus !== 'pending_delivery') return false;
      if (activeFilter === 'disputed' && pStatus !== 'disputed') return false;

      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const matchesCn = (s.cnNumber || '').toLowerCase().includes(query);
        const matchesRecv = (s.receiver?.name || '').toLowerCase().includes(query);
        const matchesPhone = (s.receiver?.phone || '').includes(query);
        const matchesDest = (s.receiver?.city || '').toLowerCase().includes(query);
        return matchesCn || matchesRecv || matchesPhone || matchesDest;
      }

      return true;
    });
  }, [customerShipments, activeFilter, searchTerm]);

  // Handle dispute submission
  const handleSubmitDispute = (e: React.FormEvent) => {
    e.preventDefault();
    if (!disputeShipment || !disputeReason.trim()) return;

    setIsSubmittingDispute(true);
    try {
      disputeSellerPayout(disputeShipment.id, disputeReason);
      setDisputeShipment(null);
      setDisputeReason('');
    } finally {
      setIsSubmittingDispute(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      
      {/* Page Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-red-950 to-slate-900 text-white p-6 sm:p-8 shadow-2xl border border-red-900/40">
        <div className="absolute top-0 end-0 -mt-10 -me-10 w-80 h-80 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-bold text-amber-300">
              <Sparkles className="w-3.5 h-3.5" />
              <span>
                {language === 'fa' 
                  ? 'حسابداری، تسویه‌حساب و امور مالی فروشنده' 
                  : language === 'ps' 
                  ? 'د پلورونکي مالي حساب او تصفیه' 
                  : 'Customer Seller Accounts & Financial Clearance'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              {language === 'fa' 
                ? 'امور مالی و تسویه‌حساب بارهای فروخته شده' 
                : language === 'ps' 
                ? 'د پلورل شوو بارونو مالي تصفیه' 
                : 'Consignment Accounts & Financial Clearance'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              {language === 'fa' 
                ? 'مشاهده مجموع فروشات، پول دریافت شده از شعبه، وجوه در حال انتقال و بررسی دقیق کمیشن و مصارف وزن هر بسته.'
                : 'Real-time financial transparency: track delivered goods value, cash collected at branches, en-route amounts, and scale weight commissions.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setActiveView('customer_portal')}
              type="button"
              className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all border border-white/20 cursor-pointer flex items-center gap-2"
            >
              <span>{language === 'fa' ? 'پیشخوان ثبت بار' : 'Consignment Booking'}</span>
              <ArrowRight className="w-4 h-4 rtl:rotate-180 text-amber-300" />
            </button>
          </div>
        </div>
      </div>

      {/* 6 Comprehensive Financial Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5 sm:gap-4">
        
        {/* Card 1: Total Sold Value */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-emerald-400 dark:hover:border-emerald-600 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              {language === 'fa' ? 'مجموع ارزش فروشات' : language === 'ps' ? 'د پلور ټول ارزښت' : 'Total Sold Value'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-white">
              {financialStats.totalSoldProductAfn.toLocaleString()} <span className="text-xs font-sans text-slate-400">AFN</span>
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1 font-semibold">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              <span>{financialStats.totalDeliveredCount} {language === 'fa' ? 'بسته تحویل خریدار شد' : 'parcels delivered'}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Cash Taken / Received by Customer */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-blue-400 dark:hover:border-blue-600 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              {language === 'fa' ? 'پول دریافت شده از شعبه' : language === 'ps' ? 'له څانګې اخیستل شوې پیسې' : 'Cash Received in Hand'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black font-mono text-blue-600 dark:text-blue-400">
              {financialStats.totalPaidToCustomerAfn.toLocaleString()} <span className="text-xs font-sans text-slate-400">AFN</span>
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1 font-semibold">
              <CheckCheck className="w-3 h-3 text-blue-500" />
              <span>{language === 'fa' ? 'تسویه و تحویل نقد شده' : 'Cleared & disbursed'}</span>
            </div>
          </div>
        </div>

        {/* Card 3: Ready for Collection at Branch */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-emerald-500 dark:hover:border-emerald-500 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
              {language === 'fa' ? 'آماده دریافت از شعبه' : language === 'ps' ? 'په څانګه کې چمتو پیسې' : 'Ready at Branch'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black font-mono text-emerald-700 dark:text-emerald-300">
              {financialStats.totalPendingCollectionAfn.toLocaleString()} <span className="text-xs font-sans text-slate-400">AFN</span>
            </div>
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1 font-semibold">
              <Clock className="w-3 h-3 text-emerald-600" />
              <span>{financialStats.pendingParcelsCount} {language === 'fa' ? 'بسته وصول شده آماده تحویل' : 'parcels ready for pickup'}</span>
            </div>
          </div>
        </div>

        {/* Card 4: Money In Transit */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-amber-400 dark:hover:border-amber-600 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              {language === 'fa' ? 'پول در راه (انتقال)' : language === 'ps' ? 'په لاره پیسې' : 'Money In Transit'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black font-mono text-amber-600 dark:text-amber-400">
              {financialStats.inTransitExpectedAfn.toLocaleString()} <span className="text-xs font-sans text-slate-400">AFN</span>
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1 font-semibold">
              <span>{financialStats.inTransitCount} {language === 'fa' ? 'بسته در حال انتقال بین شعب' : 'parcels en-route'}</span>
            </div>
          </div>
        </div>

        {/* Card 5: Branch Commission & Weight Charges */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-red-400 dark:hover:border-red-600 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
              {language === 'fa' ? 'مجموع کمیشن و مصارف' : language === 'ps' ? 'ټول کمیشن او لګښتونه' : 'Commissions & Fees'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center">
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black font-mono text-red-600 dark:text-red-400">
              {(financialStats.totalDestCommissionAfn + financialStats.totalServiceFeesAfn).toLocaleString()} <span className="text-xs font-sans text-slate-400">AFN</span>
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1 font-semibold">
              <span>{language === 'fa' ? 'کمیشن نمایندگی + کرایه وزن' : 'Branch comm. + Freight'}</span>
            </div>
          </div>
        </div>

        {/* Card 6: Total Remaining Uncollected */}
        <div className="bg-gradient-to-br from-red-600 to-red-700 text-white rounded-2xl p-4 sm:p-5 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-red-100">
              {language === 'fa' ? 'مجموع طلب باقی‌مانده' : language === 'ps' ? 'ټول پاتې حساب' : 'Total Remaining Due'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-white/20 text-white flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black font-mono text-white">
              {financialStats.totalRemainingUncollectedAfn.toLocaleString()} <span className="text-xs font-sans text-red-200">AFN</span>
            </div>
            <div className="text-[10px] text-red-100 mt-1 flex items-center gap-1 font-semibold">
              <span>{financialStats.pendingParcelsCount + financialStats.inTransitCount} {language === 'fa' ? 'بسته باقی‌مانده' : 'parcels pending'}</span>
            </div>
          </div>
        </div>

      </div>

      {/* Fraud-Proof Explanatory Notice */}
      <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-100 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="font-black text-amber-900 dark:text-amber-200 text-xs sm:text-sm">
              {language === 'fa' 
                ? 'سیستم شفافیت مالی و تضمین پرداخت نقد' 
                : 'Financial Transparency & Cash Handover Guarantee'}
            </div>
            <div className="text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
              {language === 'fa' 
                ? 'هر زمان شعبه پول را به شما تحویل داد، دکمه «تأیید دریافت وجه» را فشار دهید. اگر شعبه وضعیت را پرداخت شده ثبت نمود اما پولی به شما نداده است، فوراً دکمه «گزارش مغایرت» را بزنید تا مدیریت مرکز رسیدگی کند.'
                : 'When the branch hands you the cash, click "Confirm Received". If a branch marked your parcel as paid without handing over the cash, use "Report Not Received" to trigger immediate audit.'}
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        
        {/* Table Filter Tabs and Search Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          
          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-colors cursor-pointer ${
                activeFilter === 'all'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              {language === 'fa' ? 'همه بارها' : 'All'} ({customerShipments.length})
            </button>
            
            <button
              onClick={() => setActiveFilter('ready')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeFilter === 'ready'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>{language === 'fa' ? 'آماده دریافت از شعبه' : 'Ready for Payout'}</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">{financialStats.pendingParcelsCount}</span>
            </button>

            <button
              onClick={() => setActiveFilter('disbursed')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeFilter === 'disbursed'
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 hover:bg-blue-100'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{language === 'fa' ? 'پرداخت شده توسط شعبه (در انتظار تأیید شما)' : 'Disbursed by Branch'}</span>
            </button>

            <button
              onClick={() => setActiveFilter('confirmed')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeFilter === 'confirmed'
                  ? 'bg-teal-600 text-white'
                  : 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400 hover:bg-teal-100'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{language === 'fa' ? 'تأیید نهایی شده' : 'Confirmed Received'}</span>
            </button>

            <button
              onClick={() => setActiveFilter('in_transit')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeFilter === 'in_transit'
                  ? 'bg-amber-600 text-white'
                  : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 hover:bg-amber-100'
              }`}
            >
              <span>{language === 'fa' ? 'در راه' : 'In Transit'}</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">{financialStats.inTransitCount}</span>
            </button>
          </div>

          {/* Search Input */}
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={language === 'fa' ? 'جستجو بر اساس بارنامه، گیرنده، شهر...' : 'Search CN, receiver, city...'}
              className="w-full ps-9 pe-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-red-500"
            />
          </div>
        </div>

        {/* Table Content */}
        {filteredShipments.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <DollarSign className="w-6 h-6" />
            </div>
            <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
              {language === 'fa' ? 'هیچ ردیفی با این فیلتر یافت نشد' : 'No records found for current filter'}
            </div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {language === 'fa' ? 'فیلتر دیگری را انتخاب کنید یا بار جدیدی را ثبت فرمایید.' : 'Try changing your filter or book new consignments.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                  <th className="py-3.5 px-4 text-start">#</th>
                  <th className="py-3.5 px-4 text-start">{t('your_cn_lbl') || 'Waybill CN'}</th>
                  <th className="py-3.5 px-4 text-start">{language === 'fa' ? 'مسیر و گیرنده' : 'Route & Receiver'}</th>
                  <th className="py-3.5 px-4 text-center">{language === 'fa' ? 'وزن تأیید شده' : 'Confirmed Weight'}</th>
                  <th className="py-3.5 px-4 text-end">{language === 'fa' ? 'ارزش جنس (فروش)' : 'Product Price'}</th>
                  <th className="py-3.5 px-4 text-end">{language === 'fa' ? 'کمیشن نمایندگی' : 'Branch Comm.'}</th>
                  <th className="py-3.5 px-4 text-end">{language === 'fa' ? 'کرایه انتقال' : 'Freight Fee'}</th>
                  <th className="py-3.5 px-4 text-end font-black text-slate-900 dark:text-white">{language === 'fa' ? 'خالص قابل پرداخت' : 'Net Payout'}</th>
                  <th className="py-3.5 px-4 text-center">{language === 'fa' ? 'وضعیت تصفیه مالی' : 'Clearance Status'}</th>
                  <th className="py-3.5 px-4 text-center">{language === 'fa' ? 'عملیات و تأیید' : 'Action & Confirmation'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredShipments.map((s, idx) => {
                  const pStatus = getPayoutStatus(s);
                  const netPayout = getNetSellerPayout(s);
                  const pPrice = s.financials?.productPrice || s.packageInfo?.declaredValueAfn || 0;
                  const destComm = s.destBranchCommission !== undefined ? s.destBranchCommission : (s.financials?.destBranchCommission || 70);
                  const serviceFee = s.financials?.serviceFee || s.transportationFee || 150;
                  const origBr = branches.find(b => b.id === s.originBranchId);
                  const destBr = branches.find(b => b.id === s.destinationBranchId);

                  return (
                    <tr 
                      key={s.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-400">
                        {idx + 1}
                      </td>

                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => {
                            trackByCnNumber(s.cnNumber);
                            setActiveView('tracking');
                          }}
                          className="font-mono font-black text-red-600 dark:text-red-400 hover:underline cursor-pointer flex items-center gap-1"
                          title={language === 'fa' ? 'پیگیری زنده بارنامه' : 'Track parcel'}
                        >
                          <span>{s.cnNumber}</span>
                          <Search className="w-3 h-3 text-slate-400" />
                        </button>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {new Date(s.bookedAt).toLocaleDateString()}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {s.receiver?.name}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                          <span>{getBranchName(s.originBranchId)}</span>
                          <ArrowRight className="w-3 h-3 text-red-500 rtl:rotate-180" />
                          <span className="font-semibold text-slate-700 dark:text-slate-300">{getBranchName(s.destinationBranchId)}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                          {s.packageInfo?.weightKg || 0} kg
                        </span>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {s.packageInfo?.pieces || 1} {language === 'fa' ? 'قطعه' : 'pcs'}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-end font-mono font-bold text-slate-900 dark:text-white">
                        {pPrice.toLocaleString()} AFN
                      </td>

                      <td className="py-3.5 px-4 text-end font-mono text-red-600 dark:text-red-400 font-semibold">
                        -{destComm.toLocaleString()} AFN
                      </td>

                      <td className="py-3.5 px-4 text-end font-mono text-slate-600 dark:text-slate-400">
                        -{serviceFee.toLocaleString()} AFN
                      </td>

                      <td className="py-3.5 px-4 text-end font-mono font-black text-emerald-700 dark:text-emerald-400 text-sm">
                        {netPayout.toLocaleString()} AFN
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {pStatus === 'confirmed_by_customer' && (
                          <div className="inline-flex flex-col items-center">
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-teal-100 text-teal-900 dark:bg-teal-950 dark:text-teal-200 border border-teal-300 dark:border-teal-800 flex items-center gap-1">
                              <CheckCheck className="w-3.5 h-3.5 text-teal-600" />
                              <span>{language === 'fa' ? 'تسویه کامل شد' : 'Fully Cleared'}</span>
                            </span>
                            {s.sellerPayoutConfirmedAt && (
                              <span className="text-[9px] text-slate-400 mt-0.5 font-mono">
                                {new Date(s.sellerPayoutConfirmedAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        )}

                        {pStatus === 'disbursed_by_branch' && (
                          <div className="inline-flex flex-col items-center">
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200 border border-blue-300 dark:border-blue-800 flex items-center gap-1">
                              <Building2 className="w-3.5 h-3.5 text-blue-600" />
                              <span>{language === 'fa' ? 'شعبه پرداخت کرد' : 'Disbursed by Branch'}</span>
                            </span>
                            <span className="text-[9px] text-blue-600 font-semibold mt-0.5">
                              {language === 'fa' ? 'لطفاً تأیید نمایید' : 'Please confirm'}
                            </span>
                          </div>
                        )}

                        {pStatus === 'ready_for_payout' && (
                          <div className="inline-flex flex-col items-center">
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-emerald-600" />
                              <span>{language === 'fa' ? 'آماده تحویل در شعبه' : 'Ready at Origin Branch'}</span>
                            </span>
                            <span className="text-[9px] text-slate-400 mt-0.5">
                              {getBranchName(s.originBranchId)}
                            </span>
                          </div>
                        )}

                        {pStatus === 'pending_delivery' && (
                          <div className="inline-flex flex-col items-center">
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-amber-600" />
                              <span>{language === 'fa' ? 'در راه (در حال انتقال)' : 'In Transit'}</span>
                            </span>
                          </div>
                        )}

                        {pStatus === 'disputed' && (
                          <div className="inline-flex flex-col items-center">
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200 border border-red-300 dark:border-red-800 flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                              <span>{language === 'fa' ? 'در حال بررسی مغایرت' : 'Dispute Under Review'}</span>
                            </span>
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          
                          {/* If branch has disbursed, allow customer to confirm cash received */}
                          {pStatus === 'disbursed_by_branch' && (
                            <>
                              <button
                                type="button"
                                onClick={() => confirmSellerPayoutReceived(s.id)}
                                className="px-3 py-1 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs flex items-center gap-1 transition-all cursor-pointer"
                                title={language === 'fa' ? 'تأیید دریافت فیزیکی پول از شعبه' : 'Confirm Cash Handed Over'}
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>{language === 'fa' ? 'تأیید دریافت وجه' : 'Confirm Received'}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setDisputeShipment(s);
                                  setDisputeReason('');
                                }}
                                className="px-2 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-red-50 text-red-600 dark:hover:bg-red-950/40 text-xs font-bold border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                                title={language === 'fa' ? 'پول را تحویل نگرفته‌ام / ثبت اعتراض' : 'Did not receive cash / dispute'}
                              >
                                <AlertCircle className="w-3.5 h-3.5" />
                                <span>{language === 'fa' ? 'نگرفته‌ام' : 'Not Received'}</span>
                              </button>
                            </>
                          )}

                          {/* If ready at branch, guide customer to visit branch */}
                          {pStatus === 'ready_for_payout' && (
                            <div className="text-[11px] text-slate-500 font-medium">
                              <span>{language === 'fa' ? 'مراجعه به نمایندگی ' : 'Visit branch: '}</span>
                              <strong className="text-slate-800 dark:text-slate-200">{getBranchName(s.originBranchId)}</strong>
                            </div>
                          )}

                          {/* If in transit, give quick tracking */}
                          {pStatus === 'pending_delivery' && (
                            <button
                              type="button"
                              onClick={() => {
                                trackByCnNumber(s.cnNumber);
                                setActiveView('tracking');
                              }}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer flex items-center gap-1"
                            >
                              <Search className="w-3 h-3" />
                              <span>{language === 'fa' ? 'پیگیری' : 'Track'}</span>
                            </button>
                          )}

                          {/* If already confirmed */}
                          {pStatus === 'confirmed_by_customer' && (
                            <span className="text-[11px] text-teal-600 dark:text-teal-400 font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{language === 'fa' ? 'حساب تصفیه شد' : 'Account Settled'}</span>
                            </span>
                          )}

                          {/* If in dispute */}
                          {pStatus === 'disputed' && (
                            <span className="text-[10px] text-red-600 font-semibold" title={s.sellerPayoutDisputeReason}>
                              {language === 'fa' ? 'اطلاع به مدیر کل داده شد' : 'Notified Super Admin'}
                            </span>
                          )}

                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* Dispute Modal */}
      {disputeShipment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-black text-sm text-slate-900 dark:text-white">
                  {language === 'fa' ? 'گزارش عدم دریافت وجه از شعبه' : 'Report Cash Payout Not Received'}
                </h3>
              </div>
              <button
                onClick={() => setDisputeShipment(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {language === 'fa' 
                ? `شعبه مبدأ بارنامه شماره ${disputeShipment.cnNumber} را به عنوان پرداخت شده ثبت نموده است. اگر شما پول نقد را دریافت نکرده‌اید، لطفاً دلیل یا توضیحات خود را بنویسید تا مدیریت مرکزی و بازرسی فوراً پیگیری نمایند.`
                : `The origin branch marked CN #${disputeShipment.cnNumber} as paid. If you did not receive this cash, please submit details below for immediate Super Admin audit.`}
            </div>

            <form onSubmit={handleSubmitDispute} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {language === 'fa' ? 'توضیحات و علت اعتراض' : 'Dispute Description & Reason'} *
                </label>
                <textarea
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  rows={3}
                  required
                  placeholder={language === 'fa' ? 'مثال: به شعبه مراجعه کردم ولی صندوق‌دار گفت پول آماده نیست یا شماره حساب اشتباه است...' : 'e.g., I visited the branch but cashier did not hand over the cash...'}
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDisputeShipment(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer"
                >
                  {language === 'fa' ? 'انصراف' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingDispute || !disputeReason.trim()}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingDispute ? '...' : (language === 'fa' ? 'ثبت گزارش و ارسال به مدیریت' : 'Submit Dispute')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
