import React, { useState, useEffect, useMemo } from 'react';
import { 
  Boxes, 
  Search, 
  Printer, 
  Eye, 
  FileSpreadsheet,
  PackagePlus,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  MapPin, 
  Clock, 
  DollarSign, 
  Loader2, 
  FileCheck, 
  Calendar,
  X, 
  Lock, 
  Send, 
  Inbox,
  CheckCircle2,
  Check,
  Scale,
  ArrowRightLeft,
  AlertCircle,
  AlertTriangle,
  ShieldCheck,
  RefreshCw,
  PhoneOff,
  MessageSquareWarning,
  Edit3,
  Trash2,
  Truck,
  CheckSquare,
  HelpCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useI18n } from '../context/I18nContext';
import { Shipment, ShipmentStatus, PaymentStatus } from '../types';
import { generateThermalLabelPdf } from '../utils/pdfExport';
import { ShipmentStatusTimeline } from './ShipmentStatusTimeline';
import { EditShipmentModal } from './EditShipmentModal';
import { CombinedBranchReceiptModal } from './CombinedBranchReceiptModal';
import { ReportDeliveryIssueModal } from './ReportDeliveryIssueModal';

type SortField = 'date' | 'weight' | 'amount' | 'cn' | 'status';
type SortOrder = 'asc' | 'desc';
type InventoryTab = 'all' | 'in_transit' | 'arrived' | 'delivered' | 'submitted' | 'prebooked';

