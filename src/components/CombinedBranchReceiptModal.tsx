import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  X,
  Printer,
  Download,
  Building2,
  Truck,
  Package,
  Scale,
  DollarSign,
  FileText,
  Tag,
  CheckSquare,
  Square,
  Search,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Calendar,
  Layers,
  Sparkles,
  QrCode,
  Lock
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useI18n } from '../context/I18nContext';
import { Shipment, Branch } from '../types';
import { 
  generateBranchBulkDispatchPdf, 
  generateBranchBagStickerPdf, 
  printElementUsingIframe 
} from '../utils/pdfExport';
import { BarcodeGenerator } from './BarcodeGenerator';

export interface CombinedBranchReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedBranchId?: string;
  initialSelectedShipmentIds?: string[];
}

export const CombinedBranchReceiptModal: React.FC<CombinedBranchReceiptModalProps> = ({
  isOpen,
  onClose,
  preselectedBranchId,
  initialSelectedShipmentIds = []
}) => {
  const { shipments: allShipments, branches, currentUser, activeBranchId, showToast } = useApp();
  const { t, language, isRTL, formatAfn, formatNumber, formatDate, getLocalizedBranchName } = useI18n();

  // Active Origin Branch determination
  const originBranchId = currentUser.role === 'super_admin' 
    ? (activeBranchId !== 'all' ? activeBranchId : (branches[0]?.id || ''))
    : currentUser.branchId;

  const originBranch = branches.find(b => b.id === originBranchId) || branches[0];

  // Destination branch state
  const [selectedDestBranchId, setSelectedDestBranchId] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedShipmentIds, setSelectedShipmentIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'sticker' | 'manifest'>('sticker');

  // Dispatch Metadata
  const [driverName, setDriverName] = useState('Ghulam Nabi (0799123456)');
  const [vehiclePlate, setVehiclePlate] = useState('KBL-24901 (Isuzu 5-Ton)');
  const [sealNumber, setSealNumber] = useState(`SEAL-${Math.floor(1000 + Math.random() * 9000)}`);
  const [batchRefNumber, setBatchRefNumber] = useState('');
  const [dispatchNote, setDispatchNote] = useState('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const stickerPrintRef = useRef<HTMLDivElement>(null);
  const manifestPrintRef = useRef<HTMLDivElement>(null);

  // Initialize or reset when opened
  useEffect(() => {
    if (isOpen) {
      const initialBranch = preselectedBranchId || 'all';
      setSelectedDestBranchId(initialBranch);
      
      const randomSuffix = Math.floor(100000 + Math.random() * 900000);
      setBatchRefNumber(`AST-DSP-${randomSuffix}`);

      if (initialSelectedShipmentIds && initialSelectedShipmentIds.length > 0) {
        setSelectedShipmentIds(initialSelectedShipmentIds);
        // If all selected shipments belong to a single destination branch, set that branch
        const firstShipment = allShipments.find(s => s.id === initialSelectedShipmentIds[0]);
        if (firstShipment && initialBranch === 'all') {
          setSelectedDestBranchId(firstShipment.destinationBranchId);
        }
      } else {
        setSelectedShipmentIds([]);
      }
    }
  }, [isOpen, preselectedBranchId, initialSelectedShipmentIds, allShipments]);

  // Destination branches available (all branches except the current origin branch)
  const destinationBranches = useMemo(() => {
    return branches.filter(b => b.id !== originBranchId);
  }, [branches, originBranchId]);

  // Outgoing eligible shipments from origin branch
  const availableShipments = useMemo(() => {
    return allShipments.filter(s => {
      // Must be from origin branch (if admin and viewing all, can dispatch any active)
      const matchesOrigin = originBranchId ? s.originBranchId === originBranchId : true;
      const isNotDeliveredOrCancelled = s.status !== 'cancelled' && s.status !== 'delivered' && s.status !== 'returned';
      return matchesOrigin && isNotDeliveredOrCancelled;
    });
  }, [allShipments, originBranchId]);

  // Filtered shipments based on selected destination branch & search term
  const displayedShipments = useMemo(() => {
    return availableShipments.filter(s => {
      const matchesBranch = selectedDestBranchId === 'all' || s.destinationBranchId === selectedDestBranchId;
      const query = searchTerm.toLowerCase().trim();
      const matchesSearch = !query ||
        s.cnNumber.toLowerCase().includes(query) ||
        s.receiver.name.toLowerCase().includes(query) ||
        s.receiver.phone.includes(query) ||
        s.sender.name.toLowerCase().includes(query) ||
        s.packageInfo.description.toLowerCase().includes(query);

      return matchesBranch && matchesSearch;
    });
  }, [availableShipments, selectedDestBranchId, searchTerm]);

  // Selected shipments subset
  const selectedShipments = useMemo(() => {
    return availableShipments.filter(s => selectedShipmentIds.includes(s.id));
  }, [availableShipments, selectedShipmentIds]);

  // Current selected destination branch object
  const currentDestBranch = useMemo(() => {
    if (selectedDestBranchId !== 'all') {
      return branches.find(b => b.id === selectedDestBranchId);
    }
    if (selectedShipments.length > 0) {
      return branches.find(b => b.id === selectedShipments[0].destinationBranchId);
    }
    return destinationBranches[0];
  }, [selectedDestBranchId, branches, selectedShipments, destinationBranches]);

  // Selection toggle helpers
  const toggleShipmentSelection = (id: string) => {
    setSelectedShipmentIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const selectAllForCurrentBranch = () => {
    const ids = displayedShipments.map(s => s.id);
    setSelectedShipmentIds(prev => Array.from(new Set([...prev, ...ids])));
  };

  const deselectAll = () => {
    setSelectedShipmentIds([]);
  };

  // Aggregated summary metrics for selected parcels
  const metrics = useMemo(() => {
    const count = selectedShipments.length;
    const pieces = selectedShipments.reduce((sum, s) => sum + (s.packageInfo.pieces || 1), 0);
    const weight = selectedShipments.reduce((sum, s) => sum + (s.packageInfo.weightKg || 0), 0);
    const productValue = selectedShipments.reduce((sum, s) => sum + (s.financials.baseFare || s.packageInfo.declaredValue || 0), 0);
    const freightFee = selectedShipments.reduce((sum, s) => sum + (s.financials.totalAmount || 0), 0);
    const prepaid = selectedShipments.reduce((sum, s) => sum + (s.financials.paymentStatus === 'paid' ? s.financials.totalAmount : (s.financials.amountPaid || 0)), 0);
    const codToCollect = selectedShipments.reduce((sum, s) => sum + (s.financials.paymentStatus === 'to_pay' ? s.financials.totalAmount : (s.financials.amountDue || 0)), 0);

    return { count, pieces, weight, productValue, freightFee, prepaid, codToCollect };
  }, [selectedShipments]);

  // Print Handlers
  const handlePrintSticker = () => {
    if (selectedShipments.length === 0) {
      showToast(t('select_at_least_one_parcel', 'Please select at least one parcel'));
      return;
    }
    if (stickerPrintRef.current) {
      printElementUsingIframe(stickerPrintRef.current, `Bag_Sticker_${currentDestBranch?.code || 'DEST'}_${batchRefNumber}`);
    }
  };

  const handlePrintManifest = () => {
    if (selectedShipments.length === 0) {
      showToast(t('select_at_least_one_parcel', 'Please select at least one parcel'));
      return;
    }
    if (manifestPrintRef.current) {
      printElementUsingIframe(manifestPrintRef.current, `Branch_Manifest_${currentDestBranch?.code || 'DEST'}_${batchRefNumber}`);
    }
  };

  const handleDownloadPdf = () => {
    if (selectedShipments.length === 0) {
      showToast(t('select_at_least_one_parcel', 'Please select at least one parcel'));
      return;
    }

    setIsGeneratingPdf(true);
    try {
      const dispatchInfo = {
        batchNumber: batchRefNumber,
        originBranch,
        destinationBranch: currentDestBranch,
        driverName,
        vehiclePlate,
        sealNumber,
        notes: dispatchNote,
        dispatchDate: new Date().toLocaleString()
      };

      if (activeTab === 'sticker') {
        generateBranchBagStickerPdf(dispatchInfo, selectedShipments);
        showToast('✓ Master Bag Sticker PDF downloaded successfully');
      } else {
        generateBranchBulkDispatchPdf(dispatchInfo, selectedShipments, branches);
        showToast('✓ Consolidated Branch Waybill PDF downloaded successfully');
      }
    } catch (err) {
      console.error(err);
      showToast('❌ Failed to generate PDF');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div 
        className="relative w-full max-w-6xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[94vh] overflow-hidden my-auto"
        id="branch-bulk-dispatch-modal"
      >
        {/* MODAL TOP HEADER */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-red-600 text-white flex items-center justify-center shadow-md shadow-red-600/20 shrink-0">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  {t('branch_bulk_dispatch_title', 'Branch Bulk Dispatch & Bag Tag')}
                </h2>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
                  {originBranch?.code || 'ORIGIN'} ➔ {currentDestBranch?.code || 'DEST'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 hidden sm:block">
                {t('branch_bulk_dispatch_subtitle', 'Consolidated parcel transfer to target branch with printable waybill and bag sticker')}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL MAIN CONTENT GRID */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* LEFT PANEL: BRANCH FILTER, PARCEL SELECTION & DISPATCH METADATA (5 COLS) */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            
            {/* 1. Destination Branch Selector & Quick Actions */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/70 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-red-600" />
                  <span>{t('target_dest_branch', 'Destination Branch')}</span>
                </label>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  {displayedShipments.length} {t('parcels_unit', 'Parcels Available')}
                </span>
              </div>

              <select
                value={selectedDestBranchId}
                onChange={(e) => setSelectedDestBranchId(e.target.value)}
                className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:outline-none cursor-pointer"
              >
                <option value="all">🌐 {t('all_destinations', 'All Destination Branches')}</option>
                {destinationBranches.map(b => {
                  const readyCount = availableShipments.filter(s => s.destinationBranchId === b.id).length;
                  return (
                    <option key={b.id} value={b.id}>
                      📍 {getLocalizedBranchName(b)} ({b.code}) — {readyCount} {t('parcels_unit', 'Parcels')}
                    </option>
                  );
                })}
              </select>

              {/* Quick Select Buttons */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={selectAllForCurrentBranch}
                  disabled={displayedShipments.length === 0}
                  className="flex-1 py-1.5 px-2.5 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/60 text-red-700 dark:text-red-300 text-xs font-bold rounded-lg border border-red-200 dark:border-red-800 transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>{t('select_all_branch_parcels', 'Select All for this Branch')}</span>
                </button>

                <button
                  type="button"
                  onClick={deselectAll}
                  disabled={selectedShipmentIds.length === 0}
                  className="py-1.5 px-2.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {t('unselect_all', 'Deselect')}
                </button>
              </div>
            </div>

            {/* 2. Dispatch Vehicle & Driver Handover Metadata */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700/70 space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>{t('branch_route_manifest', 'Transit & Vehicle Information')}</span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                    {t('driver_courier_name', 'Driver / Courier')}
                  </label>
                  <input
                    type="text"
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-200"
                    placeholder="e.g. Ghulam Nabi"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                    {t('vehicle_plate_no', 'Vehicle / Plate')}
                  </label>
                  <input
                    type="text"
                    value={vehiclePlate}
                    onChange={(e) => setVehiclePlate(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-200"
                    placeholder="e.g. KBL-24901"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                    {t('batch_dispatch_no', 'Batch Ref #')}
                  </label>
                  <input
                    type="text"
                    value={batchRefNumber}
                    onChange={(e) => setBatchRefNumber(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-red-600 dark:text-red-400"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                    {t('master_seal_no', 'Master Seal / Bag #')}
                  </label>
                  <input
                    type="text"
                    value={sealNumber}
                    onChange={(e) => setSealNumber(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-slate-800 dark:text-slate-200"
                    placeholder="e.g. SEAL-8821"
                  />
                </div>
              </div>
            </div>

            {/* 3. Search & Contained Parcels Checklist List */}
            <div className="flex-1 flex flex-col min-h-[220px] max-h-[320px] rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700/70 overflow-hidden">
              <div className="p-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 flex items-center justify-between gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute start-2.5 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={t('search_parcels_placeholder', 'Search CN, Sender, Receiver...')}
                    className="w-full ps-8 pe-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none"
                  />
                </div>
                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 shrink-0">
                  <span className="text-red-600 dark:text-red-400">{selectedShipmentIds.length}</span> / {displayedShipments.length}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-2 space-y-1.5 divide-y divide-slate-100 dark:divide-slate-800">
                {displayedShipments.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-400">
                    {t('no_parcels_found_for_branch', 'No active parcels found for this branch destination.')}
                  </div>
                ) : (
                  displayedShipments.map(s => {
                    const isSelected = selectedShipmentIds.includes(s.id);
                    const dest = branches.find(b => b.id === s.destinationBranchId);
                    const isCod = s.financials.paymentStatus === 'to_pay';

                    return (
                      <div
                        key={s.id}
                        onClick={() => toggleShipmentSelection(s.id)}
                        className={`p-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-red-50/70 dark:bg-red-950/40 border border-red-200 dark:border-red-800/80 shadow-2xs'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <button
                            type="button"
                            className="text-red-600 dark:text-red-400 shrink-0"
                            aria-label="Toggle parcel selection"
                          >
                            {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-slate-300 dark:text-slate-600" />}
                          </button>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">{s.cnNumber}</span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold">
                                ➔ {dest?.code || 'DEST'}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                              {s.receiver.name} ({s.receiver.phone}) • {s.packageInfo.pieces}p / {s.packageInfo.weightKg}kg
                            </div>
                          </div>
                        </div>

                        <div className="text-end shrink-0">
                          <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            {s.financials.totalAmount} AFN
                          </div>
                          <div className={`text-[10px] font-bold ${isCod ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                            {isCod ? 'COD (To-Pay)' : 'PAID'}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>

          {/* RIGHT PANEL: LIVE PREVIEW OF BAG STICKER / WAYBILL MANIFEST (7 COLS) */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            
            {/* View Mode Tabs & Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              {/* Tabs */}
              <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setActiveTab('sticker')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'sticker'
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Tag className="w-3.5 h-3.5" />
                  <span>{t('view_mode_bag_tag', 'Master Bag / Carton Sticker')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('manifest')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'manifest'
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>{t('view_mode_manifest', 'Dispatch Waybill (A4)')}</span>
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={activeTab === 'sticker' ? handlePrintSticker : handlePrintManifest}
                  disabled={selectedShipments.length === 0}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-amber-400" />
                  <span>{activeTab === 'sticker' ? t('print_bag_tag_btn', 'Print Sticker') : t('print_manifest_btn', 'Print Waybill')}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={selectedShipments.length === 0 || isGeneratingPdf}
                  className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{t('download_combined_pdf', 'Download PDF')}</span>
                </button>
              </div>
            </div>

            {/* Consolidated Totals Highlight Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t('total_parcels_in_batch', 'Total Parcels')}</div>
                <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-0.5">
                  {metrics.count} <span className="text-xs font-normal text-slate-500">({metrics.pieces} pcs)</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t('total_weight_in_batch', 'Total Scale Wt')}</div>
                <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-0.5">
                  {metrics.weight} <span className="text-xs font-normal text-slate-500">KG</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t('total_freight_amount', 'Freight Amount')}</div>
                <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-0.5">
                  {metrics.freightFee.toLocaleString()} <span className="text-xs font-normal text-slate-500">AFN</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/80">
                <div className="text-[10px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400">{t('total_cod_to_collect', 'Dest COD (To Collect)')}</div>
                <div className="text-base sm:text-lg font-black text-red-600 dark:text-red-400 mt-0.5">
                  {metrics.codToCollect.toLocaleString()} <span className="text-xs font-normal">AFN</span>
                </div>
              </div>
            </div>

            {/* PREVIEW CONTAINER */}
            <div className="flex-1 bg-slate-100 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 p-3 sm:p-4 overflow-y-auto max-h-[480px]">
              
              {/* TAB 1: MASTER BAG / CARTON STICKER PREVIEW (STICKABLE TO SACK/BOX) */}
              {activeTab === 'sticker' && (
                <div
                  ref={stickerPrintRef}
                  className="bg-white text-slate-900 p-5 rounded-xl shadow-md border-4 border-slate-900 max-w-xl mx-auto space-y-4 font-sans text-xs print:m-0 print:border-4 print:p-4"
                  id="printable-master-bag-sticker"
                >
                  {/* Sticker Top Header */}
                  <div className="bg-red-600 text-white p-3 rounded-lg flex items-center justify-between">
                    <div>
                      <div className="font-black text-sm tracking-wider uppercase">ARMAGHAN SADEQ TRANSFERS</div>
                      <div className="text-[11px] font-semibold opacity-95">خدمات انتقالات ارمغان صادق • CONSOLIDATED SACK / BAG STICKER</div>
                    </div>
                    <div className="text-end">
                      <div className="text-[10px] font-mono uppercase opacity-80">BATCH ID</div>
                      <div className="font-mono font-bold text-xs">{batchRefNumber}</div>
                    </div>
                  </div>

                  {/* GIANT DESTINATION TERMINAL BANNER */}
                  <div className="bg-slate-900 text-white p-4 rounded-xl text-center space-y-1">
                    <div className="text-[11px] text-yellow-300 font-bold uppercase tracking-wider">
                      DESTINATION TERMINAL / نمایندگی مقصد
                    </div>
                    <div className="text-2xl sm:text-3xl font-black tracking-wide text-white">
                      {currentDestBranch?.name.toUpperCase()} ({currentDestBranch?.code || 'DEST'})
                    </div>
                    <div className="text-xs font-semibold text-slate-300">
                      {currentDestBranch?.city} {currentDestBranch?.province ? `• ${currentDestBranch.province}` : ''}
                    </div>
                  </div>

                  {/* Route & Vehicle Info Box */}
                  <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-[11px]">
                    <div>
                      <span className="font-bold text-slate-500">ORIGIN HUB:</span>
                      <div className="font-bold text-slate-900">{originBranch?.name} ({originBranch?.code})</div>
                    </div>
                    <div>
                      <span className="font-bold text-slate-500">TRANSIT DRIVER:</span>
                      <div className="font-bold text-slate-900">{driverName} ({vehiclePlate})</div>
                    </div>
                    <div>
                      <span className="font-bold text-slate-500">SECURITY SEAL #:</span>
                      <div className="font-mono font-bold text-red-600">{sealNumber}</div>
                    </div>
                    <div>
                      <span className="font-bold text-slate-500">DISPATCH DATE:</span>
                      <div className="font-medium text-slate-800">{new Date().toLocaleDateString()} {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                  </div>

                  {/* Huge Key Metrics Box */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2.5 rounded-lg bg-slate-100 border border-slate-300">
                      <div className="text-[10px] font-bold text-slate-500 uppercase">PARCELS</div>
                      <div className="text-xl font-black text-slate-900">{metrics.count}</div>
                      <div className="text-[10px] text-slate-500 font-medium">({metrics.pieces} Boxes)</div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-100 border border-slate-300">
                      <div className="text-[10px] font-bold text-slate-500 uppercase">SCALE WEIGHT</div>
                      <div className="text-xl font-black text-slate-900">{metrics.weight} <span className="text-xs font-normal">KG</span></div>
                      <div className="text-[10px] text-slate-500 font-medium">Verified Scale</div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-red-50 border border-red-300">
                      <div className="text-[10px] font-bold text-red-600 uppercase">TOTAL COD</div>
                      <div className="text-lg font-black text-red-600">{metrics.codToCollect.toLocaleString()}</div>
                      <div className="text-[10px] text-red-600 font-bold">AFN at Dest</div>
                    </div>
                  </div>

                  {/* Contained Consignments Checklist Table */}
                  <div className="border border-slate-300 rounded-lg overflow-hidden">
                    <div className="bg-slate-900 text-white px-3 py-1.5 font-bold text-[11px] flex justify-between">
                      <span>CONTAINED PARCEL CHECKLIST (لیست امانات داخل بوجی)</span>
                      <span>{selectedShipments.length} Items</span>
                    </div>
                    <div className="divide-y divide-slate-200 max-h-48 overflow-y-auto text-[10px]">
                      {selectedShipments.map((s, idx) => {
                        const isCod = s.financials.paymentStatus === 'to_pay';
                        return (
                          <div key={s.id} className="p-1.5 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-400">#{idx + 1}</span>
                              <span className="font-mono font-bold text-slate-900">{s.cnNumber}</span>
                              <span className="text-slate-600 truncate max-w-[130px]">({s.receiver.name})</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-slate-500">{s.packageInfo.pieces}p / {s.packageInfo.weightKg}k</span>
                              <span className={`font-bold ${isCod ? 'text-red-600' : 'text-emerald-700'}`}>
                                {isCod ? `COD: ${s.financials.totalAmount}` : 'PAID'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Master Barcode */}
                  <div className="pt-2 flex flex-col items-center justify-center border-t border-slate-200">
                    <BarcodeGenerator value={batchRefNumber} width={1.8} height={38} displayValue={true} />
                    <div className="text-[9px] text-slate-500 font-mono mt-1">
                      Armaghan Sadeq Transfers • Paste Securely to Master Cargo Bag / Box
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: OFFICIAL BRANCH TRANSFER MANIFEST (A4 WAYBILL) */}
              {activeTab === 'manifest' && (
                <div
                  ref={manifestPrintRef}
                  className="bg-white text-slate-900 p-6 rounded-xl shadow-md border border-slate-200 max-w-2xl mx-auto space-y-4 font-sans text-xs print:m-0 print:border-none print:p-4"
                  id="printable-branch-manifest-waybill"
                >
                  {/* Waybill Header */}
                  <div className="border-b-2 border-slate-900 pb-3 flex items-start justify-between">
                    <div>
                      <h1 className="text-base font-black text-slate-900 tracking-wider">ARMAGHAN SADEQ TRANSFERS</h1>
                      <div className="text-xs font-bold text-red-600">خدمات انتقالات ارمغان صادق • شرکت ترانسپورت و باربری سراسری</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        Inter-Branch Highway Parcel Transfer Waybill (بارنامه رسمی انتقال تجمیعی به نمایندگی)
                      </div>
                    </div>
                    <div className="text-end">
                      <div className="px-2.5 py-1 bg-red-600 text-white font-mono font-bold text-xs rounded">
                        {batchRefNumber}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1">
                        {new Date().toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  {/* Dispatch Route Cards */}
                  <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200 text-[11px]">
                    <div>
                      <div className="text-slate-500 font-semibold">ORIGIN HUB (مبدأ):</div>
                      <div className="font-bold text-slate-900">{originBranch?.name} ({originBranch?.code})</div>
                      <div className="text-slate-600">{originBranch?.city}, {originBranch?.phone}</div>
                    </div>
                    <div>
                      <div className="text-slate-500 font-semibold">DESTINATION TERMINAL (مقصد):</div>
                      <div className="font-bold text-slate-900">{currentDestBranch?.name} ({currentDestBranch?.code})</div>
                      <div className="text-slate-600">{currentDestBranch?.city}, {currentDestBranch?.phone}</div>
                    </div>
                    <div>
                      <div className="text-slate-500 font-semibold">DRIVER & VEHICLE:</div>
                      <div className="font-bold text-slate-900">{driverName}</div>
                      <div className="text-slate-600">{vehiclePlate} • Seal: {sealNumber}</div>
                    </div>
                    <div>
                      <div className="text-slate-500 font-semibold">CONSOLIDATED STATS:</div>
                      <div className="font-bold text-slate-900">{metrics.count} Parcels ({metrics.pieces} Boxes)</div>
                      <div className="text-slate-600">Total Scale Weight: {metrics.weight} KG</div>
                    </div>
                  </div>

                  {/* Itemized Consignments Table */}
                  <table className="w-full text-start border-collapse text-[10px]">
                    <thead>
                      <tr className="bg-slate-900 text-white">
                        <th className="p-1.5 text-start">#</th>
                        <th className="p-1.5 text-start">CN #</th>
                        <th className="p-1.5 text-start">Sender (فرستنده)</th>
                        <th className="p-1.5 text-start">Receiver (گیرنده)</th>
                        <th className="p-1.5 text-start">Pcs/Wt</th>
                        <th className="p-1.5 text-start">Freight</th>
                        <th className="p-1.5 text-start">Payment</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {selectedShipments.map((s, idx) => {
                        const isCod = s.financials.paymentStatus === 'to_pay';
                        return (
                          <tr key={s.id} className={idx % 2 === 1 ? 'bg-slate-50' : 'bg-white'}>
                            <td className="p-1.5 font-bold text-slate-400">{idx + 1}</td>
                            <td className="p-1.5 font-mono font-bold text-slate-900">{s.cnNumber}</td>
                            <td className="p-1.5">{s.sender.name} ({s.sender.phone.slice(-7)})</td>
                            <td className="p-1.5">{s.receiver.name} ({s.receiver.phone.slice(-7)})</td>
                            <td className="p-1.5">{s.packageInfo.pieces}p / {s.packageInfo.weightKg}k</td>
                            <td className="p-1.5 font-bold">{s.financials.totalAmount}</td>
                            <td className="p-1.5 font-bold">
                              <span className={isCod ? 'text-red-600' : 'text-emerald-700'}>
                                {isCod ? 'TO PAY' : 'PAID'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {/* Financial Summary Strip */}
                  <div className="bg-slate-100 p-2.5 rounded-lg flex items-center justify-between text-xs font-bold">
                    <span>Total Freight: {metrics.freightFee.toLocaleString()} AFN</span>
                    <span className="text-emerald-700">Prepaid: {metrics.prepaid.toLocaleString()} AFN</span>
                    <span className="text-red-600">Net Destination COD: {metrics.codToCollect.toLocaleString()} AFN</span>
                  </div>

                  {/* Three Signatures Block */}
                  <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-200 text-[10px]">
                    <div className="border border-slate-300 p-2 rounded text-center">
                      <div className="font-bold text-slate-700 mb-6">{t('signature_origin_dispatcher', 'Origin Branch Dispatcher')}</div>
                      <div className="border-t border-slate-300 pt-1 text-[9px] text-slate-500">Sign & Stamp</div>
                    </div>
                    <div className="border border-slate-300 p-2 rounded text-center">
                      <div className="font-bold text-slate-700 mb-6">{t('signature_driver', 'Transit Driver / Courier')}</div>
                      <div className="border-t border-slate-300 pt-1 text-[9px] text-slate-500">Signature / Thumb</div>
                    </div>
                    <div className="border border-slate-300 p-2 rounded text-center">
                      <div className="font-bold text-slate-700 mb-6">{t('signature_dest_receiver', 'Destination Branch Receiver')}</div>
                      <div className="border-t border-slate-300 pt-1 text-[9px] text-slate-500">Sign & Stamp</div>
                    </div>
                  </div>

                  {/* Developer and Hotline credit */}
                  <div className="text-[9px] text-slate-400 text-center pt-2">
                    Armaghan Sadeq Transfers • Helpline: 0711299680 / 0774144004 • Developed by Rayan tech solutions (Rayan-Tech-Solution.tech)
                  </div>
                </div>
              )}

            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
