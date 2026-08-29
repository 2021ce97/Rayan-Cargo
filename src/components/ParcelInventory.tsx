import React, { useState, useMemo, useRef } from 'react';
import { 
  Boxes, 
  Search, 
  Filter, 
  Download, 
  Printer, 
  Eye, 
  ArrowUpRight, 
  Building2, 
  FileSpreadsheet,
  PackagePlus,
  RotateCcw,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ShieldCheck,
  MapPin,
  Phone,
  AlertTriangle,
  Clock,
  DollarSign,
  FileText,
  Loader2,
  FileCheck,
  X,
  Lock,
  ArrowRight,
  Sparkles,
  Send,
  Inbox
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Shipment, ShipmentStatus, ParcelCategory, PaymentStatus } from '../types';
import { generateDispatchManifestPdf, printElementUsingIframe } from '../utils/pdfExport';
import { BarcodeGenerator } from './BarcodeGenerator';

type SortField = 'date' | 'weight' | 'amount' | 'cn' | 'status';
type SortOrder = 'asc' | 'desc';
type InventoryTab = 'all' | 'inbound' | 'outbound' | 'warehouse';

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
    trackByCnNumber, 
    setActiveView,
    updateShipmentStatus
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

      if (userBranch) {
        if (activeTab === 'inbound') {
          matchesTab = s.destinationBranchId === userBranch;
        } else if (activeTab === 'outbound') {
          matchesTab = s.originBranchId === userBranch;
        } else if (activeTab === 'warehouse') {
          matchesTab = s.currentBranchId === userBranch && s.status !== 'delivered';
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
  }, [
    baseShipmentList,
    searchTerm, 
    selectedStatus, 
    selectedCategory, 
    selectedPayment, 
    activeTab, 
    activeBranchId,
    currentUser,
    sortField, 
    sortOrder
  ]);

  // Export to CSV Function
  const exportToCSV = () => {
    const headers = [
      'CN Number', 
      'Origin Branch', 
      'Destination Branch', 
      'Sender Name', 
      'Sender Phone', 
      'Receiver Name', 
      'Receiver Phone', 
      'Category', 
      'Weight (KG)', 
      'Pieces', 
      'Total AFN', 
      'Payment Status', 
      'Tracking Status', 
      'Booked At'
    ];

    const rows = processedParcels.map(p => {
      const orig = branches.find(b => b.id === p.originBranchId)?.name || p.sender.city;
      const dest = branches.find(b => b.id === p.destinationBranchId)?.name || p.receiver.city;
      return [
        p.cnNumber,
        `"${orig}"`,
        `"${dest}"`,
        `"${p.sender.name}"`,
        `"${p.sender.phone}"`,
        `"${p.receiver.name}"`,
        `"${p.receiver.phone}"`,
        p.packageInfo.category,
        p.packageInfo.weightKg,
        p.packageInfo.pieces,
        p.financials.totalAmount,
        p.financials.paymentStatus,
        p.status,
        `"${new Date(p.bookedAt).toLocaleDateString()}"`
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `RayanCargo_Consignments_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadManifestPdf = () => {
    setIsGeneratingManifestPdf(true);
    setManifestPdfSuccess(false);
    try {
      const branchName = activeBranchId === 'all' 
        ? 'All Network Hubs' 
        : (branches.find(b => b.id === activeBranchId)?.name || 'Branch');

      const manifestNumber = `MNF-${new Date().getFullYear()}-${processedParcels.length.toString().padStart(4, '0')}`;
      const ok = generateDispatchManifestPdf(
        manifestNumber,
        branchName,
        manifestDriver,
        manifestVehicle,
        processedParcels
      );
      if (ok) {
        setManifestPdfSuccess(true);
        setTimeout(() => setManifestPdfSuccess(false), 4000);
      }
    } catch (e) {
      console.error('Failed to generate Manifest PDF:', e);
    } finally {
      setIsGeneratingManifestPdf(false);
    }
  };

  const handlePrintManifest = () => {
    if (manifestRef.current) {
      printElementUsingIframe(manifestRef.current, 'Rayan_Cargo_Dispatch_Manifest');
    } else {
      window.print();
    }
  };

  const handleOpenStatusModal = (shipment: Shipment) => {
    const perm = canUserUpdateStatus(shipment);
    setStatusModalShipment(shipment);
    setStatusChoice(perm.allowedStatuses[0] || shipment.status);
    setStatusNote('');
  };

  const handleSaveStatus = () => {
    if (!statusModalShipment) return;
    updateShipmentStatus(statusModalShipment.id, statusChoice, statusNote);
    setStatusModalShipment(null);
  };

  const currentBranchName = activeBranchId === 'all' 
    ? 'All 6 Hubs' 
    : (branches.find(b => b.id === activeBranchId)?.name || 'Branch');

  const otherBranches = currentUser.role !== 'super_admin'
    ? branches.filter(b => b.id !== currentUser.branchId)
    : branches;

  const partnerBranchObj = branches.find(b => b.id === selectedPartnerBranchId);

  return (
    <div className="space-y-6 pb-12 font-sans" id="parcel-inventory-root">
      
      {/* Header with Title and Action buttons */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-6 rounded-2xl bg-white border border-slate-200 shadow-xs" id="inventory-header">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-md">
              <Boxes className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Consignment Cargo Inventory
                </h1>
                {activeBranchId !== 'all' && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-red-100 text-red-700 border border-red-200">
                    {currentBranchName}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Manage 6-branch consignments, origin/destination handoffs, and manifests
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
            className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs flex items-center gap-1.5 border border-slate-200 transition-colors cursor-pointer"
            title="Export Table as CSV"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">CSV</span>
          </button>
        </div>
      </div>

      {/* CROSS-BRANCH BILATERAL HISTORY SELECTOR */}
      {currentUser.role !== 'super_admin' && (
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <Building2 className="w-4 h-4 text-red-600" />
              <span>Cross-Branch Partner History:</span>
              <span className="text-slate-500 font-normal">
                Select a branch to view all mutual parcels sent to or received from that branch
              </span>
            </div>
            {selectedPartnerBranchId !== 'all' && (
              <button
                onClick={() => setSelectedPartnerBranchId('all')}
                className="text-xs text-red-600 hover:underline font-bold cursor-pointer"
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
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
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
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
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

          {selectedPartnerBranchId !== 'all' && (
            <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-900 flex items-center justify-between">
              <span>
                Viewing mutual shipment history with: <strong>{partnerBranchObj?.name} ({partnerBranchObj?.city})</strong>
              </span>
              <span className="font-bold">{processedParcels.length} consignments</span>
            </div>
          )}
        </div>
      )}

      {/* Tabs & Filter Toolbar */}
      <div className="space-y-4">
        
        {/* Inbound / Outbound / Warehouse Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex p-1 rounded-xl bg-slate-200/80 border border-slate-300 text-xs font-bold">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-1.5 rounded-lg transition-all cursor-pointer ${activeTab === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              All Parcels ({baseShipmentList.length})
            </button>
            <button
              onClick={() => setActiveTab('outbound')}
              className={`px-4 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${activeTab === 'outbound' ? 'bg-white text-red-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>Outbound (Sent)</span>
            </button>
            <button
              onClick={() => setActiveTab('inbound')}
              className={`px-4 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${activeTab === 'inbound' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <Inbox className="w-3.5 h-3.5" />
              <span>Inbound (Incoming)</span>
            </button>
            <button
              onClick={() => setActiveTab('warehouse')}
              className={`px-4 py-1.5 rounded-lg transition-all cursor-pointer ${activeTab === 'warehouse' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              In Warehouse
            </button>
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Showing <strong>{processedParcels.length}</strong> of {baseShipmentList.length} consignments
          </div>
        </div>

        {/* Search and Secondary Select Filters */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          
          {/* Search Bar */}
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by CN, Sender, Receiver, Phone, City..."
              className="w-full h-10 ps-9 pe-4 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="all">All Statuses (همه حالات)</option>
              <option value="booked">Booked (ثبت شده)</option>
              <option value="in_transit">In Transit (در حال انتقال)</option>
              <option value="received_at_branch">Received at Hub (رسیده به مقصد)</option>
              <option value="out_for_delivery">Out for Delivery (توزیع)</option>
              <option value="delivered">Delivered (تحویل داده شده)</option>
            </select>
          </div>

          {/* Payment Status Filter */}
          <div>
            <select
              value={selectedPayment}
              onChange={(e) => setSelectedPayment(e.target.value)}
              className="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="all">All Payments (پرداخت)</option>
              <option value="paid">Paid (پرداخت شده)</option>
              <option value="to_pay">COD / To-Pay (تحویل در مقصد)</option>
              <option value="partial">Partial</option>
            </select>
          </div>

        </div>

      </div>

      {/* Main Parcel Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                <th className="p-3.5 text-start cursor-pointer select-none" onClick={() => handleSort('cn')}>
                  <div className="flex items-center gap-1">
                    <span>CN Number</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="p-3.5 text-start">Route & Terminals</th>
                <th className="p-3.5 text-start">Sender (Origin)</th>
                <th className="p-3.5 text-start">Receiver (Destination)</th>
                <th className="p-3.5 text-center cursor-pointer select-none" onClick={() => handleSort('weight')}>
                  <div className="flex items-center justify-center gap-1">
                    <span>Weight / Specs</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="p-3.5 text-center cursor-pointer select-none" onClick={() => handleSort('amount')}>
                  <div className="flex items-center justify-center gap-1">
                    <span>Amount</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="p-3.5 text-center">Status & Update</th>
                <th className="p-3.5 text-end">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {processedParcels.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-400">
                    <Boxes className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600">No consignments found</p>
                    <p className="text-xs text-slate-400 mt-1">Try adjusting search filters or book a new parcel.</p>
                  </td>
                </tr>
              ) : (
                processedParcels.map((s) => {
                  const orig = branches.find(b => b.id === s.originBranchId);
                  const dest = branches.find(b => b.id === s.destinationBranchId);
                  const updatePerm = canUserUpdateStatus(s);

                  return (
                    <tr 
                      key={s.id} 
                      className="hover:bg-slate-50 transition-colors cursor-pointer group"
                      onClick={() => setDetailsModalShipment(s)}
                    >
                      {/* CN Number */}
                      <td className="p-3.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => {
                            trackByCnNumber(s.cnNumber);
                            setActiveView('tracking');
                          }}
                          className="font-mono font-bold text-red-600 hover:underline cursor-pointer flex items-center gap-1"
                        >
                          <span>{s.cnNumber}</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </button>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {new Date(s.bookedAt).toLocaleDateString()}
                        </div>
                      </td>

                      {/* Route */}
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900 flex items-center gap-1">
                          <span>{orig?.city || s.sender.city}</span>
                          <span className="text-slate-400">➔</span>
                          <span>{dest?.city || s.receiver.city}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1">
                          <span className="font-mono font-semibold">{orig?.code}</span>
                          <span>to</span>
                          <span className="font-mono font-semibold">{dest?.code}</span>
                        </div>
                      </td>

                      {/* Sender Info */}
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900 max-w-[130px] truncate">
                          {s.sender.name}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">{s.sender.phone}</div>
                        <div className="text-[10px] text-slate-500 truncate max-w-[130px]">{s.sender.city}</div>
                      </td>

                      {/* Receiver Info */}
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900 max-w-[130px] truncate">
                          {s.receiver.name}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">{s.receiver.phone}</div>
                        <div className="text-[10px] text-slate-500 truncate max-w-[130px]">{s.receiver.city}</div>
                      </td>

                      {/* Package Details */}
                      <td className="p-3.5 text-center">
                        <div className="font-black text-slate-900 font-mono">
                          {s.packageInfo.weightKg} KG
                        </div>
                        <div className="text-[10px] text-slate-500 capitalize">
                          {s.packageInfo.pieces} pcs • {s.packageInfo.category}
                        </div>
                        {s.packageInfo.isFragile && (
                          <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-100 text-rose-700">
                            Fragile
                          </span>
                        )}
                      </td>

                      {/* Amount & Payment */}
                      <td className="p-3.5 text-center">
                        <div className="font-black text-slate-900 font-mono">
                          {s.financials.totalAmount.toLocaleString()} AFN
                        </div>
                        <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          s.financials.paymentStatus === 'paid' 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : s.financials.paymentStatus === 'to_pay'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {s.financials.paymentStatus === 'to_pay' ? 'COD (To-Pay)' : s.financials.paymentStatus.toUpperCase()}
                        </span>
                      </td>

                      {/* Milestone Status & Update Trigger */}
                      <td className="p-3.5 text-center" onClick={(e) => e.stopPropagation()}>
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
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-end" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedShipmentForReceipt(s)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                            title="Print / Download PDF Receipt"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDetailsModalShipment(s)}
                            className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-colors cursor-pointer"
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

      {/* Comprehensive Parcel Details Modal */}
      {detailsModalShipment && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 p-6 animate-in fade-in zoom-in-95 space-y-6 my-8">
            
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
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
                <h2 className="text-base font-black text-slate-900">
                  Consignment Dossier & Tracking Specifications
                </h2>
              </div>

              <button
                onClick={() => setDetailsModalShipment(null)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-900 flex items-center justify-center font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 uppercase tracking-wider">
                  <MapPin className="w-4 h-4 text-red-500" />
                  <span>Sender Details (Origin)</span>
                </div>
                <div className="font-bold text-sm text-slate-900">{detailsModalShipment.sender.name}</div>
                <div className="font-mono text-slate-600">{detailsModalShipment.sender.phone}</div>
                <div className="text-[11px] text-slate-500">{detailsModalShipment.sender.address}, {detailsModalShipment.sender.city}</div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 uppercase tracking-wider">
                  <MapPin className="w-4 h-4 text-emerald-500" />
                  <span>Receiver Details (Destination)</span>
                </div>
                <div className="font-bold text-sm text-slate-900">{detailsModalShipment.receiver.name}</div>
                <div className="font-mono text-slate-600">{detailsModalShipment.receiver.phone}</div>
                <div className="text-[11px] text-slate-500">{detailsModalShipment.receiver.address}, {detailsModalShipment.receiver.city}</div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 uppercase tracking-wider">
                  <Boxes className="w-4 h-4 text-amber-500" />
                  <span>Package Specs</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-400">Category:</span>
                    <p className="font-bold capitalize">{detailsModalShipment.packageInfo.category}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Weight:</span>
                    <p className="font-bold font-mono">{detailsModalShipment.packageInfo.weightKg} KG</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Pieces:</span>
                    <p className="font-bold">{detailsModalShipment.packageInfo.pieces} Boxes</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Service:</span>
                    <p className="font-bold">{detailsModalShipment.packageInfo.serviceType}</p>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 uppercase tracking-wider">
                  <DollarSign className="w-4 h-4 text-emerald-500" />
                  <span>Financials</span>
                </div>
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Base Fare</span>
                    <span className="font-mono">{detailsModalShipment.financials.baseRate} AFN</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Weight Cost</span>
                    <span className="font-mono">{detailsModalShipment.financials.weightCost} AFN</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-slate-200">
                    <span>Total Amount:</span>
                    <span className="font-mono text-red-600">{detailsModalShipment.financials.totalAmount?.toLocaleString()} AFN</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500">Status:</span>
                    <span className="font-bold uppercase text-emerald-600">{detailsModalShipment.financials.paymentStatus}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Tracking History */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-blue-500" />
                <span>Milestone History Timeline</span>
              </h3>
              <div className="space-y-2.5 max-h-44 overflow-y-auto pr-1">
                {detailsModalShipment.statusHistory.map((h, i) => (
                  <div key={h.id || i} className="flex items-start gap-2.5 text-xs">
                    <div className="w-2 h-2 rounded-full bg-red-600 mt-1.5 shrink-0" />
                    <div>
                      <div className="font-bold text-slate-900">
                        {h.status.replace(/_/g, ' ')} • <span className="font-medium text-slate-500">{h.location}</span>
                      </div>
                      <p className="text-[11px] text-slate-500">{h.note}</p>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(h.timestamp).toLocaleString()} ({h.updatedBy})
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
              <button
                onClick={() => {
                  setSelectedShipmentForReceipt(detailsModalShipment);
                  setDetailsModalShipment(null);
                }}
                className="px-4 py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>Print / Download Receipt</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    handleOpenStatusModal(detailsModalShipment);
                    setDetailsModalShipment(null);
                  }}
                  className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-colors"
                >
                  Update Status
                </button>
                <button
                  onClick={() => setDetailsModalShipment(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* SENDER/RECEIVER GUARDED STATUS UPDATE MODAL */}
      {statusModalShipment && (() => {
        const updatePerm = canUserUpdateStatus(statusModalShipment);
        const origBranch = branches.find(b => b.id === statusModalShipment.originBranchId);
        const destBranch = branches.find(b => b.id === statusModalShipment.destinationBranchId);

        return (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-6 animate-in fade-in zoom-in-95 space-y-4">
              
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    Update Consignment Status
                  </h3>
                  <div className="text-xs font-mono font-bold text-red-600">
                    {statusModalShipment.cnNumber} ({origBranch?.code} ➔ {destBranch?.code})
                  </div>
                </div>
                <button
                  onClick={() => setStatusModalShipment(null)}
                  className="text-slate-400 hover:text-slate-600 font-bold"
                >
                  ✕
                </button>
              </div>

              {/* Status Progression Role Explainer */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                <div className="font-bold text-slate-800 flex items-center justify-between">
                  <span>Current State:</span>
                  <span className="font-mono text-red-600 uppercase font-black">{statusModalShipment.status.replace(/_/g, ' ')}</span>
                </div>
                <p className="text-[11px] text-slate-600">
                  {updatePerm.roleType === 'sender_branch' && (
                    <span>🏢 You are the <strong>Sender Branch ({origBranch?.name})</strong>. You manage booking and transit dispatch.</span>
                  )}
                  {updatePerm.roleType === 'receiver_branch' && (
                    <span>📍 You are the <strong>Receiver Branch ({destBranch?.name})</strong>. You manage destination arrival and customer delivery.</span>
                  )}
                  {updatePerm.roleType === 'admin' && (
                    <span>⭐ Super Admin override permissions.</span>
                  )}
                </p>
              </div>

              {updatePerm.canUpdate ? (
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">
                      Select Next Permitted Milestone
                    </label>
                    <select
                      value={statusChoice}
                      onChange={(e) => setStatusChoice(e.target.value as ShipmentStatus)}
                      className="w-full h-10 px-3 font-bold bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      {updatePerm.allowedStatuses.map(st => (
                        <option key={st} value={st}>
                          {st === 'in_transit' && '➔ In Transit (Dispatch to Highway Carrier)'}
                          {st === 'received_at_branch' && '✓ Received at Destination Branch Terminal'}
                          {st === 'out_for_delivery' && '🚚 Out for Final Delivery to Receiver'}
                          {st === 'delivered' && '★ Delivered & Handed Over to Client'}
                          {st === 'booked' && 'Booked'}
                          {st === 'returned' && 'Returned'}
                          {st === 'cancelled' && 'Cancelled'}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-600 font-medium mb-1">
                      Milestone Note / Tracking Remark
                    </label>
                    <textarea
                      rows={2}
                      value={statusNote}
                      onChange={(e) => setStatusNote(e.target.value)}
                      placeholder="e.g. Dispatched via Truck Plate #24901 / Arrived at Western Hub..."
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 resize-none focus:outline-none focus:ring-2 focus:ring-red-500 text-xs"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      onClick={handleSaveStatus}
                      className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-colors"
                    >
                      Apply Milestone Change
                    </button>
                    <button
                      onClick={() => setStatusModalShipment(null)}
                      className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold text-amber-900">
                    <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Status Update Locked</span>
                  </div>
                  <p className="leading-relaxed">
                    {updatePerm.reason}
                  </p>
                  <button
                    onClick={() => setStatusModalShipment(null)}
                    className="w-full py-2 bg-amber-200 hover:bg-amber-300 text-amber-900 font-bold rounded-lg text-xs transition-colors"
                  >
                    Understood
                  </button>
                </div>
              )}

            </div>
          </div>
        );
      })()}

      {/* Cargo Dispatch & Transit Manifest Modal */}
      {isManifestOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-5xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95">
            
            <div className="no-print p-4 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-red-600" />
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    Inter-Branch Cargo Dispatch Manifest
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
                  placeholder="Driver Name & ID"
                  className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs font-medium w-44"
                />
                <input
                  type="text"
                  value={manifestVehicle}
                  onChange={(e) => setManifestVehicle(e.target.value)}
                  placeholder="Vehicle Plate #"
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
                      <span>Download PDF</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handlePrintManifest}
                  className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Sheet</span>
                </button>

                <button
                  onClick={() => setIsManifestOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 font-bold"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Manifest Document Preview Container */}
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
