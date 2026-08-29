import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  ShieldCheck, 
  Building2, 
  KeyRound, 
  Lock, 
  CheckCircle2, 
  Copy, 
  Check,
  Plus,
  Sparkles
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { User, Branch } from '../types';

const AFGHAN_PROVINCES = [
  'Kabul', 'Herat', 'Balkh', 'Kandahar', 'Nangarhar', 'Kunduz', 'Ghazni', 
  'Badakhshan', 'Baghlan', 'Bamyan', 'Farah', 'Faryab', 'Ghor', 'Helmand', 
  'Jawzjan', 'Khost', 'Kunar', 'Laghman', 'Logar', 'Nimruz', 'Nuristan', 
  'Paktia', 'Paktika', 'Panjshir', 'Parwan', 'Samangan', 'Sar-e Pol', 
  'Takhar', 'Urozgan', 'Wardak', 'Zabul', 'Badghis', 'Daykundi', 'Kapisa'
];

export const UserManagement: React.FC = () => {
  const { 
    t,
    language,
    users, 
    branches, 
    currentUser, 
    resetBranchUserCredentials,
    addBranch
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>('all');
  
  // Provision modal
  const [provisionUser, setProvisionUser] = useState<User | null>(null);
  const [tempPassword, setTempPassword] = useState('');
  const [copied, setCopied] = useState(false);
  const [provisionSuccess, setProvisionSuccess] = useState(false);

  // Add new branch modal
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
  const [createdResult, setCreatedResult] = useState<{ branch: Branch; user: User } | null>(null);
  const [copiedNew, setCopiedNew] = useState(false);

  const isSuperAdmin = currentUser.role === 'super_admin';

  const getLocalizedBranchName = (b: Branch | undefined) => {
    if (!b) return t('all_branches');
    if (language === 'fa' && b.nameFa) return b.nameFa;
    if (language === 'ps' && b.namePs) return b.namePs;
    return b.name;
  };

  const handleOpenProvision = (user: User) => {
    setProvisionUser(user);
    setTempPassword(user.password || 'rayan123');
    setCopied(false);
    setProvisionSuccess(false);
  };

  const handleSaveProvision = (e: React.FormEvent) => {
    e.preventDefault();
    if (!provisionUser || !tempPassword.trim()) return;

    resetBranchUserCredentials(provisionUser.id, tempPassword.trim());
    setProvisionSuccess(true);
    setTimeout(() => {
      setProvisionSuccess(false);
      setProvisionUser(null);
    }, 2000);
  };

  const handleCopy = () => {
    if (!provisionUser) return;
    const branch = branches.find(b => b.id === provisionUser.branchId);
    const text = `Rayan Cargo Login Credentials:\nBranch: ${branch?.name || 'HQ'}\nEmail: ${provisionUser.email}\nTemporary Password: ${tempPassword}\n\nPlease sign in and immediately change your private password in the top bar.`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleOpenAddBranch = () => {
    const nextNum = branches.length + 1;
    setNewBranchData({
      name: '',
      nameFa: '',
      namePs: '',
      code: `GZN-0${nextNum}`,
      province: 'Ghazni',
      city: 'Ghazni City',
      address: 'Main Commercial Cargo Hub',
      phone: '+93 79 ',
      email: 'ghazni@rayancargo.af',
      managerName: '',
      initialPassword: 'ghazni123'
    });
    setCreatedResult(null);
    setCopiedNew(false);
    setIsAddBranchOpen(true);
  };

  const handleProvinceChange = (prov: string) => {
    const cleanProv = prov.toLowerCase().replace(/[^a-z0-9]/g, '');
    const nextCode = `${prov.slice(0, 3).toUpperCase()}-0${branches.length + 1}`;
    setNewBranchData(prev => ({
      ...prev,
      province: prov,
      city: `${prov} City`,
      name: `${prov} Regional Hub`,
      code: nextCode,
      email: `${cleanProv}@rayancargo.af`,
      initialPassword: `${cleanProv}123`
    }));
  };

  const handleCreateBranchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchData.name.trim() || !newBranchData.code.trim() || !newBranchData.email.trim()) return;

    const res = addBranch({
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

    setCreatedResult(res);
  };

  const filteredUsers = users.filter(u => {
    const query = searchTerm.toLowerCase().trim();
    const branch = branches.find(b => b.id === u.branchId);
    const branchName = branch?.name.toLowerCase() || '';
    const branchFa = branch?.nameFa?.toLowerCase() || '';
    const branchPs = branch?.namePs?.toLowerCase() || '';

    const matchesSearch = !query || 
      u.name.toLowerCase().includes(query) ||
      u.email.toLowerCase().includes(query) ||
      u.phone.includes(query) ||
      branchName.includes(query) ||
      branchFa.includes(query) ||
      branchPs.includes(query);

    const matchesBranch = selectedBranchFilter === 'all' || u.branchId === selectedBranchFilter;
    return matchesSearch && matchesBranch;
  });

  return (
    <div className="space-y-6 pb-12 font-sans" id="user-management-root">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-6 rounded-2xl bg-white border border-slate-200 shadow-xs" id="users-header">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-md">
              <Users className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {t('branch_provision_title')}
              </h1>
              <p className="text-xs text-slate-500">
                {t('branch_provision_subtitle')}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-700 font-semibold">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>{t('encrypted_badge')}</span>
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

      {/* Role Policy Box */}
      <div className="p-4 rounded-2xl bg-slate-100 border border-slate-200 text-xs text-slate-700 space-y-1">
        <div className="font-bold text-slate-900 flex items-center gap-2">
          <Lock className="w-4 h-4 text-red-600" />
          <span>{t('single_role_architecture')}</span>
        </div>
        <p>
          {t('single_role_architecture_desc')}
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('search_placeholder')}
            className="w-full h-10 ps-9 pe-4 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>

        <div>
          <select
            value={selectedBranchFilter}
            onChange={(e) => setSelectedBranchFilter(e.target.value)}
            className="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="all">{t('filter_all_branches')}</option>
            {branches.map(b => (
              <option key={b.id} value={b.id}>{getLocalizedBranchName(b)} ({b.code})</option>
            ))}
          </select>
        </div>
      </div>

      {/* Accounts Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                <th className="p-3.5 text-start">{t('assigned_branch')}</th>
                <th className="p-3.5 text-start">{t('user_name')}</th>
                <th className="p-3.5 text-start">{t('branch_email_lbl')}</th>
                <th className="p-3.5 text-start">{t('branch_phone_lbl')}</th>
                <th className="p-3.5 text-center">{t('user_role')}</th>
                <th className="p-3.5 text-center">{t('payment_status')}</th>
                <th className="p-3.5 text-end">{t('col_actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map(u => {
                const branch = branches.find(b => b.id === u.branchId);
                const localizedBranch = getLocalizedBranchName(branch);

                return (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3.5 font-bold text-slate-900 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-red-600 shrink-0" />
                      <span>{branch ? localizedBranch : t('role_super_admin')}</span>
                    </td>
                    <td className="p-3.5 font-medium text-slate-800">
                      {u.name}
                    </td>
                    <td className="p-3.5 font-mono text-slate-700">
                      {u.email}
                    </td>
                    <td className="p-3.5 font-mono text-slate-600">
                      {u.phone}
                    </td>
                    <td className="p-3.5 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        u.role === 'super_admin' 
                          ? 'bg-red-100 text-red-800 border border-red-200' 
                          : 'bg-blue-100 text-blue-800 border border-blue-200'
                      }`}>
                        {u.role === 'super_admin' ? t('role_super_admin') : t('role_branch_manager')}
                      </span>
                    </td>
                    <td className="p-3.5 text-center">
                      {u.passwordChangedByBranch ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          {t('private_password_set')}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                          {t('initial_password_status')}
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-end">
                      {isSuperAdmin && (
                        <button
                          onClick={() => handleOpenProvision(u)}
                          className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ms-auto"
                        >
                          <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                          <span>{t('btn_provision')}</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Admin Provision / Reset Credentials Modal */}
      {provisionUser && (() => {
        const branch = branches.find(b => b.id === provisionUser.branchId);

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
                      {getLocalizedBranchName(branch)} ({provisionUser.name})
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setProvisionUser(null)}
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
                    value={provisionUser.email}
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
                    onClick={handleCopy}
                    className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-600" />}
                    <span>{copied ? t('copied_btn') : t('copy_btn')}</span>
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

            {createdResult ? (
              <div className="mt-4 space-y-4">
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>{t('branch_added_successfully')}</span>
                  </div>
                  <p className="text-xs">
                    The new regional cargo hub is now active. All sub-branch contents, bilateral trade exchanges, booking manifests, and status controls are fully ready.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-900 text-white font-mono text-xs space-y-2.5">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <span className="text-amber-400 font-bold">🏢 Account Credentials</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {createdResult.branch.code}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Branch Name: </span>
                    <span className="font-bold text-white">{createdResult.branch.name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Province: </span>
                    <span>{createdResult.branch.province} ({createdResult.branch.city})</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Login Email: </span>
                    <span className="text-red-400 font-bold">{createdResult.user.email}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Temporary Password: </span>
                    <span className="text-emerald-400 font-bold">{createdResult.user.password}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      const text = `Rayan Cargo Login Credentials:\nBranch: ${createdResult.branch.name} (${createdResult.branch.code})\nEmail: ${createdResult.user.email}\nTemporary Password: ${createdResult.user.password}\n\nPlease sign in to Rayan Cargo and update your private password.`;
                      navigator.clipboard.writeText(text);
                      setCopiedNew(true);
                      setTimeout(() => setCopiedNew(false), 3000);
                    }}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    {copiedNew ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-600" />}
                    <span>{copiedNew ? t('copied_btn') : t('copy_btn')}</span>
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

                {/* City & Phone */}
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

                {/* Account Provisioning */}
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
