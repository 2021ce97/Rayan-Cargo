import React, { useState } from 'react';
import { 
  Building2, 
  Plus, 
  MapPin, 
  Phone, 
  Mail, 
  User as UserIcon, 
  Boxes, 
  KeyRound,
  ShieldCheck, 
  Lock,
  Search,
  CheckCircle2,
  Copy,
  Check,
  Sparkles,
  Globe
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Branch, User } from '../types';

const AFGHAN_PROVINCES = [
  'Kabul', 'Herat', 'Balkh', 'Kandahar', 'Nangarhar', 'Kunduz', 'Ghazni', 
  'Badakhshan', 'Baghlan', 'Bamyan', 'Farah', 'Faryab', 'Ghor', 'Helmand', 
  'Jawzjan', 'Khost', 'Kunar', 'Laghman', 'Logar', 'Nimruz', 'Nuristan', 
  'Paktia', 'Paktika', 'Panjshir', 'Parwan', 'Samangan', 'Sar-e Pol', 
  'Takhar', 'Urozgan', 'Wardak', 'Zabul', 'Badghis', 'Daykundi', 'Kapisa'
];

export const BranchManagement: React.FC = () => {
  const { 
    t,
    language,
    branches, 
    users, 
    currentUser, 
    setActiveBranchId, 
    setActiveView,
    resetBranchUserCredentials,
    addBranch
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  
  // Password Provision Modal for Admin
  const [provisionBranch, setProvisionBranch] = useState<Branch | null>(null);
  const [tempPassword, setTempPassword] = useState('');
  const [copiedInfo, setCopiedInfo] = useState(false);
  const [provisionSuccess, setProvisionSuccess] = useState(false);

  // Add New Branch Modal state
  const [isAddBranchOpen, setIsAddBranchOpen] = useState(false);
  const [newBranchData, setNewBranchData] = useState({
    name: '',
    nameFa: '',
    namePs: '',
    code: '',
    province: 'Ghazni',
    city: '',
    address: '',
    phone: '+93 7',
    email: '',
    managerName: '',
    initialPassword: ''
  });
  const [createdBranchResult, setCreatedBranchResult] = useState<{ branch: Branch; user: User } | null>(null);
  const [copiedNewCreds, setCopiedNewCreds] = useState(false);

  const isSuperAdmin = currentUser.role === 'super_admin';

  const getLocalizedBranchName = (b: Branch) => {
    if (language === 'fa' && b.nameFa) return b.nameFa;
    if (language === 'ps' && b.namePs) return b.namePs;
    return b.name;
  };

  const filteredBranches = branches.filter(b => {
    const q = searchTerm.toLowerCase();
    return b.name.toLowerCase().includes(q) ||
      (b.nameFa && b.nameFa.toLowerCase().includes(q)) ||
      (b.namePs && b.namePs.toLowerCase().includes(q)) ||
      b.province.toLowerCase().includes(q) ||
      b.city.toLowerCase().includes(q) ||
      b.code.toLowerCase().includes(q);
  });

  const handleOpenProvisionModal = (branch: Branch) => {
    setProvisionBranch(branch);
    const branchUser = users.find(u => u.branchId === branch.id);
    setTempPassword(branchUser?.password || `${branch.code.toLowerCase().replace(/[^a-z0-9]/g, '')}123`);
    setCopiedInfo(false);
    setProvisionSuccess(false);
  };

  const handleSaveProvision = (e: React.FormEvent) => {
    e.preventDefault();
    if (!provisionBranch || !tempPassword.trim()) return;

    const branchUser = users.find(u => u.branchId === provisionBranch.id);
    if (branchUser) {
      resetBranchUserCredentials(branchUser.id, tempPassword.trim());
      setProvisionSuccess(true);
      setTimeout(() => {
        setProvisionSuccess(false);
        setProvisionBranch(null);
      }, 2000);
    }
  };

  const handleCopyCredentials = () => {
    if (!provisionBranch) return;
    const branchUser = users.find(u => u.branchId === provisionBranch.id);
    const text = `Rayan Cargo Login Credentials:\nBranch: ${provisionBranch.name}\nEmail: ${branchUser?.email}\nTemporary Password: ${tempPassword}\n\nPlease sign in and immediately change your private password in the top bar.`;
    navigator.clipboard.writeText(text);
    setCopiedInfo(true);
    setTimeout(() => setCopiedInfo(false), 3000);
  };

  const handleOpenAddBranch = () => {
    setNewBranchData({
      name: '',
      nameFa: '',
      namePs: '',
      code: '',
      province: 'Ghazni',
      city: 'Ghazni City',
      address: 'Main Commercial Cargo Hub',
      phone: '+93 79 ',
      email: '',
      managerName: '',
      initialPassword: ''
    });
    setCreatedBranchResult(null);
    setCopiedNewCreds(false);
    setIsAddBranchOpen(true);
  };

  const handleProvinceChange = (prov: string) => {
    const defaultCity = `${prov} City`;
    const suggestedCode = `${prov.slice(0, 3).toUpperCase()}-0${branches.length + 1}`;
    const cleanProv = prov.toLowerCase().replace(/[^a-z0-9]/g, '');
    const suggestedEmail = `${cleanProv}@rayancargo.af`;
    const suggestedPass = `${cleanProv}123`;

    setNewBranchData(prev => ({
      ...prev,
      province: prov,
      city: prev.city || defaultCity,
      name: prev.name || `${prov} Regional Hub`,
      code: prev.code || suggestedCode,
      email: prev.email || suggestedEmail,
      initialPassword: prev.initialPassword || suggestedPass
    }));
  };

  const handleCreateBranchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchData.name.trim() || !newBranchData.code.trim() || !newBranchData.email.trim()) return;

    const result = addBranch({
      name: newBranchData.name,
      nameFa: newBranchData.nameFa || newBranchData.name,
      namePs: newBranchData.namePs || newBranchData.name,
      code: newBranchData.code,
      province: newBranchData.province,
      city: newBranchData.city || `${newBranchData.province} City`,
      address: newBranchData.address || 'Main Cargo Terminal',
      phone: newBranchData.phone || '+93 79 000 0000',
      email: newBranchData.email,
      managerName: newBranchData.managerName || `${newBranchData.province} Branch Officer`,
      initialPassword: newBranchData.initialPassword || `${newBranchData.code.toLowerCase().replace(/[^a-z0-9]/g, '')}123`
    });

    setCreatedBranchResult(result);
  };

  const handleCopyNewBranchCreds = () => {
    if (!createdBranchResult) return;
    const text = `Rayan Cargo Login Credentials (New Hub):\nBranch: ${createdBranchResult.branch.name} (${createdBranchResult.branch.code})\nEmail: ${createdBranchResult.user.email}\nTemporary Password: ${createdBranchResult.user.password}\n\nPlease sign in to Rayan Cargo and update your private password.`;
    navigator.clipboard.writeText(text);
    setCopiedNewCreds(true);
    setTimeout(() => setCopiedNewCreds(false), 3000);
  };

  return (
    <div className="space-y-6 pb-12 font-sans" id="branch-management-root">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-6 rounded-2xl bg-white border border-slate-200 shadow-xs" id="branch-header">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-md shadow-red-600/20">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {t('branch_mgmt_title')}
              </h1>
              <p className="text-xs text-slate-500">
                {t('branch_mgmt_subtitle')}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Privacy badge */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-700 font-semibold">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>{t('branch_revenue_privacy_enforced')}</span>
          </div>

          {/* Add New Branch Button for Super Admin */}
          {isSuperAdmin && (
            <button
              onClick={handleOpenAddBranch}
              className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md shadow-red-600/20 flex items-center gap-2 transition-all transform active:scale-98 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{t('btn_add_branch')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Policy Notice Box */}
      <div className="p-4 rounded-2xl bg-slate-100 border border-slate-200 text-xs text-slate-700 flex items-start gap-3">
        <Lock className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-bold text-slate-900">
            {t('single_role_architecture')}
          </div>
          <p>
            {t('single_role_architecture_desc')}
          </p>
        </div>
      </div>

      {/* Search Filter */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('search_placeholder')}
            className="w-full h-10 ps-9 pe-4 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>

        <div className="text-xs font-bold text-slate-500 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>{branches.length} {t('online_terminals_badge')}</span>
        </div>
      </div>

      {/* Branch Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredBranches.map((branch) => {
          const branchUser = users.find(u => u.branchId === branch.id);
          const localizedName = getLocalizedBranchName(branch);

          return (
            <div
              key={branch.id}
              className="rounded-2xl border border-slate-200 bg-white shadow-xs p-5 space-y-4 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                {/* Top Title & Code */}
                <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100">
                  <div>
                    <div className="font-black text-base text-slate-900">
                      {localizedName}
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium">
                      {branch.city}, {branch.province}
                    </div>
                  </div>

                  <span className="font-mono text-xs font-black px-2.5 py-1 rounded-lg bg-red-50 text-red-700 border border-red-200">
                    {branch.code}
                  </span>
                </div>

                {/* Location & Details */}
                <div className="space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center gap-2 text-slate-800">
                    <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                    <span className="truncate">{branch.address}</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-[11px]">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{branch.phone}</span>
                  </div>
                </div>

                {/* Exclusive Account Info Box */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                    <span className="flex items-center gap-1">
                      <UserIcon className="w-3.5 h-3.5 text-red-600" />
                      <span>{t('assigned_branch')}:</span>
                    </span>
                    {branchUser?.passwordChangedByBranch ? (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                        {t('private_password_set')}
                      </span>
                    ) : (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">
                        {t('initial_password_status')}
                      </span>
                    )}
                  </div>

                  <div className="text-xs font-bold text-slate-900">
                    {branchUser?.name || branch.managerName || 'Exclusive Branch Manager'}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1">
                    <Mail className="w-3 h-3 text-slate-400" />
                    <span>{branchUser?.email || branch.email}</span>
                  </div>
                </div>

                {/* Privacy Guarantee Lock */}
                <div className="p-2.5 rounded-xl bg-slate-100 text-slate-600 text-[11px] flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>{t('branch_revenue_privacy_enforced')}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                <button
                  onClick={() => {
                    setActiveBranchId(branch.id);
                    setActiveView('parcels');
                  }}
                  className="flex-1 py-2 px-3 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Boxes className="w-3.5 h-3.5 text-red-500" />
                  <span>{t('view_shipments_btn')}</span>
                </button>

                {currentUser.role === 'super_admin' && (
                  <button
                    onClick={() => handleOpenProvisionModal(branch)}
                    className="py-2 px-3 rounded-xl text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1 transition-colors cursor-pointer"
                    title={t('credentials_modal_title')}
                  >
                    <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                    <span>{t('credentials_btn')}</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Admin Provision / Reset Credentials Modal */}
      {provisionBranch && (() => {
        const bUser = users.find(u => u.branchId === provisionBranch.id);

        return (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-6 animate-in fade-in zoom-in-95 space-y-4">
              
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-amber-600" />
                  <div>
                    <h3 className="font-bold text-base text-slate-900">
                      {t('credentials_modal_title')}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      {provisionBranch.name} ({provisionBranch.code})
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setProvisionBranch(null)}
                  className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {provisionSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{t('credentials_success_msg')}</span>
                </div>
              )}

              <form onSubmit={handleSaveProvision} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    {t('branch_email_lbl')}
                  </label>
                  <input
                    type="text"
                    disabled
                    value={bUser?.email || ''}
                    className="w-full h-10 px-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-700 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    {t('branch_initial_pass_lbl')}
                  </label>
                  <input
                    type="text"
                    required
                    value={tempPassword}
                    onChange={(e) => setTempPassword(e.target.value)}
                    placeholder="Enter temporary password..."
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono focus:ring-2 focus:ring-red-500 focus:outline-none"
                  />
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1">
                  <div className="font-bold text-slate-800">{t('single_role_architecture')}:</div>
                  <p>
                    {t('branch_ownership_notice')}
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleCopyCredentials}
                    className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {copiedInfo ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-600" />}
                    <span>{copiedInfo ? t('copied_btn') : t('copy_btn')}</span>
                  </button>

                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-md cursor-pointer transition-colors"
                  >
                    {t('save_and_issue_btn')}
                  </button>
                </div>
              </form>

            </div>
          </div>
        );
      })()}

      {/* Add New Branch Modal */}
      {isAddBranchOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 p-6 animate-in fade-in zoom-in-95 my-8">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-red-100 text-red-700 flex items-center justify-center font-bold">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    {t('modal_add_new_branch_title')}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {t('modal_add_new_branch_subtitle')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddBranchOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-base cursor-pointer"
              >
                ✕
              </button>
            </div>

            {createdBranchResult ? (
              <div className="mt-4 space-y-4">
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>{t('branch_added_successfully')}</span>
                  </div>
                  <p className="text-xs">
                    The new branch has been added into the Afghanistan cargo network and can immediately send and receive parcels, view manifests, and trade with all partner terminals.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-900 text-white font-mono text-xs space-y-2.5">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <span className="text-amber-400 font-bold">🏢 Terminal Credentials</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {createdBranchResult.branch.code}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Branch Name: </span>
                    <span className="font-bold text-white">{createdBranchResult.branch.name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Province: </span>
                    <span>{createdBranchResult.branch.province} ({createdBranchResult.branch.city})</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Login Email: </span>
                    <span className="text-red-400 font-bold">{createdBranchResult.user.email}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Temporary Password: </span>
                    <span className="text-emerald-400 font-bold">{createdBranchResult.user.password}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleCopyNewBranchCreds}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    {copiedNewCreds ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-600" />}
                    <span>{copiedNewCreds ? t('copied_btn') : t('copy_btn')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsAddBranchOpen(false)}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    {t('close_button')}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateBranchSubmit} className="mt-4 space-y-3.5 text-xs">
                
                {/* Province & Code */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">
                      {t('branch_province_lbl')} *
                    </label>
                    <select
                      value={newBranchData.province}
                      onChange={(e) => handleProvinceChange(e.target.value)}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium focus:ring-2 focus:ring-red-500 focus:outline-none"
                    >
                      {AFGHAN_PROVINCES.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">
                      {t('branch_code_lbl')} *
                    </label>
                    <input
                      type="text"
                      required
                      value={newBranchData.code}
                      onChange={(e) => setNewBranchData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                      placeholder="e.g. GZN-07"
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono font-bold focus:ring-2 focus:ring-red-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Names in 3 Languages */}
                <div className="space-y-2 pt-1 border-t border-slate-100">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">
                      {t('branch_name_en_lbl')} *
                    </label>
                    <input
                      type="text"
                      required
                      value={newBranchData.name}
                      onChange={(e) => setNewBranchData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g. Ghazni Central Cargo Hub"
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-red-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">
                        {t('branch_name_fa_lbl')}
                      </label>
                      <input
                        type="text"
                        dir="rtl"
                        value={newBranchData.nameFa}
                        onChange={(e) => setNewBranchData(prev => ({ ...prev, nameFa: e.target.value }))}
                        placeholder="مثلاً: نمایندگی مرکزی ولایت غزنی"
                        className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-red-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">
                        {t('branch_name_ps_lbl')}
                      </label>
                      <input
                        type="text"
                        dir="rtl"
                        value={newBranchData.namePs}
                        onChange={(e) => setNewBranchData(prev => ({ ...prev, namePs: e.target.value }))}
                        placeholder="لکه: د غزني ولایت مرکزي څانګه"
                        className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-red-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* City & Address */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">
                      {t('branch_city_lbl')} *
                    </label>
                    <input
                      type="text"
                      required
                      value={newBranchData.city}
                      onChange={(e) => setNewBranchData(prev => ({ ...prev, city: e.target.value }))}
                      placeholder="e.g. Ghazni City"
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-red-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">
                      {t('branch_phone_lbl')} *
                    </label>
                    <input
                      type="text"
                      required
                      value={newBranchData.phone}
                      onChange={(e) => setNewBranchData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="+93 79 123 4567"
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono focus:ring-2 focus:ring-red-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    {t('branch_address_lbl')} *
                  </label>
                  <input
                    type="text"
                    required
                    value={newBranchData.address}
                    onChange={(e) => setNewBranchData(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="e.g. Commercial Square, Cargo Center #1"
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-red-500 focus:outline-none"
                  />
                </div>

                {/* Dedicated Account Login Provisioning */}
                <div className="p-3.5 rounded-xl bg-red-50/70 border border-red-200 space-y-3">
                  <div className="text-[11px] font-bold text-red-900 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-red-600" />
                    <span>Exclusive Account Provisioning (No Sub-Roles)</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1 text-[11px]">
                        {t('branch_manager_lbl')}
                      </label>
                      <input
                        type="text"
                        value={newBranchData.managerName}
                        onChange={(e) => setNewBranchData(prev => ({ ...prev, managerName: e.target.value }))}
                        placeholder="e.g. Asadullah Niazi"
                        className="w-full h-9 px-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-red-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1 text-[11px]">
                        {t('branch_email_lbl')} *
                      </label>
                      <input
                        type="email"
                        required
                        value={newBranchData.email}
                        onChange={(e) => setNewBranchData(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="e.g. ghazni@rayancargo.af"
                        className="w-full h-9 px-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono focus:ring-2 focus:ring-red-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1 text-[11px]">
                        {t('branch_initial_pass_lbl')} *
                      </label>
                      <input
                        type="text"
                        required
                        value={newBranchData.initialPassword}
                        onChange={(e) => setNewBranchData(prev => ({ ...prev, initialPassword: e.target.value }))}
                        placeholder="e.g. ghazni123"
                        className="w-full h-9 px-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono focus:ring-2 focus:ring-red-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddBranchOpen(false)}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer"
                  >
                    {t('close_button')}
                  </button>

                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold shadow-md shadow-red-600/20 transition-all cursor-pointer"
                  >
                    {t('btn_create_branch_submit')}
                  </button>
                </div>

              </form>
            )}

          </div>
        </div>
      )}

    </div>
  );
};
