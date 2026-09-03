import React, { useState } from 'react';
import { 
  Package, 
  Search, 
  Languages, 
  Building2, 
  ShieldCheck, 
  Wifi, 
  UserCheck, 
  ChevronDown,
  Sparkles,
  LogOut,
  Lock,
  KeyRound,
  Menu,
  X
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Language, UserRole, Branch } from '../types';
import { ChangePasswordModal } from './ChangePasswordModal';
import { ArmaghanLogo } from './ArmaghanLogo';

export const Header: React.FC = () => {
  const { 
    t, 
    language, 
    setLanguage, 
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
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

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
    : getLocalizedBranchName(currentBranchObj);

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

        <div className="max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-2 sm:gap-3">
            
            {/* Left: Mobile Menu Toggle + Logo & Brand */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {/* Mobile Sidebar Hamburger Toggle */}
              <button
                onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
                className="lg:hidden p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
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
                className="cursor-pointer transition-transform hover:opacity-95"
              >
                <ArmaghanLogo variant="badge" size="sm" showSubtitle={true} />
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
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">

              {/* Mobile Search Icon Toggle */}
              <button
                onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
                className="md:hidden p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                title="Search CN"
              >
                <Search className="w-4 h-4" />
              </button>

              {/* Branch Switcher (for super_admin only) / Lock Badge (for branch) */}
              <div className="relative">
                {currentUser.role === 'super_admin' ? (
                  <button
                    onClick={() => {
                      setShowBranchDropdown(!showBranchDropdown);
                      setShowLangDropdown(false);
                    }}
                    className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                    title={t('current_branch')}
                  >
                    <Building2 className="w-3.5 h-3.5 text-red-600 dark:text-red-400 shrink-0" />
                    <span className="max-w-[75px] sm:max-w-[140px] md:max-w-[180px] truncate">{currentBranchName}</span>
                    <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
                  </button>
                ) : (
                  <div 
                    className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-xl text-xs font-semibold bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800"
                    title={t('restricted_access_title')}
                  >
                    <Lock className="w-3.5 h-3.5 text-red-600 dark:text-red-400 shrink-0" />
                    <span className="max-w-[80px] sm:max-w-[140px] md:max-w-[180px] truncate font-bold">{currentBranchName}</span>
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
                          <div className="font-semibold">{getLocalizedBranchName(b)}</div>
                          <div className="text-[10px] text-slate-400">{b.city}, {b.province} ({b.code})</div>
                        </div>
                        {activeBranchId === b.id && <span className="w-2 h-2 rounded-full bg-red-600" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Language Switcher */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowLangDropdown(!showLangDropdown);
                    setShowBranchDropdown(false);
                  }}
                  className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                  title={t('theme_toggle')}
                >
                  <Languages className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span className="uppercase font-bold text-[11px] sm:text-xs">{language}</span>
                  <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
                </button>

                {showLangDropdown && (
                  <div className="absolute end-0 mt-2 w-44 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 py-1.5 z-50">
                    <button
                      onClick={() => { setLanguage('en'); setShowLangDropdown(false); }}
                      className={`w-full text-start px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer ${language === 'en' ? 'text-blue-600 font-bold bg-blue-50/50 dark:bg-blue-950/30' : 'text-slate-700 dark:text-slate-300'}`}
                    >
                      <span>English (US)</span>
                      <span className="text-[10px] text-slate-400 font-mono">LTR</span>
                    </button>
                    <button
                      onClick={() => { setLanguage('fa'); setShowLangDropdown(false); }}
                      className={`w-full text-start px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer ${language === 'fa' ? 'text-blue-600 font-bold bg-blue-50/50 dark:bg-blue-950/30' : 'text-slate-700 dark:text-slate-300'}`}
                    >
                      <span>دری (Afghanistan)</span>
                      <span className="text-[10px] text-slate-400 font-mono">RTL</span>
                    </button>
                    <button
                      onClick={() => { setLanguage('ps'); setShowLangDropdown(false); }}
                      className={`w-full text-start px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer ${language === 'ps' ? 'text-blue-600 font-bold bg-blue-50/50 dark:bg-blue-950/30' : 'text-slate-700 dark:text-slate-300'}`}
                    >
                      <span>پښتو (Pashto)</span>
                      <span className="text-[10px] text-slate-400 font-mono">RTL</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Branch Password Self-Change Button (for Branch Accounts) */}
              {currentUser.role !== 'super_admin' && (
                <button
                  onClick={() => setIsPasswordModalOpen(true)}
                  className="hidden md:flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-semibold transition-colors cursor-pointer"
                  title={t('change_branch_password_title')}
                >
                  <KeyRound className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span className="hidden lg:inline">{t('login_password_lbl')}</span>
                </button>
              )}

              {/* User Account / Role Switcher Modal Trigger */}
              <button
                onClick={() => setShowRoleModal(true)}
                className="flex items-center gap-1.5 sm:gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors text-start cursor-pointer"
                title={t('switch_account_modal_title')}
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
              </button>

              {/* Dedicated Logout Button */}
              <button
                onClick={logout}
                className="p-2 rounded-xl bg-red-50 dark:bg-red-950/40 hover:bg-red-100 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 transition-colors cursor-pointer"
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

        {/* Switch Branch Account Modal */}
        {showRoleModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-red-600" />
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    {t('switch_account_modal_title')}
                  </h3>
                </div>
                <button 
                  onClick={() => setShowRoleModal(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="mb-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400">
                <p className="font-semibold text-slate-800 dark:text-slate-200 mb-1">
                  🏢 {t('single_role_architecture')}:
                </p>
                <p>
                  {t('switch_account_desc')}
                </p>
              </div>

              <div className="space-y-2 max-h-84 overflow-y-auto pr-1">
                {users.map(u => {
                  const branchObj = branches.find(b => b.id === u.branchId);
                  const isSelected = currentUser.id === u.id;
                  const isSuper = u.role === 'super_admin';
                  const locBranchName = getLocalizedBranchName(branchObj);

                  return (
                    <button
                      key={u.id}
                      onClick={() => {
                        setCurrentUser(u);
                        if (u.role === 'super_admin') {
                          setActiveBranchId('all');
                        } else {
                          setActiveBranchId(u.branchId);
                        }
                        setShowRoleModal(false);
                      }}
                      className={`w-full text-start p-3 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                        isSelected 
                          ? 'border-red-500 bg-red-50/60 dark:bg-red-950/40 ring-1 ring-red-500' 
                          : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm ${
                          isSuper 
                            ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300' 
                            : 'bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300'
                        }`}>
                          {branchObj?.code || 'HQ'}
                        </div>
                        <div>
                          <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-2">
                            <span>{u.name}</span>
                            {u.passwordChangedByBranch && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold">
                                {t('private_password_badge')}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">{u.email}</div>
                          <div className="text-[10px] font-semibold text-red-600 dark:text-red-400">
                            {isSuper ? t('role_super_admin') : `${locBranchName} (${branchObj?.province})`}
                          </div>
                        </div>
                      </div>
                      {isSelected ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-600 text-white">
                          {t('active_account_badge')}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                          {t('sign_in_arrow')}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  {t('data_isolation_badge')}
                </span>
                <span className="flex items-center gap-1">
                  <Wifi className="w-3.5 h-3.5 text-blue-500" />
                  {branches.length} {t('active_terminals_status')}
                </span>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Change Password Modal */}
      <ChangePasswordModal 
        isOpen={isPasswordModalOpen} 
        onClose={() => setIsPasswordModalOpen(false)} 
      />
    </>
  );
};
