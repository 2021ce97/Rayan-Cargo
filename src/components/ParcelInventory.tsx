import React, { useState, useMemo, useRef } from 'react';
import { 
  Boxes, 
  Search, 
  Filter, 
  Download, 
  Printer, 
  Eye, 
  Building2, 
  FileSpreadsheet,
  PackagePlus,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  MapPin, 
  Phone, 
  Clock, 
  DollarSign, 
  FileText, 
  Loader2, 
  FileCheck, 
  X, 
  Lock, 
  Send, 
  Inbox,
  CheckCircle2,
  Scale,
  ArrowRightLeft,
  Banknote,
  Receipt,
  UserCheck,
  AlertCircle
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Shipment, ShipmentStatus, ParcelCategory, PaymentStatus } from '../types';
import { generateDispatchManifestPdf, printElementUsingIframe } from '../utils/pdfExport';
import { BarcodeGenerator } from './BarcodeGenerator';

type SortField = 'date' | 'weight' | 'amount' | 'cn' | 'status';
type SortOrder = 'asc' | 'desc';
type InventoryTab = 'all' | 'inbound' | 'outbound' | 'warehouse' | 'prebooked' | 'settlement';

export const ParcelInventory: React.FC = () => {
  const { 
    t, 
    filteredShipments, 
    partnerShipments,
    branches, 
    currentUser,
    activeBranchId,
    setActiveBranchId,
    selectedPartnerBranchId,
    setSelectedPartnerBranchId,
    canUserUpdateStatus,
    setSelectedShipmentForReceipt, 
    setActiveView,
    updateShipmentStatus,
    confirmCustomerPreBooking,
    settleInterBranchRemittance
  } = useApp();

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPayment, setSelectedPayment] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<InventoryTab>('all');

  // Sorting state
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Modals state
  const [statusModalShipment, setStatusModalShipment] = useState<Shipment | null>(null);
  const [statusChoice, setStatusChoice] = useState<ShipmentStatus>('in_transit');
  const [statusNote, setStatusNote] = useState('');
  const [detailsModalShipment, setDetailsModalShipment] = useState<Shipment | null>(null);

  // Pre-booking confirmation modal state
  const [confirmModalShipment, setConfirmModalShipment] = useState<Shipment | null>(null);
  const [weighedWeight, setWeighedWeight] = useState<number>(1);
  const [weighedPieces, setWeighedPieces] = useState<number>(1);
  const [customTransportFee, setCustomTransportFee] = useState<number>(0);
  const [customDestCommission, setCustomDestCommission] = useState<number>(100);
  const [confirmedPaymentStatus, setConfirmedPaymentStatus] = useState<PaymentStatus>('paid');

  // Inter-branch settlement modal state
  const [settlementModalShipment, setSettlementModalShipment] = useState<Shipment | null>(null);
  const [settlementNote, setSettlementNote] = useState('');
  const [isSettling, setIsSettling] = useState(false);

  // Manifest modal state
  const [isManifestOpen, setIsManifestOpen] = useState(false);
  const [manifestDriver, setManifestDriver] = useState('Ghulam Nabi (Driver ID #402)');
  const [manifestVehicle, setManifestVehicle] = useState('KBL-24901 (Isuzu 5-Ton)');
  const [isGeneratingManifestPdf, setIsGeneratingManifestPdf] = useState(false);
  const [manifestPdfSuccess, setManifestPdfSuccess] = useState(false);
  const manifestRef = useRef<HTMLDivElement>(null);

  // Toggle sorting helper
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Base list of shipments based on partner branch selection
  const baseShipmentList = selectedPartnerBranchId !== 'all' ? partnerShipments : filteredShipments;

  // Filter and sort parcels
  const processedParcels = useMemo(() => {
    let result = baseShipmentList.filter(s => {
      const query = searchTerm.toLowerCase().trim();
      const matchesSearch = !query || 
        s.cnNumber.toLowerCase().includes(query) ||
        s.sender.name.toLowerCase().includes(query) ||
        s.sender.phone.includes(query) ||
        s.sender.city.toLowerCase().includes(query) ||
        s.receiver.name.toLowerCase().includes(query) ||
        s.receiver.phone.includes(query) ||
        s.receiver.city.toLowerCase().includes(query) ||
        (s.sender.nationalId && s.sender.nationalId.toLowerCase().includes(query)) ||
        s.packageInfo.description.toLowerCase().includes(query);

      const matchesStatus = selectedStatus === 'all' || s.status === selectedStatus;
      const matchesCategory = selectedCategory === 'all' || s.packageInfo.category === selectedCategory;
      const matchesPayment = selectedPayment === 'all' || s.financials.paymentStatus === selectedPayment;

      let matchesTab = true;
      const userBranch = currentUser.role !== 'super_admin' ? currentUser.branchId : (activeBranchId !== 'all' ? activeBranchId : null);

      if (activeTab === 'prebooked') {
        matchesTab = s.status === 'pre_booked' || s.isCustomerPrebooked === true;
      } else if (activeTab === 'settlement') {
        matchesTab = s.remittanceStatus === 'pending' || s.destBranchCommission !== undefined;
      } else if (userBranch) {
        if (activeTab === 'inbound') {
          matchesTab = s.destinationBranchId === userBranch && s.status !== 'pre_booked';
        } else if (activeTab === 'outbound') {
          matchesTab = s.originBranchId === userBranch && s.status !== 'pre_booked';
        } else if (activeTab === 'warehouse') {
          matchesTab = s.currentBranchId === userBranch && s.status !== 'delivered' && s.status !== 'pre_booked';
        }
      } else {
        if (activeTab === 'inbound') {
          matchesTab = s.status === 'in_transit' || s.status === 'received_at_branch' || s.status === 'out_for_delivery';
        } else if (activeTab === 'outbound') {
          matchesTab = s.status === 'booked' || s.status === 'in_transit';
        } else if (activeTab === 'warehouse') {
          matchesTab = s.status === 'received_at_branch' || s.status === 'booked';
        }
      }

      return matchesSearch && matchesStatus && matchesCategory && matchesPayment && matchesTab;
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
  }, [baseShipmentList, searchTerm, selectedStatus, selectedCategory, selectedPayment, activeTab, sortField, sortOrder, currentUser, activeBranchId]);

  // Open status modal
  const handleOpenStatusModal = (shipment: Shipment) => {
    const perm = canUserUpdateStatus(shipment);
    setStatusModalShipment(shipment);
    setStatusNote('');
    if (perm.allowedStatuses.length > 0) {
      setStatusChoice(perm.allowedStatuses[0]);
    }
  };

  // Save status progression
  const handleSaveStatus = async () => {
    if (!statusModalShipment) return;
    const ok = await updateShipmentStatus(statusModalShipment.id, statusChoice, statusNote);
    if (ok) {
      setStatusModalShipment(null);
    }
  };

  // Open Pre-booking confirmation modal
  const handleOpenConfirmPreBooking = (shipment: Shipment) => {
    setConfirmModalShipment(shipment);
    setWeighedWeight(shipment.packageInfo.weightKg || 1);
    setWeighedPieces(shipment.packageInfo.pieces || 1);
    setCustomTransportFee(shipment.transportationFee || 100);
    setCustomDestCommission(shipment.destBranchCommission || 100);
    setConfirmedPaymentStatus(shipment.financials.paymentStatus || 'paid');
  };

  // Confirm pre-booking
  const handleConfirmPreBookingSubmit = () => {
    if (!confirmModalShipment) return;
    confirmCustomerPreBooking(confirmModalShipment.id, {
      weightKg: weighedWeight,
      pieces: weighedPieces,
      transportationFee: customTransportFee,
      destBranchCommission: customDestCommission,
      paymentStatus: confirmedPaymentStatus
    });
    setConfirmModalShipment(null);
  };

  // Handle Inter-Branch Settlement
  const handleOpenSettlement = (shipment: Shipment) => {
    setSettlementModalShipment(shipment);
    setSettlementNote(`Remittance settled via Central Treasury / Hawala by ${currentUser.name}`);
  };

  const handleConfirmSettlement = () => {
    if (!settlementModalShipment) return;
    setIsSettling(true);
    setTimeout(() => {
      settleInterBranchRemittance(settlementModalShipment.id, settlementNote);
      setIsSettling(false);
      setSettlementModalShipment(null);
    }, 400);
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = [
      'CN Number', 'Status', 'Origin Branch', 'Destination Branch',
      'Sender Name', 'Sender Phone', 'Sender City',
      'Receiver Name', 'Receiver Phone', 'Receiver City',
      'Category', 'Weight (KG)', 'Pieces',
      'Total Amount (AFN)', 'Payment Status', 'Remittance Status', 'Booking Date'
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
        p.packageInfo.category,
        p.packageInfo.weightKg,
        p.packageInfo.pieces,
        p.financials.totalAmount,
        p.financials.paymentStatus,
        p.remittanceStatus || 'n/a',
        new Date(p.bookedAt).toISOString()
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `RayanCargo_Consignments_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Manifest PDF Handler
  const handleDownloadManifestPdf = () => {
    setIsGeneratingManifestPdf(true);
    setManifestPdfSuccess(false);

    try {
      const origBranch = currentUser.role !== 'super_admin' 
        ? branches.find(b => b.id === currentUser.branchId) 
        : branches.find(b => b.id === activeBranchId);

      const manifestNumber = `MNF-${new Date().getFullYear()}-${processedParcels.length.toString().padStart(3, '0')}`;
      const branchName = origBranch?.name || 'Rayan Central Hub';

      const ok = generateDispatchManifestPdf(
        manifestNumber,
        branchName,
        manifestDriver,
        manifestVehicle,
        processedParcels,
        branches
      );
      if (ok) {
        setManifestPdfSuccess(true);
        setTimeout(() => setManifestPdfSuccess(false), 4000);
      }
    } catch (err) {
      console.error('Error creating manifest PDF:', err);
    } finally {
      setIsGeneratingPdfFalse();
    }
  };

  const setIsGeneratingPdfFalse = () => {
    setIsGeneratingManifestPdf(false);
  };

  const handlePrintManifest = () => {
    if (manifestRef.current) {
      printElementUsingIframe(manifestRef.current, `Manifest_${new Date().toISOString().slice(0, 10)}`);
    } else {
      window.print();
    }
  };

  const currentBranchName = currentUser.role === 'super_admin' 
    ? (activeBranchId === 'all' ? t('all_branches') : branches.find(b => b.id === activeBranchId)?.name)
    : branches.find(b => b.id === currentUser.branchId)?.name;

  const otherBranches = branches.filter(b => b.id !== currentUser.branchId);
  const partnerBranchObj = branches.find(b => b.id === selectedPartnerBranchId);

  const prebookedCount = baseShipmentList.filter(s => s.status === 'pre_booked').length;
  const pendingSettlementCount = baseShipmentList.filter(s => s.remittanceStatus === 'pending').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300" id="parcel-inventory-page">
      
      {/* Header Banner */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center font-bold">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-900 dark:text-white">
                  {t('parcels_title')}
                </h1>
                {activeBranchId !== 'all' && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800">
                    {currentBranchName}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Manage 6-branch consignments, origin/destination handoffs, settlements, and manifests
              </p>
            </div>
          </div>
        </div>

        {/* Top actions: New Booking, Export Manifest, Export CSV */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveView('booking')}
            className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <PackagePlus className="w-4 h-4" />
            <span>{t('new_booking_btn')}</span>
          </button>

          <button
            onClick={() => setIsManifestOpen(true)}
            className="px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Generate Dispatch Cargo Sheet"
          >
            <FileText className="w-4 h-4 text-amber-400" />
            <span>{t('manifest_title')}</span>
          </button>

          <button
            onClick={exportToCSV}
            className="px-3 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-xl text-xs flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
            title="Export Table as CSV"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden sm:inline">CSV</span>
          </button>
        </div>
      </div>

      {/* CROSS-BRANCH BILATERAL HISTORY SELECTOR */}
      {currentUser.role !== 'super_admin' && (
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
              <Building2 className="w-4 h-4 text-red-600 dark:text-red-400" />
              <span>Cross-Branch Partner History:</span>
              <span className="text-slate-500 dark:text-slate-400 font-normal">
                Select a branch to view all mutual parcels sent to or received from that branch
              </span>
            </div>
            {selectedPartnerBranchId !== 'all' && (
              <button
                onClick={() => setSelectedPartnerBranchId('all')}
                className="text-xs text-red-600 dark:text-red-400 hover:underline font-bold cursor-pointer"
              >
                Clear Partner Filter ✕
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
            <button
              onClick={() => setSelectedPartnerBranchId('all')}
              className={`p-2.5 rounded-xl text-xs font-bold border transition-all text-start cursor-pointer ${
                selectedPartnerBranchId === 'all'
                  ? 'bg-red-600 text-white border-red-600 shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
              }`}
            >
              <div className="text-[10px] opacity-75">All Hubs</div>
              <div className="truncate font-black">All 5 Partners</div>
            </button>

            {otherBranches.map(b => {
              const isSelected = selectedPartnerBranchId === b.id;
              return (
                <button
                  key={b.id}
                  onClick={() => setSelectedPartnerBranchId(b.id)}
                  className={`p-2.5 rounded-xl text-xs font-bold border transition-all text-start cursor-pointer ${
                    isSelected
                      ? 'bg-red-600 text-white border-red-600 shadow-xs ring-2 ring-red-300'
                      : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] opacity-75 font-mono">
                    <span>{b.code}</span>
                    <span>{b.province}</span>
                  </div>
                  <div className="truncate font-black mt-0.5">{b.name.replace(' Branch', '')}</div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Tabs & Filter Toolbar */}
      <div className="space-y-4">
        
        {/* Navigation Filter Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex p-1 rounded-xl bg-slate-200/80 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold flex-wrap gap-1">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${activeTab === 'all' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
            >
              {t('tab_all_parcels')} ({baseShipmentList.length})
            </button>
            <button
              onClick={() => setActiveTab('outbound')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${activeTab === 'outbound' ? 'bg-white dark:bg-slate-900 text-red-600 dark:text-red-400 shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>{t('tab_outbound_sent')}</span>
            </button>
            <button
              onClick={() => setActiveTab('inbound')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${activeTab === 'inbound' ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
            >
              <Inbox className="w-3.5 h-3.5" />
              <span>{t('tab_inbound_incoming')}</span>
            </button>
            <button
              onClick={() => setActiveTab('warehouse')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${activeTab === 'warehouse' ? 'bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-400 shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
            >
              {t('tab_in_warehouse')}
            </button>
            <button
              onClick={() => setActiveTab('prebooked')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${activeTab === 'prebooked' ? 'bg-purple-600 text-white shadow-xs' : 'text-purple-600 dark:text-purple-400 hover:text-purple-700'}`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Online Pre-Bookings</span>
              {prebookedCount > 0 && (
                <span className="px-1.5 py-0.2 bg-white text-purple-700 rounded-full text-[10px] font-black">
                  {prebookedCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('settlement')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${activeTab === 'settlement' ? 'bg-emerald-600 text-white shadow-xs' : 'text-emerald-600 dark:text-emerald-400 hover:text-emerald-700'}`}
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>Branch Settlement</span>
              {pendingSettlementCount > 0 && (
                <span className="px-1.5 py-0.2 bg-amber-400 text-slate-950 rounded-full text-[10px] font-black">
                  {pendingSettlementCount} Due
                </span>
              )}
            </button>
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            {t('showing_label')} <strong>{processedParcels.length}</strong> {t('of_label')} {baseShipmentList.length}
          </div>
        </div>

        {/* Search and Secondary Select Filters */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          
          <div className="relative">
            <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search CN, Sender, Receiver, Phone..."
              className="w-full h-10 ps-9 pe-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
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

          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full h-10 px-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 cursor-pointer font-medium"
            >
              <option value="all">{t('filter_by_status')}: {t('filter_all')}</option>
              <option value="pre_booked">Pre-Booked (Online Customer)</option>
              <option value="booked">{t('status_booked')}</option>
              <option value="in_transit">{t('status_in_transit')}</option>
              <option value="received_at_branch">{t('status_received')}</option>
              <option value="out_for_delivery">{t('status_out_delivery')}</option>
              <option value="delivered">{t('status_delivered')}</option>
              <option value="cancelled">{t('status_cancelled')}</option>
            </select>
          </div>

          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full h-10 px-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 cursor-pointer font-medium capitalize"
            >
              <option value="all">{t('filter_by_category')}: {t('filter_all')}</option>
              <option value="documents">{t('category_documents')}</option>
              <option value="electronics">{t('category_electronics')}</option>
              <option value="clothing">{t('category_clothing')}</option>
              <option value="commercial">{t('category_commercial')}</option>
              <option value="dry_fruits">{t('category_dry_fruits')}</option>
              <option value="carpets">{t('category_carpets')}</option>
              <option value="perishable">{t('category_perishable')}</option>
            </select>
          </div>

          <div>
            <select
              value={selectedPayment}
              onChange={(e) => setSelectedPayment(e.target.value)}
              className="w-full h-10 px-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 cursor-pointer font-medium"
            >
              <option value="all">{t('filter_by_payment')}: {t('filter_all')}</option>
              <option value="paid">{t('payment_paid')} (Cash at Origin)</option>
              <option value="to_pay">{t('payment_to_pay')} (COD at Destination)</option>
              <option value="pending">{t('payment_pending')}</option>
            </select>
          </div>

        </div>
      </div>

      {/* Main Parcels Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs border-collapse">
            
            <thead className="bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold uppercase text-[10px] tracking-wider select-none">
              <tr>
                <th className="p-3.5 text-start cursor-pointer" onClick={() => handleSort('cn')}>
                  <div className="flex items-center gap-1">
                    <span>{t('th_cn')}</span>
                    {sortField === 'cn' ? (sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-red-600" /> : <ArrowDown className="w-3 h-3 text-red-600" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}
                  </div>
                </th>
                <th className="p-3.5 text-start">{t('th_sender')}</th>
                <th className="p-3.5 text-start">{t('th_receiver')}</th>
                <th className="p-3.5 text-center">{t('th_route')}</th>
                <th className="p-3.5 text-center cursor-pointer" onClick={() => handleSort('weight')}>
                  <div className="flex items-center justify-center gap-1">
                    <span>{t('th_weight_pieces')}</span>
                    {sortField === 'weight' ? (sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-red-600" /> : <ArrowDown className="w-3 h-3 text-red-600" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}
                  </div>
                </th>
                <th className="p-3.5 text-center cursor-pointer" onClick={() => handleSort('amount')}>
                  <div className="flex items-center justify-center gap-1">
                    <span>{t('th_total_charge')}</span>
                    {sortField === 'amount' ? (sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-red-600" /> : <ArrowDown className="w-3 h-3 text-red-600" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}
                  </div>
                </th>
                <th className="p-3.5 text-center cursor-pointer" onClick={() => handleSort('status')}>
                  <div className="flex items-center justify-center gap-1">
                    <span>{t('th_status')}</span>
                    {sortField === 'status' ? (sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-red-600" /> : <ArrowDown className="w-3 h-3 text-red-600" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}
                  </div>
                </th>
                <th className="p-3.5 text-end">{t('th_actions')}</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {processedParcels.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-400">
                    <Boxes className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="font-semibold text-sm">{t('no_shipments_found')}</p>
                    <p className="text-xs text-slate-500 mt-1">Try resetting the search terms or filters</p>
                  </td>
                </tr>
              ) : (
                processedParcels.map(s => {
                  const orig = branches.find(b => b.id === s.originBranchId);
                  const dest = branches.find(b => b.id === s.destinationBranchId);
                  const updatePerm = canUserUpdateStatus(s);
                  const isPrebooked = s.status === 'pre_booked';
                  const isPendingSettlement = s.remittanceStatus === 'pending';

                  return (
                    <tr 
                      key={s.id} 
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                        isPrebooked ? 'bg-purple-50/30 dark:bg-purple-950/20' : ''
                      }`}
                    >
                      
                      {/* CN Number */}
                      <td className="p-3.5 font-mono font-bold">
                        <div className="flex items-center gap-1.5">
                          <span className="text-red-600 dark:text-red-400 font-bold">{s.cnNumber}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-normal">
                          {new Date(s.bookedAt).toLocaleDateString()}
                        </div>
                        {isPrebooked && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-sans font-bold text-[9px]">
                            Online Pre-Book
                          </span>
                        )}
                      </td>

                      {/* Sender */}
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900 dark:text-slate-100">{s.sender.name}</div>
                        <div className="text-[11px] font-mono text-slate-500">{s.sender.phone}</div>
                        <div className="text-[10px] text-slate-400">{s.sender.city}</div>
                      </td>

                      {/* Receiver */}
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900 dark:text-slate-100">{s.receiver.name}</div>
                        <div className="text-[11px] font-mono text-slate-500">{s.receiver.phone}</div>
                        <div className="text-[10px] text-slate-400">{s.receiver.city}</div>
                      </td>

                      {/* Route */}
                      <td className="p-3.5 text-center">
                        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 font-bold text-[11px]">
                          <span>{orig?.code || 'ORIG'}</span>
                          <span className="text-slate-400">➔</span>
                          <span>{dest?.code || 'DEST'}</span>
                        </div>
                      </td>

                      {/* Weight & Category */}
                      <td className="p-3.5 text-center">
                        <div className="font-black text-slate-900 dark:text-slate-100 font-mono">
                          {s.packageInfo.weightKg} KG
                        </div>
                        <div className="text-[10px] text-slate-500 capitalize">
                          {s.packageInfo.pieces} pcs • {s.packageInfo.category}
                        </div>
                      </td>

                      {/* Amount & Commission / Remittance Info */}
                      <td className="p-3.5 text-center">
                        <div className="font-black text-slate-900 dark:text-slate-100 font-mono">
                          {s.financials.totalAmount.toLocaleString()} AFN
                        </div>
                        <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          s.financials.paymentStatus === 'paid' 
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300' 
                            : s.financials.paymentStatus === 'to_pay'
                            ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                            : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300'
                        }`}>
                          {s.financials.paymentStatus === 'to_pay' ? 'COD (To-Pay)' : s.financials.paymentStatus.toUpperCase()}
                        </span>
                        {s.destBranchCommission !== undefined && (
                          <div className="text-[9px] text-slate-400 mt-0.5">
                            Dest Comm: {s.destBranchCommission} AFN
                          </div>
                        )}
                      </td>

                      {/* Status / Pre-booked / Settlement Action */}
                      <td className="p-3.5 text-center">
                        {isPrebooked ? (
                          <button
                            onClick={() => handleOpenConfirmPreBooking(s)}
                            className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-xs flex items-center justify-center gap-1 mx-auto transition-transform active:scale-95 cursor-pointer"
                          >
                            <Scale className="w-3 h-3" />
                            <span>Verify & Confirm</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleOpenStatusModal(s)}
                            className={`px-3 py-1 rounded-full text-[10px] font-bold cursor-pointer transition-transform active:scale-95 shadow-xs flex items-center justify-center gap-1 mx-auto ${
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
                        )}
                        
                        {/* Settle Remittance Trigger */}
                        {isPendingSettlement && s.status === 'delivered' && (
                          <button
                            onClick={() => handleOpenSettlement(s)}
                            className="mt-1 px-2 py-0.5 rounded text-[9px] font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 flex items-center justify-center gap-1 mx-auto cursor-pointer"
                          >
                            <ArrowRightLeft className="w-2.5 h-2.5" />
                            <span>Settle Remittance</span>
                          </button>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-end">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedShipmentForReceipt(s)}
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                            title="Print / Download Receipt (A4 or Thermal)"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDetailsModalShipment(s)}
                            className="p-1.5 rounded-lg bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 transition-colors cursor-pointer"
                            title="View Full Dossier"
                          >
                            <Eye className="w-3.5 h-3.5" />
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

      {/* MODAL 1: PRE-BOOKING INSPECTION & CONFIRMATION MODAL */}
      {confirmModalShipment && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-800 p-6 animate-in fade-in zoom-in-95 space-y-5 my-8">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="px-2.5 py-0.5 rounded-md bg-purple-100 text-purple-700 font-mono font-black text-xs">
                  {confirmModalShipment.cnNumber}
                </span>
                <h3 className="font-black text-base text-slate-900 dark:text-white mt-1">
                  {t('modal_weigh_title') || 'Weigh, Inspect & Issue Official Waybill'}
                </h3>
                <p className="text-xs text-slate-500">
                  {t('modal_weigh_desc') || 'Customer submitted this pre-booking online. Inspect cargo and set official weight and freight charges.'}
                </p>
              </div>
              <button
                onClick={() => setConfirmModalShipment(null)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              
              {/* Route Summary */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">{t('sender_origin_lbl') || 'Sender'}</span>
                  <p className="font-bold text-slate-900 dark:text-white">{confirmModalShipment.sender.name}</p>
                  <p className="font-mono text-slate-500">{confirmModalShipment.sender.phone}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">{t('receiver_destination_lbl') || 'Receiver'}</span>
                  <p className="font-bold text-slate-900 dark:text-white">{confirmModalShipment.receiver.name}</p>
                  <p className="font-mono text-slate-500">{confirmModalShipment.receiver.phone}</p>
                </div>
              </div>

              {/* Weight and Pieces Inputs */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {t('inspected_weight_lbl') || 'Inspected Weight (KG) *'}
                  </label>
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={weighedWeight}
                    onChange={(e) => setWeighedWeight(Math.max(0.1, parseFloat(e.target.value) || 0.1))}
                    className="w-full h-10 px-3 font-mono font-bold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {t('pieces_boxes_lbl') || 'Pieces / Boxes *'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={weighedPieces}
                    onChange={(e) => setWeighedPieces(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full h-10 px-3 font-mono font-bold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
                  />
                </div>
              </div>

              {/* Transport fee & Destination Commission */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {t('transport_fee_lbl') || 'Transport Fee (AFN)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={customTransportFee}
                    onChange={(e) => setCustomTransportFee(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full h-10 px-3 font-mono font-bold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {t('dest_commission_lbl') || 'Dest Branch Commission (AFN)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={customDestCommission}
                    onChange={(e) => setCustomDestCommission(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full h-10 px-3 font-mono font-bold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
                  />
                </div>
              </div>

              {/* Payment Option */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('payment_collection_lbl') || 'Payment Collection Status'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmedPaymentStatus('paid')}
                    className={`py-2 px-3 rounded-xl font-bold border transition-all cursor-pointer ${
                      confirmedPaymentStatus === 'paid'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    {t('paid_at_origin') || 'Paid at Origin Branch'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmedPaymentStatus('to_pay')}
                    className={`py-2 px-3 rounded-xl font-bold border transition-all cursor-pointer ${
                      confirmedPaymentStatus === 'to_pay'
                        ? 'bg-amber-600 text-white border-amber-600'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    {t('cod_dest') || 'COD (To Pay at Dest)'}
                  </button>
                </div>
              </div>

              {/* Live Calculation Preview */}
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 space-y-1">
                <div className="flex justify-between text-[11px] text-slate-600 dark:text-slate-400">
                  <span>Base Rate:</span>
                  <span>{confirmModalShipment.financials.baseRate} AFN</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-600 dark:text-slate-400">
                  <span>Weight ({weighedWeight}kg x 30):</span>
                  <span>{Math.round(weighedWeight * 30)} AFN</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-600 dark:text-slate-400">
                  <span>{t('transport_fee_lbl') || 'Transport Fee'}:</span>
                  <span>{customTransportFee} AFN</span>
                </div>
                <div className="flex justify-between font-black text-sm text-red-600 dark:text-red-400 pt-1 border-t border-red-200 dark:border-red-800">
                  <span>{t('total_calc_amount') || 'Total Calculated Amount'}:</span>
                  <span>{confirmModalShipment.financials.baseRate + Math.round(weighedWeight * 30) + customTransportFee} AFN</span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleConfirmPreBookingSubmit}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-md transition-colors cursor-pointer"
                >
                  {t('btn_confirm_waybill') || 'Confirm & Issue Official Waybill'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmModalShipment(null)}
                  className="px-4 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition-colors cursor-pointer"
                >
                  {t('btn_cancel') || 'Cancel'}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: INTER-BRANCH SETTLEMENT MODAL */}
      {settlementModalShipment && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 p-6 animate-in fade-in zoom-in-95 space-y-5 my-8">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-mono font-black text-xs">
                  {settlementModalShipment.cnNumber}
                </span>
                <h3 className="font-black text-base text-slate-900 dark:text-white mt-1">
                  {t('modal_settle_title') || 'Inter-Branch Financial Settlement'}
                </h3>
                <p className="text-xs text-slate-500">
                  {t('modal_settle_desc') || 'Branch 2 collected COD money. Retain Destination Commission and remit balance to Origin Branch.'}
                </p>
              </div>
              <button
                onClick={() => setSettlementModalShipment(null)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500">{t('total_collected') || 'Total Money Collected'}:</span>
                  <span className="font-bold">{settlementModalShipment.financials.totalAmount} AFN</span>
                </div>
                <div className="flex justify-between text-emerald-600 font-bold">
                  <span>{t('dest_kept_commission') || 'Dest Branch Commission'}:</span>
                  <span>- {settlementModalShipment.destBranchCommission || 100} AFN</span>
                </div>
                <div className="flex justify-between text-base font-black text-red-600 pt-2 border-t border-slate-200 dark:border-slate-700">
                  <span>{t('net_remittance_due') || 'Net Remittance Due'}:</span>
                  <span>{settlementModalShipment.originRemittanceDue || (settlementModalShipment.financials.totalAmount - (settlementModalShipment.destBranchCommission || 100))} AFN</span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('settle_ref_note') || 'Settlement & Transfer Reference Note'}
                </label>
                <textarea
                  rows={2}
                  value={settlementNote}
                  onChange={(e) => setSettlementNote(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl resize-none text-slate-900 dark:text-white"
                  placeholder="e.g. Settle via Kabul Sarafi Hawala / Central Treasury..."
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleConfirmSettlement}
                  disabled={isSettling}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  {isSettling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Banknote className="w-4 h-4" />}
                  <span>{t('btn_confirm_settle') || 'Confirm Settlement & Release Funds'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSettlementModalShipment(null)}
                  className="px-4 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition-colors cursor-pointer"
                >
                  {t('btn_cancel') || 'Cancel'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: STATUS PROGRESSION MODAL */}
      {statusModalShipment && (() => {
        const updatePerm = canUserUpdateStatus(statusModalShipment);
        const origBranch = branches.find(b => b.id === statusModalShipment.originBranchId);
        const destBranch = branches.find(b => b.id === statusModalShipment.destinationBranchId);

        return (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 p-6 animate-in fade-in zoom-in-95 space-y-4">
              
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    {t('modal_status_title') || 'Update Consignment Status'}
                  </h3>
                  <div className="text-xs font-mono font-bold text-red-600">
                    {statusModalShipment.cnNumber} ({origBranch?.code} ➔ {destBranch?.code})
                  </div>
                </div>
                <button
                  onClick={() => setStatusModalShipment(null)}
                  className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Status Progression Role Explainer */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                  <span>{t('status_current_state') || 'Current State'}:</span>
                  <span className="font-mono text-red-600 uppercase font-black">{statusModalShipment.status.replace(/_/g, ' ')}</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  {updatePerm.roleType === 'sender_branch' && (
                    <span>🏢 <strong>{origBranch?.name}</strong>: {t('sender_origin_lbl') || 'Sender Branch'}</span>
                  )}
                  {updatePerm.roleType === 'receiver_branch' && (
                    <span>📍 <strong>{destBranch?.name}</strong>: {t('receiver_destination_lbl') || 'Receiver Branch'}</span>
                  )}
                  {updatePerm.roleType === 'admin' && (
                    <span>⭐ {t('perm_super_admin_all') || 'Super Admin'}</span>
                  )}
                </p>
              </div>

              {updatePerm.canUpdate ? (
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                      {t('status_next_milestone') || 'Select Next Permitted Milestone'}
                    </label>
                    <select
                      value={statusChoice}
                      onChange={(e) => setStatusChoice(e.target.value as ShipmentStatus)}
                      className="w-full h-10 px-3 font-bold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      {updatePerm.allowedStatuses.map(st => (
                        <option key={st} value={st}>
                          {st === 'in_transit' && `➔ ${t('status_in_transit') || 'In Transit (Dispatch to Highway Carrier)'}`}
                          {st === 'received_at_branch' && `✓ ${t('status_received_at_branch') || 'Received at Destination Branch Terminal'}`}
                          {st === 'out_for_delivery' && `🚚 ${t('status_out_for_delivery') || 'Out for Final Delivery to Receiver'}`}
                          {st === 'delivered' && `★ ${t('status_delivered') || 'Delivered & Handed Over to Client'}`}
                          {st === 'booked' && (t('status_booked') || 'Booked')}
                          {st === 'returned' && (t('status_returned') || 'Returned')}
                          {st === 'cancelled' && (t('status_cancelled') || 'Cancelled')}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                      {t('status_note_lbl') || 'Milestone Note / Tracking Remark'}
                    </label>
                    <textarea
                      rows={2}
                      value={statusNote}
                      onChange={(e) => setStatusNote(e.target.value)}
                      placeholder="e.g. Dispatched via Truck Plate #24901 / Arrived at Western Hub..."
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-red-500 text-xs"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      onClick={handleSaveStatus}
                      className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-colors"
                    >
                      {t('btn_apply_status') || 'Apply Milestone Change'}
                    </button>
                    <button
                      onClick={() => setStatusModalShipment(null)}
                      className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      {t('btn_cancel') || 'Cancel'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-200">
                    <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>{t('status_locked_title') || 'Status Update Locked'}</span>
                  </div>
                  <p className="leading-relaxed">
                    {updatePerm.reason}
                  </p>
                  <button
                    onClick={() => setStatusModalShipment(null)}
                    className="w-full py-2 bg-amber-200 dark:bg-amber-900 hover:bg-amber-300 text-amber-900 dark:text-amber-100 font-bold rounded-lg text-xs transition-colors cursor-pointer"
                  >
                    {t('status_understood') || 'Understood'}
                  </button>
                </div>
              )}

            </div>
          </div>
        );
      })()}

      {/* MODAL 4: DETAILS DOSSIER MODAL */}
      {detailsModalShipment && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 p-6 animate-in fade-in zoom-in-95 space-y-6 my-8">
            
            <div className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md bg-red-100 text-red-700 font-mono font-black text-sm">
                    {detailsModalShipment.cnNumber}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    detailsModalShipment.status === 'delivered' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {detailsModalShipment.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <h2 className="text-base font-black text-slate-900 dark:text-white">
                  {t('dossier_title') || 'Consignment Dossier & Tracking Specifications'}
                </h2>
              </div>

              <button
                onClick={() => setDetailsModalShipment(null)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  <MapPin className="w-4 h-4 text-red-500" />
                  <span>{t('dossier_sender_box') || 'Sender Details (Origin)'}</span>
                </div>
                <div className="font-bold text-sm text-slate-900 dark:text-white">{detailsModalShipment.sender.name}</div>
                <div className="font-mono text-slate-600 dark:text-slate-400">{detailsModalShipment.sender.phone}</div>
                <div className="text-[11px] text-slate-500">{detailsModalShipment.sender.address}, {detailsModalShipment.sender.city}</div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  <MapPin className="w-4 h-4 text-emerald-500" />
                  <span>{t('dossier_receiver_box') || 'Receiver Details (Destination)'}</span>
                </div>
                <div className="font-bold text-sm text-slate-900 dark:text-white">{detailsModalShipment.receiver.name}</div>
                <div className="font-mono text-slate-600 dark:text-slate-400">{detailsModalShipment.receiver.phone}</div>
                <div className="text-[11px] text-slate-500">{detailsModalShipment.receiver.address}, {detailsModalShipment.receiver.city}</div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  <Boxes className="w-4 h-4 text-amber-500" />
                  <span>{t('dossier_specs_box') || 'Package Specs'}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-400">{t('category_lbl') || 'Category'}:</span>
                    <p className="font-bold capitalize">{detailsModalShipment.packageInfo.category}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">{t('weight_lbl') || 'Weight'}:</span>
                    <p className="font-bold font-mono">{detailsModalShipment.packageInfo.weightKg} KG</p>
                  </div>
                  <div>
                    <span className="text-slate-400">{t('pieces_lbl') || 'Pieces'}:</span>
                    <p className="font-bold">{detailsModalShipment.packageInfo.pieces} Boxes</p>
                  </div>
                  <div>
                    <span className="text-slate-400">{t('service_type') || 'Service'}:</span>
                    <p className="font-bold">{detailsModalShipment.packageInfo.serviceType}</p>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  <DollarSign className="w-4 h-4 text-emerald-500" />
                  <span>{t('dossier_financial_box') || 'Financial Summary'}</span>
                </div>
                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Base + Weight Charge:</span>
                    <span className="font-mono">{detailsModalShipment.financials.baseRate + detailsModalShipment.financials.weightCost} AFN</span>
                  </div>
                  {detailsModalShipment.transportationFee && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">{t('transport_fee_lbl') || 'Transport Fee'}:</span>
                      <span className="font-mono">{detailsModalShipment.transportationFee} AFN</span>
                    </div>
                  )}
                  <div className="flex justify-between font-black text-sm text-red-600 dark:text-red-400 pt-1 border-t border-slate-200 dark:border-slate-700">
                    <span>Total Freight:</span>
                    <span>{detailsModalShipment.financials.totalAmount} AFN</span>
                  </div>
                  <div className="flex justify-between font-bold pt-0.5">
                    <span>{t('payment_lbl') || 'Payment Status'}:</span>
                    <span className="uppercase text-emerald-600">{detailsModalShipment.financials.paymentStatus}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => {
                  setSelectedShipmentForReceipt(detailsModalShipment);
                  setDetailsModalShipment(null);
                }}
                className="px-4 py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>{t('print_receipt_waybill_btn') || 'Print / Download Receipt'}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    handleOpenStatusModal(detailsModalShipment);
                    setDetailsModalShipment(null);
                  }}
                  className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-colors"
                >
                  {t('modal_status_title') || 'Update Status'}
                </button>
                <button
                  onClick={() => setDetailsModalShipment(null)}
                  className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  {t('btn_close') || 'Close'}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* MODAL 5: CARGO MANIFEST MODAL */}
      {isManifestOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-5xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95">
            
            <div className="no-print p-4 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-red-600" />
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    {t('manifest_title') || 'Inter-Branch Cargo Dispatch Manifest'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {processedParcels.length} Consignments in this Cargo Sheet
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <input
                  type="text"
                  value={manifestDriver}
                  onChange={(e) => setManifestDriver(e.target.value)}
                  placeholder={t('manifest_driver_id') || 'Driver Name & ID'}
                  className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs font-medium w-44"
                />
                <input
                  type="text"
                  value={manifestVehicle}
                  onChange={(e) => setManifestVehicle(e.target.value)}
                  placeholder={t('manifest_vehicle_plate') || 'Vehicle Plate #'}
                  className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs font-medium w-40"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadManifestPdf}
                  disabled={isGeneratingManifestPdf}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {isGeneratingManifestPdf ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Generating PDF...</span>
                    </>
                  ) : manifestPdfSuccess ? (
                    <>
                      <FileCheck className="w-4 h-4 text-emerald-200" />
                      <span>PDF Downloaded!</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>{t('manifest_btn_pdf') || 'Download PDF'}</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handlePrintManifest}
                  className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>{t('manifest_btn_print') || 'Print Sheet'}</span>
                </button>

                <button
                  onClick={() => setIsManifestOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Manifest Document Preview */}
            <div className="p-6 max-h-[75vh] overflow-y-auto bg-slate-50">
              <div 
                ref={manifestRef} 
                className="bg-white p-8 rounded-xl border border-slate-300 shadow-sm max-w-4xl mx-auto text-slate-900 font-sans"
              >
                {/* Header */}
                <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4 mb-4">
                  <div>
                    <h2 className="text-xl font-black tracking-tight text-slate-900">
                      RAYAN CARGO LOGISTICS DB
                    </h2>
                    <p className="text-xs text-slate-600 font-medium">
                      Afghanistan Inter-Branch Consignment Dispatch Sheet
                    </p>
                    <p className="text-xs text-slate-500 font-mono mt-1">
                      Terminal: {currentBranchName} | Date: {new Date().toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-end">
                    <span className="text-xs font-mono font-bold bg-slate-100 px-3 py-1 rounded border border-slate-300">
                      MNF-{new Date().getFullYear()}-{processedParcels.length.toString().padStart(3, '0')}
                    </span>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Carrier: {manifestDriver} ({manifestVehicle})
                    </p>
                  </div>
                </div>

                {/* Table */}
                <table className="w-full text-start text-xs border-collapse border border-slate-300">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300 font-bold text-slate-800">
                      <th className="p-2 border border-slate-300 text-start">#</th>
                      <th className="p-2 border border-slate-300 text-start">CN Number</th>
                      <th className="p-2 border border-slate-300 text-start">Destination</th>
                      <th className="p-2 border border-slate-300 text-start">Receiver & Contact</th>
                      <th className="p-2 border border-slate-300 text-center">Weight</th>
                      <th className="p-2 border border-slate-300 text-center">Pcs</th>
                      <th className="p-2 border border-slate-300 text-center">Payment</th>
                      <th className="p-2 border border-slate-300 text-center">Sign</th>
                    </tr>
                  </thead>
                  <tbody>
                    {processedParcels.map((p, idx) => {
                      const dest = branches.find(b => b.id === p.destinationBranchId);
                      return (
                        <tr key={p.id} className="border-b border-slate-200">
                          <td className="p-2 border border-slate-300 font-mono text-[11px]">{idx + 1}</td>
                          <td className="p-2 border border-slate-300 font-mono font-bold">{p.cnNumber}</td>
                          <td className="p-2 border border-slate-300 font-bold">{dest?.city || p.receiver.city}</td>
                          <td className="p-2 border border-slate-300">
                            <div className="font-semibold">{p.receiver.name}</div>
                            <div className="font-mono text-[10px] text-slate-500">{p.receiver.phone}</div>
                          </td>
                          <td className="p-2 border border-slate-300 text-center font-mono">{p.packageInfo.weightKg} KG</td>
                          <td className="p-2 border border-slate-300 text-center font-mono">{p.packageInfo.pieces}</td>
                          <td className="p-2 border border-slate-300 text-center font-bold text-[10px]">
                            {p.financials.paymentStatus.toUpperCase()}
                          </td>
                          <td className="p-2 border border-slate-300 w-24"></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Footer signatures */}
                <div className="grid grid-cols-3 gap-6 pt-10 mt-6 border-t border-slate-300 text-xs text-center text-slate-600">
                  <div>
                    <div className="border-b border-slate-400 pb-8 mb-1"></div>
                    <p className="font-bold">Dispatching Officer Sign</p>
                  </div>
                  <div>
                    <div className="border-b border-slate-400 pb-8 mb-1"></div>
                    <p className="font-bold">Highway Carrier / Driver Sign</p>
                  </div>
                  <div>
                    <div className="border-b border-slate-400 pb-8 mb-1"></div>
                    <p className="font-bold">Destination Receiving Officer Sign</p>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
