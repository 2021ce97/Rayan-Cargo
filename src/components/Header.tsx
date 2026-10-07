import React, { useState } from 'react';
import { 
  Search, 
  Building2, 
  ChevronDown,
  Sparkles,
  LogOut,
  Lock,
  KeyRound,
  Menu,
  X
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { UserRole, Branch } from '../types';
import { ChangePasswordModal } from './ChangePasswordModal';
import { ArmaghanLogo } from './ArmaghanLogo';
import { SystemSettingsModal } from './SystemSettingsModal';
import { LanguageSwitcher } from './LanguageSwitcher';
import { Settings as SettingsIcon } from 'lucide-react';

export const Header: React.FC = () => {
  const { 
    t, 
    language, 
    currentUser, 
    setCurrentUser,
    users,
    branches, 
    activeBranchId, 
    setActiveBranchId,
    trackByCnNumber,
    setActiveView,
    toastMessage,
    logout,
    isMobileSidebarOpen,
    setIsMobileSidebarOpen
  } = useApp();

  const [searchCn, setSearchCn] = useState('');
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchCn.trim()) return;
    trackByCnNumber(searchCn);
    setActiveView('tracking');
    setIsMobileSearchOpen(false);
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'super_admin': return t('role_super_admin');
      case 'branch_manager': return t('role_branch_manager');
      default: return role;
    }
  };

  const getLocalizedBranchName = (b: Branch | undefined) => {
    if (!b) return t('all_branches');
    if (language === 'fa' && b.nameFa) return b.nameFa;
    if (language === 'ps' && b.namePs) return b.namePs;
    return b.name;
  };

  const currentBranchObj = branches.find(b => b.id === activeBranchId);
  const currentBranchName = activeBranchId === 'all'
    ? t('all_branches')
    : (currentBranchObj?.isHeadOffice
        ? `👑 ${getLocalizedBranchName(currentBranchObj)}`
        : getLocalizedBranchName(currentBranchObj));

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/98 dark:bg-slate-900/98 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-xs" id="app-header">
        {/* Toast notification banner */}
        {toastMessage && (
          <div className="bg-emerald-600 text-white text-center py-2 px-4 text-xs font-semibold animate-fadeIn flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-200" />
            <span>{toastMessage}</span>
          </div>
        )}

        <div className="max-w-[1600px] mx-auto px-2 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-1.5 sm:gap-3 min-w-0">
            
            {/* Left: Mobile Menu Toggle + Logo & Brand */}
            <div className="flex items-center gap-1.5 sm:gap-3 shrink-0 min-w-0">
              {/* Mobile Sidebar Hamburger Toggle */}
              <button
                onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
                className="lg:hidden p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer shrink-0"
                title={isMobileSidebarOpen ? 'Close Menu' : 'Open Navigation Menu'}
                aria-label="Toggle navigation menu"
              >
                {isMobileSidebarOpen ? (
                  <X className="w-5 h-5 text-red-600 dark:text-red-400" />
                ) : (
                  <Menu className="w-5 h-5 text-slate-700 dark:text-slate-200" />
                )}
              </button>

              <div 
                onClick={() => setActiveView('dashboard')}
                className="cursor-pointer transition-transform hover:opacity-95 shrink-0"
              >
                {/* Responsive Logo: compact on mobile, full on tablet/desktop */}
                <div className="hidden sm:block">
                  <ArmaghanLogo variant="badge" size="sm" showSubtitle={true} />
                </div>
                <div className="sm:hidden flex items-center gap-1.5">
                  <div className="w-8 h-8 rounded-xl p-0.5 bg-white dark:bg-slate-900 border border-red-500/20 shadow-xs flex items-center justify-center shrink-0">
                    <img src="/logo.jpg" alt="Logo" className="w-7 h-7 object-contain rounded-lg" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-black text-xs text-slate-900 dark:text-white leading-tight">
                      Armaghan Sadeq
                    </span>
                    <span className="text-[8px] font-bold text-red-600 dark:text-red-400 leading-none">
                      TRANSFERS
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Tracking Search Bar (Desktop) */}
            <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md mx-2 hidden md:block">
              <div className="relative flex items-center">
                <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none text-slate-400">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={searchCn}
                  onChange={(e) => setSearchCn(e.target.value)}
                  placeholder={t('enter_cn_placeholder')}
                  className="w-full h-10 ps-9 pe-20 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500 transition-all font-mono"
                />
                <button
                  type="submit"
                  className="absolute inset-y-1 end-1 px-3 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs cursor-pointer"
                >
                  {t('track_btn')}
                </button>
              </div>
            </form>

            {/* Action Tools & Switchers */}
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">

              {/* Mobile Search Icon Toggle */}
              <button
                onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
                className="md:hidden p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer shrink-0"
                title="Search CN"
              >
                <Search className="w-4 h-4" />
              </button>

              {/* Branch Switcher (for super_admin only) / Lock Badge (for branch) */}
              <div className="relative shrink-0">
                {currentUser.role === 'super_admin' ? (
                  <button
                    onClick={() => {
                      setShowBranchDropdown(!showBranchDropdown);
                    }}
                    className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                    title={t('current_branch')}
                  >
                    <Building2 className="w-3.5 h-3.5 text-red-600 dark:text-red-400 shrink-0" />
                    <span className="max-w-[55px] sm:max-w-[140px] md:max-w-[180px] truncate text-[11px] sm:text-xs">{currentBranchName}</span>
                    <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
                  </button>
                ) : (
                  <div 
                    className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-xl text-xs font-semibold bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800"
                    title={t('restricted_access_title')}
                  >
                    <Lock className="w-3.5 h-3.5 text-red-600 dark:text-red-400 shrink-0" />
                    <span className="max-w-[60px] sm:max-w-[140px] md:max-w-[180px] truncate font-bold text-[11px] sm:text-xs">{currentBranchName}</span>
                  </div>
                )}

                {showBranchDropdown && currentUser.role === 'super_admin' && (
                  <div className="absolute end-0 mt-2 w-72 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 py-1.5 z-50 animate-in fade-in zoom-in-95">
                    <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      {t('filter_all_branches')} ({branches.length} {t('nav_branches')})
                    </div>
                    <button
                      onClick={() => {
                        setActiveBranchId('all');
                        setShowBranchDropdown(false);
                      }}
                      className={`w-full text-start px-3 py-2 text-xs font-medium flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer ${activeBranchId === 'all' ? 'text-red-600 font-bold bg-red-50/50 dark:bg-red-950/30' : 'text-slate-700 dark:text-slate-300'}`}
                    >
                      <span>🌐 {t('all_branches')}</span>
                      {activeBranchId === 'all' && <span className="w-2 h-2 rounded-full bg-red-600" />}
                    </button>
                    {branches.map((b) => (
                      <button
                        key={b.id}
                        onClick={() => {
                          setActiveBranchId(b.id);
                          setShowBranchDropdown(false);
                        }}
                        className={`w-full text-start px-3 py-2 text-xs font-medium flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer ${activeBranchId === b.id ? 'text-red-600 font-bold bg-red-50/50 dark:bg-red-950/30' : 'text-slate-700 dark:text-slate-300'}`}
                      >
                        <div>
                          <div className="flex items-center gap-1.5 font-semibold">
                            <span>{b.isHeadOffice ? '👑' : '📍'}</span>
                            <span>{getLocalizedBranchName(b)}</span>
                            {b.isHeadOffice && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-bold border border-amber-300 dark:border-amber-700">
                                {t('admin_main_office_badge', 'Main Branch (Admin HQ)')}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400">{b.city}, {b.province} ({b.code})</div>
                        </div>
                        {activeBranchId === b.id && <span className="w-2 h-2 rounded-full bg-red-600" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Dedicated Global Trilingual Language Switcher (Always accessible on all screen sizes) */}
              <div className="shrink-0">
                <LanguageSwitcher variant="dropdown" />
              </div>

              {/* User Account Info */}
              <div
                className="hidden sm:flex items-center gap-1.5 sm:gap-2 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors text-start shrink-0"
              >
                <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-slate-800 to-slate-950 text-white flex items-center justify-center font-bold text-xs shrink-0">
                  {currentUser.name.charAt(0)}
                </div>
                <div className="hidden xl:block">
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight">
                    {currentUser.name.split(' ')[0]}
                  </div>
                  <div className="text-[10px] text-red-600 dark:text-red-400 font-semibold">
                    {getRoleLabel(currentUser.role)}
                  </div>
                </div>
              </div>

              {/* Dedicated Logout Button */}
              <button
                onClick={logout}
                className="p-2 rounded-xl bg-red-50 dark:bg-red-950/40 hover:bg-red-100 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 transition-colors cursor-pointer shrink-0"
                title={t('logout_btn')}
              >
                <LogOut className="w-4 h-4" />
              </button>

            </div>

          </div>

          {/* Mobile Search Dropdown Toolbar */}
          {isMobileSearchOpen && (
            <div className="md:hidden pb-3 pt-1 animate-in slide-in-from-top-2 duration-200">
              <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchCn}
                    onChange={(e) => setSearchCn(e.target.value)}
                    placeholder={t('enter_cn_placeholder')}
                    className="w-full h-10 ps-9 pe-3 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 font-mono"
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  className="h-10 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0"
                >
                  {t('track_btn')}
                </button>
              </form>
            </div>
          )}
        </div>


      </header>

      {/* Change Password Modal */}
      <ChangePasswordModal 
        isOpen={isPasswordModalOpen} 
        onClose={() => setIsPasswordModalOpen(false)} 
      />

      {/* System Settings Modal */}
      <SystemSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />
    </>
  );
};
