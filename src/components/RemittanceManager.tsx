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
  Inbox,
  Lock,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  TrendingDown,
  Equal
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { BranchRemittanceTransfer, Shipment, PriceAdjustmentType } from '../types';
import { printElementUsingIframe } from '../utils/pdfExport';
import { DeliveryPaymentSettlementModal } from './DeliveryPaymentSettlementModal';

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
    branchTotalSubmittedRemittances,
    branchTotalConfirmedSettledRemittances,
    headOfficePendingRemittancesTotal,
    headOfficeSettledRevenueTotal,
    activeBranchId,
    setActiveBranchId
  } = useApp();

  const isSuperAdmin = currentUser.role === 'super_admin';
  const currentBranchId = isSuperAdmin ? (activeBranchId === 'all' ? 'all' : activeBranchId) : currentUser.branchId;
  const currentBranch = branches.find(b => b.id === currentBranchId);
  const mainBranch = branches.find(b => b.isHeadOffice) || branches[0];
  const branchShipments = useMemo(() => {
    if (isSuperAdmin && currentBranchId === 'all') return shipments;
    return shipments.filter(s => s.originBranchId === currentBranchId || s.destinationBranchId === currentBranchId);
  }, [shipments, isSuperAdmin, currentBranchId]);
  const branchCustomerCount = useMemo(() => {
    const keys = new Set(branchShipments.map(s => s.sender.phone.replace(/\D/g, '') || s.sender.name.trim().toLowerCase()));
    return keys.size;
  }, [branchShipments]);
  const branchCustomers = useMemo(() => {
    const grouped = new Map<string, { name: string; phone: string; parcels: number }>();
    branchShipments.forEach(s => {
      const key = s.sender.phone.replace(/\D/g, '') || s.sender.name.trim().toLowerCase();
      const existing = grouped.get(key);
      grouped.set(key, {
        name: existing?.name || s.sender.name,
        phone: existing?.phone || s.sender.phone,
        parcels: (existing?.parcels || 0) + 1
      });
    });
    return Array.from(grouped.values()).sort((a, b) => b.parcels - a.parcels);
  }, [branchShipments]);

  const [activeTab, setActiveTab] = useState<RemittanceTab>(
    isSuperAdmin ? 'transfers_submitted' : 'pending_deliveries'
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>('all');
  const [showMoneyGuide, setShowMoneyGuide] = useState<boolean>(false);

  // Remit submission modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedParcelIds, setSelectedParcelIds] = useState<string[]>([]);
  const [customOriginBranchId, setCustomOriginBranchId] = useState<string>('br_admin_hq');
  const [customDestBranchId, setCustomDestBranchId] = useState<string>('br_herat');
  const [customTotalCollected, setCustomTotalCollected] = useState<number>(100);
  
  // Portion 1: Commission Details & Adjustments (Extra [+] / Less [-])
  const [customBaseCommission, setCustomBaseCommission] = useState<number>(30);
  const [commissionAdjType, setCommissionAdjType] = useState<PriceAdjustmentType>('exact');
  const [commissionAdjAmount, setCommissionAdjAmount] = useState<number>(0);
  const [commissionAdjReason, setCommissionAdjReason] = useState<string>('exact_commission');

  // Portion 2: Transportation & Extra Service Fee Adjustments (Extra [+] / Less [-])
  const [customBaseTransport, setCustomBaseTransport] = useState<number>(0);
  const [transportAdjType, setTransportAdjType] = useState<PriceAdjustmentType>('exact');
  const [transportAdjAmount, setTransportAdjAmount] = useState<number>(0);
  const [transportAdjReason, setTransportAdjReason] = useState<string>('exact_transport');

  const [paymentMethod, setPaymentMethod] = useState<'hawala' | 'bank_transfer' | 'cash_handover' | 'treasury'>('hawala');
  const [refNumber, setRefNumber] = useState('');
  const [agentName, setAgentName] = useState('');
  const [notes, setNotes] = useState('');

  // Effective Destination Commission retained by branch
  const effectiveCommission = useMemo(() => {
    let comm = Math.max(0, customBaseCommission);
    if (commissionAdjType === 'extra') {
      comm += Math.max(0, commissionAdjAmount);
    } else if (commissionAdjType === 'less') {
      comm = Math.max(0, comm - Math.max(0, commissionAdjAmount));
    }
    return comm;
  }, [customBaseCommission, commissionAdjType, commissionAdjAmount]);

  // Effective Transportation Fee
  const effectiveTransport = useMemo(() => {
    let trans = Math.max(0, customBaseTransport);
    if (transportAdjType === 'extra') {
      trans += Math.max(0, transportAdjAmount);
    } else if (transportAdjType === 'less') {
      trans = Math.max(0, trans - Math.max(0, transportAdjAmount));
    }
    return trans;
  }, [customBaseTransport, transportAdjType, transportAdjAmount]);

  // Net Remittance Amount to send to Main Branch (HQ)
  const calculatedNetToHq = useMemo(() => {
    // Destination branch retains ONLY its effective commission.
    // All other collected funds (including product price and transportation fees) are remitted to Main Branch HQ.
    return Math.max(0, customTotalCollected - effectiveCommission);
  }, [customTotalCollected, effectiveCommission]);

  // Open modal for single or batch
  const handleOpenRemitModal = (parcels: Shipment[]) => {
    if (parcels.length === 0) return;
    const ids = parcels.map(p => p.id);
    setSelectedParcelIds(ids);

    const totalColl = parcels.reduce((sum, p) => {
      const settlement = p.paymentSettlement || p.financials?.paymentSettlement;
      return sum + (settlement?.locked ? settlement.actualCollectedAmount : (p.financials?.totalAmount || p.financials?.productPrice || 0));
    }, 0);

    const totalComm = parcels.reduce((sum, p) => {
      const settlement = p.paymentSettlement || p.financials?.paymentSettlement;
      if (settlement?.locked) return sum + settlement.fixedDestCommission;
      const comm = p.financials?.destBranchCommission || p.destBranchCommission || 70;
      return sum + comm;
    }, 0);

    const totalTrans = parcels.reduce((sum, p) => {
      const settlement = p.paymentSettlement || p.financials?.paymentSettlement;
      if (settlement?.locked) return sum + settlement.fixedServiceFee;
      return sum + (p.financials?.serviceFee || p.transportationFee || 150);
    }, 0);
    
    const firstParcel = parcels[0];

    setCustomOriginBranchId(firstParcel?.originBranchId || 'br_admin_hq');
    setCustomDestBranchId(firstParcel?.destinationBranchId || currentBranchId || 'br_herat');
    setCustomTotalCollected(totalColl);
    setCustomBaseCommission(totalComm);
    setCommissionAdjType('exact');
    setCommissionAdjAmount(0);
    setCommissionAdjReason('exact_commission');

    setCustomBaseTransport(totalTrans);
    setTransportAdjType('exact');
    setTransportAdjAmount(0);
    setTransportAdjReason('exact_transport');

    setRefNumber(`HAW-${Math.floor(100000 + Math.random() * 900000)}`);
    setAgentName('Sarafi Khorasan / Kabul Central');
    setNotes(`Settlement for ${parcels.length} parcel(s) delivered by ${currentBranch?.name || 'Branch'}.`);
    setIsCreateModalOpen(true);
  };

  // Submit Remittance
  const handleSubmitRemittance = () => {
    if (selectedParcelIds.length === 0 && !customTotalCollected) return;

    const fromBr = isSuperAdmin ? (selectedBranchFilter !== 'all' ? selectedBranchFilter : branches[1]?.id || 'br_admin_hq') : (currentUser.branchId || 'br_admin_hq');

    const accepted = createBatchRemittance(
      selectedParcelIds,
      fromBr,
      customTotalCollected,
      customBaseCommission,
      calculatedNetToHq,
      paymentMethod,
      refNumber,
      agentName,
      notes,
      customBaseTransport,
      0, // originCommission
      customOriginBranchId,
      commissionAdjType,
      commissionAdjAmount,
      commissionAdjReason,
      transportAdjType,
      transportAdjAmount,
      transportAdjReason
    );

    if (accepted) {
      setIsCreateModalOpen(false);
      setSelectedParcelIds([]);
      setActiveTab('transfers_submitted');
    }
  };
  const [confirmModalTransfer, setConfirmModalTransfer] = useState<BranchRemittanceTransfer | null>(null);
  const [confirmationNote, setConfirmationNote] = useState('');

  // Rejection modal state
  const [rejectModalTransfer, setRejectModalTransfer] = useState<BranchRemittanceTransfer | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // View detail modal state
  const [viewDetailTransfer, setViewDetailTransfer] = useState<BranchRemittanceTransfer | null>(null);
  const [paymentSettlementShipment, setPaymentSettlementShipment] = useState<Shipment | null>(null);
  const printableVoucherRef = useRef<HTMLDivElement>(null);

  // Delivered shipments that are still awaiting Step 2: Payment Settlement Lock
  const awaitingPaymentSettlementShipments = useMemo(() => {
    return shipments.filter(s => {
      const isTargetDest = isSuperAdmin 
        ? (selectedBranchFilter === 'all' ? true : s.destinationBranchId === selectedBranchFilter)
        : (s.destinationBranchId === currentBranchId);
      const isDelivered = s.status === 'delivered';
      const isPaymentLocked = Boolean(
        s.paymentSettlementLocked ||
        s.paymentSettlement?.locked ||
        s.financials?.paymentSettlement?.locked ||
        s.financials?.paymentStatus === 'paid'
      );
      return isTargetDest && isDelivered && !isPaymentLocked;
    });
  }, [shipments, isSuperAdmin, selectedBranchFilter, currentBranchId]);

  // Filter delivered shipments that have locked payment settlement and are pending remittance to HQ
  const pendingDeliveredShipments = useMemo(() => {
    return shipments.filter(s => {
      const isTargetDest = isSuperAdmin 
        ? (selectedBranchFilter === 'all' ? true : s.destinationBranchId === selectedBranchFilter)
        : (s.destinationBranchId === currentBranchId);
      
      const isDelivered = s.status === 'delivered';
      const isPaymentLocked = Boolean(
        s.paymentSettlementLocked ||
        s.paymentSettlement?.locked ||
        s.financials?.paymentSettlement?.locked ||
        s.financials?.paymentStatus === 'paid'
      );
      const isPendingRemittance = !s.remittanceStatus || s.remittanceStatus === 'pending' || (s.remittanceStatus as string) === 'unsettled';

      return isTargetDest && isDelivered && isPaymentLocked && isPendingRemittance;
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
                <span>{t('remittance_system_title')}</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold border border-amber-300 dark:border-amber-800">
                  {t('remittance_system_badge')}
                </span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('remittance_system_subtitle')}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setShowMoneyGuide(!showMoneyGuide)}
            className="px-3.5 py-2.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
          >
            <HelpCircle className="w-4 h-4 text-amber-500" />
            <span>{t('how_money_works_title')}</span>
            {showMoneyGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

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
              <span>{t('remit_all_delivered_btn')} ({pendingDeliveredShipments.length})</span>
            </button>
          )}

          {isSuperAdmin && (
            <button
              onClick={() => {
                setSelectedParcelIds([]);
                setCustomTotalCollected(100);
                setCustomBaseCommission(30);
                setCommissionAdjType('exact');
                setCommissionAdjAmount(0);
                setCommissionAdjReason('exact_commission');
                setCustomBaseTransport(20);
                setTransportAdjType('exact');
                setTransportAdjAmount(0);
                setTransportAdjReason('exact_transport');
                setRefNumber(`HAW-${Math.floor(100000 + Math.random() * 900000)}`);
                setAgentName('Sarafi Central');
                setIsCreateModalOpen(true);
              }}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-amber-600 dark:hover:bg-amber-700 font-bold rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{t('create_test_remittance_btn')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Collapsible Educational Guide: How the Money System Works */}
      {showMoneyGuide && (
        <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-slate-50 to-emerald-500/10 dark:from-amber-950/30 dark:via-slate-900 dark:to-emerald-950/30 border border-amber-200 dark:border-amber-800/60 shadow-sm animate-in fade-in duration-200 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Banknote className="w-4 h-4 text-amber-600" />
              <span>{t('how_money_works_title')}</span>
            </h3>
            <button
              onClick={() => setShowMoneyGuide(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1">
              <span className="text-[10px] font-black uppercase text-amber-700 dark:text-amber-400 tracking-wider">Step 1</span>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                {t('step1_cash_collected')}
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1">
              <span className="text-[10px] font-black uppercase text-blue-700 dark:text-blue-400 tracking-wider">Step 2</span>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                {t('step2_remit_deduct')}
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1">
              <span className="text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-400 tracking-wider">Step 3</span>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                {t('step3_hq_confirm')}
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1">
              <span className="text-[10px] font-black uppercase text-purple-700 dark:text-purple-400 tracking-wider">Step 4</span>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                {t('step4_seller_payout')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isSuperAdmin ? (
          <>
            {/* HQ Stat 1: Pending Receipts from Branches */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800/60 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-amber-700 dark:text-amber-400">
                <span>{t('stat_pending_confirmation')}</span>
                <Clock className="w-4 h-4" />
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {headOfficePendingRemittancesTotal.toLocaleString()} <span className="text-xs font-normal text-slate-500">AFN</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {remittanceTransfers.filter(r => r.status === 'submitted_to_headoffice').length} {t('stat_transfers_submitted_desc')}
              </p>
            </div>

            {/* HQ Stat 2: Confirmed Main Branch Revenue */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800/60 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-700 dark:text-emerald-400">
                <span>{t('stat_confirmed_hq_rev')}</span>
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {headOfficeSettledRevenueTotal.toLocaleString()} <span className="text-xs font-normal text-slate-500">AFN</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {t('stat_confirmed_hq_rev_desc')}
              </p>
            </div>

            {/* HQ Stat 3: Branch Retained Commissions */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800/60 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-blue-700 dark:text-blue-400">
                <span>{t('stat_branch_retained_comm')}</span>
                <DollarSign className="w-4 h-4" />
              </div>
              <div className="text-2xl font-black text-blue-600 dark:text-blue-400">
                {remittanceTransfers.filter(r => r.status === 'confirmed_by_headoffice').reduce((sum, r) => sum + r.totalCommissionKeptAfn, 0).toLocaleString()} <span className="text-xs font-normal text-slate-500">AFN</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {t('stat_branch_retained_comm_desc')}
              </p>
            </div>

            {/* HQ Stat 4: Total Provincial Hubs Connected */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                <span>{t('stat_active_hubs')}</span>
                <Building2 className="w-4 h-4 text-red-600" />
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {branches.length} <span className="text-xs font-normal text-slate-500">{t('stat_hubs_unit')}</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {t('stat_full_network_desc')}
              </p>
            </div>
          </>
        ) : (
          <>
            {/* Branch Stat 1: Ready to Remit to HQ (Cash on hand from delivered parcels) */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-amber-700 dark:text-amber-400">
                <span>{t('stat_owed_to_main_branch')}</span>
                <Banknote className="w-4 h-4" />
              </div>
              <div className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
                {branchOwedToHeadOffice.toLocaleString()} <span className="text-xs font-normal text-slate-500">AFN</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {pendingDeliveredShipments.length} {t('stat_parcels_delivered_collected')}
              </p>
            </div>

            {/* Branch Stat 2: My Earned Commissions (Kept in branch profit) */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-800 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-700 dark:text-emerald-400">
                <span>{t('stat_my_earned_commission')}</span>
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                {branchEarnedCommissions.toLocaleString()} <span className="text-xs font-normal text-slate-500">AFN</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {t('stat_earned_comm_desc')}
              </p>
            </div>

            {/* Branch Stat 3: Total Submitted to HQ (In Review) */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-blue-700 dark:text-blue-400">
                <span>{t('stat_total_submitted_hq')}</span>
                <Clock className="w-4 h-4" />
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                {branchTotalSubmittedRemittances.toLocaleString()} <span className="text-xs font-normal text-slate-500">AFN</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {remittanceTransfers.filter(r => r.fromBranchId === currentBranchId && r.status === 'submitted_to_headoffice').length} {t('stat_submitted_to_hq_desc')}
              </p>
            </div>

            {/* Branch Stat 4: Total Confirmed & Settled with HQ */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                <span>{t('stat_total_confirmed_hq')}</span>
                <Receipt className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                {branchTotalConfirmedSettledRemittances.toLocaleString()} <span className="text-xs font-normal text-slate-500">AFN</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {remittanceTransfers.filter(r => r.fromBranchId === currentBranchId && r.status === 'confirmed_by_headoffice').length} {t('stat_total_confirmed_hq_desc')}
              </p>
            </div>
          </>
        )}
      </div>

      {!isSuperAdmin && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-sm font-black text-slate-900 dark:text-white">{t('branch_customer_list_title')}</h2>
            <p className="text-xs text-slate-500">{t('branch_customer_list_desc')}</p>
          </div>
          {branchCustomers.length === 0 ? (
            <p className="p-6 text-xs text-slate-500">{t('branch_customer_list_empty')}</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 divide-y sm:divide-y-0 sm:gap-px bg-slate-100 dark:bg-slate-800">
              {branchCustomers.map(customer => (
                <div key={`${customer.phone}-${customer.name}`} className="p-3 bg-white dark:bg-slate-900 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate">{customer.name}</div>
                    <div className="text-[11px] text-slate-500 font-mono">{customer.phone}</div>
                  </div>
                  <span className="shrink-0 text-[10px] font-bold text-slate-500">{customer.parcels} {t('branch_customer_parcels')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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
            <span>{t('tab_remit_pending_deliveries')} ({pendingDeliveredShipments.length})</span>
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
            <span>{t('tab_remit_transfers_submitted')} ({remittanceTransfers.filter(r => r.status === 'submitted_to_headoffice').length})</span>
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
            <span>{t('tab_remit_settled_history')} ({remittanceTransfers.filter(r => r.status === 'confirmed_by_headoffice').length})</span>
          </button>
        </div>

        {/* Branch Filter for Admin */}
        {isSuperAdmin && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">{t('filter_branch_lbl')}</span>
            <select
              value={selectedBranchFilter}
              onChange={(e) => setSelectedBranchFilter(e.target.value)}
              className="h-9 px-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
            >
              <option value="all">{t('all_provincial_hubs_opt')}</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name} ({b.city})</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* TAB CONTENT 1: PENDING PARCEL COLLECTIONS */}
      {activeTab === 'pending_deliveries' && (
        <div className="space-y-4">
          {/* Alert Banner if any delivered parcels are awaiting Step 2 Payment Settlement Lock */}
          {awaitingPaymentSettlementShipments.length > 0 && (
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-300 dark:border-amber-800 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-amber-950 dark:text-amber-100">
                      {awaitingPaymentSettlementShipments.length} Delivered Parcel(s) Awaiting Payment Settlement & Price Adjustment
                    </h3>
                    <p className="text-[11px] text-amber-800 dark:text-amber-300">
                      Complete "💰 Record Payment & Report" (Exact / + Paid Extra / - Paid Less) to lock payment and automatically add them to Remittance below.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {awaitingPaymentSettlementShipments.map(s => (
                  <div
                    key={s.id}
                    className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800/80 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-mono font-black text-slate-900 dark:text-white">{s.cnNumber}</div>
                      <div className="text-[11px] text-slate-500 truncate">{s.receiver.name} • {s.financials.totalAmount.toLocaleString()} AFN</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPaymentSettlementShipment(s)}
                      className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-black text-[10px] shrink-0 cursor-pointer transition-colors"
                    >
                      💰 Record Payment
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>{t('pending_deliveries_heading')}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" />
                  <span>Payment Locked & Ready</span>
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                {t('pending_deliveries_subheading')}
              </p>
            </div>

            {pendingDeliveredShipments.length > 0 && (
              <button
                onClick={() => handleOpenRemitModal(pendingDeliveredShipments)}
                className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{t('remit_all_together_btn')} ({pendingDeliveredShipments.length})</span>
              </button>
            )}
          </div>

          {pendingDeliveredShipments.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                {t('no_pending_remittances_title')}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {t('no_pending_remittances_desc')}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-start text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
                    <th className="p-3 text-start">{t('th_cn')}</th>
                    <th className="p-3 text-start">{t('th_sender')} ➔ {t('th_receiver')}</th>
                    <th className="p-3 text-start">{t('th_route')}</th>
                    <th className="p-3 text-end">{t('th_remit_collected')}</th>
                    <th className="p-3 text-end">{t('th_remit_commission')}</th>
                    <th className="p-3 text-end">{t('th_remit_due_hq')}</th>
                    <th className="p-3 text-center">{t('th_actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {pendingDeliveredShipments.map(s => {
                    const origBranch = branches.find(b => b.id === s.originBranchId);
                    const destBranch = branches.find(b => b.id === s.destinationBranchId);
                    const settlement = s.paymentSettlement || s.financials?.paymentSettlement;
                    const collected = settlement?.locked
                      ? settlement.actualCollectedAmount
                      : (s.financials.productPrice || s.financials.totalAmount);
                    const commission = settlement?.locked
                      ? settlement.fixedDestCommission
                      : (s.financials.destBranchCommission || s.destBranchCommission || 70);
                    const netDue = settlement?.locked
                      ? settlement.reconciledRemittanceDue
                      : (s.originRemittanceDue || Math.max(0, collected - commission));

                    return (
                      <tr key={s.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">
                          <div>{s.cnNumber}</div>
                          {settlement?.reconciliationId && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-mono text-emerald-700 dark:text-emerald-400">
                              <Lock className="w-2.5 h-2.5" />
                              #{settlement.reconciliationId}
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-slate-800 dark:text-slate-200">{s.receiver.name}</div>
                          <div className="text-[11px] text-slate-500">{t('from_lbl')} {s.sender.name} ({s.sender.phone})</div>
                        </td>
                        <td className="p-3 text-slate-600 dark:text-slate-400 font-medium">
                          {origBranch?.city} ➔ <strong className="text-slate-900 dark:text-white">{destBranch?.city}</strong>
                        </td>
                        <td className="p-3 text-end font-mono font-bold text-slate-900 dark:text-white">
                          <div>{collected.toLocaleString()} AFN</div>
                          {settlement?.locked && settlement.adjustmentType !== 'exact' && (
                            <div className={`text-[9.5px] font-bold ${
                              settlement.adjustmentType === 'extra' ? 'text-emerald-600' : 'text-amber-600'
                            }`} title={`Original: ${settlement.originalProductPrice.toLocaleString()} AFN | ${settlement.reasonLabel}`}>
                              {settlement.adjustmentType === 'extra'
                                ? `+${settlement.adjustmentAmount.toLocaleString()} Extra (${settlement.reasonLabel})`
                                : `-${settlement.adjustmentAmount.toLocaleString()} Less (${settlement.reasonLabel})`}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-end font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          <div>+ {commission.toLocaleString()} AFN</div>
                          <div className="text-[9px] text-slate-400 font-sans">Fixed</div>
                        </td>
                        <td className="p-3 text-end font-mono font-black text-amber-600 dark:text-amber-400">
                          {netDue.toLocaleString()} AFN
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setPaymentSettlementShipment(s)}
                              className="px-2 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-lg text-[10px] cursor-pointer transition-colors"
                              title="View Locked Payment Report"
                            >
                              Report
                            </button>
                            <button
                              onClick={() => handleOpenRemitModal([s])}
                              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs cursor-pointer shadow-xs transition-colors flex items-center gap-1"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>{t('btn_remit_to_hq')}</span>
                            </button>
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
        </div>
      )}

      {/* TAB CONTENT 2 & 3: TRANSFERS LIST */}
      {(activeTab === 'transfers_submitted' || activeTab === 'settled_history') && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-black text-slate-900 dark:text-white">
                {activeTab === 'transfers_submitted' 
                  ? t('remit_batches_awaiting_title')
                  : t('remit_batches_settled_title')}
              </h2>
              <p className="text-xs text-slate-500">
                {activeTab === 'transfers_submitted' 
                  ? t('remit_batches_awaiting_desc')
                  : t('remit_batches_settled_desc')}
              </p>
            </div>

            {/* Search */}
            <div className="relative min-w-[240px]">
              <Search className="w-3.5 h-3.5 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t('search_batch_placeholder')}
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
                {t('no_remit_batches_found')}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {activeTab === 'transfers_submitted' 
                  ? t('no_remit_batches_awaiting_desc') 
                  : t('no_remit_batches_settled_desc')}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-start text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
                    <th className="p-3 text-start">{t('th_batch_num')}</th>
                    <th className="p-3 text-start">{t('th_originator_branch')}</th>
                    <th className="p-3 text-start">{t('th_parcels_count')}</th>
                    <th className="p-3 text-end">{t('th_remit_collected')}</th>
                    <th className="p-3 text-end">{t('th_remit_commission')}</th>
                    <th className="p-3 text-end">{t('th_net_to_hq')}</th>
                    <th className="p-3 text-start">{t('th_method_ref')}</th>
                    <th className="p-3 text-center">{t('th_status')}</th>
                    <th className="p-3 text-center">{t('th_actions')}</th>
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
                          <div className="text-[10px] text-slate-400">{t('by_lbl')} {tr.submittedByUserName}</div>
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[11px]">
                            {tr.parcelCount} {t('parcels_unit_lbl')}
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
                              <span>{t('status_awaiting_hq')}</span>
                            </span>
                          )}
                          {isConfirmed && (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1 justify-center w-fit mx-auto">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>{t('status_hq_confirmed')}</span>
                            </span>
                          )}
                          {tr.status === 'rejected' && (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-800 flex items-center gap-1 justify-center w-fit mx-auto">
                              <X className="w-3 h-3" />
                              <span>{t('status_rejected')}</span>
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* View / Print Voucher */}
                            <button
                              onClick={() => setViewDetailTransfer(tr)}
                              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
                              title={t('btn_view_voucher')}
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
                                  title={t('btn_confirm_receipt')}
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>{t('btn_confirm_receipt')}</span>
                                </button>
                                <button
                                  onClick={() => {
                                    setRejectModalTransfer(tr);
                                    setRejectionReason('Amount mismatch with Sarafi receipt.');
                                  }}
                                  className="px-2 py-1 rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 font-bold text-xs border border-red-200 dark:border-red-800 cursor-pointer"
                                  title={t('btn_reject_remittance')}
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
                  <span>{t('modal_submit_remittance_title')}</span>
                </h3>
                <p className="text-xs text-slate-500">
                  {t('from_lbl')}: {currentBranch?.name || t('branch_lbl')} ➔ {t('to_lbl')}: {mainBranch?.name || t('main_branch_hq_lbl')}
                </p>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Live Financial Breakdown Card with Two Portions */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-4">
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center justify-between">
                <span>{t('financial_calc_matrix_title')}</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold">
                  {t('kabul_hq_owner_lbl')}
                </span>
              </div>

              {/* Branch Route Selectors if manually creating */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-0.5">
                    {t('origin_hub_lbl')}:
                  </label>
                  <select
                    value={customOriginBranchId}
                    onChange={(e) => setCustomOriginBranchId(e.target.value)}
                    className="w-full h-8 px-2 font-medium bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                  >
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name} {b.isHeadOffice ? `(${t('hq_main_tag')})` : ''}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-0.5">
                    {t('destination_hub_lbl')}:
                  </label>
                  <select
                    value={customDestBranchId}
                    onChange={(e) => setCustomDestBranchId(e.target.value)}
                    className="w-full h-8 px-2 font-medium bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                  >
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Top Input: Total Collected from Receiver */}
              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                  {t('input_collected_from_receiver')}:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    value={customTotalCollected}
                    onChange={(e) => setCustomTotalCollected(Math.max(0, parseInt(e.target.value) || 0))}
                    className="flex-1 h-9 px-3 font-mono font-black text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                    placeholder="100"
                  />
                  <span className="text-xs font-bold text-slate-500 font-mono">AFN</span>
                </div>
                <span className="text-[10px] text-slate-500 block mt-1">{t('input_total_cash_collected_sub')}</span>
              </div>

              {/* PORTION 1: BRANCH COMMISSION ADJUSTMENT */}
              <div className="p-3.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-md bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-[10px] font-black">1</span>
                    <h4 className="text-xs font-black text-emerald-900 dark:text-emerald-200">
                      {t('portion1_commission_title')}
                    </h4>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-700">
                    {effectiveCommission.toLocaleString()} AFN
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                  {t('portion1_commission_desc')}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 mb-0.5">
                      {t('th_remit_commission')} (Base):
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={customBaseCommission}
                      onChange={(e) => setCustomBaseCommission(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full h-8 px-2 font-mono text-xs font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 mb-0.5">
                      {t('label_adjustment_type')}
                    </label>
                    <div className="grid grid-cols-3 gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setCommissionAdjType('exact');
                          setCommissionAdjAmount(0);
                        }}
                        className={`h-8 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                          commissionAdjType === 'exact'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <Equal className="w-3 h-3" />
                        <span>{t('adj_mode_exact')}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setCommissionAdjType('extra')}
                        className={`h-8 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                          commissionAdjType === 'extra'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <TrendingUp className="w-3 h-3" />
                        <span>{t('adj_mode_extra')}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setCommissionAdjType('less')}
                        className={`h-8 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                          commissionAdjType === 'less'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <TrendingDown className="w-3 h-3" />
                        <span>{t('adj_mode_less')}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {commissionAdjType !== 'exact' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-emerald-200/50 dark:border-emerald-800/40">
                    <div>
                      <label className="block text-[10px] font-bold text-emerald-800 dark:text-emerald-300 mb-0.5">
                        {t('commission_adj_amount_lbl')}
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={commissionAdjAmount}
                        onChange={(e) => setCommissionAdjAmount(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full h-8 px-2 font-mono text-xs font-black text-emerald-700 bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 rounded-lg"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 mb-0.5">
                        {t('commission_adj_reason_lbl')}
                      </label>
                      <select
                        value={commissionAdjReason}
                        onChange={(e) => setCommissionAdjReason(e.target.value)}
                        className="w-full h-8 px-2 text-[10px] font-medium bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
                      >
                        <option value="reason_comm_heavy">{t('reason_comm_heavy')}</option>
                        <option value="reason_comm_fragile">{t('reason_comm_fragile')}</option>
                        <option value="reason_comm_volume">{t('reason_comm_volume')}</option>
                        <option value="reason_comm_waiver">{t('reason_comm_waiver')}</option>
                        <option value="reason_comm_other">{t('reason_comm_other')}</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* PORTION 2: TRANSPORTATION & EXTRA SERVICE FEE ADJUSTMENT */}
              <div className="p-3.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/60 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-md bg-blue-500/20 text-blue-700 dark:text-blue-300 flex items-center justify-center text-[10px] font-black">2</span>
                    <h4 className="text-xs font-black text-blue-900 dark:text-blue-200">
                      {t('portion2_transport_title')}
                    </h4>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-blue-700 dark:text-blue-400 bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-blue-300 dark:border-blue-700">
                    {effectiveTransport.toLocaleString()} AFN
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                  {t('portion2_transport_desc')}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 mb-0.5">
                      {t('base_transport_fee_lbl')}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={customBaseTransport}
                      onChange={(e) => setCustomBaseTransport(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full h-8 px-2 font-mono text-xs font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 mb-0.5">
                      {t('label_adjustment_type')}
                    </label>
                    <div className="grid grid-cols-3 gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setTransportAdjType('exact');
                          setTransportAdjAmount(0);
                        }}
                        className={`h-8 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                          transportAdjType === 'exact'
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <Equal className="w-3 h-3" />
                        <span>{t('adj_mode_exact')}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setTransportAdjType('extra')}
                        className={`h-8 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                          transportAdjType === 'extra'
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <TrendingUp className="w-3 h-3" />
                        <span>{t('adj_mode_extra')}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setTransportAdjType('less')}
                        className={`h-8 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                          transportAdjType === 'less'
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <TrendingDown className="w-3 h-3" />
                        <span>{t('adj_mode_less')}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {transportAdjType !== 'exact' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-blue-200/50 dark:border-blue-800/40">
                    <div>
                      <label className="block text-[10px] font-bold text-blue-800 dark:text-blue-300 mb-0.5">
                        {t('transport_adj_amount_lbl')}
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={transportAdjAmount}
                        onChange={(e) => setTransportAdjAmount(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full h-8 px-2 font-mono text-xs font-black text-blue-700 bg-white dark:bg-slate-900 border border-blue-300 dark:border-blue-700 rounded-lg"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 mb-0.5">
                        {t('transport_adj_reason_lbl')}
                      </label>
                      <select
                        value={transportAdjReason}
                        onChange={(e) => setTransportAdjReason(e.target.value)}
                        className="w-full h-8 px-2 text-[10px] font-medium bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
                      >
                        <option value="reason_trans_door">{t('reason_trans_door')}</option>
                        <option value="reason_trans_storage">{t('reason_trans_storage')}</option>
                        <option value="reason_trans_discount">{t('reason_trans_discount')}</option>
                        <option value="reason_trans_other">{t('reason_trans_other')}</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* LIVE FINANCIAL CALCULATION MATRIX & NET RESULT */}
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-800/80 space-y-2 shadow-inner">
                <div className="text-xs font-bold text-amber-950 dark:text-amber-100 flex items-center justify-between border-b border-amber-200 dark:border-amber-800 pb-2">
                  <span>{t('breakdown_matrix_cash_collected')}</span>
                  <span className="font-mono text-sm font-black">{customTotalCollected.toLocaleString()} AFN</span>
                </div>
                <div className="flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
                  <span>{t('breakdown_matrix_branch_commission')}</span>
                  <span className="font-mono font-bold">- {effectiveCommission.toLocaleString()} AFN</span>
                </div>
                {effectiveTransport > 0 && (
                  <div className="flex items-center justify-between text-xs text-blue-800 dark:text-blue-300">
                    <span>{t('breakdown_matrix_transport_fee')}</span>
                    <span className="font-mono font-bold">{effectiveTransport.toLocaleString()} AFN</span>
                  </div>
                )}

                <div className="pt-2 border-t border-amber-200 dark:border-amber-800 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-black text-amber-950 dark:text-amber-100">
                      {t('breakdown_matrix_net_hq')}
                    </div>
                    <div className="text-[10px] text-amber-700 dark:text-amber-400 font-mono">
                      {customTotalCollected} - {effectiveCommission} = {calculatedNetToHq} AFN
                    </div>
                  </div>
                  <div className="text-xl font-black text-amber-700 dark:text-amber-300 font-mono">
                    {calculatedNetToHq.toLocaleString()} AFN
                  </div>
                </div>

                {/* Money Distribution Bar */}
                <div className="pt-1 space-y-1">
                  <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                    <span>{t('branch_kept_lbl')}: {effectiveCommission} AFN</span>
                    <span>{t('hq_net_lbl')}: {calculatedNetToHq} AFN</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full flex overflow-hidden">
                    <div 
                      style={{ width: `${Math.min(100, Math.round((effectiveCommission / (customTotalCollected || 1)) * 100))}%` }}
                      className="bg-emerald-500 h-full" 
                    />
                    <div 
                      style={{ flex: 1 }}
                      className="bg-amber-400 h-full" 
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Transfer Details Form */}
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('lbl_payment_method')}:
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
                    {t('method_sarafi_hawala')}
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
                    {t('method_bank_transfer')}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t('lbl_sarafi_ref_no')}:
                  </label>
                  <input
                    type="text"
                    value={refNumber}
                    onChange={(e) => setRefNumber(e.target.value)}
                    className="w-full h-9 px-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-mono text-xs"
                    placeholder={t('ph_sarafi_hawala') || "HAW-90412"}
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t('lbl_sarafi_agent_bank')}:
                  </label>
                  <input
                    type="text"
                    value={agentName}
                    onChange={(e) => setAgentName(e.target.value)}
                    className="w-full h-9 px-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                    placeholder={t('ph_sarafi_bank') || "Sarafi Shamsi / Azizi Bank"}
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t('lbl_submission_notes')}:
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl resize-none text-xs"
                  placeholder={t('placeholder_notes_hq')}
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
                <span>{t('btn_submit_to_main_branch')} ({calculatedNetToHq.toLocaleString()} AFN)</span>
              </button>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition-colors cursor-pointer text-xs"
              >
                {t('btn_cancel')}
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
                  {t('confirm_funds_received_title')}
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
                <span>{t('th_batch_num')}:</span>
                <span className="font-mono">{confirmModalTransfer.batchNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>{t('th_originator_branch')}:</span>
                <span className="font-bold">{confirmModalTransfer.fromBranchName}</span>
              </div>
              <div className="flex justify-between">
                <span>{t('th_remit_collected')}:</span>
                <span>{confirmModalTransfer.totalCollectedAfn.toLocaleString()} AFN</span>
              </div>
              <div className="flex justify-between text-emerald-700 dark:text-emerald-400">
                <span>{t('stat_branch_retained_comm')}:</span>
                <span>{confirmModalTransfer.totalCommissionKeptAfn.toLocaleString()} AFN</span>
              </div>
              <div className="flex justify-between text-base font-black text-emerald-800 dark:text-emerald-300 pt-2 border-t border-emerald-200 dark:border-emerald-800">
                <span>{t('net_funds_received_hq')}:</span>
                <span className="font-mono">{confirmModalTransfer.netRemittanceAmountAfn.toLocaleString()} AFN</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t('hq_confirmation_remark_lbl')}:
              </label>
              <textarea
                rows={2}
                value={confirmationNote}
                onChange={(e) => setConfirmationNote(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                placeholder={t('placeholder_confirmed_hq')}
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleConfirmSubmit}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-colors cursor-pointer flex items-center justify-center gap-2 text-xs"
              >
                <Check className="w-4 h-4" />
                <span>{t('btn_confirm_receipt_of')} {confirmModalTransfer.netRemittanceAmountAfn.toLocaleString()} AFN</span>
              </button>
              <button
                type="button"
                onClick={() => setConfirmModalTransfer(null)}
                className="px-4 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs cursor-pointer"
              >
                {t('btn_cancel')}
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
                {t('reject_remittance_title')}
              </h3>
              <button
                onClick={() => setRejectModalTransfer(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400">
              {t('reject_remittance_desc')} <strong>{rejectModalTransfer.batchNumber}</strong>.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t('reason_for_rejection_lbl')}:
              </label>
              <textarea
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                placeholder={t('placeholder_reject_reason')}
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleRejectSubmit}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-md transition-colors cursor-pointer text-xs"
              >
                {t('btn_reject_send_back')}
              </button>
              <button
                type="button"
                onClick={() => setRejectModalTransfer(null)}
                className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs cursor-pointer"
              >
                {t('btn_cancel')}
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
                <span>{t('official_remittance_voucher_title')}</span>
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
                      {t('voucher_brand_sub')}
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
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">{t('originating_branch_lbl')}:</span>
                  <strong className="text-slate-900">{viewDetailTransfer.fromBranchName}</strong>
                  <div className="text-[10px] text-slate-600">{t('by_lbl')}: {viewDetailTransfer.submittedByUserName}</div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">{t('destination_hq_lbl')}:</span>
                  <strong className="text-slate-900">{viewDetailTransfer.toBranchName}</strong>
                  <div className="text-[10px] text-slate-600">{t('admin_central_treasury_lbl')}</div>
                </div>
              </div>

              {/* Financial Breakdown Table */}
              <table className="w-full border-collapse text-xs border border-slate-200">
                <tbody>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <td className="p-2 font-bold text-slate-700">{t('voucher_total_collected_lbl')}:</td>
                    <td className="p-2 font-mono font-bold text-end">{viewDetailTransfer.totalCollectedAfn.toLocaleString()} AFN</td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="p-2 font-bold text-emerald-700">{t('voucher_deducted_receiver_comm')}:</td>
                    <td className="p-2 font-mono font-bold text-emerald-700 text-end">- {viewDetailTransfer.totalCommissionKeptAfn.toLocaleString()} AFN</td>
                  </tr>
                  <tr className="bg-amber-50/60 font-black text-amber-900 text-sm">
                    <td className="p-2.5">{t('voucher_net_remitted_hq')}:</td>
                    <td className="p-2.5 font-mono text-end text-base text-amber-700">{viewDetailTransfer.netRemittanceAmountAfn.toLocaleString()} AFN</td>
                  </tr>
                </tbody>
              </table>

              {/* Transfer Method Info */}
              <div className="grid grid-cols-2 gap-2 text-[11px] p-2 bg-slate-50 rounded border border-slate-200">
                <div>
                  <span className="text-slate-500">{t('lbl_payment_method')}: </span>
                  <strong className="capitalize">{viewDetailTransfer.paymentMethod.replace('_', ' ')}</strong>
                </div>
                <div>
                  <span className="text-slate-500">{t('lbl_sarafi_ref_no')}: </span>
                  <strong className="font-mono">{viewDetailTransfer.referenceNumber || 'N/A'}</strong>
                </div>
                {viewDetailTransfer.transferAgentName && (
                  <div className="col-span-2">
                    <span className="text-slate-500">{t('lbl_sarafi_agent_bank')}: </span>
                    <strong>{viewDetailTransfer.transferAgentName}</strong>
                  </div>
                )}
              </div>

              {/* Status and Signatures */}
              <div className="pt-2 border-t border-slate-200 grid grid-cols-2 gap-6 text-[10px] text-center">
                <div className="border-t border-dashed border-slate-400 pt-2 mt-4">
                  <div className="font-bold">{t('branch_officer_sign_stamp')}</div>
                  <div className="text-slate-500 mt-1">{viewDetailTransfer.fromBranchName}</div>
                </div>
                <div className="border-t border-dashed border-slate-400 pt-2 mt-4">
                  <div className="font-bold">{t('head_office_finance_approval')}</div>
                  <div className="text-slate-500 mt-1">
                    {viewDetailTransfer.confirmedByUserName ? `${t('status_hq_confirmed')} (${viewDetailTransfer.confirmedByUserName})` : t('status_awaiting_hq')}
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
                <span>{t('btn_print_voucher')}</span>
              </button>
              <button
                type="button"
                onClick={() => setViewDetailTransfer(null)}
                className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs cursor-pointer"
              >
                {t('btn_close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delivery Payment Settlement & Price Adjustment Modal */}
      <DeliveryPaymentSettlementModal
        shipment={paymentSettlementShipment}
        onClose={() => setPaymentSettlementShipment(null)}
      />

    </div>
  );
};
