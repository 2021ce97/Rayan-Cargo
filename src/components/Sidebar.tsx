import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Boxes, 
  PackagePlus, 
  Crosshair, 
  Building2, 
  Users, 
  FileText, 
  ShieldCheck, 
  Zap, 
  KeyRound, 
  ArrowRightLeft, 
  LogOut,
  DollarSign,
  UserCheck,
  Package
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ChangePasswordModal } from './ChangePasswordModal';
import { Branch } from '../types';

export const Sidebar: React.FC = () => {
  const { 
    t, 
    language,
    activeView, 
    setActiveView, 
    currentUser, 
    filteredShipments, 
    branches, 
    logout, 
    activeBranchPartnerId, 
    setActiveBranchPartnerId,
    customerShipments,
    branchExpenses
  } = useApp();

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  const isSuperAdmin = currentUser.role === 'super_admin';
  const isCustomer = currentUser.role === 'customer';
  const currentBranch = branches.find(b => b.id === currentUser.branchId);

  const getLocalizedBranchName = (b: Branch | undefined) => {
    if (!b) return t('all_branches');
    if (language === 'fa' && b.nameFa) return b.nameFa;
    if (language === 'ps' && b.namePs) return b.namePs;
    return b.name;
  };

  // Other branches to trade/exchange with
  const partnerBranches = branches.filter(b => b.id !== currentUser.branchId);

  const navItems = isCustomer ? [
    {
      id: 'customer_portal' as const,
      label: t('nav_customer_portal'),
      icon: Package,
      badge: customerShipments.length,
      visible: true
    },
    {
      id: 'tracking' as const,
      label: t('nav_tracking'),
      icon: Crosshair,
      badge: 'Live',
      visible: true
    }
  ] : [
    {
      id: 'dashboard' as const,
      label: t('nav_dashboard'),
      icon: LayoutDashboard,
      badge: null,
      visible: true
    },
    {
      id: 'parcels' as const,
      label: t('nav_parcels'),
      icon: Boxes,
      badge: filteredShipments.length,
      visible: true
    },
    {
      id: 'booking' as const,
      label: t('nav_new_booking'),
      icon: PackagePlus,
      highlight: true,
      visible: true
    },
    {
      id: 'expenses' as const,
      label: t('nav_expenses'),
      icon: DollarSign,
      badge: branchExpenses.length > 0 ? branchExpenses.length : null,
      visible: true
    },
    {
      id: 'tracking' as const,
      label: t('nav_tracking'),
      icon: Crosshair,
      badge: 'Live',
      visible: true
    },
    {
      id: 'branches' as const,
      label: t('nav_branches'),
      icon: Building2,
      badge: branches.length,
      visible: isSuperAdmin
    },
    {
      id: 'users' as const,
      label: t('nav_users'),
      icon: Users,
      badge: `${branches.length} Hubs`,
      visible: isSuperAdmin
    },
    {
      id: 'reports' as const,
      label: t('nav_reports'),
      icon: FileText,
      badge: null,
      visible: true
    }
  ].filter(item => item.visible);

  return (
    <>
      {/* Dark Sidebar - Strict Black Theme with Red/Amber Highlights */}
      <aside className="w-68 shrink-0 hidden lg:flex flex-col justify-between border-e border-slate-800 bg-[#0B0F17] p-4 min-h-[calc(100vh-4rem)] text-slate-300 select-none shadow-xl" id="app-sidebar">
        
        <div className="space-y-5">
          {/* Quick Booking Action Callout */}
          {isCustomer ? (
            <button
              onClick={() => setActiveView('customer_portal')}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 transition-all transform active:scale-98 cursor-pointer"
            >
              <PackagePlus className="w-4 h-4" />
              <span>{t('prebook_new_parcel')}</span>
            </button>
          ) : (
            <button
              onClick={() => setActiveView('booking')}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 transition-all transform active:scale-98 cursor-pointer"
            >
              <PackagePlus className="w-4 h-4" />
              <span>{t('nav_new_booking')}</span>
            </button>
          )}

          {/* Main Navigation Items */}
          <nav className="space-y-1">
            <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              {isCustomer ? 'Customer Services' : t('app_title')}
            </p>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveView(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                    isActive
                      ? 'bg-red-600/90 text-white font-bold shadow-md shadow-red-600/20 border border-red-500/40'
                      : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== null && item.badge !== undefined && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isActive 
                        ? 'bg-white text-red-700' 
                        : 'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Cross-Branch Bilateral Exchange Filter (For Branch Managers) */}
          {!isSuperAdmin && !isCustomer && (
            <div className="pt-2">
              <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                    <ArrowRightLeft className="w-3.5 h-3.5 text-red-400" />
                    {t('branch_exchange_title')}
                  </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-red-400 border border-slate-700">
                    {branches.length} Hubs
                  </span>
                </div>
                
                <p className="text-[10px] text-slate-400 leading-tight">
                  {t('branch_exchange_desc')}
                </p>

                <select
                  value={activeBranchPartnerId}
                  onChange={(e) => {
                    setActiveBranchPartnerId(e.target.value as string);
                    if (activeView !== 'parcels' && activeView !== 'dashboard') {
                      setActiveView('parcels');
                    }
                  }}
                  className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-2 outline-none focus:border-red-500 font-medium cursor-pointer"
                >
                  <option value="all">{t('all_branch_exchanges')}</option>
                  {partnerBranches.map(b => (
                    <option key={b.id} value={b.id}>
                      📍 {getLocalizedBranchName(b)} ({b.code})
                    </option>
                  ))}
                </select>

                {activeBranchPartnerId !== 'all' && (
                  <button
                    onClick={() => setActiveBranchPartnerId('all')}
                    className="w-full py-1 text-[10px] text-center text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
                  >
                    {t('clear_partner_filter')}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Network Highway Health */}
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 text-slate-300 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-red-400 uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                {t('afghan_highway_fleet')}
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed truncate">
              {branches.slice(0, 5).map(b => b.city).join(' • ')}
            </p>
            <div className="pt-1.5 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-500">
              <span>{branches.length} {t('online_terminals_badge')}</span>
              <span className="text-emerald-400 font-bold">100% Online</span>
            </div>
          </div>
        </div>

        {/* User Account & Security Footer */}
        <div className="pt-4 border-t border-slate-800 space-y-3">
          
          {/* Active Terminal Card */}
          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                {isSuperAdmin ? t('role_super_admin') : isCustomer ? 'Customer Account' : t('role_branch_manager')}
              </span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                isSuperAdmin 
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : isCustomer
                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              }`}>
                {isSuperAdmin ? 'Central HQ' : isCustomer ? 'Customer' : currentBranch?.code || 'Terminal'}
              </span>
            </div>
            
            <p className="text-xs font-bold text-white truncate">
              {isSuperAdmin ? currentUser.name : isCustomer ? currentUser.name : (getLocalizedBranchName(currentBranch) || currentUser.name)}
            </p>
            <p className="text-[10px] text-slate-400 truncate font-mono">
              {currentUser.email}
            </p>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-2">
            {!isSuperAdmin && !isCustomer && (
              <button
                onClick={() => setIsPasswordModalOpen(true)}
                className="py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-medium flex items-center justify-center gap-1 transition-colors cursor-pointer"
                title={t('change_branch_password_title')}
              >
                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                <span>{t('login_password_lbl')}</span>
              </button>
            )}
            
            <button
              onClick={logout}
              className={`py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-rose-950/50 hover:text-rose-400 text-slate-300 text-[11px] font-medium flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                isSuperAdmin || isCustomer ? 'col-span-2' : ''
              }`}
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{t('logout_btn')}</span>
            </button>
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-500" />
              {t('data_isolation_badge')}
            </span>
            <span className="font-mono">v2.5.0</span>
          </div>

        </div>

      </aside>

      {/* Change Password Modal */}
      <ChangePasswordModal 
        isOpen={isPasswordModalOpen} 
        onClose={() => setIsPasswordModalOpen(false)} 
      />
    </>
  );
};

