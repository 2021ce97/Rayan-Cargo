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
  CheckCircle2
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Language, Shipment, ShipmentStatus } from '../types';

export const LoginPage: React.FC = () => {
  const { 
    t, 
    language, 
    setLanguage, 
    login, 
    loginWithUser,
    users, 
    branches, 
    shipments,
    trackByCnNumber,
    setSelectedShipmentForReceipt
  } = useApp();

  // Public Tracking State
  const [searchCn, setSearchCn] = useState('');
  const [trackedItem, setTrackedItem] = useState<Shipment | null>(null);
  const [searched, setSearched] = useState(false);
  const [trackError, setTrackError] = useState(false);

  // Login Form State
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [activeTab, setActiveTab] = useState<'track' | 'login'>('track');

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

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    if (!identifier.trim()) {
      setLoginError('Please enter your branch email or phone number');
      return;
    }
    const success = login(identifier, password);
    if (!success) {
      setLoginError('Account or password incorrect. Please use one of the 6 branch accounts below.');
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
              Multi-Terminal Cargo & Consignment Management
            </p>
          </div>
        </div>

        {/* Header Controls: Language + Staff Portal Tab Switch */}
        <div className="flex items-center gap-3">
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

          <button
            onClick={() => setActiveTab(activeTab === 'track' ? 'login' : 'track')}
            className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {activeTab === 'track' ? (
              <>
                <Building2 className="w-3.5 h-3.5 text-red-400" />
                <span>Branch Sign In</span>
              </>
            ) : (
              <>
                <Search className="w-3.5 h-3.5 text-red-400" />
                <span>Public Tracking</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Hero Container */}
      <main className="flex-1 max-w-5xl mx-auto w-full p-4 sm:p-6 lg:p-8 flex flex-col justify-center">
        
        {/* Navigation Tabs */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex p-1 rounded-2xl bg-slate-200/80 border border-slate-300">
            <button
              onClick={() => setActiveTab('track')}
              className={`px-6 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'track'
                  ? 'bg-white text-red-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Search className="w-4 h-4" />
              <span>{t('track_shipment')}</span>
            </button>
            <button
              onClick={() => setActiveTab('login')}
              className={`px-6 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'login'
                  ? 'bg-white text-red-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
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
            
            {/* Tracking Search Card */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-6 sm:p-10 text-white shadow-xl space-y-6">
              <div className="text-center max-w-xl mx-auto space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-600/30 border border-red-500/40 text-red-400 text-xs font-bold uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" />
                  {t('live_consignment_tracking')}
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-white">
                  {t('track_cargo_across_hubs')}
                </h1>
                <p className="text-xs sm:text-sm text-slate-400">
                  {t('instant_milestone_status_desc')}
                </p>
              </div>

              {/* Search input */}
              <form onSubmit={handleTrackSubmit} className="max-w-2xl mx-auto">
                <div className="relative flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 start-0 flex items-center ps-4 pointer-events-none text-slate-400">
                      <Search className="w-5 h-5" />
                    </div>
                    <input
                      type="text"
                      value={searchCn}
                      onChange={(e) => setSearchCn(e.target.value)}
                      placeholder={t('enter_cn_number_prompt')}
                      className="w-full h-12 ps-11 pe-4 text-sm bg-white/10 border border-white/20 rounded-2xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 font-mono"
                    />
                  </div>
                  <button
                    type="submit"
                    className="h-12 px-6 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-bold text-sm shadow-md shadow-red-600/30 transition-all shrink-0 cursor-pointer"
                  >
                    {t('track_parcel_btn')}
                  </button>
                </div>
              </form>

              {/* Demo CN tags */}
              <div className="flex flex-wrap items-center justify-center gap-2 text-xs pt-2">
                <span className="text-slate-400 font-medium">{t('quick_demo_cns')}</span>
                {shipments.slice(0, 4).map(s => (
                  <button
                    key={s.id}
                    onClick={() => handleQuickTrack(s.cnNumber)}
                    className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-mono text-[11px] font-semibold transition-colors border border-white/10 cursor-pointer"
                  >
                    {s.cnNumber} ({s.receiver.city})
                  </button>
                ))}
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
                      <span>{t('booked_at_label')}: {new Date(trackedItem.bookedAt).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>{t('service_lbl')}: <strong>{trackedItem.packageInfo.serviceType}</strong></span>
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

        {/* SECTION 2: 6 BRANCH EXCLUSIVE SIGN-IN PORTAL */}
        {activeTab === 'login' && (
          <div className="max-w-2xl mx-auto w-full space-y-6 animate-in fade-in zoom-in-95 duration-200">
            
            {/* Login Card */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xl space-y-6">
              
              <div className="text-center space-y-1">
                <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
                  <Lock className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-black text-slate-900">
                  {t('branch_terminal_signin_title')}
                </h2>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  {t('branch_terminal_signin_desc')}
                </p>
              </div>

              {loginError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              <form onSubmit={handleLoginSubmit} className="space-y-4">
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
                  className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md shadow-red-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" />
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
                  {users.map(u => {
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
        <p>© {new Date().getFullYear()} Rayan Cargo DB Logistics Network. 6 Branches Inter-Connected with End-to-End Privacy.</p>
      </footer>

    </div>
  );
};
