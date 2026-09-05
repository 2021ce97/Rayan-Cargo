import React, { useState, useMemo, useRef } from 'react';
import {
  X,
  Printer,
  Download,
  Users,
  Search,
  CheckSquare,
  Square,
  Package,
  MapPin,
  Phone,
  Scale,
  DollarSign,
  FileCheck,
  Loader2,
  CheckCircle2,
  Building2,
  AlertCircle,
  FileText,
  BadgeAlert
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Shipment, Branch } from '../types';
import { generateCombinedCustomerPdf, printElementUsingIframe } from '../utils/pdfExport';
import { BarcodeGenerator } from './BarcodeGenerator';

interface CombinedCustomerReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedCustomerPhone?: string;
}

interface CustomerGroup {
  receiverName: string;
  receiverPhone: string;
  receiverCity: string;
  receiverAddress: string;
  receiverTazkira?: string;
  destinationBranchId: string;
  shipments: Shipment[];
}

export const CombinedCustomerReceiptModal: React.FC<CombinedCustomerReceiptModalProps> = ({
  isOpen,
  onClose,
  preselectedCustomerPhone
}) => {
  const { filteredShipments, shipments: allShipments, branches, currentUser, activeBranchId, t } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterMultiOnly, setFilterMultiOnly] = useState(false);
  const [selectedCustomerKey, setSelectedCustomerKey] = useState<string | null>(null);
  const [selectedShipmentIds, setSelectedShipmentIds] = useState<string[]>([]);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [customTazkira, setCustomTazkira] = useState('');

  const printableRef = useRef<HTMLDivElement>(null);

  // Group all available shipments by receiver phone / name
  const customerGroups = useMemo(() => {
    // Current branch scope
    const currentBranch = currentUser.role === 'super_admin' ? (activeBranchId !== 'all' ? activeBranchId : null) : currentUser.branchId;

    // We look at all shipments relevant to the destination or whole system if admin
    const relevantShipments = (currentBranch 
      ? allShipments.filter(s => s.destinationBranchId === currentBranch || s.originBranchId === currentBranch)
      : allShipments
    ).filter(s => s.status !== 'cancelled');

    const map = new Map<string, CustomerGroup>();

    relevantShipments.forEach(s => {
      const cleanPhone = s.receiver.phone.replace(/[^0-9]/g, '');
      const key = cleanPhone || s.receiver.name.toLowerCase().trim();

      if (!map.has(key)) {
        map.set(key, {
          receiverName: s.receiver.name,
          receiverPhone: s.receiver.phone,
          receiverCity: s.receiver.city,
          receiverAddress: s.receiver.address,
          receiverTazkira: s.receiver.nationalId || s.sender.receiverTazkira || '',
          destinationBranchId: s.destinationBranchId,
          shipments: []
        });
      }

      const grp = map.get(key)!;
      grp.shipments.push(s);
      if (!grp.receiverTazkira && (s.receiver.nationalId || s.sender.receiverTazkira)) {
        grp.receiverTazkira = s.receiver.nationalId || s.sender.receiverTazkira;
      }
    });

    return Array.from(map.values());
  }, [allShipments, currentUser, activeBranchId]);

  // Filtered customer groups
  const filteredCustomerGroups = useMemo(() => {
    let list = customerGroups;

    if (filterMultiOnly) {
      list = list.filter(g => g.shipments.length >= 2);
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      list = list.filter(g => 
        g.receiverName.toLowerCase().includes(q) ||
        g.receiverPhone.includes(q) ||
        (g.receiverTazkira && g.receiverTazkira.toLowerCase().includes(q)) ||
        g.receiverCity.toLowerCase().includes(q) ||
        g.shipments.some(s => s.cnNumber.toLowerCase().includes(q))
      );
    }

    // Sort: multi-parcel customers first
    return list.sort((a, b) => b.shipments.length - a.shipments.length);
  }, [customerGroups, searchTerm, filterMultiOnly]);

  // Handle setting initial preselected customer
  React.useEffect(() => {
    if (preselectedCustomerPhone && customerGroups.length > 0) {
      const clean = preselectedCustomerPhone.replace(/[^0-9]/g, '');
      const found = customerGroups.find(g => g.receiverPhone.replace(/[^0-9]/g, '') === clean);
      if (found) {
        setSelectedCustomerKey(found.receiverPhone.replace(/[^0-9]/g, '') || found.receiverName.toLowerCase().trim());
        setSelectedShipmentIds(found.shipments.map(s => s.id));
        setCustomTazkira(found.receiverTazkira || '');
      }
    } else if (!selectedCustomerKey && filteredCustomerGroups.length > 0) {
      // Auto-select first multi-parcel customer if available
      const first = filteredCustomerGroups[0];
      setSelectedCustomerKey(first.receiverPhone.replace(/[^0-9]/g, '') || first.receiverName.toLowerCase().trim());
      setSelectedShipmentIds(first.shipments.map(s => s.id));
      setCustomTazkira(first.receiverTazkira || '');
    }
  }, [preselectedCustomerPhone, customerGroups]);

  if (!isOpen) return null;

  const currentSelectedGroup = customerGroups.find(g => {
    const key = g.receiverPhone.replace(/[^0-9]/g, '') || g.receiverName.toLowerCase().trim();
    return key === selectedCustomerKey;
  }) || null;

  const handleSelectCustomer = (grp: CustomerGroup) => {
    const key = grp.receiverPhone.replace(/[^0-9]/g, '') || grp.receiverName.toLowerCase().trim();
    setSelectedCustomerKey(key);
    setSelectedShipmentIds(grp.shipments.map(s => s.id));
    setCustomTazkira(grp.receiverTazkira || '');
  };

  const handleToggleShipment = (id: string) => {
    setSelectedShipmentIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllShipments = (selectAll: boolean) => {
    if (!currentSelectedGroup) return;
    if (selectAll) {
      setSelectedShipmentIds(currentSelectedGroup.shipments.map(s => s.id));
    } else {
      setSelectedShipmentIds([]);
    }
  };

  // Selected Shipments for the combined document
  const activeSelectedShipments = currentSelectedGroup 
    ? currentSelectedGroup.shipments.filter(s => selectedShipmentIds.includes(s.id))
    : [];

  const destBranch = currentSelectedGroup 
    ? branches.find(b => b.id === currentSelectedGroup.destinationBranchId)
    : branches.find(b => b.id === currentUser.branchId);

  // Financial totals
  const totalPcs = activeSelectedShipments.reduce((sum, s) => sum + (s.packageInfo.pieces || 1), 0);
  const totalWeight = activeSelectedShipments.reduce((sum, s) => sum + (s.packageInfo.weightKg || 0), 0);
  const totalFreight = activeSelectedShipments.reduce((sum, s) => sum + (s.financials.totalAmount || 0), 0);
  const totalPaid = activeSelectedShipments.reduce((sum, s) => sum + (s.financials.paymentStatus === 'paid' ? s.financials.totalAmount : (s.financials.amountPaid || 0)), 0);
  const totalCodDue = activeSelectedShipments.reduce((sum, s) => sum + (s.financials.paymentStatus === 'to_pay' ? s.financials.totalAmount : (s.financials.amountDue || 0)), 0);

  const handleDownloadPdf = () => {
    if (!currentSelectedGroup || activeSelectedShipments.length === 0) return;
    setIsGeneratingPdf(true);
    setDownloadSuccess(false);

    try {
      const ok = generateCombinedCustomerPdf(
        {
          name: currentSelectedGroup.receiverName,
          phone: currentSelectedGroup.receiverPhone,
          city: currentSelectedGroup.receiverCity,
          address: currentSelectedGroup.receiverAddress,
          receiverTazkira: customTazkira || currentSelectedGroup.receiverTazkira
        },
        activeSelectedShipments,
        destBranch,
        branches
      );
      if (ok) {
        setDownloadSuccess(true);
        setTimeout(() => setDownloadSuccess(false), 4000);
      }
    } catch (e) {
      console.error('Combined PDF error:', e);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrintReceipt = () => {
    if (printableRef.current) {
      printElementUsingIframe(
        printableRef.current,
        `Combined_Receipt_${currentSelectedGroup?.receiverName || 'Customer'}`
      );
    } else {
      window.print();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-5xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95">
        
        {/* Modal Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between gap-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-red-600 flex items-center justify-center text-white font-bold shadow-xs">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight">
                  Combined Customer Multi-Parcel PDF & Delivery Manifest
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30">
                  چند بسته یک گیرنده
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Consolidate and print a single combined waybill / delivery slip for a customer receiving multiple parcels from different origin hubs
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body: Split into Customer Selector & Multi-Parcel Consignments view */}
        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-hidden">
          
          {/* LEFT COLUMN: Customer Picker & Search */}
          <div className="lg:col-span-4 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-slate-50 dark:bg-slate-950/60 overflow-hidden">
            
            {/* Search & Filter Header */}
            <div className="p-3 border-b border-slate-200 dark:border-slate-800 space-y-2 bg-white dark:bg-slate-900 shrink-0">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search customer name, phone, tazkira..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setFilterMultiOnly(!filterMultiOnly)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    filterMultiOnly 
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  <Package className="w-3 h-3" />
                  <span>Only Multiple Parcels (2+)</span>
                </button>

                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                  {filteredCustomerGroups.length} Receivers
                </span>
              </div>
            </div>

            {/* Customer List Scrollable */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5 divide-y divide-slate-200/60 dark:divide-slate-800/60">
              {filteredCustomerGroups.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p>No customer found matching your search</p>
                </div>
              ) : (
                filteredCustomerGroups.map(grp => {
                  const key = grp.receiverPhone.replace(/[^0-9]/g, '') || grp.receiverName.toLowerCase().trim();
                  const isSelected = selectedCustomerKey === key;
                  const isMulti = grp.shipments.length > 1;

                  // Get unique origin branch names
                  const originNames = Array.from(new Set(
                    grp.shipments.map(s => branches.find(b => b.id === s.originBranchId)?.city || s.sender.city)
                  ));

                  return (
                    <button
                      key={key}
                      onClick={() => handleSelectCustomer(grp)}
                      className={`w-full p-2.5 rounded-xl text-start transition-all cursor-pointer block ${
                        isSelected 
                          ? 'bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 shadow-xs'
                          : 'hover:bg-white dark:hover:bg-slate-900 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <div className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                          {grp.receiverName}
                        </div>
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                          isMulti 
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-black'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}>
                          {grp.shipments.length} {grp.shipments.length > 1 ? 'Parcels' : 'Parcel'}
                        </span>
                      </div>

                      <div className="text-[11px] font-mono text-slate-600 dark:text-slate-400 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{grp.receiverPhone}</span>
                      </div>

                      <div className="text-[10px] text-slate-500 dark:text-slate-500 truncate mt-0.5">
                        Origins: {originNames.join(', ')}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

          </div>

          {/* RIGHT COLUMN: Consignment List & Combined PDF Preview */}
          <div className="lg:col-span-8 flex flex-col bg-white dark:bg-slate-900 overflow-hidden">
            
            {currentSelectedGroup ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                
                {/* Consignee Summary Card */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 shrink-0">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Consignee (Person A):
                        </span>
                        <span className="text-sm font-black text-slate-900 dark:text-white">
                          {currentSelectedGroup.receiverName}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-300 mt-1">
                        <span className="flex items-center gap-1 font-mono">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          {currentSelectedGroup.receiverPhone}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {currentSelectedGroup.receiverCity} ({destBranch?.name || 'Dest Hub'})
                        </span>
                      </div>
                    </div>

                    {/* Tazkira Input */}
                    <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                        Receiver Tazkira:
                      </span>
                      <input
                        type="text"
                        placeholder="e.g. 1401-1234567-8"
                        value={customTazkira}
                        onChange={e => setCustomTazkira(e.target.value)}
                        className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100 bg-transparent focus:outline-hidden w-36"
                      />
                    </div>
                  </div>
                </div>

                {/* Selection & Checklist Controls */}
                <div className="px-4 py-2 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs shrink-0">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSelectAllShipments(selectedShipmentIds.length !== currentSelectedGroup.shipments.length)}
                      className="font-bold text-red-600 dark:text-red-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      {selectedShipmentIds.length === currentSelectedGroup.shipments.length ? (
                        <>
                          <CheckSquare className="w-4 h-4" />
                          <span>Deselect All</span>
                        </>
                      ) : (
                        <>
                          <Square className="w-4 h-4" />
                          <span>Select All ({currentSelectedGroup.shipments.length})</span>
                        </>
                      )}
                    </button>
                    <span className="text-slate-400">|</span>
                    <span className="text-slate-500">
                      {selectedShipmentIds.length} of {currentSelectedGroup.shipments.length} parcels included in combined PDF
                    </span>
                  </div>

                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    Destination Hub: {destBranch?.name || 'Local Hub'}
                  </span>
                </div>

                {/* Shipments Table List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  {currentSelectedGroup.shipments.map(s => {
                    const isChecked = selectedShipmentIds.includes(s.id);
                    const origBranch = branches.find(b => b.id === s.originBranchId);
                    const isToPay = s.financials.paymentStatus === 'to_pay';

                    return (
                      <div
                        key={s.id}
                        onClick={() => handleToggleShipment(s.id)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isChecked 
                            ? 'bg-white dark:bg-slate-800/80 border-slate-300 dark:border-slate-600 shadow-xs'
                            : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-60'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            className="text-red-600 dark:text-red-400 cursor-pointer"
                            onClick={(e) => { e.stopPropagation(); handleToggleShipment(s.id); }}
                          >
                            {isChecked ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-slate-400" />}
                          </button>

                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-xs text-red-600 dark:text-red-400">
                                {s.cnNumber}
                              </span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                                From: {origBranch?.name || s.sender.city}
                              </span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                                Shipper: {s.sender.name}
                              </span>
                            </div>

                            <div className="text-xs text-slate-600 dark:text-slate-300 mt-1 flex flex-wrap items-center gap-3">
                              <span>{s.packageInfo.description || s.packageInfo.category}</span>
                              <span className="font-mono text-slate-500">
                                {s.packageInfo.pieces} pcs ({s.packageInfo.weightKg} kg)
                              </span>
                              <span className="text-[10px] text-slate-400">
                                Status: {s.status.replace('_', ' ').toUpperCase()}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Charges & Payment badge */}
                        <div className="text-end shrink-0">
                          <div className="font-bold text-xs text-slate-900 dark:text-white">
                            {s.financials.totalAmount.toLocaleString()} AFN
                          </div>
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                            isToPay 
                              ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200'
                              : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200'
                          }`}>
                            {isToPay ? 'COD (TO PAY)' : 'PAID'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Consolidated Bottom Totals & Action Bar */}
                <div className="p-4 bg-slate-100 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 shrink-0">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    
                    {/* Totals Summary */}
                    <div className="flex flex-wrap items-center gap-4 text-xs">
                      <div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">Selected Consignments</div>
                        <div className="font-bold text-slate-900 dark:text-white">
                          {activeSelectedShipments.length} Parcels ({totalPcs} pcs, {totalWeight} kg)
                        </div>
                      </div>

                      <div className="border-l border-slate-300 dark:border-slate-600 pl-4">
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">Total Freight Value</div>
                        <div className="font-bold text-slate-900 dark:text-white">
                          {totalFreight.toLocaleString()} AFN
                        </div>
                      </div>

                      <div className="border-l border-slate-300 dark:border-slate-600 pl-4">
                        <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">Already Paid</div>
                        <div className="font-bold text-emerald-700 dark:text-emerald-300">
                          {totalPaid.toLocaleString()} AFN
                        </div>
                      </div>

                      <div className="border-l border-slate-300 dark:border-slate-600 pl-4">
                        <div className="text-[10px] text-rose-600 dark:text-rose-400 font-black">NET COD TO COLLECT</div>
                        <div className="font-black text-sm text-rose-700 dark:text-rose-300">
                          {totalCodDue.toLocaleString()} AFN
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleDownloadPdf}
                        disabled={isGeneratingPdf || activeSelectedShipments.length === 0}
                        id="btn-download-combined-pdf"
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        {isGeneratingPdf ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Generating PDF...</span>
                          </>
                        ) : downloadSuccess ? (
                          <>
                            <FileCheck className="w-4 h-4 text-emerald-200" />
                            <span>PDF Downloaded!</span>
                          </>
                        ) : (
                          <>
                            <Download className="w-4 h-4" />
                            <span>Download Combined PDF</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={handlePrintReceipt}
                        disabled={activeSelectedShipments.length === 0}
                        id="btn-print-combined-receipt"
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Printer className="w-4 h-4 text-amber-400" />
                        <span>Print Delivery Slip</span>
                      </button>
                    </div>

                  </div>
                </div>

              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
                <Users className="w-12 h-12 mb-3 opacity-30 text-slate-400" />
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">No Receiver Selected</h3>
                <p className="text-xs text-slate-500 max-w-sm mt-1">
                  Select a customer from the left list to view all their consignments and generate a combined multi-parcel PDF.
                </p>
              </div>
            )}

          </div>

        </div>

      </div>

      {/* HIDDEN PRINTABLE ELEMENT (For clean iframe printing) */}
      <div className="hidden">
        {currentSelectedGroup && (
          <div ref={printableRef} className="p-6 font-sans text-slate-900 bg-white max-w-3xl mx-auto space-y-4">
            
            {/* Header */}
            <div className="border-b-2 border-slate-900 pb-3 flex justify-between items-start">
              <div>
                <h1 className="text-xl font-black text-red-600">ARMAGHAN SADEQ TRANSFERS</h1>
                <p className="text-xs font-bold text-slate-700">خدمات انتقالات ارمغان صادق - سند تحویلی بسته های همزمان</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Nationwide Express Cargo & Freight Network | 34 Provinces</p>
              </div>
              <div className="text-right text-xs">
                <div className="font-bold font-mono">DELIVERY NOTE #{Date.now().toString().slice(-6)}</div>
                <div className="text-[10px] text-slate-500">Date: {new Date().toLocaleDateString()}</div>
                <div className="text-[10px] text-slate-600 font-bold">Helpline: 0711299680 / 0774144004</div>
              </div>
            </div>

            {/* Receiver Card */}
            <div className="p-3 bg-slate-50 border border-slate-300 rounded-lg text-xs space-y-1">
              <div className="font-bold text-slate-900 flex justify-between">
                <span>CONSIGNEE (PERSON A): {currentSelectedGroup.receiverName}</span>
                <span>Tel: {currentSelectedGroup.receiverPhone}</span>
              </div>
              <div className="text-slate-600 flex justify-between text-[11px]">
                <span>Destination: {destBranch?.name || currentSelectedGroup.receiverCity} ({currentSelectedGroup.receiverAddress})</span>
                <span>Tazkira / ID: {customTazkira || currentSelectedGroup.receiverTazkira || 'Recorded on Handover'}</span>
              </div>
            </div>

            {/* Consignments Table */}
            <table className="w-full text-xs border border-slate-300 border-collapse">
              <thead>
                <tr className="bg-slate-100 text-left border-b border-slate-300">
                  <th className="p-2 border-r border-slate-300">#</th>
                  <th className="p-2 border-r border-slate-300">CN Number</th>
                  <th className="p-2 border-r border-slate-300">Origin Hub (Sender)</th>
                  <th className="p-2 border-r border-slate-300">Description</th>
                  <th className="p-2 border-r border-slate-300 text-center">Pcs / Wt</th>
                  <th className="p-2 border-r border-slate-300 text-right">Freight</th>
                  <th className="p-2 text-center">Payment</th>
                </tr>
              </thead>
              <tbody>
                {activeSelectedShipments.map((s, i) => {
                  const orig = branches.find(b => b.id === s.originBranchId);
                  const isToPay = s.financials.paymentStatus === 'to_pay';
                  return (
                    <tr key={s.id} className="border-b border-slate-200">
                      <td className="p-2 border-r border-slate-200">{i + 1}</td>
                      <td className="p-2 border-r border-slate-200 font-mono font-bold">{s.cnNumber}</td>
                      <td className="p-2 border-r border-slate-200">{orig?.name || s.sender.city} ({s.sender.name})</td>
                      <td className="p-2 border-r border-slate-200">{s.packageInfo.description || s.packageInfo.category}</td>
                      <td className="p-2 border-r border-slate-200 text-center">{s.packageInfo.pieces} pcs / {s.packageInfo.weightKg} kg</td>
                      <td className="p-2 border-r border-slate-200 text-right font-bold">{s.financials.totalAmount} AFN</td>
                      <td className="p-2 text-center font-bold text-[10px]">{isToPay ? 'COD (TO PAY)' : 'PAID'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Totals Box */}
            <div className="p-3 bg-slate-100 border border-slate-300 rounded-lg flex justify-between text-xs font-bold">
              <div>Total Parcels: {activeSelectedShipments.length} ({totalPcs} pieces, {totalWeight} kg)</div>
              <div>Total Freight: {totalFreight.toLocaleString()} AFN</div>
              <div className="text-emerald-700">Paid: {totalPaid.toLocaleString()} AFN</div>
              <div className="text-red-600 font-black">NET COD DUE: {totalCodDue.toLocaleString()} AFN</div>
            </div>

            {/* Acknowledgment */}
            <div className="p-3 border border-slate-300 rounded-lg text-[10px] space-y-1">
              <p className="font-bold">اقرار خط و تسلیمی بسته ها (Customer Handover Confirmation):</p>
              <p className="text-slate-600">
                I, {currentSelectedGroup.receiverName}, confirm that I have inspected and received all the above listed {activeSelectedShipments.length} consignments in sealed, good condition from Armaghan Sadeq Transfers.
              </p>
              <div className="pt-6 grid grid-cols-3 gap-4 text-center">
                <div className="border-t border-slate-400 pt-1 font-bold">Receiver Signature & Date</div>
                <div className="border-t border-slate-400 pt-1 font-bold">Tazkira / ID Verified</div>
                <div className="border-t border-slate-400 pt-1 font-bold">Branch Delivery Officer Stamp</div>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center text-[9px] text-slate-500 pt-2 border-t border-slate-200">
              Armaghan Sadeq Transfers • www.armaghansadeq.af • Developed by Rayan tech solutions (Rayan-Tech-Solution.tech)
            </div>

          </div>
        )}
      </div>

    </div>
  );
};
