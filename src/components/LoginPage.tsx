import React, { useState } from 'react';
import { 
  Package, 
  Search, 
  Lock, 
  Mail, 
  ShieldCheck, 
  Building2, 
  Languages, 
  AlertCircle,
  Sparkles,
  KeyRound,
  ArrowRight,
  CheckCircle2,
  User,
  Phone,
  UserPlus,
  LogIn
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Language, Shipment, ShipmentStatus } from '../types';

export const LoginPage: React.FC = () => {
  const { 
    t, 
    language, 
    setLanguage, 
    login, 
    signupCustomer,
    loginWithUser,
    users, 
    branches, 
    shipments,
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

  // Branch Login Form State
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [branchLoginError, setBranchLoginError] = useState('');

  // Customer Auth State
  const [customerAuthMode, setCustomerAuthMode] = useState<'signin' | 'signup'>('signin');
  const [customerIdentifier, setCustomerIdentifier] = useState('');
  const [customerPassword, setCustomerPassword] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerCity, setCustomerCity] = useState('Kabul');
  const [customerAuthError, setCustomerAuthError] = useState('');

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

  const handleQuickTrack = (cn: string) => {
    setSearchCn(cn);
    setSearched(true);
    const res = trackByCnNumber(cn);
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
    if (!identifier.trim()) {
      setBranchLoginError('Please enter your branch email or phone number');
      return;
    }
    const success = login(identifier, password);
    if (!success) {
      setBranchLoginError('Account or password incorrect. Please use one of the branch accounts below.');
    }
  };

  const handleCustomerAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCustomerAuthError('');

    if (customerAuthMode === 'signup') {
      if (!customerName.trim() || (!customerPhone.trim() && !customerEmail.trim()) || !customerPassword.trim()) {
        setCustomerAuthError('Please fill in name, contact phone or email, and password.');
        return;
      }
      const success = signupCustomer(
        customerName.trim(),
        customerPhone.trim() || '0700000000',
        customerEmail.trim() || `${customerPhone.trim()}@customer.rayancargo.af`,
        customerPassword,
        customerCity
      );
      if (!success) {
        setCustomerAuthError('Registration failed. Please try again.');
      }
    } else {
      if (!customerIdentifier.trim()) {
        setCustomerAuthError('Please enter your phone number or email.');
        return;
      }
      const success = login(customerIdentifier.trim(), customerPassword);
      if (!success) {
        setCustomerAuthError('Customer credentials not found. Try Demo Customer or click Sign Up.');
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
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      
      {/* Top Header */}
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-red-600 to-rose-700 text-white flex items-center justify-center font-black text-xl shadow-md shadow-red-600/20">
            R
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg sm:text-xl tracking-tight bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 bg-clip-text text-transparent">
                Rayan Cargo DB
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700 uppercase">
                6 Branches AF
              </span>
            </div>
            <p className="text-[11px] text-slate-500 hidden sm:block">
              Afghanistan Logistics, Cargo Network & Customer Self-Service
            </p>
          </div>
        </div>

        {/* Header Controls: Language + Tab Switch */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Language Selector */}
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setLanguage('en')}
              className={`px-2.5 py-1 rounded-md transition-colors ${language === 'en' ? 'bg-white text-red-600 shadow-xs font-bold' : 'text-slate-600'}`}
            >
              EN
            </button>
            <button
              onClick={() => setLanguage('fa')}
              className={`px-2.5 py-1 rounded-md transition-colors ${language === 'fa' ? 'bg-white text-red-600 shadow-xs font-bold' : 'text-slate-600'}`}
            >
              دری
            </button>
            <button
              onClick={() => setLanguage('ps')}
              className={`px-2.5 py-1 rounded-md transition-colors ${language === 'ps' ? 'bg-white text-red-600 shadow-xs font-bold' : 'text-slate-600'}`}
            >
              پښتو
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl mx-auto w-full p-4 sm:p-6 lg:p-8 flex flex-col justify-center">
        
        {/* Navigation Tabs for 3 Modes */}
        <div className="flex justify-center mb-6 sm:mb-8">
          <div className="inline-flex p-1 rounded-2xl bg-slate-200/90 border border-slate-300 shadow-xs">
            <button
              onClick={() => setActiveTab('track')}
              className={`px-4 sm:px-6 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 sm:gap-2 ${
                activeTab === 'track'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              <Search className="w-4 h-4" />
              <span>{t('track_shipment')}</span>
            </button>
            
            <button
              onClick={() => setActiveTab('customer')}
              className={`px-4 sm:px-6 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 sm:gap-2 ${
                activeTab === 'customer'
                  ? 'bg-white text-red-600 shadow-sm'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              <User className="w-4 h-4" />
              <span>{t('nav_customer_portal')}</span>
            </button>

            <button
              onClick={() => setActiveTab('branch')}
              className={`px-4 sm:px-6 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 sm:gap-2 ${
                activeTab === 'branch'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>{t('branch_terminal_signin_title')}</span>
            </button>
          </div>
        </div>

        {/* SECTION 1: PUBLIC TRACKING PORTAL (Red Themed Portal) */}
        {activeTab === 'track' && (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
            
            {/* Tracking Search Card - Red Gradient Design matching internal Tracking Portal */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-red-700 via-red-600 to-amber-600 text-white shadow-2xl shadow-red-700/25">
              
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/20 via-transparent to-black/30 pointer-events-none" />
              <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-amber-400/20 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 p-6 sm:p-10 max-w-3xl">
                
                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold uppercase tracking-wider mb-4 border border-white/20 shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-amber-300 animate-ping" />
                  <span>RAYAN CARGO DB LOGISTICS & FREIGHT NETWORK</span>
                </div>

                <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight mb-2">
                  {t('tracking_banner_title')}
                </h1>
                <p className="text-sm sm:text-base text-red-100 mb-6 max-w-xl font-normal leading-relaxed">
                  {t('tracking_banner_subtitle')}
                </p>

                {/* Search Box matching the red tracking portal banner */}
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

                {/* Quick Demo CN Numbers */}
                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-red-100 font-medium">{t('quick_track')}:</span>
                  {shipments.slice(0, 4).map(s => (
                    <button
                      key={s.id}
                      onClick={() => handleQuickTrack(s.cnNumber)}
                      className="px-2.5 py-1 rounded-md bg-white/20 hover:bg-white/30 text-white font-mono text-[11px] font-semibold transition-colors border border-white/10 cursor-pointer"
                    >
                      {s.cnNumber} ({s.receiver.city})
                    </button>
                  ))}
                </div>

              </div>
            </div>

            {/* Tracking Result Dossier Card */}
            {trackedItem && (
              <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-lg space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xl sm:text-2xl font-black text-slate-900">
                        {trackedItem.cnNumber}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase border ${getStatusBadge(trackedItem.status)}`}>
                        {t(`status_${trackedItem.status}` as any) || trackedItem.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
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
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                    <div className="text-[11px] font-bold text-red-600 uppercase tracking-wider mb-2">
                      {t('sender_origin_lbl')}
                    </div>
                    <div className="text-sm font-bold text-slate-900">{trackedItem.sender.name}</div>
                    <div className="text-xs text-slate-500">{trackedItem.sender.city}, {trackedItem.sender.province}</div>
                    <div className="text-xs font-mono text-slate-600 mt-1">{trackedItem.sender.phone}</div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                    <div className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider mb-2">
                      {t('receiver_destination_lbl')}
                    </div>
                    <div className="text-sm font-bold text-slate-900">{trackedItem.receiver.name}</div>
                    <div className="text-xs text-slate-500">{trackedItem.receiver.city}, {trackedItem.receiver.province}</div>
                    <div className="text-xs font-mono text-slate-600 mt-1">{trackedItem.receiver.phone}</div>
                  </div>
                </div>

                {/* Cargo Details Snapshot */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-slate-100 text-center">
                    <div className="text-[10px] text-slate-500 uppercase">{t('category_lbl')}</div>
                    <div className="text-xs font-bold text-slate-900 mt-0.5">{trackedItem.packageInfo.category}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-100 text-center">
                    <div className="text-[10px] text-slate-500 uppercase">{t('weight_lbl')}</div>
                    <div className="text-xs font-bold text-slate-900 mt-0.5">{trackedItem.packageInfo.weightKg} KG</div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-100 text-center">
                    <div className="text-[10px] text-slate-500 uppercase">{t('pieces_lbl')}</div>
                    <div className="text-xs font-bold text-slate-900 mt-0.5">{trackedItem.packageInfo.pieces} {t('pkgs_unit')}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-100 text-center">
                    <div className="text-[10px] text-slate-500 uppercase">{t('payment_lbl')}</div>
                    <div className="text-xs font-bold text-emerald-600 mt-0.5">{trackedItem.financials.paymentStatus} ({trackedItem.financials.totalAmount} AFN)</div>
                  </div>
                </div>

                {/* Milestone History Timeline */}
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-bold uppercase text-slate-500 tracking-wider">
                    {t('milestone_progress_lbl')}
                  </h4>
                  <div className="space-y-2.5">
                    {trackedItem.statusHistory.map((h, index) => (
                      <div key={h.id || index} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                        <div className="w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs shrink-0 font-bold mt-0.5">
                          ✓
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-900">{t(`status_${h.status}` as any) || h.status.replace(/_/g, ' ')}</span>
                            <span className="text-[11px] text-slate-400 font-mono">{new Date(h.timestamp).toLocaleString()}</span>
                          </div>
                          <p className="text-xs text-slate-600 mt-0.5">{h.note}</p>
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
              <div className="p-6 rounded-2xl bg-red-50 border border-red-200 text-center space-y-2">
                <AlertCircle className="w-8 h-8 text-red-600 mx-auto" />
                <h3 className="text-sm font-bold text-red-900">
                  {t('no_parcel_found_msg')} "{searchCn}"
                </h3>
                <p className="text-xs text-red-700">
                  {t('verify_cn_prompt')}
                </p>
              </div>
            )}

          </div>
        )}

        {/* SECTION 2: CUSTOMER PORTAL (Sign In & Sign Up with Phone or Email) */}
        {activeTab === 'customer' && (
          <div className="max-w-xl mx-auto w-full space-y-6 animate-in fade-in zoom-in-95 duration-200">
            
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xl space-y-6">
              
              <div className="text-center space-y-1">
                <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
                  <User className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-black text-slate-900">
                  {customerAuthMode === 'signin' ? 'Customer Sign In' : 'Customer Account Registration'}
                </h2>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {customerAuthMode === 'signin'
                    ? 'Sign in with your Email or Afghan Phone number to pre-book parcels & view shipping records'
                    : 'Create your free customer account to book and manage your cargo shipments across Afghanistan'}
                </p>
              </div>

              {/* Sub-tab: Sign In vs Sign Up */}
              <div className="flex p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => { setCustomerAuthMode('signin'); setCustomerAuthError(''); }}
                  className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    customerAuthMode === 'signin' ? 'bg-white text-red-600 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setCustomerAuthMode('signup'); setCustomerAuthError(''); }}
                  className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    customerAuthMode === 'signup' ? 'bg-white text-red-600 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Sign Up (New Customer)</span>
                </button>
              </div>

              {customerAuthError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{customerAuthError}</span>
                </div>
              )}

              <form onSubmit={handleCustomerAuthSubmit} className="space-y-4">
                {customerAuthMode === 'signup' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute start-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="e.g. Ahmad Tariq Stanikzai"
                        className="w-full ps-10 pe-4 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 text-xs focus:ring-2 focus:ring-red-500 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {customerAuthMode === 'signup' ? (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Phone Number
                        </label>
                        <div className="relative">
                          <Phone className="w-4 h-4 text-slate-400 absolute start-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            required
                            value={customerPhone}
                            onChange={(e) => setCustomerPhone(e.target.value)}
                            placeholder="0799 123 456"
                            className="w-full ps-10 pe-4 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 text-xs focus:ring-2 focus:ring-red-500 focus:outline-none font-mono"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Email (Optional)
                        </label>
                        <div className="relative">
                          <Mail className="w-4 h-4 text-slate-400 absolute start-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="email"
                            value={customerEmail}
                            onChange={(e) => setCustomerEmail(e.target.value)}
                            placeholder="tariq@gmail.com"
                            className="w-full ps-10 pe-4 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 text-xs focus:ring-2 focus:ring-red-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        City / Location
                      </label>
                      <input
                        type="text"
                        value={customerCity}
                        onChange={(e) => setCustomerCity(e.target.value)}
                        placeholder="Kabul, Herat, Mazar..."
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 text-xs focus:ring-2 focus:ring-red-500 focus:outline-none"
                      />
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Email or Afghan Phone Number
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute start-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={customerIdentifier}
                        onChange={(e) => setCustomerIdentifier(e.target.value)}
                        placeholder="e.g. 0799888777 or customer@rayancargo.af"
                        className="w-full ps-10 pe-4 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 text-xs focus:ring-2 focus:ring-red-500 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute start-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      value={customerPassword}
                      onChange={(e) => setCustomerPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full ps-10 pe-4 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 text-xs focus:ring-2 focus:ring-red-500 focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md shadow-red-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  {customerAuthMode === 'signup' ? <UserPlus className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
                  <span>{customerAuthMode === 'signup' ? 'Create Customer Account & Continue' : 'Sign In as Customer'}</span>
                </button>
              </form>

              {/* 1-Click Demo Customer Account */}
              <div className="pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    const custUser = users.find(u => u.role === 'customer');
                    if (custUser) loginWithUser(custUser);
                  }}
                  className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-all flex items-center justify-between text-start cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center font-bold text-xs">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">
                        1-Click Demo Customer Access
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        Ahmad Tariq (0799888777)
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-red-600">
                    Sign In Instant ➔
                  </span>
                </button>
              </div>

            </div>

          </div>
        )}

        {/* SECTION 3: 6 BRANCH EXCLUSIVE SIGN-IN PORTAL */}
        {activeTab === 'branch' && (
          <div className="max-w-2xl mx-auto w-full space-y-6 animate-in fade-in zoom-in-95 duration-200">
            
            {/* Login Card */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xl space-y-6">
              
              <div className="text-center space-y-1">
                <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center mx-auto mb-3 shadow-md shadow-slate-900/20">
                  <Building2 className="w-6 h-6 text-red-400" />
                </div>
                <h2 className="text-xl font-black text-slate-900">
                  {t('branch_terminal_signin_title')}
                </h2>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  {t('branch_terminal_signin_desc')}
                </p>
              </div>

              {branchLoginError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{branchLoginError}</span>
                </div>
              )}

              <form onSubmit={handleBranchLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t('login_email_lbl')}
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute start-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="e.g. kabul@rayancargo.af or herat@rayancargo.af"
                      className="w-full ps-10 pe-4 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 text-xs focus:ring-2 focus:ring-red-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t('login_password_lbl')}
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute start-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t('login_password_placeholder')}
                      className="w-full ps-10 pe-4 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 text-xs focus:ring-2 focus:ring-red-500 focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md shadow-slate-900/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4 text-red-400" />
                  <span>{t('sign_in_to_terminal_btn')}</span>
                </button>
              </form>

              {/* 1-Click Instant Branch Sign-In Cards (6 Branches + Super Admin) */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>{t('exclusive_accounts_1click')}</span>
                  <span className="text-[10px] text-slate-400">{t('one_role_per_branch')}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {users.filter(u => u.role !== 'customer').map(u => {
                    const branchObj = branches.find(b => b.id === u.branchId);
                    const isSuper = u.role === 'super_admin';
                    const branchDisplayName = branchObj ? (language === 'fa' ? branchObj.nameFa || branchObj.name : language === 'ps' ? branchObj.namePs || branchObj.name : branchObj.name) : 'HQ';

                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => loginWithUser(u)}
                        className={`text-start p-3 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                          isSuper
                            ? 'col-span-full border-amber-200 bg-amber-50/70 hover:bg-amber-100/80'
                            : 'border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                            isSuper ? 'bg-amber-600 text-white' : 'bg-red-600 text-white'
                          }`}>
                            {branchObj?.code || 'HQ'}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900 leading-tight">
                              {isSuper ? t('central_system_admin') : branchDisplayName}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              {u.email}
                            </div>
                            <div className="text-[9px] text-slate-400 font-mono">
                              pass: {u.password || 'kabul123'}
                            </div>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-red-600">
                          {t('enter_arrow_btn')}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>

          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-4 text-center text-xs text-slate-500 bg-white">
        <p>© {new Date().getFullYear()} Rayan Cargo DB Logistics Network. 6 Provincial Branches & Customer Portal Inter-Connected.</p>
      </footer>

    </div>
  );
};

