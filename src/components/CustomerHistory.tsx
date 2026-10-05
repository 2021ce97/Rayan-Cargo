import React, { useState, useMemo } from 'react';
import { 
  Package, 
  Search, 
  Plus, 
  Clock, 
  CheckCircle2, 
  Truck, 
  MapPin, 
  ArrowRight, 
  Filter, 
  FileText, 
  ShieldCheck, 
  DollarSign, 
  Layers,
  ArrowLeft,
  Calendar,
  User,
  Phone,
  Info,
  AlertTriangle,
  Wallet
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Shipment, ShipmentStatus } from '../types';

export const CustomerHistory: React.FC = () => {
  const { 
    t, 
    currentUser, 
    branches, 
    customerShipments, 
    setActiveView, 
    trackByCnNumber,
    language,
    isRTL
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'active' | 'delivered'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Filtered customer shipments list
  const filteredList = useMemo(() => {
    return customerShipments.filter(s => {
      // Status Filter
      if (statusFilter === 'pending') {
        if (s.status !== 'pre_booked') return false;
      } else if (statusFilter === 'active') {
        if (s.status === 'delivered' || s.status === 'cancelled' || s.status === 'pre_booked') return false;
      } else if (statusFilter === 'delivered') {
        if (s.status !== 'delivered') return false;
      }

      // Category Filter
      if (selectedCategory !== 'all' && s.packageInfo?.category !== selectedCategory) {
        return false;
      }

      // Search Query
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchesCn = (s.cnNumber || '').toLowerCase().includes(q);
        const matchesReceiver = (s.receiver?.name || '').toLowerCase().includes(q) || (s.receiver?.phone || '').includes(q);
        const matchesSender = (s.sender?.name || '').toLowerCase().includes(q) || (s.sender?.phone || '').includes(q);
        const matchesCity = (s.receiver?.city || '').toLowerCase().includes(q) || (s.sender?.city || '').toLowerCase().includes(q);
        const matchesDesc = (s.packageInfo?.description || '').toLowerCase().includes(q);
        return matchesCn || matchesReceiver || matchesSender || matchesCity || matchesDesc;
      }

      return true;
    });
  }, [customerShipments, statusFilter, selectedCategory, searchTerm]);

  // Metric counts
  const stats = useMemo(() => {
    const total = customerShipments.length;
    const pending = customerShipments.filter(s => s.status === 'pre_booked').length;
    const active = customerShipments.filter(s => s.status !== 'delivered' && s.status !== 'cancelled' && s.status !== 'pre_booked').length;
    const delivered = customerShipments.filter(s => s.status === 'delivered').length;
    const totalSpent = customerShipments.reduce((sum, s) => sum + (s.financials?.totalAmount || 0), 0);
    const totalProductVal = customerShipments.reduce((sum, s) => sum + (s.financials?.productPrice || 0), 0);

    return { total, pending, active, delivered, totalSpent, totalProductVal };
  }, [customerShipments]);

  const getStatusBadge = (status: ShipmentStatus) => {
    switch (status) {
      case 'pre_booked':
        return 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-700';
      case 'verified':
        return 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700';
      case 'booked':
        return 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-700';
      case 'in_transit':
        return 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700';
      case 'received_at_branch':
        return 'bg-cyan-100 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-300 border-cyan-300 dark:border-cyan-700';
      case 'out_for_delivery':
        return 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700';
      case 'delivered':
        return 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700';
      case 'cancelled':
        return 'bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 border-red-300 dark:border-red-700';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  const getStatusLabel = (status: ShipmentStatus) => {
    const key = `status_${status}` as any;
    const translated = t(key);
    if (translated && translated !== key) return translated;
    return status.replace(/_/g, ' ');
  };

  return (
    <div className="space-y-6 pb-12 font-sans" id="customer-history-page">
      
      {/* Header Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 sm:p-8 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-bold uppercase tracking-wider text-amber-300 border border-white/15">
              <FileText className="w-3.5 h-3.5" />
              <span>{language === 'fa' ? 'تاریخچه کامل بسته‌ها و سفارشات' : language === 'ps' ? 'د بارونو او فرمایشونو بشپړ تاریخچه' : 'Customer Parcel & Order Archive'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              {language === 'fa' ? 'لیست تمام بسته‌ها و محموله‌های شما' : language === 'ps' ? 'ستاسو د ټولو بارونو او کڅوړو لیست' : 'All Customer Parcels & Orders'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              {language === 'fa' 
                ? 'مشاهده وضعیت لحظه‌ای، مبالغ پرداختی، تذکره، بارنامه دیجیتال و سابقه انتقال تمام بسته‌های ثبت‌شده'
                : language === 'ps'
                ? 'د ثبت شویو بارونو او کڅوړو د تحویلۍ او پیسو بشپړ حالت وګورئ'
                : 'Track real-time delivery status, financial settlements, destination hubs, and live tracking for all your shipments.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setActiveView('customer_finances')}
              className="px-4 py-2.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
            >
              <Wallet className="w-4 h-4" />
              <span>{language === 'fa' ? 'امور مالی و تسویه‌حساب' : 'Financial Clearance'}</span>
            </button>
            <button
              onClick={() => setActiveView('customer_portal')}
              className="px-4 py-2.5 rounded-xl font-bold text-xs bg-red-600 hover:bg-red-500 text-white flex items-center gap-2 shadow-lg shadow-red-600/30 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{t('prebook_new_parcel') || 'Pre-Book New Parcel'}</span>
            </button>
            <button
              onClick={() => setActiveView('tracking')}
              className="px-4 py-2.5 rounded-xl font-bold text-xs bg-white/10 hover:bg-white/20 text-white border border-white/20 flex items-center gap-2 transition-all cursor-pointer"
            >
              <Search className="w-4 h-4 text-amber-300" />
              <span>{t('quick_track') || 'Live Tracking'}</span>
            </button>
          </div>
        </div>

        {/* Quick KPI summary bar */}
        <div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-white/10 backdrop-blur-xs p-3 rounded-2xl border border-white/10">
            <div className="text-[11px] text-slate-300">{language === 'fa' ? 'مجموع بسته‌ها' : language === 'ps' ? 'ټول بارونه' : 'Total Bookings'}</div>
            <div className="text-xl font-black text-white font-mono mt-0.5">{stats.total}</div>
          </div>
          <div className="bg-white/10 backdrop-blur-xs p-3 rounded-2xl border border-white/10">
            <div className="text-[11px] text-amber-300">{language === 'fa' ? 'در انتظار تایید شعبه' : language === 'ps' ? 'د تایید په تمه' : 'Pending Verification'}</div>
            <div className="text-xl font-black text-amber-300 font-mono mt-0.5">{stats.pending}</div>
          </div>
          <div className="bg-white/10 backdrop-blur-xs p-3 rounded-2xl border border-white/10">
            <div className="text-[11px] text-indigo-300">{language === 'fa' ? 'در جریان انتقال' : language === 'ps' ? 'په لاره او باربري کې' : 'In Transit'}</div>
            <div className="text-xl font-black text-indigo-300 font-mono mt-0.5">{stats.active}</div>
          </div>
          <div className="bg-white/10 backdrop-blur-xs p-3 rounded-2xl border border-white/10">
            <div className="text-[11px] text-emerald-300">{language === 'fa' ? 'تسلیم‌شده' : language === 'ps' ? 'تسلیم شوي' : 'Delivered'}</div>
            <div className="text-xl font-black text-emerald-300 font-mono mt-0.5">{stats.delivered}</div>
          </div>
        </div>
      </div>

      {/* Control Filters Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute start-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={language === 'fa' ? 'جستجو با شماره بارنامه (CN)، نام گیرنده، شماره تماس یا شهر...' : language === 'ps' ? 'د بار نمبر (CN)، د ترلاسه کوونکي نوم یا ټلیفون لټول...' : 'Search by CN #, Receiver name, phone number, city...'}
              className="w-full ps-10 pe-4 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 font-medium"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute end-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>

          {/* Status Tabs */}
          <div className="flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold border border-slate-200 dark:border-slate-700 overflow-x-auto">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-white dark:bg-slate-900 text-red-600 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {language === 'fa' ? 'همه' : language === 'ps' ? 'ټول' : 'All'} ({stats.total})
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                statusFilter === 'pending'
                  ? 'bg-white dark:bg-slate-900 text-amber-600 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {language === 'fa' ? 'در انتظار وزن‌گیری' : language === 'ps' ? 'د وزن په تمه' : 'Pending Drop-off'} ({stats.pending})
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                statusFilter === 'active'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {language === 'fa' ? 'در حال ارسال' : language === 'ps' ? 'په لاره' : 'In Transit'} ({stats.active})
            </button>
            <button
              onClick={() => setStatusFilter('delivered')}
              className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                statusFilter === 'delivered'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {language === 'fa' ? 'تسلیم‌شده' : language === 'ps' ? 'تسلیم شوي' : 'Delivered'} ({stats.delivered})
            </button>
          </div>

        </div>
      </div>

      {/* Shipments List */}
      {filteredList.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center space-y-4 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
            <Package className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {searchTerm 
                ? (language === 'fa' ? `هیچ بسته‌ای با مشخصات "${searchTerm}" یافت نشد` : language === 'ps' ? `د "${searchTerm}" لپاره هیڅ بار ونه موندل شو` : `No parcels match "${searchTerm}"`)
                : (language === 'fa' ? 'تا هنوز هیچ بسته‌ای ثبت نکرده‌اید' : language === 'ps' ? 'تاسو تر اوسه هیڅ بار نه دی ثبت کړی' : 'No parcels found in your history')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              {language === 'fa' 
                ? 'می‌توانید همین حالا اولین بسته کارگو خود را ثبت اولیه (Pre-Book) کنید و به نمایندگی تحویل دهید.'
                : language === 'ps'
                ? 'تاسو کولی شئ همدا اوس خپل لومړنی بار ثبت کړئ.'
                : 'Pre-book your first consignment online and drop it off at your nearest branch.'}
            </p>
          </div>
          <div>
            <button
              onClick={() => setActiveView('customer_portal')}
              className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs inline-flex items-center gap-2 shadow-md shadow-red-600/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{t('prebook_new_parcel') || 'Pre-Book New Parcel'}</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredList.map((shipment) => {
            const originBr = branches.find(b => b.id === shipment.originBranchId);
            const destBr = branches.find(b => b.id === shipment.destinationBranchId);
            const isPrebookedAwaitingPrice = shipment.status === 'pre_booked' || (shipment.financials?.totalAmount === 0 && shipment.financials?.productPrice === 0);

            return (
              <div 
                key={shipment.id}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs hover:shadow-md hover:border-red-300 dark:hover:border-red-800 transition-all space-y-4"
              >
                {/* Top Bar: CN + Status + Price + Print */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-base sm:text-lg text-slate-900 dark:text-white">
                        {shipment.cnNumber}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase border ${getStatusBadge(shipment.status)}`}>
                        {getStatusLabel(shipment.status)}
                      </span>
                    </div>

                    {isPrebookedAwaitingPrice ? (
                      <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[10px] font-bold flex items-center gap-1 border border-amber-200 dark:border-amber-800">
                        <Clock className="w-3 h-3 text-amber-600" />
                        <span>{language === 'fa' ? 'در انتظار وزن‌کشی در شعبه' : language === 'ps' ? 'په څانګه کې د وزن په تمه' : 'Price pending branch evaluation'}</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold flex items-center gap-1 border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>{language === 'fa' ? 'قیمت‌گذاری نهایی' : language === 'ps' ? 'تایید شوی قیمت' : 'Priced & Verified'}</span>
                      </span>
                    )}

                    {shipment.deliveryIssue && shipment.status !== 'delivered' && (
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 text-[10px] font-bold flex items-center gap-1 border border-amber-300 dark:border-amber-800">
                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                        <span>{shipment.deliveryIssue.reasonText || 'Delivery Issue'}</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-end">
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">
                        {language === 'fa' ? 'کرایه باربری' : language === 'ps' ? 'د بار کرایه' : 'Freight & Value'}
                      </div>
                      <div className="text-sm font-black text-slate-900 dark:text-white font-mono">
                        {(shipment.financials?.totalAmount || shipment.financials?.productPrice || 0).toLocaleString()} AFN
                        <span className="text-[10px] font-semibold text-slate-500 ms-1">
                          ({shipment.financials?.paymentStatus === 'to_pay' ? 'COD' : (shipment.financials?.paymentStatus || 'PAID').toUpperCase()})
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        trackByCnNumber(shipment.cnNumber);
                        setActiveView('tracking');
                      }}
                      className="px-3 py-2 rounded-xl bg-red-50 hover:bg-red-600 hover:text-white dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-red-200 dark:border-red-900 shadow-xs"
                      title={language === 'fa' ? 'پیگیری زنده بارنامه' : 'Track Parcel'}
                    >
                      <Search className="w-3.5 h-3.5" />
                      <span>{language === 'fa' ? 'پیگیری زنده' : 'Track'}</span>
                    </button>
                  </div>
                </div>

                {/* Delivery Issue Notice Banner if undelivered */}
                {shipment.deliveryIssue && shipment.status !== 'delivered' && (
                  <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-400 dark:border-amber-800 text-amber-950 dark:text-amber-100 text-xs flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-amber-500 text-white shrink-0 shadow-xs">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div className="space-y-1 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-1">
                        <span className="font-extrabold text-amber-900 dark:text-amber-200">
                          {t('delivery_issue_alert_title') || 'Delivery Attempt Unsuccessful (گزارش عدم تحویل بسته)'}
                        </span>
                        <span className="text-[10px] font-mono text-amber-700 dark:text-amber-400">
                          {new Date(shipment.deliveryIssue.reportedAt).toLocaleDateString()} {new Date(shipment.deliveryIssue.reportedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-amber-850 dark:text-amber-300">
                        {t('issue_reason_lbl') || 'Reason'}: <span className="underline">{shipment.deliveryIssue.reasonText || shipment.deliveryIssue.type}</span>
                      </div>
                      {shipment.deliveryIssue.note && (
                        <p className="text-[11px] text-amber-800 dark:text-amber-300 bg-white/60 dark:bg-slate-900/50 p-2 rounded-xl border border-amber-200 dark:border-amber-800/60">
                          {shipment.deliveryIssue.note}
                        </p>
                      )}
                      <div className="text-[10px] text-amber-700/90 dark:text-amber-400">
                        {t('contact_branch_prompt') || 'Please contact your destination cargo branch or visit the hub to collect your parcel.'}
                      </div>
                    </div>
                  </div>
                )}

                {/* Main Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                  
                  {/* Origin & Destination Hubs */}
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                    <div className="text-[10px] text-slate-400 uppercase font-bold mb-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-red-500" />
                      <span>{t('route_lbl') || 'Route & Hubs'}</span>
                    </div>
                    <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>{originBr?.city || shipment.sender?.city || 'Origin'}</span>
                      <ArrowRight className="w-3 h-3 text-slate-400 rtl:rotate-180" />
                      <span>{destBr?.city || shipment.receiver?.city || 'Destination'}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      {originBr?.name || 'Origin Hub'} ➔ {destBr?.name || 'Destination Hub'}
                    </div>
                  </div>

                  {/* Receiver Information */}
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                    <div className="text-[10px] text-slate-400 uppercase font-bold mb-1 flex items-center gap-1">
                      <User className="w-3 h-3 text-blue-500" />
                      <span>{t('receiver_info_dest') || 'Receiver'}</span>
                    </div>
                    <div className="font-bold text-slate-900 dark:text-white">
                      {shipment.receiver?.name || 'Receiver'}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                      📞 {shipment.receiver?.phone || 'No phone'}
                    </div>
                    {shipment.receiver?.nationalId && (
                      <div className="text-[10px] text-slate-400 font-mono">
                        🪪 {shipment.receiver.nationalId}
                      </div>
                    )}
                  </div>

                  {/* Cargo Specifications */}
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                    <div className="text-[10px] text-slate-400 uppercase font-bold mb-1 flex items-center gap-1">
                      <Package className="w-3 h-3 text-amber-500" />
                      <span>{t('cargo_specs_lbl') || 'Specifications'}</span>
                    </div>
                    <div className="font-bold text-slate-900 dark:text-white">
                      {shipment.packageInfo?.category || 'General'} • {shipment.packageInfo?.weightKg || 1} KG
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {shipment.packageInfo?.pieces || 1} {t('pcs_unit') || 'pcs'} • {shipment.packageInfo?.description || 'Goods'}
                    </div>
                  </div>

                  {/* Booking Date & Financial Details */}
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                    <div className="text-[10px] text-slate-400 uppercase font-bold mb-1 flex items-center gap-1">
                      <DollarSign className="w-3 h-3 text-emerald-500" />
                      <span>{t('financials') || 'Financial Payout'}</span>
                    </div>
                    {shipment.financials?.productPrice ? (
                      <div className="font-bold text-emerald-700 dark:text-emerald-400 font-mono">
                        Product Price: {shipment.financials.productPrice.toLocaleString()} AFN
                      </div>
                    ) : (
                      <div className="font-bold text-slate-700 dark:text-slate-300 font-mono">
                        Freight: {(shipment.financials?.totalAmount || 0).toLocaleString()} AFN
                      </div>
                    )}
                    <div className="text-[10px] text-slate-400 font-mono mt-1">
                      📅 {new Date(shipment.bookedAt).toLocaleDateString()}
                    </div>
                  </div>

                </div>

                {/* Milestone History Timeline */}
                {shipment.statusHistory && shipment.statusHistory.length > 0 && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-2">
                      {t('milestone_progress_lbl') || 'Tracking Milestones Timeline'}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {shipment.statusHistory.map((h, idx) => (
                        <div 
                          key={h.id || idx}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-[11px] flex items-center gap-1.5"
                        >
                          <span className="w-2 h-2 rounded-full bg-red-500" />
                          <span className="font-bold text-slate-900 dark:text-white">
                            {getStatusLabel(h.status)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
