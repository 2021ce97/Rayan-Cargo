import React, { useState, useMemo, useRef } from 'react';
import { 
  ArrowRightLeft, 
  DollarSign, 
  Building2, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Search, 
  Filter, 
  FileText, 
  Plus, 
  X, 
  Send, 
  Check, 
  Printer, 
  Eye, 
  ShieldCheck, 
  Banknote, 
  Receipt,
  Download,
  Boxes,
  HelpCircle,
  Inbox
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { BranchRemittanceTransfer, Shipment } from '../types';
import { printElementUsingIframe } from '../utils/pdfExport';

type RemittanceTab = 'pending_deliveries' | 'transfers_submitted' | 'settled_history';

export const RemittanceManager: React.FC = () => {
  const { 
    t, 
    language,
    currentUser, 
    branches, 
    shipments, 
    remittanceTransfers,
    createBatchRemittance,
    confirmRemittanceByHeadOffice,
    rejectRemittanceByHeadOffice,
    branchOwedToHeadOffice,
    branchEarnedCommissions,
    headOfficePendingRemittancesTotal,
    headOfficeSettledRevenueTotal,
    activeBranchId,
    setActiveBranchId
  } = useApp();

  const isSuperAdmin = currentUser.role === 'super_admin';
  const currentBranchId = isSuperAdmin ? (activeBranchId === 'all' ? 'all' : activeBranchId) : currentUser.branchId;
  const currentBranch = branches.find(b => b.id === currentBranchId);
  const mainBranch = branches.find(b => b.isHeadOffice) || branches[0];

  const [activeTab, setActiveTab] = useState<RemittanceTab>(
    isSuperAdmin ? 'transfers_submitted' : 'pending_deliveries'
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>('all');

  // Remit submission modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedParcelIds, setSelectedParcelIds] = useState<string[]>([]);
  const [customTotalCollected, setCustomTotalCollected] = useState<number>(100);
  const [customCommission, setCustomCommission] = useState<number>(30);
  const [customNetToHq, setCustomNetToHq] = useState<number>(70);
  const [paymentMethod, setPaymentMethod] = useState<'hawala' | 'bank_transfer' | 'cash_handover' | 'treasury'>('hawala');
  const [refNumber, setRefNumber] = useState('');
  const [agentName, setAgentName] = useState('');
  const [notes, setNotes] = useState('');

  // Confirmation modal state (Super Admin)
  const [confirmModalTransfer, setConfirmModalTransfer] = useState<BranchRemittanceTransfer | null>(null);
  const [confirmationNote, setConfirmationNote] = useState('');

  // Rejection modal state
  const [rejectModalTransfer, setRejectModalTransfer] = useState<BranchRemittanceTransfer | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // View detail modal state
  const [viewDetailTransfer, setViewDetailTransfer] = useState<BranchRemittanceTransfer | null>(null);
  const printableVoucherRef = useRef<HTMLDivElement>(null);

  // Filter delivered shipments that have collected money and are pending remittance to HQ
  const pendingDeliveredShipments = useMemo(() => {
    return shipments.filter(s => {
      const isTargetDest = isSuperAdmin 
        ? (selectedBranchFilter === 'all' ? true : s.destinationBranchId === selectedBranchFilter)
        : (s.destinationBranchId === currentBranchId);
      
      const isDelivered = s.status === 'delivered';
      const isPendingRemittance = s.remittanceStatus === 'pending' || !s.remittanceStatus;

      return isTargetDest && isDelivered && isPendingRemittance;
    });
  }, [shipments, isSuperAdmin, selectedBranchFilter, currentBranchId]);

  // Filter transfers
  const filteredTransfers = useMemo(() => {
    return remittanceTransfers.filter(r => {
      const query = searchTerm.toLowerCase().trim();
      const matchesSearch = !query || 
        r.batchNumber.toLowerCase().includes(query) ||
        r.fromBranchName.toLowerCase().includes(query) ||
        (r.referenceNumber && r.referenceNumber.toLowerCase().includes(query)) ||
        (r.transferAgentName && r.transferAgentName.toLowerCase().includes(query));

      const matchesBranch = isSuperAdmin 
        ? (selectedBranchFilter === 'all' || r.fromBranchId === selectedBranchFilter)
        : (r.fromBranchId === currentBranchId);

      const matchesTab = activeTab === 'transfers_submitted' 
        ? (r.status === 'submitted_to_headoffice')
        : (r.status === 'confirmed_by_headoffice' || r.status === 'rejected');

      return matchesSearch && matchesBranch && matchesTab;
    });
  }, [remittanceTransfers, searchTerm, isSuperAdmin, selectedBranchFilter, currentBranchId, activeTab]);

  // Open modal for single or batch
  const handleOpenRemitModal = (parcels: Shipment[]) => {
    if (parcels.length === 0) return;
    const ids = parcels.map(p => p.id);
    setSelectedParcelIds(ids);

    const totalColl = parcels.reduce((sum, p) => sum + (p.financials?.totalAmount || 0), 0);
    const totalComm = parcels.reduce((sum, p) => {
      const comm = p.destBranchCommission !== undefined ? p.destBranchCommission : (p.financials?.destBranchCommission || 100);
      return sum + comm;
    }, 0);
    const net = Math.max(0, totalColl - totalComm);

    setCustomTotalCollected(totalColl);
    setCustomCommission(totalComm);
    setCustomNetToHq(net);
    setRefNumber(`HAW-${Math.floor(100000 + Math.random() * 900000)}`);
    setAgentName('Sarafi Khorasan / Kabul Central');
    setNotes(`Remittance from ${currentBranch?.name || 'Branch'} to Main Branch Head Office.`);
    setIsCreateModalOpen(true);
  };

  // When custom commission or total collected changes, recompute net to HQ
  const handleCommissionChange = (newComm: number) => {
    setCustomCommission(newComm);
    setCustomNetToHq(Math.max(0, customTotalCollected - newComm));
  };

  const handleTotalCollectedChange = (newTotal: number) => {
    setCustomTotalCollected(newTotal);
    setCustomNetToHq(Math.max(0, newTotal - customCommission));
  };

  // Submit Remittance
  const handleSubmitRemittance = () => {
    if (selectedParcelIds.length === 0 && !customTotalCollected) return;

    const fromBr = isSuperAdmin ? (selectedBranchFilter !== 'all' ? selectedBranchFilter : branches[1]?.id || 'br_kbl') : (currentUser.branchId || 'br_kbl');

    createBatchRemittance(
      selectedParcelIds,
      fromBr,
      customTotalCollected,
      customCommission,
      customNetToHq,
      paymentMethod,
      refNumber,
      agentName,
      notes
    );

    setIsCreateModalOpen(false);
    setSelectedParcelIds([]);
    setActiveTab('transfers_submitted');
  };

  // Confirm Remittance (Super Admin)
  const handleConfirmSubmit = () => {
    if (!confirmModalTransfer) return;
    confirmRemittanceByHeadOffice(confirmModalTransfer.id, confirmationNote);
    setConfirmModalTransfer(null);
    setConfirmationNote('');
  };

  // Reject Remittance (Super Admin)
  const handleRejectSubmit = () => {
    if (!rejectModalTransfer || !rejectionReason.trim()) return;
    rejectRemittanceByHeadOffice(rejectModalTransfer.id, rejectionReason);
    setRejectModalTransfer(null);
    setRejectionReason('');
  };

  // Print voucher
  const handlePrintVoucher = () => {
    if (printableVoucherRef.current) {
      printElementUsingIframe(printableVoucherRef.current, `Remittance_${viewDetailTransfer?.batchNumber || 'Voucher'}`);
    } else {
      window.print();
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 font-sans" id="remittance-manager-root">
      
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>Branch Remittances & Commission System</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold border border-amber-300 dark:border-amber-800">
                  سیستم حسابداری و انتقال عواید شعب
                </span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Branches submit delivered parcels, deduct commission, and remit balance to Main Branch with Head Office receipt confirmation.
              </p>
            </div>
          </div>
        </div>

        {/* Action Button */}
        {!isSuperAdmin && (
          <button
            onClick={() => handleOpenRemitModal(pendingDeliveredShipments)}
            disabled={pendingDeliveredShipments.length === 0}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer ${
              pendingDeliveredShipments.length > 0
                ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-200 dark:border-slate-700'
            }`}
          >
            <Send className="w-4 h-4" />
            <span>Remit All Delivered ({pendingDeliveredShipments.length})</span>
          </button>
        )}

        {isSuperAdmin && (
          <button
            onClick={() => {
              setSelectedParcelIds([]);
              setCustomTotalCollected(100);
              setCustomCommission(30);
              setCustomNetToHq(70);
              setRefNumber(`HAW-${Math.floor(100000 + Math.random() * 900000)}`);
              setAgentName('Sarafi Central');
              setIsCreateModalOpen(true);
            }}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-amber-600 dark:hover:bg-amber-700 font-bold rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Test Remittance Transfer</span>
          </button>
        )}
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isSuperAdmin ? (
          <>
            {/* HQ Stat 1: Pending Receipts from Branches */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800/60 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-amber-700 dark:text-amber-400">
                <span>Pending Confirmation (Awaiting HQ)</span>
                <Clock className="w-4 h-4" />
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {headOfficePendingRemittancesTotal.toLocaleString()} <span className="text-xs font-normal text-slate-500">AFN</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {remittanceTransfers.filter(r => r.status === 'submitted_to_headoffice').length} transfers submitted by branches
              </p>
            </div>

            {/* HQ Stat 2: Confirmed Main Branch Revenue */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800/60 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-700 dark:text-emerald-400">
                <span>Confirmed Main Branch Revenue</span>
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {headOfficeSettledRevenueTotal.toLocaleString()} <span className="text-xs font-normal text-slate-500">AFN</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Verified & deposited at Central Admin HQ
              </p>
            </div>

            {/* HQ Stat 3: Branch Retained Commissions */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800/60 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-blue-700 dark:text-blue-400">
                <span>Branch Retained Commissions</span>
                <DollarSign className="w-4 h-4" />
              </div>
              <div className="text-2xl font-black text-blue-600 dark:text-blue-400">
                {remittanceTransfers.filter(r => r.status === 'confirmed_by_headoffice').reduce((sum, r) => sum + r.totalCommissionKeptAfn, 0).toLocaleString()} <span className="text-xs font-normal text-slate-500">AFN</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Paid out to handling destination hubs
              </p>
            </div>

            {/* HQ Stat 4: Total Provincial Hubs Connected */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                <span>Active Branch Terminals</span>
                <Building2 className="w-4 h-4 text-red-600" />
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {branches.length} <span className="text-xs font-normal text-slate-500">Hubs</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Full bi-directional clearing network
              </p>
            </div>
          </>
        ) : (
          <>
            {/* Branch Stat 1: Ready to Remit to HQ */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-amber-700 dark:text-amber-400">
                <span>Owed to Main Branch (بدهی در انتظار ارسال)</span>
                <Banknote className="w-4 h-4" />
              </div>
              <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
                {branchOwedToHeadOffice.toLocaleString()} <span className="text-xs font-normal text-slate-500">AFN</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {pendingDeliveredShipments.length} parcels delivered & collected
              </p>
            </div>

            {/* Branch Stat 2: My Earned Commissions */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-800 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-700 dark:text-emerald-400">
                <span>My Earned Commission (کمیشن شعبه)</span>
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {branchEarnedCommissions.toLocaleString()} <span className="text-xs font-normal text-slate-500">AFN</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Retained income from handled deliveries
              </p>
            </div>

            {/* Branch Stat 3: Submitted to HQ (In Review) */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-blue-700 dark:text-blue-400">
                <span>Submitted to HQ (در انتظار تأیید مرکز)</span>
                <Clock className="w-4 h-4" />
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {remittanceTransfers.filter(r => r.fromBranchId === currentBranchId && r.status === 'submitted_to_headoffice').reduce((sum, r) => sum + r.netRemittanceAmountAfn, 0).toLocaleString()} <span className="text-xs font-normal text-slate-500">AFN</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {remittanceTransfers.filter(r => r.fromBranchId === currentBranchId && r.status === 'submitted_to_headoffice').length} transfers sent to Kabul HQ
              </p>
            </div>

            {/* Branch Stat 4: Settled & Cleared by HQ */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                <span>Settled with HQ (تأیید شده نهایی)</span>
                <Receipt className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {remittanceTransfers.filter(r => r.fromBranchId === currentBranchId && r.status === 'confirmed_by_headoffice').reduce((sum, r) => sum + r.netRemittanceAmountAfn, 0).toLocaleString()} <span className="text-xs font-normal text-slate-500">AFN</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Audited & archived transfers
              </p>
            </div>
          </>
        )}
      </div>

      {/* TABS & SEARCH BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="inline-flex p-1 rounded-xl bg-slate-200/80 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold flex-wrap gap-1">
          <button
            onClick={() => setActiveTab('pending_deliveries')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'pending_deliveries'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Banknote className="w-3.5 h-3.5 text-amber-500" />
            <span>1. Pending Parcel Collections ({pendingDeliveredShipments.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('transfers_submitted')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'transfers_submitted'
                ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>2. Awaiting HQ Confirmation ({remittanceTransfers.filter(r => r.status === 'submitted_to_headoffice').length})</span>
          </button>

          <button
            onClick={() => setActiveTab('settled_history')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'settled_history'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>3. Confirmed & Settled Transfers ({remittanceTransfers.filter(r => r.status === 'confirmed_by_headoffice').length})</span>
          </button>
        </div>

        {/* Branch Filter for Admin */}
        {isSuperAdmin && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Filter Branch:</span>
            <select
              value={selectedBranchFilter}
              onChange={(e) => setSelectedBranchFilter(e.target.value)}
              className="h-9 px-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
            >
              <option value="all">All Provincial Hubs</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name} ({b.city})</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* TAB CONTENT 1: PENDING PARCEL COLLECTIONS */}
      {activeTab === 'pending_deliveries' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-black text-slate-900 dark:text-white">
                Delivered Parcels with Collected Funds (دریافت پول از گیرنده و کسر کمیشن)
              </h2>
              <p className="text-xs text-slate-500">
                Select one or more delivered consignments to submit commission deduction and transfer remaining funds to Main Branch.
              </p>
            </div>

            {pendingDeliveredShipments.length > 0 && (
              <button
                onClick={() => handleOpenRemitModal(pendingDeliveredShipments)}
                className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Remit All {pendingDeliveredShipments.length} Parcels Together</span>
              </button>
            )}
          </div>

          {pendingDeliveredShipments.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                No Pending Remittances
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                All delivered parcels have been remitted and submitted to Main Branch Head Office.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-start text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
                    <th className="p-3 text-start">CN Number</th>
                    <th className="p-3 text-start">Sender ➔ Receiver</th>
                    <th className="p-3 text-start">Route</th>
                    <th className="p-3 text-end">Collected (AFN)</th>
                    <th className="p-3 text-end">Branch Commission</th>
                    <th className="p-3 text-end">Remittance Due HQ</th>
                    <th className="p-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {pendingDeliveredShipments.map(s => {
                    const origBranch = branches.find(b => b.id === s.originBranchId);
                    const destBranch = branches.find(b => b.id === s.destinationBranchId);
                    const collected = s.financials.totalAmount;
                    const commission = s.destBranchCommission !== undefined ? s.destBranchCommission : (s.financials?.destBranchCommission || 100);
                    const netDue = s.originRemittanceDue !== undefined ? s.originRemittanceDue : Math.max(0, collected - commission);

                    return (
                      <tr key={s.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">
                          {s.cnNumber}
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-slate-800 dark:text-slate-200">{s.receiver.name}</div>
                          <div className="text-[11px] text-slate-500">From: {s.sender.name} ({s.sender.phone})</div>
                        </td>
                        <td className="p-3 text-slate-600 dark:text-slate-400 font-medium">
                          {origBranch?.city} ➔ <strong className="text-slate-900 dark:text-white">{destBranch?.city}</strong>
                        </td>
                        <td className="p-3 text-end font-mono font-bold text-slate-900 dark:text-white">
                          {collected.toLocaleString()} AFN
                        </td>
                        <td className="p-3 text-end font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          + {commission.toLocaleString()} AFN
                        </td>
                        <td className="p-3 text-end font-mono font-black text-amber-600 dark:text-amber-400">
                          {netDue.toLocaleString()} AFN
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleOpenRemitModal([s])}
                            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs cursor-pointer shadow-xs transition-colors flex items-center gap-1 mx-auto"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Remit to HQ</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT 2 & 3: TRANSFERS LIST */}
      {(activeTab === 'transfers_submitted' || activeTab === 'settled_history') && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-black text-slate-900 dark:text-white">
                {activeTab === 'transfers_submitted' 
                  ? 'Remittance Batches Awaiting Head Office Confirmation (در انتظار تأیید مرکز)'
                  : 'Confirmed & Settled Remittance Archive (آرشیو انتقالات تایید شده)'}
              </h2>
              <p className="text-xs text-slate-500">
                {activeTab === 'transfers_submitted' 
                  ? 'The Main Branch (Head Office) verifies funds before releasing full credit into company records.'
                  : 'Historical records of money submitted from branches and approved by the Main Branch.'}
              </p>
            </div>

            {/* Search */}
            <div className="relative min-w-[240px]">
              <Search className="w-3.5 h-3.5 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search batch # or ref..."
                className="w-full h-8 ps-8 pe-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {filteredTransfers.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                <Inbox className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                No Remittance Batches Found
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {activeTab === 'transfers_submitted' 
                  ? 'No branch remittances are currently waiting for confirmation.' 
                  : 'No confirmed historical batches match the filter.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-start text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
                    <th className="p-3 text-start">Batch Number</th>
                    <th className="p-3 text-start">Branch (Originator)</th>
                    <th className="p-3 text-start">Parcels</th>
                    <th className="p-3 text-end">Total Collected</th>
                    <th className="p-3 text-end">Branch Commission</th>
                    <th className="p-3 text-end">Net Sent to HQ</th>
                    <th className="p-3 text-start">Method & Ref</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-center">Operations</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredTransfers.map(tr => {
                    const isPendingHq = tr.status === 'submitted_to_headoffice';
                    const isConfirmed = tr.status === 'confirmed_by_headoffice';

                    return (
                      <tr key={tr.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="p-3 font-mono font-black text-slate-900 dark:text-white">
                          <div>{tr.batchNumber}</div>
                          <div className="text-[10px] text-slate-400 font-normal">
                            {new Date(tr.submittedAt).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-slate-800 dark:text-slate-200">{tr.fromBranchName}</div>
                          <div className="text-[10px] text-slate-400">By: {tr.submittedByUserName}</div>
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[11px]">
                            {tr.parcelCount} Parcels
                          </span>
                        </td>
                        <td className="p-3 text-end font-mono font-bold text-slate-900 dark:text-white">
                          {tr.totalCollectedAfn.toLocaleString()} AFN
                        </td>
                        <td className="p-3 text-end font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {tr.totalCommissionKeptAfn.toLocaleString()} AFN
                        </td>
                        <td className="p-3 text-end font-mono font-black text-amber-600 dark:text-amber-400 text-sm">
                          {tr.netRemittanceAmountAfn.toLocaleString()} AFN
                        </td>
                        <td className="p-3">
                          <div className="font-semibold text-slate-800 dark:text-slate-200 capitalize">
                            {tr.paymentMethod.replace('_', ' ')}
                          </div>
                          <div className="text-[10px] font-mono text-slate-400">
                            {tr.referenceNumber || 'N/A'}
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          {isPendingHq && (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1 justify-center w-fit mx-auto">
                              <Clock className="w-3 h-3" />
                              <span>Awaiting HQ</span>
                            </span>
                          )}
                          {isConfirmed && (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1 justify-center w-fit mx-auto">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>HQ Confirmed</span>
                            </span>
                          )}
                          {tr.status === 'rejected' && (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-800 flex items-center gap-1 justify-center w-fit mx-auto">
                              <X className="w-3 h-3" />
                              <span>Rejected</span>
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* View / Print Voucher */}
                            <button
                              onClick={() => setViewDetailTransfer(tr)}
                              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
                              title="View Remittance Voucher"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {/* Super Admin Actions */}
                            {isSuperAdmin && isPendingHq && (
                              <>
                                <button
                                  onClick={() => {
                                    setConfirmModalTransfer(tr);
                                    setConfirmationNote(`Verified and received at Main Branch (${tr.netRemittanceAmountAfn.toLocaleString()} AFN).`);
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 cursor-pointer shadow-xs transition-colors"
                                  title="Confirm Receipt of Funds"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Confirm Receipt</span>
                                </button>
                                <button
                                  onClick={() => {
                                    setRejectModalTransfer(tr);
                                    setRejectionReason('Amount mismatch with Sarafi receipt.');
                                  }}
                                  className="px-2 py-1 rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 font-bold text-xs border border-red-200 dark:border-red-800 cursor-pointer"
                                  title="Reject Remittance"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: CREATE REMITTANCE TRANSFER (BRANCH) */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-800 p-6 animate-in fade-in zoom-in-95 space-y-4 my-auto max-h-[92vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <Banknote className="w-5 h-5 text-amber-600" />
                  <span>Submit Money & Commission Remittance</span>
                </h3>
                <p className="text-xs text-slate-500">
                  From: {currentBranch?.name || 'Branch'} ➔ To: {mainBranch?.name || 'Main Branch HQ'}
                </p>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Live Financial Breakdown Card */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Financial Calculation Matrix (محاسبه کمیشن و انتقال به مرکز)
              </div>

              {/* Total collected input */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  1. Total Money Collected from Receiver (مبلغ کل اخذ شده از گیرنده - AFN):
                </label>
                <input
                  type="number"
                  min="0"
                  value={customTotalCollected}
                  onChange={(e) => handleTotalCollectedChange(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full h-10 px-3 font-mono font-black text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl"
                  placeholder="100"
                />
              </div>

              {/* Branch Commission input */}
              <div>
                <label className="block text-[11px] font-bold text-emerald-700 dark:text-emerald-400 mb-1">
                  2. Branch Retained Commission (کمیشن کسر شده توسط شعبه - AFN):
                </label>
                <input
                  type="number"
                  min="0"
                  value={customCommission}
                  onChange={(e) => handleCommissionChange(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full h-10 px-3 font-mono font-black text-sm text-emerald-600 bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-800 rounded-xl"
                  placeholder="30"
                />
              </div>

              {/* Net Remittance to HQ result */}
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-amber-900 dark:text-amber-200">
                    3. Net Remaining to Send to Main Branch (مبلغ ارسالی به مرکز):
                  </div>
                  <div className="text-[10px] text-amber-700 dark:text-amber-400">
                    {customTotalCollected} - {customCommission} = {customNetToHq} AFN
                  </div>
                </div>
                <div className="text-xl font-black text-amber-600 dark:text-amber-400 font-mono">
                  {customNetToHq.toLocaleString()} AFN
                </div>
              </div>
            </div>

            {/* Transfer Details Form */}
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Payment / Transfer Method:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('hawala')}
                    className={`p-2.5 rounded-xl font-bold border transition-all text-xs cursor-pointer ${
                      paymentMethod === 'hawala'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    Sarafi Hawala (حواله صرافی)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('bank_transfer')}
                    className={`p-2.5 rounded-xl font-bold border transition-all text-xs cursor-pointer ${
                      paymentMethod === 'bank_transfer'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    Bank Transfer (انتقال بانکی)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Sarafi / Hawala Reference No.:
                  </label>
                  <input
                    type="text"
                    value={refNumber}
                    onChange={(e) => setRefNumber(e.target.value)}
                    className="w-full h-9 px-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-mono text-xs"
                    placeholder="HAW-90412"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Sarafi Agent / Bank Name:
                  </label>
                  <input
                    type="text"
                    value={agentName}
                    onChange={(e) => setAgentName(e.target.value)}
                    className="w-full h-9 px-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                    placeholder="Sarafi Shamsi / Azizi Bank"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Submission Notes / Explanations:
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl resize-none text-xs"
                  placeholder="Notes for Head Office Finance..."
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleSubmitRemittance}
                className="flex-1 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-md transition-colors cursor-pointer flex items-center justify-center gap-2 text-xs"
              >
                <Send className="w-4 h-4" />
                <span>Submit to Main Branch for Confirmation ({customNetToHq.toLocaleString()} AFN)</span>
              </button>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition-colors cursor-pointer text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CONFIRM REMITTANCE BY HEAD OFFICE (SUPER ADMIN) */}
      {confirmModalTransfer && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 p-6 animate-in fade-in zoom-in-95 space-y-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <Check className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Confirm Funds Received at HQ
                </h3>
              </div>
              <button
                onClick={() => setConfirmModalTransfer(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs space-y-2">
              <div className="flex justify-between font-bold">
                <span>Batch Number:</span>
                <span className="font-mono">{confirmModalTransfer.batchNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>From Branch:</span>
                <span className="font-bold">{confirmModalTransfer.fromBranchName}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Collected:</span>
                <span>{confirmModalTransfer.totalCollectedAfn.toLocaleString()} AFN</span>
              </div>
              <div className="flex justify-between text-emerald-700 dark:text-emerald-400">
                <span>Branch Commission Kept:</span>
                <span>{confirmModalTransfer.totalCommissionKeptAfn.toLocaleString()} AFN</span>
              </div>
              <div className="flex justify-between text-base font-black text-emerald-800 dark:text-emerald-300 pt-2 border-t border-emerald-200 dark:border-emerald-800">
                <span>Net Funds Received at HQ:</span>
                <span className="font-mono">{confirmModalTransfer.netRemittanceAmountAfn.toLocaleString()} AFN</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                HQ Confirmation Remark / Receipt Notes:
              </label>
              <textarea
                rows={2}
                value={confirmationNote}
                onChange={(e) => setConfirmationNote(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                placeholder="Verified and deposited to central treasury account..."
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleConfirmSubmit}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-colors cursor-pointer flex items-center justify-center gap-2 text-xs"
              >
                <Check className="w-4 h-4" />
                <span>Confirm Receipt of {confirmModalTransfer.netRemittanceAmountAfn.toLocaleString()} AFN</span>
              </button>
              <button
                type="button"
                onClick={() => setConfirmModalTransfer(null)}
                className="px-4 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: REJECT REMITTANCE */}
      {rejectModalTransfer && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 p-6 animate-in fade-in zoom-in-95 space-y-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base text-red-600 dark:text-red-400">
                Reject Remittance Transfer
              </h3>
              <button
                onClick={() => setRejectModalTransfer(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400">
              Please enter the reason for rejecting batch <strong>{rejectModalTransfer.batchNumber}</strong>. The branch will be notified to correct and re-submit.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Reason for Rejection:
              </label>
              <textarea
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                placeholder="e.g. Sarafi voucher not found / commission discrepancy..."
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleRejectSubmit}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-md transition-colors cursor-pointer text-xs"
              >
                Reject & Send Back to Branch
              </button>
              <button
                type="button"
                onClick={() => setRejectModalTransfer(null)}
                className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: VIEW / PRINT OFFICIAL REMITTANCE VOUCHER */}
      {viewDetailTransfer && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 p-6 animate-in fade-in zoom-in-95 space-y-4 my-auto max-h-[92vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Receipt className="w-5 h-5 text-amber-600" />
                <span>Official Remittance Voucher (سند انتقال وجه و کمیشن)</span>
              </h3>
              <button
                onClick={() => setViewDetailTransfer(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Voucher Element */}
            <div ref={printableVoucherRef} className="p-6 bg-white text-slate-900 border border-slate-200 rounded-xl space-y-4 font-sans text-xs">
              
              {/* Header with Logo & Brand */}
              <div className="flex items-center justify-between pb-3 border-b-2 border-slate-900">
                <div className="flex items-center gap-2.5">
                  <img src="/logo.jpg" alt="Logo" className="w-10 h-10 object-contain rounded" />
                  <div>
                    <h4 className="font-black text-sm text-slate-950 uppercase tracking-tight">
                      Armaghan Sadeq Transfers
                    </h4>
                    <p className="text-[10px] text-slate-600 font-bold">
                      خدمات انتقالات ارمغان صادق • Inter-Branch Remittance Voucher
                    </p>
                  </div>
                </div>
                <div className="text-end">
                  <div className="font-mono font-black text-xs text-amber-700">{viewDetailTransfer.batchNumber}</div>
                  <div className="text-[10px] text-slate-500">{new Date(viewDetailTransfer.submittedAt).toLocaleString()}</div>
                </div>
              </div>

              {/* Route & Parties */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Originating Branch:</span>
                  <strong className="text-slate-900">{viewDetailTransfer.fromBranchName}</strong>
                  <div className="text-[10px] text-slate-600">Officer: {viewDetailTransfer.submittedByUserName}</div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Destination HQ:</span>
                  <strong className="text-slate-900">{viewDetailTransfer.toBranchName}</strong>
                  <div className="text-[10px] text-slate-600">Admin Central Treasury</div>
                </div>
              </div>

              {/* Financial Breakdown Table */}
              <table className="w-full border-collapse text-xs border border-slate-200">
                <tbody>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <td className="p-2 font-bold text-slate-700">Total Money Collected from Receivers:</td>
                    <td className="p-2 font-mono font-bold text-end">{viewDetailTransfer.totalCollectedAfn.toLocaleString()} AFN</td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="p-2 font-bold text-emerald-700">Deducted Branch Handling Commission:</td>
                    <td className="p-2 font-mono font-bold text-emerald-700 text-end">- {viewDetailTransfer.totalCommissionKeptAfn.toLocaleString()} AFN</td>
                  </tr>
                  <tr className="bg-amber-50/60 font-black text-amber-900 text-sm">
                    <td className="p-2.5">Net Remitted to Main Branch HQ:</td>
                    <td className="p-2.5 font-mono text-end text-base text-amber-700">{viewDetailTransfer.netRemittanceAmountAfn.toLocaleString()} AFN</td>
                  </tr>
                </tbody>
              </table>

              {/* Transfer Method Info */}
              <div className="grid grid-cols-2 gap-2 text-[11px] p-2 bg-slate-50 rounded border border-slate-200">
                <div>
                  <span className="text-slate-500">Payment Method: </span>
                  <strong className="capitalize">{viewDetailTransfer.paymentMethod.replace('_', ' ')}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Ref Code: </span>
                  <strong className="font-mono">{viewDetailTransfer.referenceNumber || 'N/A'}</strong>
                </div>
                {viewDetailTransfer.transferAgentName && (
                  <div className="col-span-2">
                    <span className="text-slate-500">Agent/Bank: </span>
                    <strong>{viewDetailTransfer.transferAgentName}</strong>
                  </div>
                )}
              </div>

              {/* Status and Signatures */}
              <div className="pt-2 border-t border-slate-200 grid grid-cols-2 gap-6 text-[10px] text-center">
                <div className="border-t border-dashed border-slate-400 pt-2 mt-4">
                  <div className="font-bold">Branch Officer Signature & Stamp</div>
                  <div className="text-slate-500 mt-1">{viewDetailTransfer.fromBranchName}</div>
                </div>
                <div className="border-t border-dashed border-slate-400 pt-2 mt-4">
                  <div className="font-bold">Head Office Finance Approval</div>
                  <div className="text-slate-500 mt-1">
                    {viewDetailTransfer.confirmedByUserName ? `Confirmed by ${viewDetailTransfer.confirmedByUserName}` : 'Pending HQ Receipt'}
                  </div>
                </div>
              </div>
            </div>

            {/* Print & Close actions */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handlePrintVoucher}
                className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <Printer className="w-4 h-4" />
                <span>Print Official Voucher</span>
              </button>
              <button
                type="button"
                onClick={() => setViewDetailTransfer(null)}
                className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