export const ParcelInventory: React.FC = () => {
  const { language, t } = useI18n();
  const { 
    filteredShipments, 
    branches, 
    currentUser,
    activeBranchId,
    canUserUpdateStatus,
    setSelectedShipmentForReceipt, 
    setActiveView,
    updateShipmentStatus,
    reportDeliveryIssue,
    confirmCustomerPreBooking,
    submitParcelForCollection,
    deleteShipment,
    syncWithDatabase,
    isSyncing
  } = useApp();

  // Auto-sync parcels immediately on mount and poll periodically
  useEffect(() => {
    syncWithDatabase();

    const pollInterval = setInterval(() => {
      syncWithDatabase();
    }, 25000);

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'armaghan_shipments' || e.key === 'armaghan_sync_signal') {
        syncWithDatabase();
      }
    };
    window.addEventListener('storage', handleStorage);

    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('armaghan_cargo_sync');
      bc.onmessage = () => {
        syncWithDatabase();
      };
    } catch (e) {
      // BroadcastChannel unsupported fallback
    }

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('storage', handleStorage);
      if (bc) bc.close();
    };
  }, [syncWithDatabase, activeBranchId]);

  // Visual Interactive Step-by-Step Guide State
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 180);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedDestinationBranch, setSelectedDestinationBranch] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<InventoryTab>('all');

  // Sorting state
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Modals state
  const [statusModalShipment, setStatusModalShipment] = useState<Shipment | null>(null);
  const [statusChoice, setStatusChoice] = useState<ShipmentStatus>('in_transit');
  const [statusNote, setStatusNote] = useState('');
  const [statusAutoSubmitBill, setStatusAutoSubmitBill] = useState(true);
  const [deliveryCollectedAmount, setDeliveryCollectedAmount] = useState<number>(0);

  const [detailsModalShipment, setDetailsModalShipment] = useState<Shipment | null>(null);

  // Pre-booking confirmation modal state
  const [confirmModalShipment, setConfirmModalShipment] = useState<Shipment | null>(null);
  const [weighedWeight, setWeighedWeight] = useState<number>(1);
  const [weighedPieces, setWeighedPieces] = useState<number>(1);
  const [modalProductPrice, setModalProductPrice] = useState<number>(1000);
  const [modalServiceFee, setModalServiceFee] = useState<number>(150);
  const [modalDiscountAmount, setModalDiscountAmount] = useState<number>(0);
  const [customDestCommission, setCustomDestCommission] = useState<number>(70);
  const [confirmedPaymentStatus, setConfirmedPaymentStatus] = useState<PaymentStatus>('to_pay');
  const [editedSenderName, setEditedSenderName] = useState('');
  const [editedSenderPhone, setEditedSenderPhone] = useState('');
  const [editedReceiverName, setEditedReceiverName] = useState('');
  const [editedReceiverPhone, setEditedReceiverPhone] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [modalTargetStatus, setModalTargetStatus] = useState<ShipmentStatus>('booked');

  // One-Time Bill Submission modal state
  const [submissionModalShipment, setSubmissionModalShipment] = useState<Shipment | null>(null);
  const [submissionReference, setSubmissionReference] = useState('');
  const [autoSubmissionDateTime, setAutoSubmissionDateTime] = useState<boolean>(true);
  const [customSubmissionDateTime, setCustomSubmissionDateTime] = useState<string>('');

  const handleOpenSubmissionModal = (s: Shipment) => {
    setSubmissionModalShipment(s);
    setSubmissionReference(`SUB-${s.cnNumber}-${Date.now().toString().slice(-4)}`);
    setAutoSubmissionDateTime(true);
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const localNow = new Date(now.getTime() - offset * 60000);
    setCustomSubmissionDateTime(localNow.toISOString().slice(0, 16));
  };

  // Delivery Issue Reporting Modal
  const [issueModalShipment, setIssueModalShipment] = useState<Shipment | null>(null);
  const [issueType, setIssueType] = useState<string>('no_answer');
  const [issueCustomNote, setIssueCustomNote] = useState<string>('');

  // Combined Branch Bulk Dispatch
  const [isCombinedBranchOpen, setIsCombinedBranchOpen] = useState(false);

  // Admin Edit Parcel Modal
  const [editModalShipment, setEditModalShipment] = useState<Shipment | null>(null);

  // Delete Confirmation state
  const [deleteConfirmShipment, setDeleteConfirmShipment] = useState<Shipment | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Checkbox selection state
  const [selectedParcelIds, setSelectedParcelIds] = useState<Set<string>>(new Set());

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedParcelIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedParcelIds(newSet);
  };

  const toggleAll = () => {
    if (selectedParcelIds.size === processedParcels.length && processedParcels.length > 0) {
      setSelectedParcelIds(new Set());
    } else {
      setSelectedParcelIds(new Set(processedParcels.map(p => p.id)));
    }
  };

  const handleDeleteShipment = async () => {
    if (!deleteConfirmShipment) return;
    setIsDeleting(true);
    try {
      const success = await deleteShipment(deleteConfirmShipment.id);
      if (success) {
        setDeleteConfirmShipment(null);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Base list of shipments
  const baseShipmentList = filteredShipments;

  // Filter and sort parcels
  const processedParcels = useMemo(() => {
    let result = baseShipmentList.filter(s => {
      const query = debouncedSearchTerm.toLowerCase().trim();
      const matchesSearch = !query || 
        s.cnNumber.toLowerCase().includes(query) ||
        s.sender.name.toLowerCase().includes(query) ||
        s.sender.phone.includes(query) ||
        s.sender.city.toLowerCase().includes(query) ||
        s.receiver.name.toLowerCase().includes(query) ||
        s.receiver.phone.includes(query) ||
        s.receiver.city.toLowerCase().includes(query) ||
        s.packageInfo.description.toLowerCase().includes(query);

      const matchesStatus = selectedStatus === 'all' || s.status === selectedStatus;
      const matchesDestinationBranch = selectedDestinationBranch === 'all' || s.destinationBranchId === selectedDestinationBranch;

      let matchesTab = true;
      if (activeTab === 'in_transit') {
        matchesTab = s.status === 'in_transit';
      } else if (activeTab === 'arrived') {
        matchesTab = s.status === 'received_at_branch' || s.status === 'out_for_delivery';
      } else if (activeTab === 'delivered') {
        matchesTab = s.status === 'delivered';
      } else if (activeTab === 'submitted') {
        matchesTab = !!s.customerSubmissionAt;
      } else if (activeTab === 'prebooked') {
        matchesTab = s.status === 'pre_booked' || s.status === 'verified';
      }

      return matchesSearch && matchesStatus && matchesDestinationBranch && matchesTab;
    });

    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'date':
          comparison = new Date(a.bookedAt).getTime() - new Date(b.bookedAt).getTime();
          break;
        case 'weight':
          comparison = a.packageInfo.weightKg - b.packageInfo.weightKg;
          break;
        case 'amount':
          comparison = a.financials.totalAmount - b.financials.totalAmount;
          break;
        case 'cn':
          comparison = a.cnNumber.localeCompare(b.cnNumber);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [baseShipmentList, debouncedSearchTerm, selectedStatus, selectedDestinationBranch, activeTab, sortField, sortOrder]);

  // Open status modal
  const handleOpenStatusModal = (shipment: Shipment) => {
    const perm = canUserUpdateStatus(shipment);
    setStatusModalShipment(shipment);
    setStatusNote('');
    setDeliveryCollectedAmount(shipment.financials?.totalAmount || 0);
    setStatusAutoSubmitBill(true);

    if (perm.allowedStatuses.length > 0) {
      setStatusChoice(perm.allowedStatuses[0]);
    }
  };

  // Save status progression
  const handleSaveStatus = async () => {
    if (!statusModalShipment) return;
    let finalNote = statusNote.trim();

    if (statusChoice === 'delivered') {
      const moneyNote = `Delivered to consignee. Amount: ${deliveryCollectedAmount} AFN`;
      finalNote = finalNote ? `${finalNote} | ${moneyNote}` : moneyNote;
    }

    const ok = await updateShipmentStatus(statusModalShipment.id, statusChoice, finalNote || undefined);
    if (ok) {
      if (statusChoice === 'delivered' && statusAutoSubmitBill && !statusModalShipment.customerSubmissionAt) {
        const autoRef = `SUB-${statusModalShipment.cnNumber}-${Date.now().toString().slice(-4)}`;
        submitParcelForCollection(statusModalShipment.id, autoRef, new Date().toISOString());
      }
      setStatusModalShipment(null);
    }
  };

  // Open Pre-booking confirmation modal
  const handleOpenConfirmPreBooking = (shipment: Shipment) => {
    setConfirmModalShipment(shipment);
    setWeighedWeight(shipment.packageInfo.weightKg || 1);
    setWeighedPieces(shipment.packageInfo.pieces || 1);
    const price = shipment.financials?.productPrice || shipment.packageInfo?.declaredValueAfn || shipment.financials?.totalAmount || 1000;
    setModalProductPrice(price);
    setModalServiceFee(shipment.financials?.serviceFee || 150);
    setModalDiscountAmount(shipment.financials?.discountAmount || 0);
    setCustomDestCommission(shipment.destBranchCommission || shipment.financials?.destBranchCommission || 70);
    setConfirmedPaymentStatus(shipment.financials.paymentStatus || 'to_pay');
    setEditedSenderName(shipment.sender.name);
    setEditedSenderPhone(shipment.sender.phone);
    setEditedReceiverName(shipment.receiver.name);
    setEditedReceiverPhone(shipment.receiver.phone);
    setEditedDescription(shipment.packageInfo.description);
    setModalTargetStatus('booked');
  };

  // Confirm pre-booking
  const handleConfirmPreBookingSubmit = () => {
    if (!confirmModalShipment) return;
    const ok = confirmCustomerPreBooking(confirmModalShipment.id, {
      weightKg: weighedWeight,
      pieces: weighedPieces,
      senderName: editedSenderName,
      senderPhone: editedSenderPhone,
      receiverName: editedReceiverName,
      receiverPhone: editedReceiverPhone,
      description: editedDescription,
      productPrice: modalProductPrice,
      serviceFee: modalServiceFee,
      discountAmount: modalDiscountAmount,
      destBranchCommission: customDestCommission,
      paymentStatus: confirmedPaymentStatus,
      status: modalTargetStatus,
      originBranchId: confirmModalShipment.originBranchId,
      destinationBranchId: confirmModalShipment.destinationBranchId
    });
    if (ok) {
      setConfirmModalShipment(null);
    }
  };

  // Handle Delivery Issue
  const handleOpenIssueModal = (shipment: Shipment) => {
    setIssueModalShipment(shipment);
    setIssueType('no_answer');
    setIssueCustomNote('');
  };

  const handleConfirmIssue = () => {
    if (!issueModalShipment) return;
    reportDeliveryIssue(issueModalShipment.id, issueType, issueCustomNote);
    setIssueModalShipment(null);
  };

  // Submit Parcel Bill
  const handleSubmitParcel = () => {
    if (!submissionModalShipment) return;
    const submittedTimestamp = autoSubmissionDateTime 
      ? new Date().toISOString() 
      : (customSubmissionDateTime ? new Date(customSubmissionDateTime).toISOString() : new Date().toISOString());
    if (submitParcelForCollection(submissionModalShipment.id, submissionReference, submittedTimestamp)) {
      setSubmissionModalShipment(null);
      setSubmissionReference('');
      setAutoSubmissionDateTime(true);
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = [
      'CN Number', 'Status', 'Origin Branch', 'Destination Branch',
      'Sender Name', 'Sender Phone', 'Sender City',
      'Receiver Name', 'Receiver Phone', 'Receiver City',
      'Weight (KG)', 'Pieces',
      'Total Amount (AFN)', 'Payment Status', 'Booking Date',
      'Bill Submission Status', 'Submitted At (Date & Time)', 'Submission Ref', 'Submitted By'
    ];

    const rows = processedParcels.map(p => {
      const orig = branches.find(b => b.id === p.originBranchId)?.name || p.sender.city;
      const dest = branches.find(b => b.id === p.destinationBranchId)?.name || p.receiver.city;
      return [
        p.cnNumber,
        p.status,
        `"${orig}"`,
        `"${dest}"`,
        `"${p.sender.name}"`,
        `"${p.sender.phone}"`,
        `"${p.sender.city}"`,
        `"${p.receiver.name}"`,
        `"${p.receiver.phone}"`,
        `"${p.receiver.city}"`,
        p.packageInfo.weightKg,
        p.packageInfo.pieces,
        p.financials.totalAmount,
        p.financials.paymentStatus,
        new Date(p.bookedAt).toISOString(),
        p.customerSubmissionAt ? 'Submitted' : 'Not Submitted',
        p.customerSubmissionAt ? new Date(p.customerSubmissionAt).toISOString() : '',
        `"${p.customerSubmissionReference || ''}"`,
        `"${p.customerSubmissionBy || ''}"`
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Consignments_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintThermalLabel = (s: Shipment) => {
    const originB = branches.find(b => b.id === s.originBranchId);
    const destB = branches.find(b => b.id === s.destinationBranchId);
    generateThermalLabelPdf(s, originB, destB);
  };

  const currentBranchName = currentUser.role === 'super_admin' 
    ? (activeBranchId === 'all' ? t('all_branches') : branches.find(b => b.id === activeBranchId)?.name)
    : branches.find(b => b.id === currentUser.branchId)?.name;

  const prebookedCount = baseShipmentList.filter(s => s.status === 'pre_booked' || s.status === 'verified').length;
  const inTransitCount = baseShipmentList.filter(s => s.status === 'in_transit').length;
  const arrivedCount = baseShipmentList.filter(s => s.status === 'received_at_branch' || s.status === 'out_for_delivery').length;
  const deliveredCount = baseShipmentList.filter(s => s.status === 'delivered').length;
  const submittedParcelCount = baseShipmentList.filter(s => !!s.customerSubmissionAt).length;

  const isFiltered = searchTerm !== '' || selectedStatus !== 'all' || selectedDestinationBranch !== 'all';

  return (
    <div className="space-y-5 animate-in fade-in duration-300" id="parcel-inventory-page">
      
      {/* 1. Header Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center font-bold">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                {t('parcels_title') || 'Parcel Management'}
              </h1>
              {activeBranchId !== 'all' && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800">
                  {currentBranchName}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('inventory_subtitle') || 'Book, dispatch, track, deliver, and record one-time bill submissions'}
            </p>
          </div>
        </div>

        {/* Top actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* How It Works Guide Toggle */}
          <button
            onClick={() => setShowHowItWorks(!showHowItWorks)}
            className="px-3 py-2 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold rounded-xl text-xs flex items-center gap-1.5 border border-indigo-200 dark:border-indigo-800 transition-all cursor-pointer shadow-2xs"
            title="Learn the simple 4-step lifecycle of a parcel"
          >
            <HelpCircle className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>{showHowItWorks ? 'Hide Guide' : 'How Parcel System Works'}</span>
            {showHowItWorks ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {/* New Booking Button */}
          <button
            onClick={() => setActiveView('booking')}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <PackagePlus className="w-4 h-4" />
            <span>{t('new_booking_btn') || 'Book New Parcel'}</span>
          </button>

          {/* Combined Branch Bulk Dispatch */}
          <button
            onClick={() => setIsCombinedBranchOpen(true)}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            title="Bulk Dispatch & Bag Stickers"
          >
            <Boxes className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Bulk Dispatch</span>
          </button>

          {/* Export to CSV */}
          <button
            onClick={exportToCSV}
            className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-xl text-xs flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
            title="Export Table as CSV"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden md:inline">CSV</span>
          </button>
        </div>
      </div>

      {/* 2. SIMPLE 4-STEP SYSTEM GUIDE (Visible / Collapsible) */}
      {showHowItWorks && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-indigo-50/90 via-purple-50/60 to-blue-50/90 dark:from-indigo-950/40 dark:via-purple-950/30 dark:to-blue-950/40 border border-indigo-200 dark:border-indigo-800/80 shadow-xs space-y-3 animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between pb-2 border-b border-indigo-200/60 dark:border-indigo-800/60">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse"></span>
              <h2 className="text-xs sm:text-sm font-black text-indigo-950 dark:text-indigo-100">
                How a Parcel Moves in the System (Simplified 4-Step Flow)
              </h2>
            </div>
            <button 
              onClick={() => setShowHowItWorks(false)}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-bold cursor-pointer"
            >
              Close Guide ✕
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
            {/* Step 1 */}
            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900/60 shadow-2xs space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 font-black text-xs flex items-center justify-center">1</span>
                <h3 className="font-bold text-xs text-slate-900 dark:text-white">Booking (ثبت بار)</h3>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                Origin branch enters sender, receiver, weight, and price. Official Waybill (CN #) is issued and receipt is printed.
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900/60 shadow-2xs space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-black text-xs flex items-center justify-center">2</span>
                <h3 className="font-bold text-xs text-slate-900 dark:text-white">Dispatch (ارسال در مسیر)</h3>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                Parcel is dispatched on highway transport. Status changes to <strong>In Transit</strong> so customers can track online.
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900/60 shadow-2xs space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-black text-xs flex items-center justify-center">3</span>
                <h3 className="font-bold text-xs text-slate-900 dark:text-white">Arrived at Hub (رسیده به نمایندگی)</h3>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                Destination branch scans the incoming cargo into warehouse. Status updates to <strong>Received at Hub</strong>.
              </p>
            </div>

            {/* Step 4 */}
            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900/60 shadow-2xs space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-black text-xs flex items-center justify-center">4</span>
                <h3 className="font-bold text-xs text-slate-900 dark:text-white">Delivery & Bill (تحویل و تسلیمی)</h3>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                Cargo handed to receiver (COD collected). Click <strong>Submit Bill</strong> to record one-time submission with automatic date & time.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 3. SIMPLIFIED LIFECYCLE TABS */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex p-1 rounded-2xl bg-slate-200/80 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold flex-wrap gap-1">
            {/* All */}
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${activeTab === 'all' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
            >
              All Parcels ({baseShipmentList.length})
            </button>

            {/* In Transit */}
            <button
              onClick={() => setActiveTab('in_transit')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${activeTab === 'in_transit' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>In Transit ({inTransitCount})</span>
            </button>

            {/* Arrived at Hub */}
            <button
              onClick={() => setActiveTab('arrived')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${activeTab === 'arrived' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
            >
              <Inbox className="w-3.5 h-3.5" />
              <span>At Hub ({arrivedCount})</span>
            </button>

            {/* Delivered */}
            <button
              onClick={() => setActiveTab('delivered')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${activeTab === 'delivered' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
            >
              <Check className="w-3.5 h-3.5" />
              <span>Delivered ({deliveredCount})</span>
            </button>

            {/* Bill Submitted */}
            <button
              onClick={() => setActiveTab('submitted')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${activeTab === 'submitted' ? 'bg-blue-600 text-white shadow-xs' : 'text-blue-600 dark:text-blue-400 hover:text-blue-700'}`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Submitted Bills</span>
              {submittedParcelCount > 0 && (
                <span className="px-1.5 py-0.2 bg-blue-100 text-blue-700 rounded-full text-[10px] font-black">
                  {submittedParcelCount}
                </span>
              )}
            </button>

            {/* Pre-Bookings */}
            {prebookedCount > 0 && (
              <button
                onClick={() => setActiveTab('prebooked')}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${activeTab === 'prebooked' ? 'bg-purple-600 text-white shadow-xs' : 'text-purple-600 dark:text-purple-400 hover:text-purple-700'}`}
              >
                <Scale className="w-3.5 h-3.5" />
                <span>Pre-Bookings ({prebookedCount})</span>
              </button>
            )}
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Showing <strong>{processedParcels.length}</strong> of {baseShipmentList.length} parcels
          </div>
        </div>

        {/* 4. CLEAN SEARCH & COMPACT FILTERS */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by CN #, Sender, Receiver, Phone..."
              className="w-full h-9.5 ps-9 pe-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute end-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div className="min-w-[150px]">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full h-9.5 px-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 cursor-pointer font-medium"
            >
              <option value="all">Status: All</option>
              <option value="booked">Booked</option>
              <option value="in_transit">In Transit</option>
              <option value="received_at_branch">At Destination Hub</option>
              <option value="out_for_delivery">Out for Delivery</option>
              <option value="delivered">Delivered</option>
              <option value="pre_booked">Pre-Booked</option>
            </select>
          </div>

          {/* Destination Branch Filter */}
          <div className="min-w-[170px]">
            <select
              value={selectedDestinationBranch}
              onChange={(e) => setSelectedDestinationBranch(e.target.value)}
              className="w-full h-9.5 px-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 cursor-pointer font-medium"
            >
              <option value="all">Destination: All Branches</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name} ({b.city})</option>
              ))}
            </select>
          </div>

          {/* Clear Filters Button */}
          {isFiltered && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedStatus('all');
                setSelectedDestinationBranch('all');
              }}
              className="px-3 py-1.5 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg font-bold transition-colors cursor-pointer"
            >
              Reset Filters ✕
            </button>
          )}
        </div>
      </div>

      {/* 5. CLEAN PARCEL INVENTORY TABLE */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs border-collapse">
            <thead className="bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold uppercase text-[10px] tracking-wider select-none">
              <tr>
                <th className="p-3 w-8">
                  <input 
                    type="checkbox" 
                    className="rounded border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-red-600 focus:ring-red-500 cursor-pointer"
                    checked={processedParcels.length > 0 && selectedParcelIds.size === processedParcels.length}
                    onChange={toggleAll}
                  />
                </th>
                <th className="p-3 text-start cursor-pointer" onClick={() => handleSort('cn')}>
                  <div className="flex items-center gap-1">
                    <span>{t('th_cn') || 'Waybill #'}</span>
                    {sortField === 'cn' ? (sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-red-600" /> : <ArrowDown className="w-3 h-3 text-red-600" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}
                  </div>
                </th>
                <th className="p-3 text-start">{t('th_route') || 'Route'}</th>
                <th className="p-3 text-start">{t('th_sender') || 'Sender'}</th>
                <th className="p-3 text-start">{t('th_receiver') || 'Receiver'}</th>
                <th className="p-3 text-center cursor-pointer" onClick={() => handleSort('weight')}>
                  <div className="flex items-center justify-center gap-1">
                    <span>Weight / Pcs</span>
                    {sortField === 'weight' ? (sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-red-600" /> : <ArrowDown className="w-3 h-3 text-red-600" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}
                  </div>
                </th>
                <th className="p-3 text-center cursor-pointer" onClick={() => handleSort('amount')}>
                  <div className="flex items-center justify-center gap-1">
                    <span>Amount & Bill</span>
                    {sortField === 'amount' ? (sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-red-600" /> : <ArrowDown className="w-3 h-3 text-red-600" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}
                  </div>
                </th>
                <th className="p-3 text-center cursor-pointer" onClick={() => handleSort('status')}>
                  <div className="flex items-center justify-center gap-1">
                    <span>{t('th_status') || 'Status'}</span>
                    {sortField === 'status' ? (sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-red-600" /> : <ArrowDown className="w-3 h-3 text-red-600" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}
                  </div>
                </th>
                <th className="p-3 text-end">{t('th_actions') || 'Operations'}</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {processedParcels.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-10 text-center text-slate-400">
                    <Boxes className="w-9 h-9 mx-auto mb-2 opacity-30" />
                    <p className="font-bold text-xs">{t('no_shipments_found') || 'No parcels found'}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Try searching with a different keyword or resetting filters</p>
                  </td>
                </tr>
              ) : (
                processedParcels.map(s => {
                  const orig = branches.find(b => b.id === s.originBranchId);
                  const dest = branches.find(b => b.id === s.destinationBranchId);
                  const updatePerm = canUserUpdateStatus(s);
                  const isPrebooked = s.status === 'pre_booked';
                  const isSubmitted = !!s.customerSubmissionAt;
                  const canSubmitBill = (s.status === 'received_at_branch' || s.status === 'out_for_delivery' || s.status === 'delivered') && !isSubmitted;

                  return (
                    <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      {/* Checkbox */}
                      <td className="p-3 w-8" onClick={(e) => e.stopPropagation()}>
                        <input 
                          type="checkbox" 
                          className="rounded border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-red-600 focus:ring-red-500 cursor-pointer"
                          checked={selectedParcelIds.has(s.id)}
                          onChange={() => toggleSelection(s.id)}
                        />
                      </td>

                      {/* Waybill / CN */}
                      <td className="p-3 font-mono">
                        <div className="font-bold text-red-600 dark:text-red-400 flex items-center gap-1.5">
                          <span>{s.cnNumber}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {new Date(s.bookedAt).toLocaleDateString()}
                        </div>
                        {isPrebooked && (
                          <span className="inline-block mt-1 px-1.5 py-0.2 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-sans font-bold text-[8.5px]">
                            Online Pre-Book
                          </span>
                        )}
                      </td>

                      {/* Route */}
                      <td className="p-3">
                        <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                          <span>{orig?.city || s.sender.city}</span>
                          <span className="text-slate-400 text-[10px]">➔</span>
                          <span>{dest?.city || s.receiver.city}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {orig?.code || 'ORG'} - {dest?.code || 'DST'}
                        </div>
                      </td>

                      {/* Sender */}
                      <td className="p-3">
                        <div className="font-bold text-slate-900 dark:text-slate-100 truncate max-w-[130px]">{s.sender.name}</div>
                        <div className="text-[10.5px] font-mono text-slate-500">{s.sender.phone}</div>
                      </td>

                      {/* Receiver */}
                      <td className="p-3">
                        <div className="font-bold text-slate-900 dark:text-slate-100 truncate max-w-[130px]">{s.receiver.name}</div>
                        <div className="text-[10.5px] font-mono text-slate-500">{s.receiver.phone}</div>
                      </td>

                      {/* Cargo Weight & Pieces */}
                      <td className="p-3 text-center">
                        <div className="font-black text-slate-900 dark:text-slate-100 font-mono">
                          {s.packageInfo.weightKg} KG
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {s.packageInfo.pieces} pcs
                        </div>
                      </td>

                      {/* Amount & Bill Submission */}
                      <td className="p-3 text-center">
                        <div className="font-black text-slate-900 dark:text-slate-100 font-mono">
                          {s.financials.totalAmount.toLocaleString()} AFN
                        </div>
                        <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          s.financials.paymentStatus === 'paid' 
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300' 
                            : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                        }`}>
                          {s.financials.paymentStatus === 'paid' ? 'PAID' : 'COD (To-Pay)'}
                        </span>

                        {/* Bill Submission Badge or Quick Trigger */}
                        {isSubmitted ? (
                          <div className="mt-1 flex items-center justify-center gap-1 text-[9.5px] font-bold text-blue-700 dark:text-blue-300" title={`Submitted on: ${s.customerSubmissionAt ? new Date(s.customerSubmissionAt).toLocaleString() : ''} (${s.customerSubmissionReference || ''})`}>
                            <CheckCircle2 className="w-3 h-3 text-blue-600 dark:text-blue-400 shrink-0" />
                            <span>Submitted</span>
                            {s.customerSubmissionAt && (
                              <span className="text-[8.5px] font-mono opacity-75">
                                ({new Date(s.customerSubmissionAt).toLocaleDateString([], { month: 'numeric', day: 'numeric' })})
                              </span>
                            )}
                          </div>
                        ) : canSubmitBill ? (
                          <button
                            onClick={() => handleOpenSubmissionModal(s)}
                            className="mt-1 px-2 py-0.5 rounded-md bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[9.5px] font-bold flex items-center justify-center gap-1 mx-auto cursor-pointer transition-colors"
                            title="Submit Bill with automatic date & time stamp"
                          >
                            <FileCheck className="w-3 h-3 text-blue-600" />
                            <span>Submit Bill</span>
                          </button>
                        ) : null}
                      </td>

                      {/* Status */}
                      <td className="p-3 text-center">
                        {isPrebooked ? (
                          <button
                            onClick={() => handleOpenConfirmPreBooking(s)}
                            className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-2xs flex items-center justify-center gap-1 mx-auto transition-transform active:scale-95 cursor-pointer"
                          >
                            <Scale className="w-3 h-3" />
                            <span>Weigh & Confirm</span>
                          </button>
                        ) : (
                          <div className="flex flex-col items-center gap-1">
                            <button
                              onClick={() => handleOpenStatusModal(s)}
                              className={`px-3 py-1 rounded-full text-[10px] font-bold cursor-pointer transition-transform active:scale-95 shadow-2xs flex items-center justify-center gap-1 mx-auto ${
                                s.status === 'delivered' ? 'bg-emerald-600 text-white hover:bg-emerald-700' :
                                s.status === 'out_for_delivery' ? 'bg-amber-600 text-white hover:bg-amber-700' :
                                s.status === 'received_at_branch' ? 'bg-blue-600 text-white hover:bg-blue-700' :
                                s.status === 'in_transit' ? 'bg-indigo-600 text-white hover:bg-indigo-700' :
                                'bg-slate-600 text-white hover:bg-slate-700'
                              }`}
                            >
                              <span>{s.status.replace(/_/g, ' ')}</span>
                              {updatePerm.canUpdate ? (
                                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                              ) : (
                                <Lock className="w-2.5 h-2.5 text-white/70" />
                              )}
                            </button>

                            {s.deliveryIssue && s.status !== 'delivered' && (
                              <button
                                onClick={() => handleOpenIssueModal(s)}
                                className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 hover:bg-amber-200 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800 flex items-center gap-1 mx-auto cursor-pointer transition-colors"
                                title={`Delivery Issue: ${s.deliveryIssue.reasonText || s.deliveryIssue.type}`}
                              >
                                <AlertTriangle className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                                <span className="truncate max-w-[105px]">{s.deliveryIssue.reasonText || 'Delivery Issue'}</span>
                              </button>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Clean 2-Button Actions: Print & Manage */}
                      <td className="p-3 text-end">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Print Waybill */}
                          <button
                            onClick={() => setSelectedShipmentForReceipt(s)}
                            className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700 shadow-2xs"
                            title={`Print Consignment Waybill (${(s.printCount || 0) === 0 ? 'Original 1-Time Print' : `Re-print #${s.printCount}`})`}
                          >
                            <Printer className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                            <span className="hidden md:inline">Print</span>
                            {(s.printCount || 0) === 0 ? (
                              <span className="px-1.5 py-0.2 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 rounded text-[8.5px] font-black border border-emerald-300 dark:border-emerald-700" title="One-time original print available">
                                1x
                              </span>
                            ) : (
                              <span className="w-3.5 h-3.5 bg-blue-600 text-white rounded-full text-[8.5px] font-black flex items-center justify-center">
                                {s.printCount}
                              </span>
                            )}
                          </button>

                          {/* Manage / Details */}
                          <button
                            onClick={() => setDetailsModalShipment(s)}
                            className="px-2.5 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/60 text-red-700 dark:text-red-300 font-bold text-xs flex items-center gap-1 border border-red-200 dark:border-red-800/60 transition-colors cursor-pointer shadow-2xs"
                            title="Open Parcel Dossier (Full details, tracking, bill submission & actions)"
                          >
                            <Eye className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                            <span>Manage</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: SIMPLE STATUS PROGRESSION MODAL */}
      {statusModalShipment && (() => {
        const updatePerm = canUserUpdateStatus(statusModalShipment);
        const origBranch = branches.find(b => b.id === statusModalShipment.originBranchId);
        const destBranch = branches.find(b => b.id === statusModalShipment.destinationBranchId);

        const stages: { status: ShipmentStatus; label: string; desc: string }[] = [
          { status: 'booked', label: '1. Booked', desc: 'Received & weighed at origin hub' },
          { status: 'in_transit', label: '2. In Transit', desc: 'Dispatched on highway transport' },
          { status: 'received_at_branch', label: '3. At Dest Hub', desc: 'Arrived at destination branch' },
          { status: 'out_for_delivery', label: '4. Out for Delivery', desc: 'Dispatched to consignee' },
          { status: 'delivered', label: '5. Delivered', desc: 'Handed over to receiver & paid' },
        ];

        return (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-4 my-auto animate-in fade-in zoom-in-95">
              
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                    <ArrowRightLeft className="w-4 h-4 text-red-600" />
                    <span>Update Parcel Status</span>
                  </h3>
                  <div className="text-xs font-mono font-bold text-red-600 mt-0.5">
                    {statusModalShipment.cnNumber} ({origBranch?.city || 'Origin'} ➔ {destBranch?.city || 'Dest'})
                  </div>
                </div>
                <button
                  onClick={() => setStatusModalShipment(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Visual 5-Step Path */}
              <div className="grid grid-cols-5 gap-1.5 text-center">
                {stages.map((st, idx) => {
                  const isPassed = ['booked', 'in_transit', 'received_at_branch', 'out_for_delivery', 'delivered'].indexOf(statusModalShipment.status) >= idx;
                  const isCurrent = statusModalShipment.status === st.status;

                  return (
                    <div 
                      key={st.status} 
                      className={`p-2 rounded-xl border text-[10px] flex flex-col justify-between transition-all ${
                        isCurrent
                          ? 'bg-red-600 text-white border-red-600 font-bold shadow-md shadow-red-600/30 ring-2 ring-red-400/50'
                          : isPassed
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <div className="font-bold">{st.label}</div>
                    </div>
                  );
                })}
              </div>

              {/* Status form if authorized */}
              {updatePerm.canUpdate ? (
                <div className="space-y-3.5 text-xs pt-1">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                      Choose Next Status:
                    </label>
                    <select
                      value={statusChoice}
                      onChange={(e) => setStatusChoice(e.target.value as ShipmentStatus)}
                      className="w-full h-10 px-3 font-bold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      {updatePerm.allowedStatuses.map(st => (
                        <option key={st} value={st}>
                          {st === 'booked' && '📦 Booked at Origin (ثبت در مبدا)'}
                          {st === 'in_transit' && '➔ In Transit / Dispatched (در حال انتقال)'}
                          {st === 'received_at_branch' && '✓ Received at Destination Hub (رسید به شعبه مقصد)'}
                          {st === 'out_for_delivery' && '🚚 Out for Final Delivery (توزیع به گیرنده)'}
                          {st === 'delivered' && '★ Delivered to Receiver (تحویل به گیرنده)'}
                          {st === 'returned' && '↩ Returned to Origin (برگشت داده شده)'}
                          {st === 'cancelled' && '✗ Cancelled (لغو شده)'}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* If marking delivered */}
                  {statusChoice === 'delivered' && (
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-bold text-emerald-900 dark:text-emerald-200">
                        <span className="flex items-center gap-1.5">
                          <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Delivery Handover & COD Collection</span>
                        </span>
                        <span className="text-[10px] bg-emerald-200 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-100 px-2 py-0.5 rounded-full font-bold">
                          Handover
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-600 dark:text-slate-300">Amount Collected (AFN):</span>
                        <input
                          type="number"
                          min="0"
                          value={deliveryCollectedAmount}
                          onChange={(e) => setDeliveryCollectedAmount(Math.max(0, Number(e.target.value) || 0))}
                          className="w-32 h-8 px-2 font-mono font-bold text-right bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 rounded-lg text-slate-900 dark:text-white text-xs"
                        />
                      </div>

                      {/* Auto Bill Submission Toggle */}
                      <label className="flex items-center gap-2 pt-1 border-t border-emerald-200 dark:border-emerald-800 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={statusAutoSubmitBill}
                          onChange={(e) => setStatusAutoSubmitBill(e.target.checked)}
                          className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                        <span className="text-[11px] text-emerald-900 dark:text-emerald-200 font-semibold">
                          Record Bill Submission automatically with current date & time
                        </span>
                      </label>
                    </div>
                  )}

                  {/* Note / Remarks */}
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                      Tracking Remarks / Note (Optional):
                    </label>
                    <input
                      type="text"
                      value={statusNote}
                      onChange={(e) => setStatusNote(e.target.value)}
                      placeholder="e.g. Dispatched on highway fleet / Received by customer"
                      className="w-full h-9 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-red-500"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={handleSaveStatus}
                      className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-colors"
                    >
                      Apply Status Change
                    </button>
                    <button
                      onClick={() => setStatusModalShipment(null)}
                      className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>

                  {/* Undelivered / Issue Option */}
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        const s = statusModalShipment;
                        setStatusModalShipment(null);
                        handleOpenIssueModal(s);
                      }}
                      className="w-full py-2.5 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                    >
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>{t('report_not_delivered_title') || 'Report Delivery Issue / Undelivered (ثبت عدم تحویل یا مشکل)'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-300 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold">
                    <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Status Update Locked</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">{updatePerm.reason}</p>
                  <button
                    onClick={() => setStatusModalShipment(null)}
                    className="w-full py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold rounded-xl text-xs transition-colors cursor-pointer mt-2"
                  >
                    Close
                  </button>
                </div>
              )}

            </div>
          </div>
        );
      })()}

      {/* MODAL: ONE-TIME BILL SUBMISSION WITH AUTOMATIC DATE & TIME */}
      {submissionModalShipment && (() => {
        const origB = branches.find(b => b.id === submissionModalShipment.originBranchId);
        const destB = branches.find(b => b.id === submissionModalShipment.destinationBranchId);

        return (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-4 my-auto animate-in fade-in zoom-in-95">
              
              {/* Header */}
              <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <FileCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
                      <span>{t('submit_parcel_for_collection') || 'Record Bill Submission'}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold">One-Time</span>
                    </h3>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                      {submissionModalShipment.cnNumber} · {origB?.city || 'Origin'} ➔ {destB?.city || 'Dest'}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setSubmissionModalShipment(null)} 
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Consignment Brief */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Receiver:</span>
                  <div className="font-bold text-slate-800 dark:text-slate-200">{submissionModalShipment.receiver.name}</div>
                  <div className="text-[11px] font-mono text-slate-500">{submissionModalShipment.receiver.phone}</div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Amount:</span>
                  <div className="font-mono font-black text-slate-900 dark:text-white">
                    {submissionModalShipment.financials.totalAmount.toLocaleString()} AFN
                  </div>
                  <span className="text-[9.5px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                    {submissionModalShipment.financials.paymentStatus.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Automatic Date & Time Section */}
              <div className="p-3.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={autoSubmissionDateTime}
                      onChange={(e) => setAutoSubmissionDateTime(e.target.checked)}
                      className="rounded border-slate-300 dark:border-slate-600 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      {t('auto_submission_datetime') || 'Automatic Submission Date & Time'}
                    </span>
                  </label>
                  {autoSubmissionDateTime && (
                    <span className="inline-flex items-center gap-1 text-[9.5px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      Auto Timestamp Active
                    </span>
                  )}
                </div>

                {autoSubmissionDateTime ? (
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200/80 dark:border-emerald-800/40 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <div>
                        <div className="font-bold text-slate-800 dark:text-slate-100">
                          {new Date().toLocaleDateString(language === 'fa' ? 'fa-AF' : 'en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                        </div>
                        <div className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                          {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400">Current Local Time</span>
                  </div>
                ) : (
                  <div>
                    <input 
                      type="datetime-local" 
                      value={customSubmissionDateTime}
                      onChange={(e) => setCustomSubmissionDateTime(e.target.value)}
                      className="w-full h-9 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                )}
              </div>

              {/* Reference Number */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Submission Reference Number:
                </label>
                <input 
                  value={submissionReference} 
                  onChange={(e) => setSubmissionReference(e.target.value)} 
                  placeholder="e.g. SUB-10291" 
                  className="w-full h-9 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500" 
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button 
                  onClick={handleSubmitParcel} 
                  className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm Bill Submission</span>
                </button>
                <button 
                  onClick={() => setSubmissionModalShipment(null)} 
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer transition-colors"
                >
                  Cancel
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* MODAL: COMPREHENSIVE MANAGE & DOSSIER MODAL */}
      {detailsModalShipment && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-4 my-auto max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95">
            
            {/* Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md bg-red-100 text-red-700 font-mono font-black text-sm">
                    {detailsModalShipment.cnNumber}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    detailsModalShipment.status === 'delivered' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {detailsModalShipment.status.replace(/_/g, ' ').toUpperCase()}
                  </span>
                </div>
                <h2 className="text-base font-black text-slate-900 dark:text-white">
                  Consignment Dossier & Operations
                </h2>
              </div>

              <button
                onClick={() => setDetailsModalShipment(null)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Sender & Receiver Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  <MapPin className="w-4 h-4 text-red-500" />
                  <span>Sender (Origin)</span>
                </div>
                <div className="font-bold text-sm text-slate-900 dark:text-white">{detailsModalShipment.sender.name}</div>
                <div className="font-mono text-slate-600 dark:text-slate-400">{detailsModalShipment.sender.phone}</div>
                <div className="text-[11px] text-slate-500">{detailsModalShipment.sender.address}, {detailsModalShipment.sender.city}</div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  <MapPin className="w-4 h-4 text-emerald-500" />
                  <span>Receiver (Destination)</span>
                </div>
                <div className="font-bold text-sm text-slate-900 dark:text-white">{detailsModalShipment.receiver.name}</div>
                <div className="font-mono text-slate-600 dark:text-slate-400">{detailsModalShipment.receiver.phone}</div>
                <div className="text-[11px] text-slate-500">{detailsModalShipment.receiver.address}, {detailsModalShipment.receiver.city}</div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  <Boxes className="w-4 h-4 text-amber-500" />
                  <span>Cargo Specifications</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-400">Weight:</span>
                    <p className="font-bold font-mono">{detailsModalShipment.packageInfo.weightKg} KG</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Pieces:</span>
                    <p className="font-bold">{detailsModalShipment.packageInfo.pieces} Boxes</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400">Description:</span>
                    <p className="font-medium text-slate-700 dark:text-slate-300">{detailsModalShipment.packageInfo.description || 'General Cargo'}</p>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  <DollarSign className="w-4 h-4 text-emerald-500" />
                  <span>Financial Summary</span>
                </div>
                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between font-bold">
                    <span className="text-slate-500">Total Waybill Fee:</span>
                    <span className="font-mono">{detailsModalShipment.financials.totalAmount.toLocaleString()} AFN</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Payment Status:</span>
                    <span className="font-bold uppercase text-emerald-600">{detailsModalShipment.financials.paymentStatus}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bill Submission Status if submitted */}
            {detailsModalShipment.customerSubmissionAt && (
              <div className="p-3.5 rounded-2xl bg-blue-50/90 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/80 space-y-1.5">
                <div className="flex items-center justify-between pb-1 border-b border-blue-200/60 dark:border-blue-800/60">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-blue-950 dark:text-blue-100">
                    <FileCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span>One-Time Bill Submission Record</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 font-bold text-[10px]">
                    Recorded
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs pt-1">
                  <div>
                    <span className="text-[10px] text-blue-700/80 dark:text-blue-300/80 font-semibold">Submitted Date & Time:</span>
                    <div className="font-mono font-bold text-slate-900 dark:text-white flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3 text-blue-600" />
                      <span>{new Date(detailsModalShipment.customerSubmissionAt).toLocaleString()}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] text-blue-700/80 dark:text-blue-300/80 font-semibold">Reference:</span>
                    <div className="font-mono font-bold text-slate-900 dark:text-white mt-0.5">
                      {detailsModalShipment.customerSubmissionReference || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] text-blue-700/80 dark:text-blue-300/80 font-semibold">Recorded By:</span>
                    <div className="font-bold text-slate-900 dark:text-white mt-0.5">
                      {detailsModalShipment.customerSubmissionBy || 'Staff'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tracking History */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 max-h-56 overflow-y-auto">
              <ShipmentStatusTimeline 
                history={detailsModalShipment.statusHistory}
                currentStatus={detailsModalShipment.status}
                bookedAt={detailsModalShipment.bookedAt}
              />
            </div>

            {/* Operations Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                {/* Print Receipt */}
                <button
                  onClick={() => {
                    setSelectedShipmentForReceipt(detailsModalShipment);
                    setDetailsModalShipment(null);
                  }}
                  className="px-3 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Receipt</span>
                </button>

                {/* Print Thermal Label */}
                <button
                  onClick={() => handlePrintThermalLabel(detailsModalShipment)}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-slate-200 dark:border-slate-700"
                >
                  <span>Thermal Label</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                {/* Submit Bill if not yet submitted */}
                {!detailsModalShipment.customerSubmissionAt && (detailsModalShipment.status === 'received_at_branch' || detailsModalShipment.status === 'out_for_delivery' || detailsModalShipment.status === 'delivered') && (
                  <button
                    onClick={() => {
                      const s = detailsModalShipment;
                      setDetailsModalShipment(null);
                      handleOpenSubmissionModal(s);
                    }}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <FileCheck className="w-3.5 h-3.5" />
                    <span>Submit Bill</span>
                  </button>
                )}

                {/* Report Contact Issue */}
                {(detailsModalShipment.status === 'in_transit' || detailsModalShipment.status === 'received_at_branch' || detailsModalShipment.status === 'out_for_delivery') && (
                  <button
                    onClick={() => {
                      const s = detailsModalShipment;
                      setDetailsModalShipment(null);
                      handleOpenIssueModal(s);
                    }}
                    className="px-3 py-2 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer border border-orange-200"
                    title="Report Contact Issue (Customer didn't answer)"
                  >
                    <PhoneOff className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Report Issue</span>
                  </button>
                )}

                {/* Edit (Super Admin only) */}
                {currentUser.role === 'super_admin' && (
                  <button
                    onClick={() => {
                      setEditModalShipment(detailsModalShipment);
                      setDetailsModalShipment(null);
                    }}
                    className="p-2 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-xl text-xs font-bold border border-amber-200 cursor-pointer"
                    title="Edit Consignment"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Delete (Super Admin only) */}
                {currentUser.role === 'super_admin' && (
                  <button
                    onClick={() => {
                      setDeleteConfirmShipment(detailsModalShipment);
                      setDetailsModalShipment(null);
                    }}
                    className="p-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl text-xs font-bold border border-red-200 cursor-pointer"
                    title="Delete Consignment"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Change Status */}
                <button
                  onClick={() => {
                    handleOpenStatusModal(detailsModalShipment);
                    setDetailsModalShipment(null);
                  }}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                >
                  Change Status
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* MODAL: PRE-BOOKING WEIGH & CONFIRM */}
      {confirmModalShipment && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-4 my-auto animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="px-2.5 py-0.5 rounded-md bg-purple-100 text-purple-700 font-mono font-black text-xs">
                  {confirmModalShipment.cnNumber}
                </span>
                <h3 className="font-black text-base text-slate-900 dark:text-white mt-1">
                  Weigh & Confirm Pre-Booking
                </h3>
                <p className="text-xs text-slate-500">
                  Verify scale weight and price to issue official waybill.
                </p>
              </div>
              <button
                onClick={() => setConfirmModalShipment(null)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 flex items-center justify-center font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Scale Weight (KG):</label>
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={weighedWeight}
                    onChange={(e) => setWeighedWeight(Math.max(0.1, parseFloat(e.target.value) || 0.1))}
                    className="w-full h-9 px-3 font-mono font-bold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Pieces / Boxes:</label>
                  <input
                    type="number"
                    min="1"
                    value={weighedPieces}
                    onChange={(e) => setWeighedPieces(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full h-9 px-3 font-mono font-bold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Total Product Price / COD (AFN):</label>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={modalProductPrice}
                  onChange={(e) => setModalProductPrice(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full h-9 px-3 font-mono font-bold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleConfirmPreBookingSubmit}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs cursor-pointer shadow-md transition-colors"
                >
                  Confirm & Issue Official Waybill
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmModalShipment(null)}
                  className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DELIVERY ISSUE REPORTING (Report an Issue) */}
      <ReportDeliveryIssueModal
        shipment={issueModalShipment}
        onClose={() => setIssueModalShipment(null)}
      />

      {/* Combined Branch Bulk Dispatch Modal */}
      <CombinedBranchReceiptModal
        isOpen={isCombinedBranchOpen}
        onClose={() => setIsCombinedBranchOpen(false)}
        initialSelectedShipmentIds={Array.from(selectedParcelIds)}
      />

      {/* Admin Edit Parcel Modal */}
      <EditShipmentModal
        shipment={editModalShipment}
        isOpen={!!editModalShipment}
        onClose={() => setEditModalShipment(null)}
      />

      {/* Delete Confirmation Modal */}
      {deleteConfirmShipment && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 p-5 animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-base">Delete Parcel Permanently?</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Waybill <span className="font-mono font-bold text-red-600">{deleteConfirmShipment.cnNumber}</span> will be permanently removed.
                </p>
              </div>
            </div>

            <div className="flex gap-2 text-xs">
              <button
                onClick={handleDeleteShipment}
                disabled={isDeleting}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl cursor-pointer"
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete Permanently'}
              </button>
              <button
                onClick={() => setDeleteConfirmShipment(null)}
                className="px-4 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
