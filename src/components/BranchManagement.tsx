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
  Globe, 
  Trash2, 
  AlertTriangle, 
  ShieldAlert, 
  CreditCard,
  Edit3,
  LayoutGrid,
  List,
  AlertCircle,
  ExternalLink,
  FileSpreadsheet,
  Download,
  Database,
  X
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Branch, User } from '../types';
import { exportBranchesToCsv } from '../utils/exportUtils';

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
    shipments,
    currentUser, 
    setActiveBranchId, 
    setActiveView,
    resetBranchUserCredentials,
    addBranch,
    updateBranch,
    deleteBranch
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  
  // Password Provision Modal for Admin
  const [provisionBranch, setProvisionBranch] = useState<Branch | null>(null);
  const [tempPassword, setTempPassword] = useState('');
  const [copiedInfo, setCopiedInfo] = useState(false);
  const [provisionSuccess, setProvisionSuccess] = useState(false);

  // Edit Branch & Tazkira Modal state (Super Admin)
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    nameFa: '',
    namePs: '',
    code: '',
    province: '',
    city: '',
    address: '',
    phone: '',
    managerName: '',
    tazkiraNumber: ''
  });
  const [editTazkiraError, setEditTazkiraError] = useState('');

  // Delete Branch Confirmation Modal state
  const [branchToDelete, setBranchToDelete] = useState<Branch | null>(null);
  const [deleteConfirmCode, setDeleteConfirmCode] = useState('');

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
    tazkiraNumber: '',
    initialPassword: ''
  });
  const [addTazkiraError, setAddTazkiraError] = useState('');
  const [createdBranchResult, setCreatedBranchResult] = useState<{ branch: Branch; user: User } | null>(null);
  const [copiedNewCreds, setCopiedNewCreds] = useState(false);
  const [copiedTazkiraId, setCopiedTazkiraId] = useState<string | null>(null);

  // CSV Export state
  const [exportSuccessMessage, setExportSuccessMessage] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleExportCsv = () => {
    setIsExporting(true);
    const usersMap = new Map<string, any>();
    users.forEach(u => {
      if (u.branchId) usersMap.set(u.branchId, u);
    });

    const targetList = filteredBranches.length > 0 ? filteredBranches : branches;
    exportBranchesToCsv(targetList, usersMap);

    setIsExporting(false);
    setExportSuccessMessage(true);
    setTimeout(() => {
      setExportSuccessMessage(false);
    }, 4000);
  };

  const isSuperAdmin = currentUser.role === 'super_admin';

  // 13-Digit Standard Afghan Electronic Tazkira / National CNIC Validator
  const validateTazkira = (value: string) => {
    const cleanDigits = value.replace(/[\s-]/g, '');
    const digitsCount = cleanDigits.length;
    const isOnlyValidChars = /^[\d\s-]*$/.test(value);
    const isValid = isOnlyValidChars && digitsCount === 13 && /^\d{13}$/.test(cleanDigits);
    
    let message = '';
    if (!value.trim()) {
      message = t('err_tazkira_required') || 'Manager Tazkira or CNIC number is required.';
    } else if (!isOnlyValidChars || digitsCount !== 13) {
      message = t('err_tazkira_format') || 'CNIC / Tazkira number must contain exactly 13 digits (e.g. 1401-1234567-8 or 42101-1234567-1).';
    }

    return { isValid, digitsCount, cleanDigits, isOnlyValidChars, message };
  };

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
      b.code.toLowerCase().includes(q) ||
      (b.tazkiraNumber && b.tazkiraNumber.toLowerCase().includes(q)) ||
      (b.managerName && b.managerName.toLowerCase().includes(q));
  });

  const handleCopyTazkira = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTazkiraId(id);
    setTimeout(() => setCopiedTazkiraId(null), 2500);
  };

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
    const text = `Armaghan Sadeq Transfers Login Credentials:\nBranch: ${provisionBranch.name}\nEmail: ${branchUser?.email}\nTemporary Password: ${tempPassword}\n\nPlease sign in and immediately change your private password in the top bar.`;
    navigator.clipboard.writeText(text);
    setCopiedInfo(true);
    setTimeout(() => setCopiedInfo(false), 3000);
  };

  // Open Edit Branch Modal (Super Admin)
  const handleOpenEditModal = (branch: Branch) => {
    const branchUser = users.find(u => u.branchId === branch.id);
    setEditingBranch(branch);
    setEditFormData({
      name: branch.name,
      nameFa: branch.nameFa || '',
      namePs: branch.namePs || '',
      code: branch.code,
      province: branch.province,
      city: branch.city,
      address: branch.address,
      phone: branch.phone,
      managerName: branchUser?.name || branch.managerName || '',
      tazkiraNumber: branch.tazkiraNumber || ''
    });
    setEditTazkiraError('');
  };

  const handleSaveEditBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBranch) return;

    // Validate 13-digit CNIC / Tazkira
    const tazkiraVal = validateTazkira(editFormData.tazkiraNumber);
    if (!tazkiraVal.isValid) {
      setEditTazkiraError(tazkiraVal.message);
      return;
    }

    updateBranch(editingBranch.id, {
      name: editFormData.name.trim(),
      nameFa: editFormData.nameFa.trim() || editFormData.name.trim(),
      namePs: editFormData.namePs.trim() || editFormData.name.trim(),
      code: editFormData.code.trim().toUpperCase(),
      province: editFormData.province.trim(),
      city: editFormData.city.trim(),
      address: editFormData.address.trim(),
      phone: editFormData.phone.trim(),
      managerName: editFormData.managerName.trim(),
      tazkiraNumber: editFormData.tazkiraNumber.trim()
    });

    setEditingBranch(null);
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
      tazkiraNumber: '',
      initialPassword: ''
    });
    setAddTazkiraError('');
    setCreatedBranchResult(null);
    setCopiedNewCreds(false);
    setIsAddBranchOpen(true);
  };

  const handleProvinceChange = (prov: string) => {
    const defaultCity = `${prov} City`;
    const suggestedCode = `${prov.slice(0, 3).toUpperCase()}-0${branches.length + 1}`;
    const cleanProv = prov.toLowerCase().replace(/[^a-z0-9]/g, '');
    const suggestedEmail = `${cleanProv}@armaghansadeq.af`;
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
    
    // Strict 13-digit CNIC / Tazkira format validation
    const tazkiraVal = validateTazkira(newBranchData.tazkiraNumber);
    if (!tazkiraVal.isValid) {
      setAddTazkiraError(tazkiraVal.message);
      return;
    }

    if (
      !newBranchData.name.trim() || 
      !newBranchData.code.trim() || 
      !newBranchData.email.trim()
    ) {
      return;
    }

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
      tazkiraNumber: newBranchData.tazkiraNumber.trim(),
      initialPassword: newBranchData.initialPassword || `${newBranchData.code.toLowerCase().replace(/[^a-z0-9]/g, '')}123`
    });

    setCreatedBranchResult(result);
  };

  const handleCopyNewBranchCreds = () => {
    if (!createdBranchResult) return;
    const text = `Armaghan Sadeq Transfers Login Credentials (New Hub):\nBranch: ${createdBranchResult.branch.name} (${createdBranchResult.branch.code})\nEmail: ${createdBranchResult.user.email}\nManager Tazkira / CNIC: ${createdBranchResult.branch.tazkiraNumber}\nTemporary Password: ${createdBranchResult.user.password}\n\nPlease sign in to Armaghan Sadeq Transfers and update your private password.`;
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
          {/* Export to Excel / CSV Button */}
          <button
            onClick={handleExportCsv}
            disabled={isExporting || branches.length === 0}
            className="px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center gap-2 transition-all transform active:scale-98 cursor-pointer disabled:opacity-50"
            title={t('btn_export_csv_desc') || 'Export branch records and 13-digit Tazkira credentials to Excel CSV'}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{t('btn_export_csv') || 'Export to Excel / CSV'}</span>
          </button>

          {/* Privacy badge */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-700 font-semibold">
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

      {/* Export Success Notification Banner */}
      {exportSuccessMessage && (
        <div className="p-4 rounded-2xl bg-emerald-600 text-white text-xs font-bold flex items-center justify-between shadow-lg shadow-emerald-600/20 animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-200 shrink-0" />
            <div>
              <div className="text-sm font-extrabold">{t('export_csv_success') || 'Branch directory exported successfully!'}</div>
              <p className="text-[11px] font-normal text-emerald-100 mt-0.5">
                Includes all 13-digit verified Tazkira ID numbers, manager contacts, and terminal coordinates in UTF-8 formatted CSV.
              </p>
            </div>
          </div>
          <button 
            onClick={() => setExportSuccessMessage(false)}
            className="p-1.5 rounded-lg bg-emerald-700/60 hover:bg-emerald-700 text-emerald-100 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

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

      {/* Controls: Search Filter & View Mode Switcher */}
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

        <div className="flex items-center gap-3">
          {/* View Switcher: Table List vs Cards Grid */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white text-red-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title={t('view_mode_table') || 'Detailed List View'}
            >
              <List className="w-3.5 h-3.5" />
              <span>{t('view_mode_table') || 'List View'}</span>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white text-red-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title={t('view_mode_cards') || 'Cards View'}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>{t('view_mode_cards') || 'Cards View'}</span>
            </button>
          </div>

          <div className="text-xs font-bold text-slate-500 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{branches.length} {t('online_terminals_badge')}</span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {filteredBranches.length === 0 ? (
        <div className="p-12 rounded-2xl border-2 border-dashed border-slate-200 bg-white text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
            <Building2 className="w-7 h-7" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-base font-extrabold text-slate-900">{t('no_branches_found')}</h3>
            <p className="text-xs text-slate-500">
              {t('no_records_found')}
            </p>
          </div>
          {isSuperAdmin && (
            <button
              onClick={handleOpenAddBranch}
              className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-600/20 inline-flex items-center gap-2 cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>{t('btn_add_branch') || 'Add Branch'}</span>
            </button>
          )}
        </div>
      ) : viewMode === 'table' ? (
        /* Detailed List / Table View with dedicated 'Details' column */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-3.5 px-4">{t('col_branch') || 'Branch Terminal'}</th>
                  <th className="py-3.5 px-4">{t('col_location') || 'Location & Phone'}</th>
                  <th className="py-3.5 px-4">{t('col_manager') || 'Branch Officer'}</th>
                  <th className="py-3.5 px-4 bg-red-50/40 text-red-900 font-extrabold border-x border-red-100">
                    <div className="flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-red-600" />
                      <span>{t('col_details_tazkira') || 'Details (CNIC / Tazkira)'}</span>
                    </div>
                  </th>
                  <th className="py-3.5 px-4">{t('col_operations') || 'Shipments & Activity'}</th>
                  <th className="py-3.5 px-4 text-center">{t('col_actions') || 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBranches.map((branch) => {
                  const branchUser = users.find(u => u.branchId === branch.id);
                  const localizedName = getLocalizedBranchName(branch);
                  const cleanDigits = (branch.tazkiraNumber || '').replace(/[\s-]/g, '');
                  const is13Digits = cleanDigits.length === 13 && /^\d{13}$/.test(cleanDigits);

                  return (
                    <tr key={branch.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Branch Name & Code */}
                      <td className="py-4 px-4 align-middle">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                            branch.isHeadOffice 
                              ? 'bg-amber-100 text-amber-800 border border-amber-300' 
                              : 'bg-red-50 text-red-700 border border-red-200'
                          }`}>
                            <Building2 className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-xs flex items-center gap-2">
                              <span>{localizedName}</span>
                              {branch.isHeadOffice && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 font-bold border border-amber-200">
                                  Head Office
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                {branch.code}
                              </span>
                              {branch.name !== localizedName && (
                                <span className="text-[11px] text-slate-400 font-medium truncate max-w-[140px]">
                                  {branch.name}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Location & Phone */}
                      <td className="py-4 px-4 align-middle">
                        <div className="space-y-1">
                          <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                            <span>{branch.city}, {branch.province}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1.5">
                            <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{branch.phone}</span>
                          </div>
                        </div>
                      </td>

                      {/* Branch Officer & Email */}
                      <td className="py-4 px-4 align-middle">
                        <div className="space-y-1">
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <UserIcon className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            <span>{branchUser?.name || branch.managerName || 'Assigned Manager'}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1.5">
                            <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[180px]">{branchUser?.email || branch.email}</span>
                          </div>
                        </div>
                      </td>

                      {/* Details Column: CNIC / Tazkira ID */}
                      <td className="py-4 px-4 align-middle bg-red-50/20 border-x border-red-100/60">
                        {branch.tazkiraNumber ? (
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-xs font-black text-slate-900 bg-white px-2 py-1 rounded-lg border border-slate-300 shadow-2xs">
                                {branch.tazkiraNumber}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopyTazkira(branch.id, branch.tazkiraNumber)}
                                className="p-1 rounded-md bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 transition-colors cursor-pointer"
                                title="Copy CNIC / Tazkira Number"
                              >
                                {copiedTazkiraId === branch.id ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                            <div>
                              {is13Digits ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  <span>{t('tazkira_valid_badge') || '13-Digit Verified'}</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                                  <AlertTriangle className="w-3 h-3 text-amber-600" />
                                  <span>{cleanDigits.length} / 13 Digits</span>
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
                              <AlertCircle className="w-3 h-3 text-rose-600" />
                              <span>{t('not_provided')}</span>
                            </span>
                            {isSuperAdmin && (
                              <button
                                onClick={() => handleOpenEditModal(branch)}
                                className="block text-[11px] text-red-600 hover:text-red-700 font-bold underline cursor-pointer"
                              >
                                + Add Tazkira ID
                              </button>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Operations / Activity */}
                      <td className="py-4 px-4 align-middle">
                        <div className="space-y-1 text-[11px]">
                          <div className="flex items-center justify-between gap-3 text-slate-600">
                            <span>{t('dispatched_label')}:</span>
                            <span className="font-bold font-mono text-slate-900">{branch.totalParcelsDispatched || 0}</span>
                          </div>
                          <div className="flex items-center justify-between gap-3 text-slate-600">
                            <span>{t('received_label')}:</span>
                            <span className="font-bold font-mono text-slate-900">{branch.totalParcelsReceived || 0}</span>
                          </div>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 align-middle text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* View Parcels */}
                          <button
                            onClick={() => {
                              setActiveBranchId(branch.id);
                              setActiveView('parcels');
                            }}
                            className="p-1.5 rounded-lg text-slate-700 hover:text-red-600 hover:bg-red-50 border border-slate-200 transition-colors cursor-pointer"
                            title={t('view_shipments_btn')}
                          >
                            <Boxes className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit Details & Tazkira for Super Admin */}
                          {isSuperAdmin && (
                            <button
                              onClick={() => handleOpenEditModal(branch)}
                              className="p-1.5 rounded-lg text-blue-700 hover:bg-blue-50 border border-blue-200 transition-colors cursor-pointer"
                              title={t('btn_edit_branch') || 'Edit Details & Tazkira'}
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Credentials Modal */}
                          {isSuperAdmin && (
                            <button
                              onClick={() => handleOpenProvisionModal(branch)}
                              className="p-1.5 rounded-lg text-amber-700 hover:bg-amber-50 border border-amber-200 transition-colors cursor-pointer"
                              title={t('credentials_modal_title')}
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Delete */}
                          {isSuperAdmin && !branch.isHeadOffice && (
                            <button
                              onClick={() => {
                                setBranchToDelete(branch);
                                setDeleteConfirmCode('');
                              }}
                              className="p-1.5 rounded-lg text-rose-700 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer"
                              title={t('delete_branch_btn')}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Grid Cards View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredBranches.map((branch) => {
            const branchUser = users.find(u => u.branchId === branch.id);
            const localizedName = getLocalizedBranchName(branch);
            const cleanDigits = (branch.tazkiraNumber || '').replace(/[\s-]/g, '');
            const is13Digits = cleanDigits.length === 13 && /^\d{13}$/.test(cleanDigits);

            return (
              <div
                key={branch.id}
                className="rounded-2xl border border-slate-200 bg-white shadow-xs p-5 space-y-4 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* Top Title & Code */}
                  <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100">
                    <div>
                      <div className="font-black text-base text-slate-900 flex items-center gap-2">
                        <span>{localizedName}</span>
                        {branch.isHeadOffice && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 font-bold border border-amber-200">
                            HQ
                          </span>
                        )}
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

                  {/* Account & Details Box */}
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

                    {/* Prominent CNIC / Tazkira ID */}
                    <div className="pt-2 border-t border-slate-200/70 space-y-1">
                      <div className="text-[11px] text-slate-600 flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-slate-500 font-sans">
                          <CreditCard className="w-3.5 h-3.5 text-red-500 shrink-0" />
                          <span>{t('tazkira_cnic_label') || 'CNIC / Tazkira'}:</span>
                        </span>
                        {branch.tazkiraNumber && (
                          <button
                            type="button"
                            onClick={() => handleCopyTazkira(branch.id, branch.tazkiraNumber)}
                            className="text-[10px] text-slate-500 hover:text-slate-900 font-mono flex items-center gap-1 cursor-pointer"
                          >
                            {copiedTazkiraId === branch.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedTazkiraId === branch.id ? 'Copied' : 'Copy'}</span>
                          </button>
                        )}
                      </div>

                      {branch.tazkiraNumber ? (
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                            {branch.tazkiraNumber}
                          </span>
                          {is13Digits ? (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                              13 Digits ✓
                            </span>
                          ) : (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">
                              {cleanDigits.length}/13
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="text-[10px] text-rose-600 font-bold">
                          Not Registered
                        </div>
                      )}
                    </div>

                    <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1 pt-1">
                      <Mail className="w-3 h-3 text-slate-400" />
                      <span className="truncate">{branchUser?.email || branch.email}</span>
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
                    <>
                      {/* Edit Details & Tazkira Modal Trigger */}
                      <button
                        onClick={() => handleOpenEditModal(branch)}
                        className="p-2 rounded-xl text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 flex items-center justify-center transition-colors cursor-pointer"
                        title={t('btn_edit_branch') || 'Edit Details & Tazkira'}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleOpenProvisionModal(branch)}
                        className="py-2 px-2.5 rounded-xl text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1 transition-colors cursor-pointer"
                        title={t('credentials_modal_title')}
                      >
                        <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                      </button>

                      {!branch.isHeadOffice && (
                        <button
                          onClick={() => {
                            setBranchToDelete(branch);
                            setDeleteConfirmCode('');
                          }}
                          className="p-2 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 flex items-center justify-center transition-colors cursor-pointer"
                          title={t('delete_branch_btn')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Super Admin: Edit Branch & Tazkira Credentials Modal */}
      {editingBranch && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 p-6 animate-in fade-in zoom-in-95 my-8">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    {t('modal_edit_branch_title') || 'Edit Branch & Identity Credentials'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {t('modal_edit_branch_desc') || 'Modify provincial terminal details, Tazkira/CNIC ID, and contact info.'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingBranch(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-base cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditBranch} className="mt-4 space-y-3.5 text-xs">
              
              {/* Province & Code */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    {t('branch_province_lbl')} *
                  </label>
                  <select
                    value={editFormData.province}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, province: e.target.value }))}
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
                    value={editFormData.code}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono font-bold focus:ring-2 focus:ring-red-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Names in Languages */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  {t('branch_name_en_lbl')} *
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
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
                    value={editFormData.nameFa}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, nameFa: e.target.value }))}
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
                    value={editFormData.namePs}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, namePs: e.target.value }))}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-red-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* CNIC / Tazkira 13-Digit Highlight Section */}
              <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-slate-900 font-black text-xs flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-amber-700" />
                    <span>{t('branch_tazkira_lbl') || 'Manager CNIC / Tazkira Number *'}</span>
                  </label>
                  {(() => {
                    const check = validateTazkira(editFormData.tazkiraNumber);
                    return (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        check.isValid 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {check.digitsCount}/13 Digits
                      </span>
                    );
                  })()}
                </div>

                <input
                  type="text"
                  required
                  value={editFormData.tazkiraNumber}
                  onChange={(e) => {
                    setEditFormData(prev => ({ ...prev, tazkiraNumber: e.target.value }));
                    if (editTazkiraError) setEditTazkiraError('');
                  }}
                  placeholder={t('branch_tazkira_placeholder') || 'e.g. 1401-1234-56789 or 42101-1234567-1'}
                  className={`w-full h-10 px-3 bg-white border rounded-xl text-slate-900 font-mono font-bold focus:ring-2 focus:outline-none ${
                    editTazkiraError ? 'border-rose-400 focus:ring-rose-500' : 'border-slate-300 focus:ring-amber-500'
                  }`}
                />

                {editTazkiraError && (
                  <p className="text-[11px] text-rose-600 font-bold flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{editTazkiraError}</span>
                  </p>
                )}

                <p className="text-[10px] text-slate-500 leading-tight">
                  {t('tazkira_format_hint')?.replace('{count}', String(editFormData.tazkiraNumber.replace(/[\s-]/g, '').length)) || 'Standard 13-digit Afghan Electronic Tazkira or National CNIC identity card number.'}
                </p>
              </div>

              {/* Manager Name & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    {t('branch_manager_lbl')} *
                  </label>
                  <input
                    type="text"
                    required
                    value={editFormData.managerName}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, managerName: e.target.value }))}
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
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono focus:ring-2 focus:ring-red-500 focus:outline-none"
                  />
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
                    value={editFormData.city}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, city: e.target.value }))}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-red-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    {t('branch_address_lbl')} *
                  </label>
                  <input
                    type="text"
                    required
                    value={editFormData.address}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, address: e.target.value }))}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-red-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingBranch(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer"
                >
                  {t('close_button')}
                </button>

                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold shadow-md shadow-red-600/20 transition-all cursor-pointer"
                >
                  {t('btn_save_branch_changes') || 'Save Changes'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

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
                    {t('branch_provision_subtitle')}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-900 text-white font-mono text-xs space-y-2.5">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <span className="text-amber-400 font-bold">🏢 {t('credentials_modal_title')}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {createdBranchResult.branch.code}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">{t('branch_lbl')}: </span>
                    <span className="font-bold text-white">{createdBranchResult.branch.name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">{t('branch_province_lbl')}: </span>
                    <span>{createdBranchResult.branch.province} ({createdBranchResult.branch.city})</span>
                  </div>
                  <div>
                    <span className="text-slate-400">{t('login_email_lbl')}: </span>
                    <span className="text-red-400 font-bold">{createdBranchResult.user.email}</span>
                  </div>
                  {createdBranchResult.branch.tazkiraNumber && (
                    <div>
                      <span className="text-slate-400">{t('tazkira_cnic_label') || 'CNIC / Tazkira'}: </span>
                      <span className="text-amber-400 font-bold">{createdBranchResult.branch.tazkiraNumber}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-slate-400">{t('branch_initial_pass_lbl')}: </span>
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

                {/* Dedicated Account Login Provisioning & 13-Digit Tazkira */}
                <div className="p-3.5 rounded-xl bg-red-50/70 border border-red-200 space-y-3">
                  <div className="text-[11px] font-bold text-red-900 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-red-600" />
                    <span>{t('single_role_architecture')}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
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
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-slate-700 font-bold text-[11px]">
                          {t('branch_tazkira_lbl') || 'Manager CNIC / Tazkira Number *'}
                        </label>
                        {(() => {
                          const check = validateTazkira(newBranchData.tazkiraNumber);
                          return (
                            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                              check.isValid 
                                ? 'bg-emerald-100 text-emerald-800' 
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {check.digitsCount}/13
                            </span>
                          );
                        })()}
                      </div>
                      <input
                        type="text"
                        required
                        value={newBranchData.tazkiraNumber}
                        onChange={(e) => {
                          setNewBranchData(prev => ({ ...prev, tazkiraNumber: e.target.value }));
                          if (addTazkiraError) setAddTazkiraError('');
                        }}
                        placeholder={t('branch_tazkira_placeholder') || 'e.g. 1401-1234-56789 or 42101-1234567-1'}
                        className={`w-full h-9 px-2.5 bg-white border rounded-lg text-slate-900 font-mono focus:ring-2 focus:outline-none ${
                          addTazkiraError ? 'border-rose-400 focus:ring-rose-500' : 'border-slate-300 focus:ring-red-500'
                        }`}
                      />
                    </div>
                  </div>

                  {/* 13-Digit Error message if invalid */}
                  {addTazkiraError && (
                    <div className="p-2.5 rounded-lg bg-rose-100 border border-rose-200 text-rose-800 text-[11px] font-bold flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{addTazkiraError}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1 text-[11px]">
                        {t('branch_email_lbl')} *
                      </label>
                      <input
                        type="email"
                        required
                        value={newBranchData.email}
                        onChange={(e) => setNewBranchData(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="e.g. ghazni@armaghansadeq.af"
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

      {/* Admin Delete Branch Confirmation Modal */}
      {branchToDelete && (() => {
        const branchUser = users.find(u => u.branchId === branchToDelete.id);
        const relatedShipmentsCount = shipments.filter(s => 
          s.originBranchId === branchToDelete.id || 
          s.destinationBranchId === branchToDelete.id ||
          s.currentBranchId === branchToDelete.id
        ).length;
        const isCodeMatched = deleteConfirmCode.trim().toUpperCase() === branchToDelete.code.toUpperCase();

        return (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-6 animate-in fade-in zoom-in-95 space-y-4">
              
              {/* Header */}
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5 text-rose-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-900">
                      {t('confirm_delete_branch_title')}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {t('confirm_delete_branch_desc')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setBranchToDelete(null);
                    setDeleteConfirmCode('');
                  }}
                  className="text-slate-400 hover:text-slate-600 font-bold p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Target Branch Summary Card */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-black text-sm text-slate-900">
                    {getLocalizedBranchName(branchToDelete)}
                  </div>
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-red-100 text-red-800 border border-red-200">
                    {branchToDelete.code}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-1">
                  <div>
                    <span className="text-slate-400 block text-[10px] font-bold">{t('branch_province_lbl')}</span>
                    <span className="font-semibold text-slate-800">{branchToDelete.province} ({branchToDelete.city})</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] font-bold">{t('assigned_branch')}</span>
                    <span className="font-semibold text-slate-800">{branchUser?.name || branchToDelete.managerName || 'Manager'}</span>
                  </div>
                </div>

                {relatedShipmentsCount > 0 && (
                  <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-600">
                    <span>{t('active_parcels_warning')}:</span>
                    <span className="font-bold text-slate-900 px-2 py-0.5 rounded bg-slate-200">{relatedShipmentsCount}</span>
                  </div>
                )}
              </div>

              {/* Warning Notice */}
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-amber-950">
                  <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{t('confirm_delete_branch_title')}</span>
                </div>
                <p className="text-amber-800 text-[11px] leading-relaxed">
                  {t('confirm_delete_branch_warning')}
                </p>
              </div>

              {/* Code Verification Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  {t('confirm_delete_type_prompt')}{' '}
                  <span className="font-mono text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                    {branchToDelete.code}
                  </span>
                </label>
                <input
                  type="text"
                  value={deleteConfirmCode}
                  onChange={(e) => setDeleteConfirmCode(e.target.value)}
                  placeholder={branchToDelete.code}
                  className="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono uppercase focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setBranchToDelete(null);
                    setDeleteConfirmCode('');
                  }}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  {t('btn_cancel_delete_branch')}
                </button>

                <button
                  type="button"
                  disabled={!isCodeMatched}
                  onClick={() => {
                    if (isCodeMatched) {
                      deleteBranch(branchToDelete.id);
                      setBranchToDelete(null);
                      setDeleteConfirmCode('');
                    }
                  }}
                  className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold shadow-md shadow-rose-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{t('btn_confirm_delete_branch')}</span>
                </button>
              </div>

            </div>
          </div>
        );
      })()}

    </div>
  );
};
