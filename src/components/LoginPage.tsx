import React, { useState } from 'react';
import { 
  Search, 
  Lock, 
  Mail, 
  ShieldCheck, 
  Building2, 
  AlertCircle,
  ArrowRight,
  User,
  Phone,
  UserPlus,
  LogIn,
  CheckCircle2,
  Package
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Shipment, ShipmentStatus } from '../types';

export const LoginPage: React.FC = () => {
  const { 
    t, 
    language, 
    setLanguage, 
    login, 
    signupCustomer,
    trackByCnNumber,
    setSelectedShipmentForReceipt
  } = useApp();

  // Active Tab
  const [activeTab, setActiveTab] = useState<'track' | 'customer' | 'branch'>('track');

  // Public Tracking State
  const [searchCn, setSearchCn] = useState('');
  const [trackedItem, setTrackedItem] = useState<Shipment | null>(null);
  const [searched, setSearched] = useState(false);
  const [trackError, setTrackError] = useState(false);

  // Branch / Staff Login Form State
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [branchLoginError, setBranchLoginError] = useState('');
  const [isSubmittingBranch, setIsSubmittingBranch] = useState(false);
  const [wrongPortalCustomerDetected, setWrongPortalCustomerDetected] = useState(false);

  // Customer Auth State
  const [customerAuthMode, setCustomerAuthMode] = useState<'signin' | 'signup'>('signin');
  const [customerIdentifier, setCustomerIdentifier] = useState('');
  const [customerPassword, setCustomerPassword] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerCity, setCustomerCity] = useState('Kabul');
  const [customerAuthError, setCustomerAuthError] = useState('');
  const [customerAuthSuccess, setCustomerAuthSuccess] = useState('');
  const [wrongPortalStaffDetected, setWrongPortalStaffDetected] = useState(false);

  const handleTrackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchCn.trim()) return;
    setSearched(true);
    const res = trackByCnNumber(searchCn);
    if (res) {
      setTrackedItem(res);
      setTrackError(false);
    } else {
      setTrackedItem(null);
      setTrackError(true);
    }
  };

  const handleBranchLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setBranchLoginError('');
    setWrongPortalCustomerDetected(false);
    if (!identifier.trim()) {
      setBranchLoginError(t('err_enter_email_phone') || 'Please enter your account email or phone number.');
      return;
    }
    if (!password) {
      setBranchLoginError(t('err_enter_password') || 'Please enter your password.');
      return;
    }

    setIsSubmittingBranch(true);
    const res = login(identifier.trim(), password, 'staff');
    setIsSubmittingBranch(false);

    if (!res.success) {
      if (res.errorReason === 'wrong_portal_customer') {
        setWrongPortalCustomerDetected(true);
        setBranchLoginError(res.message || 'This is a Customer account. Please switch to the Customer Portal tab.');
      } else {
        setBranchLoginError(res.message || t('err_invalid_credentials') || 'Incorrect email/phone or password. Please verify your credentials.');
      }
    }
  };

  const handleCustomerAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCustomerAuthError('');
    setCustomerAuthSuccess('');
    setWrongPortalStaffDetected(false);

    if (customerAuthMode === 'signup') {
      if (!customerName.trim() || (!customerPhone.trim() && !customerEmail.trim()) || !customerPassword.trim()) {
        setCustomerAuthError(t('err_fill_required_fields') || 'Please provide your full name, phone number or email, and password.');
        return;
      }
      const success = signupCustomer(
        customerName.trim(),
        customerPhone.trim() || '0700000000',
        customerEmail.trim() || `${customerPhone.trim()}@customer.rayancargo.af`,
        customerPassword
      );
      if (!success) {
        setCustomerAuthError(t('err_reg_failed') || 'Customer registration failed. Please check your information and try again.');
      }
    } else {
      if (!customerIdentifier.trim()) {
        setCustomerAuthError(t('err_enter_email_phone') || 'Please enter your registered phone number or email.');
        return;
      }
      if (!customerPassword) {
        setCustomerAuthError(t('err_enter_password') || 'Please enter your password.');
        return;
      }
      const res = login(customerIdentifier.trim(), customerPassword, 'customer');
      if (!res.success) {
        if (res.errorReason === 'wrong_portal_staff') {
          setWrongPortalStaffDetected(true);
          setCustomerAuthError(res.message || 'This is an Administrator / Branch Staff account. Please switch to the Branch & Staff Terminal tab.');
        } else {
          setCustomerAuthError(res.message || t('err_invalid_customer_creds') || 'Account not found or password incorrect. If you are new, please Sign Up.');
        }
      }
    }
  };

  const getStatusBadge = (status: ShipmentStatus) => {
    switch (status) {
      case 'delivered':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'in_transit':
        return 'bg-indigo-100 text-indigo-800 border-indigo-300';
      case 'received_at_branch':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'out_for_delivery':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'pre_booked':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans">
      
      {/* Top Header */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-red-600 to-rose-700 text-white flex items-center justify-center font-black text-xl shadow-md shadow-red-600/20">
            R
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg sm:text-xl tracking-tight bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 bg-clip-text text-transparent">
                {t('app_title')}
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 uppercase">
                {t('system_secured_badge') || 'Secure DB'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
              {t('app_subtitle')}
            </p>
          </div>
        </div>

        {/* Language Selector */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700 text-xs font-semibold">
          <button
            onClick={() => setLanguage('en')}
            className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${language === 'en' ? 'bg-white dark:bg-slate-900 text-red-600 shadow-xs font-bold' : 'text-slate-600 dark:text-slate-300'}`}
          >
            EN
          </button>
          <button
            onClick={() => setLanguage('fa')}
            className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${language === 'fa' ? 'bg-white dark:bg-slate-900 text-red-600 shadow-xs font-bold' : 'text-slate-600 dark:text-slate-300'}`}
          >
            دری
          </button>
          <button
            onClick={() => setLanguage('ps')}
            className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${language === 'ps' ? 'bg-white dark:bg-slate-900 text-red-600 shadow-xs font-bold' : 'text-slate-600 dark:text-slate-300'}`}
          >
            پښتو
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl mx-auto w-full p-4 sm:p-6 lg:p-8 flex flex-col justify-center">
        
        {/* Navigation Tabs for 3 Modes */}
        <div className="flex justify-center mb-6 sm:mb-8">
          <div className="inline-flex p-1 rounded-2xl bg-slate-200/90 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 shadow-xs">
            <button
              onClick={() => setActiveTab('track')}
              className={`px-4 sm:px-6 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 sm:gap-2 ${
                activeTab === 'track'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Search className="w-4 h-4" />
              <span>{t('track_shipment')}</span>
            </button>
            
            <button
              onClick={() => setActiveTab('customer')}
              className={`px-4 sm:px-6 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 sm:gap-2 ${
                activeTab === 'customer'
                  ? 'bg-white dark:bg-slate-900 text-red-600 shadow-sm'
                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <User className="w-4 h-4" />
              <span>{t('nav_customer_portal')}</span>
            </button>

            <button
              onClick={() => setActiveTab('branch')}
              className={`px-4 sm:px-6 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 sm:gap-2 ${
                activeTab === 'branch'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>{t('branch_terminal_signin_title')}</span>
            </button>
          </div>
        </div>

        {/* SECTION 1: PUBLIC TRACKING PORTAL */}
        {activeTab === 'track' && (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
            
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-red-700 via-red-600 to-amber-600 text-white shadow-2xl shadow-red-700/25">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/20 via-transparent to-black/30 pointer-events-none" />
              <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-amber-400/20 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 p-6 sm:p-10 max-w-3xl">
                
                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold uppercase tracking-wider mb-4 border border-white/20 shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-amber-300 animate-ping" />
                  <span>{t('cargo_network_badge') || 'RAYAN CARGO LOGISTICS & FREIGHT NETWORK'}</span>
                </div>

                <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight mb-2">
                  {t('tracking_banner_title')}
                </h1>
                <p className="text-sm sm:text-base text-red-100 mb-6 max-w-xl font-normal leading-relaxed">
                  {t('tracking_banner_subtitle')}
                </p>

                {/* Search Box */}
                <div className="bg-white/10 backdrop-blur-md p-2 rounded-2xl border border-white/30 shadow-2xl">
                  <form 
                    onSubmit={handleTrackSubmit}
                    className="flex flex-col sm:flex-row gap-2"
                  >
                    <div className="relative flex-1">
                      <div className="absolute inset-y-0 start-0 flex items-center ps-3.5 pointer-events-none text-slate-400">
                        <Search className="w-5 h-5" />
                      </div>
                      <input
                        type="text"
                        value={searchCn}
                        onChange={(e) => setSearchCn(e.target.value)}
                        placeholder={t('enter_cn_placeholder')}
                        className="w-full h-12 ps-11 pe-4 bg-white text-slate-900 placeholder-slate-400 font-mono text-sm sm:text-base rounded-xl font-semibold focus:outline-none focus:ring-4 focus:ring-amber-400 transition-all shadow-inner"
                      />
                    </div>
                    <button
                      type="submit"
                      className="h-12 px-8 bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-slate-950 font-extrabold rounded-xl transition-all shadow-lg shadow-amber-500/30 flex items-center justify-center gap-2 cursor-pointer shrink-0"
                    >
                      <span>{t('track_btn')}</span>
                      <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                    </button>
                  </form>
                </div>

              </div>
            </div>

            {/* Tracking Result Card */}
            {trackedItem && (
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-lg space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                        {trackedItem.cnNumber}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase border ${getStatusBadge(trackedItem.status)}`}>
                        {t(`status_${trackedItem.status}` as any) || trackedItem.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                      <span>{t('booked_on')}: {new Date(trackedItem.bookedAt).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>{t('service_type')}: <strong>{trackedItem.packageInfo.serviceType}</strong></span>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedShipmentForReceipt(trackedItem)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-xs flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <span>{t('print_receipt_waybill_btn')}</span>
                  </button>
                </div>

                {/* Route Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <div className="text-[11px] font-bold text-red-600 uppercase tracking-wider mb-2">
                      {t('sender_origin_lbl')}
                    </div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white">{trackedItem.sender.name}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{trackedItem.sender.city}, {trackedItem.sender.province}</div>
                    <div className="text-xs font-mono text-slate-600 dark:text-slate-300 mt-1">{trackedItem.sender.phone}</div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <div className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider mb-2">
                      {t('receiver_destination_lbl')}
                    </div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white">{trackedItem.receiver.name}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{trackedItem.receiver.city}, {trackedItem.receiver.province}</div>
                    <div className="text-xs font-mono text-slate-600 dark:text-slate-300 mt-1">{trackedItem.receiver.phone}</div>
                  </div>
                </div>

                {/* Cargo Details Snapshot */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-center">
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase">{t('category_lbl')}</div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">{trackedItem.packageInfo.category}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-center">
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase">{t('weight_lbl')}</div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">{trackedItem.packageInfo.weightKg} KG</div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-center">
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase">{t('pieces_lbl')}</div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">{trackedItem.packageInfo.pieces} {t('pkgs_unit')}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-center">
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase">{t('payment_lbl')}</div>
                    <div className="text-xs font-bold text-emerald-600 mt-0.5">{trackedItem.financials.paymentStatus} ({trackedItem.financials.totalAmount} AFN)</div>
                  </div>
                </div>

                {/* Milestone History Timeline */}
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                    {t('milestone_progress_lbl')}
                  </h4>
                  <div className="space-y-2.5">
                    {trackedItem.statusHistory.map((h, index) => (
                      <div key={h.id || index} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                        <div className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-950 text-red-600 flex items-center justify-center text-xs shrink-0 font-bold mt-0.5">
                          ✓
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-900 dark:text-white">{t(`status_${h.status}` as any) || h.status.replace(/_/g, ' ')}</span>
                            <span className="text-[11px] text-slate-400 font-mono">{new Date(h.timestamp).toLocaleString()}</span>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">{h.note}</p>
                          <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-2">
                            <span>📍 {h.location}</span>
                            <span>•</span>
                            <span>🏢 {h.branchName}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}

            {/* Error Not Found */}
            {searched && trackError && (
              <div className="p-6 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-center space-y-2">
                <AlertCircle className="w-8 h-8 text-red-600 mx-auto" />
                <h3 className="text-sm font-bold text-red-900 dark:text-red-200">
                  {t('no_parcel_found_msg')} "{searchCn}"
                </h3>
                <p className="text-xs text-red-700 dark:text-red-300">
                  {t('verify_cn_prompt')}
                </p>
              </div>
            )}

          </div>
        )}

        {/* SECTION 2: CUSTOMER PORTAL (Sign In & Sign Up for Pre-Bookings) */}
        {activeTab === 'customer' && (
          <div className="max-w-xl mx-auto w-full space-y-6 animate-in fade-in zoom-in-95 duration-200">
            
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xl space-y-6">
              
              <div className="text-center space-y-1">
                <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950 text-red-600 flex items-center justify-center mx-auto mb-3">
                  <User className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white">
                  {customerAuthMode === 'signin' ? t('customer_signin_title') || 'Customer Sign In' : t('customer_signup_title') || 'Customer Account Registration'}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  {customerAuthMode === 'signin'
                    ? t('customer_signin_desc') || 'Sign in with your Email or Phone number to create parcel pre-bookings and track deliveries.'
                    : t('customer_signup_desc') || 'Create your account to start pre-booking cargo shipments across all provincial branches.'}
                </p>
              </div>

              {/* Sub-tab: Sign In vs Sign Up */}
              <div className="flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => { setCustomerAuthMode('signin'); setCustomerAuthError(''); }}
                  className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    customerAuthMode === 'signin' ? 'bg-white dark:bg-slate-900 text-red-600 shadow-xs' : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>{t('btn_signin') || 'Sign In'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setCustomerAuthMode('signup'); setCustomerAuthError(''); }}
                  className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    customerAuthMode === 'signup' ? 'bg-white dark:bg-slate-900 text-red-600 shadow-xs' : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{t('btn_signup') || 'Sign Up (New Customer)'}</span>
                </button>
              </div>

              {customerAuthError && (
                <div className={`p-3.5 rounded-xl border text-xs flex flex-col gap-2 ${
                  wrongPortalStaffDetected 
                    ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200' 
                    : 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
                }`}>
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                    <span className="leading-relaxed">{customerAuthError}</span>
                  </div>
                  {wrongPortalStaffDetected && (
                    <button
                      type="button"
                      onClick={() => {
                        setIdentifier(customerIdentifier);
                        setPassword(customerPassword);
                        setActiveTab('branch');
                        setWrongPortalStaffDetected(false);
                        setCustomerAuthError('');
                      }}
                      className="self-start mt-1 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Building2 className="w-3.5 h-3.5" />
                      <span>{t('switch_to_staff_terminal') || 'Go to Branch & Staff Terminal'} →</span>
                    </button>
                  )}
                </div>
              )}

              {customerAuthSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{customerAuthSuccess}</span>
                </div>
              )}

              <form onSubmit={handleCustomerAuthSubmit} className="space-y-4">
                {customerAuthMode === 'signup' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {t('full_name_lbl') || 'Full Name'}
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute start-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="e.g. Ahmad Tariq Stanikzai"
                        className="w-full ps-10 pe-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-red-500 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {customerAuthMode === 'signup' ? (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          {t('sender_phone') || 'Phone Number'}
                        </label>
                        <div className="relative">
                          <Phone className="w-4 h-4 text-slate-400 absolute start-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            required
                            value={customerPhone}
                            onChange={(e) => setCustomerPhone(e.target.value)}
                            placeholder="0799 123 456"
                            className="w-full ps-10 pe-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-red-500 focus:outline-none font-mono"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          {t('email_optional') || 'Email (Optional)'}
                        </label>
                        <div className="relative">
                          <Mail className="w-4 h-4 text-slate-400 absolute start-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="email"
                            value={customerEmail}
                            onChange={(e) => setCustomerEmail(e.target.value)}
                            placeholder="tariq@gmail.com"
                            className="w-full ps-10 pe-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-red-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        {t('city_location_lbl') || 'City / Province'}
                      </label>
                      <input
                        type="text"
                        value={customerCity}
                        onChange={(e) => setCustomerCity(e.target.value)}
                        placeholder="Kabul, Herat, Mazar..."
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-red-500 focus:outline-none"
                      />
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {t('login_email_phone_lbl') || 'Email or Afghan Phone Number'}
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute start-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={customerIdentifier}
                        onChange={(e) => setCustomerIdentifier(e.target.value)}
                        placeholder="0799 000 000 or customer@email.com"
                        className="w-full ps-10 pe-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-red-500 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {t('login_password_lbl') || 'Password'}
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute start-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      value={customerPassword}
                      onChange={(e) => setCustomerPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full ps-10 pe-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-red-500 focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md shadow-red-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  {customerAuthMode === 'signup' ? <UserPlus className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
                  <span>{customerAuthMode === 'signup' ? (t('btn_create_account_prebook') || 'Create Customer Account & Continue') : (t('btn_signin_customer') || 'Sign In as Customer')}</span>
                </button>
              </form>

            </div>

          </div>
        )}

        {/* SECTION 3: STAFF & BRANCH TERMINAL SECURE LOGIN */}
        {activeTab === 'branch' && (
          <div className="max-w-md mx-auto w-full space-y-6 animate-in fade-in zoom-in-95 duration-200">
            
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xl space-y-6">
              
              <div className="text-center space-y-1">
                <div className="w-12 h-12 rounded-2xl bg-slate-900 dark:bg-slate-800 text-white flex items-center justify-center mx-auto mb-3 shadow-md shadow-slate-900/20">
                  <Building2 className="w-6 h-6 text-red-400" />
                </div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white">
                  {t('branch_terminal_signin_title')}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  {t('branch_terminal_signin_desc')}
                </p>
              </div>

              {branchLoginError && (
                <div className={`p-3.5 rounded-xl border text-xs flex flex-col gap-2 ${
                  wrongPortalCustomerDetected
                    ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200'
                    : 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
                }`}>
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                    <span className="leading-relaxed">{branchLoginError}</span>
                  </div>
                  {wrongPortalCustomerDetected && (
                    <button
                      type="button"
                      onClick={() => {
                        setCustomerIdentifier(identifier);
                        setCustomerPassword(password);
                        setCustomerAuthMode('signin');
                        setActiveTab('customer');
                        setWrongPortalCustomerDetected(false);
                        setBranchLoginError('');
                      }}
                      className="self-start mt-1 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>{t('switch_to_customer_portal') || 'Go to Customer Portal'} →</span>
                    </button>
                  )}
                </div>
              )}

              <form onSubmit={handleBranchLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {t('login_email_lbl')}
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute start-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="admin@rayancargo.af or branch email/phone"
                      className="w-full ps-10 pe-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-red-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {t('login_password_lbl')}
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute start-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t('login_password_placeholder')}
                      className="w-full ps-10 pe-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-red-500 focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingBranch}
                  className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-red-600 dark:hover:bg-red-700 text-white font-bold text-xs shadow-md shadow-slate-900/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  <ShieldCheck className="w-4 h-4 text-red-400 dark:text-white" />
                  <span>{isSubmittingBranch ? (t('signing_in') || 'Authenticating...') : t('sign_in_to_terminal_btn')}</span>
                </button>
              </form>

              <div className="pt-1 text-center">
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  {t('staff_login_help') || 'Head Office Admin can create new branches and branch manager accounts in the Branches menu.'}
                </p>
              </div>

            </div>

          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-4 text-center text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900">
        <p>© {new Date().getFullYear()} {t('app_title')} — {t('secure_logistics_system') || 'Secure Logistics Network & Parcel Management System'}</p>
      </footer>

    </div>
  );
};
