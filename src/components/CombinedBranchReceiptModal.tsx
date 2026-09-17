import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  X,
  Printer,
  Download,
  Building2,
  Package,
  Scale,
  DollarSign,
  FileText,
  Tag,
  CheckSquare,
  Square,
  Search,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
  QrCode,
  Globe,
  Boxes,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useI18n } from '../context/I18nContext';
import { Shipment, Branch, Language } from '../types';
import { printElementUsingIframe } from '../utils/pdfExport';
import { BarcodeGenerator } from './BarcodeGenerator';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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
  const { language: globalLang, isRTL: globalIsRTL, getLocalizedBranchName } = useI18n();

  // Local language switcher for the Carton Sticker & Modal
  const [modalLang, setModalLang] = useState<Language>(globalLang);
  const isRTL = modalLang === 'fa' || modalLang === 'ps';

  // Active Origin Branch determination
  const originBranchId = currentUser.role === 'super_admin' 
    ? (activeBranchId !== 'all' ? activeBranchId : (branches[0]?.id || ''))
    : currentUser.branchId;

  const originBranch = branches.find(b => b.id === originBranchId) || branches[0];

  // Destination branch state (Simple dropdown)
  const [selectedDestBranchId, setSelectedDestBranchId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedShipmentIds, setSelectedShipmentIds] = useState<string[]>([]);
  const [stickerFormat, setStickerFormat] = useState<'thermal' | 'a4'>('thermal');
  const [batchRefNumber, setBatchRefNumber] = useState('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const stickerPrintRef = useRef<HTMLDivElement>(null);

  // Sync global language when modal opens
  useEffect(() => {
    if (isOpen) {
      setModalLang(globalLang);
      const randomSuffix = Math.floor(100000 + Math.random() * 900000);
      setBatchRefNumber(`AST-BOX-${randomSuffix}`);
    }
  }, [isOpen, globalLang]);

  // Destination branches available (all branches except current origin branch)
  const destinationBranches = useMemo(() => {
    return branches.filter(b => b.id !== originBranchId);
  }, [branches, originBranchId]);

  // Initialize selected destination branch when opened
  useEffect(() => {
    if (isOpen) {
      if (preselectedBranchId && preselectedBranchId !== 'all') {
        setSelectedDestBranchId(preselectedBranchId);
      } else if (destinationBranches.length > 0 && !selectedDestBranchId) {
        setSelectedDestBranchId(destinationBranches[0].id);
      }

      if (initialSelectedShipmentIds && initialSelectedShipmentIds.length > 0) {
        setSelectedShipmentIds(initialSelectedShipmentIds);
        const firstShipment = allShipments.find(s => s.id === initialSelectedShipmentIds[0]);
        if (firstShipment) {
          setSelectedDestBranchId(firstShipment.destinationBranchId);
        }
      } else {
        setSelectedShipmentIds([]);
      }
    }
  }, [isOpen, preselectedBranchId, initialSelectedShipmentIds, allShipments, destinationBranches]);

  // Outgoing eligible shipments from origin branch
  const availableShipments = useMemo(() => {
    return allShipments.filter(s => {
      const matchesOrigin = originBranchId ? s.originBranchId === originBranchId : true;
      const isNotDeliveredOrCancelled = s.status !== 'cancelled' && s.status !== 'delivered' && s.status !== 'returned';
      return matchesOrigin && isNotDeliveredOrCancelled;
    });
  }, [allShipments, originBranchId]);

  // Parcels for the currently selected destination branch
  const branchParcels = useMemo(() => {
    if (!selectedDestBranchId) return [];
    return availableShipments.filter(s => s.destinationBranchId === selectedDestBranchId);
  }, [availableShipments, selectedDestBranchId]);

  // Filtered parcels by search query
  const displayedParcels = useMemo(() => {
    return branchParcels.filter(s => {
      const q = searchTerm.toLowerCase().trim();
      if (!q) return true;
      return (
        s.cnNumber.toLowerCase().includes(q) ||
        s.receiver.name.toLowerCase().includes(q) ||
        s.receiver.phone.includes(q) ||
        s.sender.name.toLowerCase().includes(q) ||
        s.packageInfo.description.toLowerCase().includes(q)
      );
    });
  }, [branchParcels, searchTerm]);

  // When branch changes, auto-select all parcels for that branch by default for fast carton sticker generation
  useEffect(() => {
    if (selectedDestBranchId) {
      const ids = availableShipments
        .filter(s => s.destinationBranchId === selectedDestBranchId)
        .map(s => s.id);
      setSelectedShipmentIds(ids);
    }
  }, [selectedDestBranchId, availableShipments]);

  // Selected shipments objects
  const selectedShipments = useMemo(() => {
    return branchParcels.filter(s => selectedShipmentIds.includes(s.id));
  }, [branchParcels, selectedShipmentIds]);

  // Current selected destination branch object
  const currentDestBranch = useMemo(() => {
    return branches.find(b => b.id === selectedDestBranchId) || destinationBranches[0];
  }, [branches, selectedDestBranchId, destinationBranches]);

  // Helper translations based on active modalLang
  const localized = useMemo(() => {
    const isFa = modalLang === 'fa';
    const isPs = modalLang === 'ps';

    return {
      title: isFa ? 'استیکر کارتن و بسته‌بندی نمایندگی' : isPs ? 'د کارټن او بستې استیکر' : 'Branch Carton & Bag Sticker',
      subtitle: isFa ? 'صدور و چاپ برچسب تجمیعی کارتن برای نمایندگی مقصد' : isPs ? 'د مقصد څانګې لپاره د کارټن او غوټې استیکر چاپ' : 'Print master consolidated carton sticker for destination branch',
      selectBranchLabel: isFa ? 'انتخاب نمایندگی مقصد:' : isPs ? 'د مقصد څانګه وټاکئ:' : 'Select Destination Branch:',
      selectParcelsLabel: isFa ? 'انتخاب بسته‌های موجود برای این کارتن:' : isPs ? 'د دې کارټن لپاره بارونه وټاکئ:' : 'Select Parcels for this Carton:',
      selectAll: isFa ? 'انتخاب همه' : isPs ? 'ټول انتخاب کړئ' : 'Select All',
      deselectAll: isFa ? 'لغو انتخاب' : isPs ? 'انتخاب لغوه' : 'Deselect All',
      selectedCount: (count: number, total: number) => isFa ? `${count} از ${total} بسته انتخاب شد` : isPs ? `${count} له ${total} څخه انتخاب شو` : `${count} of ${total} parcels selected`,
      printSticker: isFa ? 'چاپ استیکر کارتن' : isPs ? 'د کارټن استیکر چاپ' : 'Print Carton Sticker',
      downloadPdf: isFa ? 'دانلود فایل PDF' : isPs ? 'د پی ډي ایف ډاونلوډ' : 'Download PDF',
      masterStickerHeader: isFa ? 'برچسب بوجی و کارتن تجمیعی باربری' : isPs ? 'د کاروان او کارټن باربري عمومي استیکر' : 'MASTER CARGO CARTON & BAG STICKER',
      origin: isFa ? 'نمایندگی مبدأ:' : isPs ? 'د پیل څانګه:' : 'Origin Branch:',
      destination: isFa ? 'نمایندگی مقصد:' : isPs ? 'د مقصد څانګه:' : 'Destination Branch:',
      parcelsCount: isFa ? 'تعداد بسته‌ها' : isPs ? 'د بارونو شمېر' : 'Total Parcels',
      totalWeight: isFa ? 'وزن مجموعی' : isPs ? 'ټول وزن' : 'Total Weight',
      totalPieces: isFa ? 'تعداد کل اجناس' : isPs ? 'د ټوټو شمېر' : 'Total Pieces',
      totalProductVal: isFa ? 'ارزش اظهاری اموال' : isPs ? 'د توکو ارزښت' : 'Declared Value',
      codToCollect: isFa ? 'طلب کرایه و تسلیمی' : isPs ? 'د ترلاسه کولو کرایه' : 'COD / Due to Collect',
      date: isFa ? 'تاریخ صدور:' : isPs ? 'د صدور نېټه:' : 'Issue Date:',
      batchCode: isFa ? 'کد رهگیری کارتن:' : isPs ? 'د کارټن کود:' : 'Carton Batch Ref:',
      includedParcels: isFa ? 'لیست بارنامه‌های موجود در این کارتن:' : isPs ? 'په دې کارټن کې شامل بارونه:' : 'Manifest of Included Consignments:',
      noParcelsFound: isFa ? 'هیچ بسته‌ای برای این نمایندگی در مبدأ موجود نیست' : isPs ? 'د دې څانګې لپاره کوم بار نشته' : 'No available parcels for this branch at origin',
      selectAtLeastOne: isFa ? 'لطفاً حداقل یک بسته را برای چاپ استیکر انتخاب کنید' : isPs ? 'مهرباني وکړئ لږترلږه یو بار وټاکئ' : 'Please select at least one parcel',
      companyName: isFa ? 'خدمات انتقالات ارمغان صادق' : isPs ? 'د ارمغان صادق باربري او انتقالات' : 'Armaghan Sadeq Transfers',
      tagline: isFa ? 'شبکه سراسری انتقال سریع و مصئون اموال در افغانستان' : isPs ? 'په ټول افغانستان کې د کارګو چټک او باوري خدمتونه' : 'Nationwide Fast & Secure Cargo Logistics',
      piecesUnit: isFa ? 'عدد' : isPs ? 'عدده' : 'Pcs',
      parcelsUnit: isFa ? 'بسته' : isPs ? 'بستې' : 'Parcels',
      kgUnit: isFa ? 'کیلو' : isPs ? 'کیلو' : 'KG',
      afnUnit: isFa ? 'افغانی' : isPs ? 'افغانۍ' : 'AFN',
      searchPlaceholder: isFa ? 'جستجوی بارنامه یا گیرنده...' : isPs ? 'د بارنامه یا ترلاسه کوونکي لټون...' : 'Search CN or receiver...',
      thermalSticker: isFa ? 'استیکر حرارتی (۴×۶ اینچ)' : isPs ? 'حرارتي استیکر (4x6)' : 'Thermal Sticker (4x6")',
      standardA4: isFa ? 'برگه A4' : isPs ? 'A4 پاڼه' : 'Standard A4 Sheet'
    };
  }, [modalLang]);

  // Aggregated summary metrics for selected parcels
  const metrics = useMemo(() => {
    const count = selectedShipments.length;
    const pieces = selectedShipments.reduce((sum, s) => sum + (s.packageInfo.pieces || 1), 0);
    const weight = selectedShipments.reduce((sum, s) => sum + (s.packageInfo.weightKg || 0), 0);
    const productValue = selectedShipments.reduce((sum, s) => sum + (s.financials.productPrice || s.packageInfo.declaredValueAfn || 0), 0);
    const codToCollect = selectedShipments.reduce((sum, s) => sum + (s.financials.paymentStatus === 'to_pay' ? s.financials.totalAmount : (s.financials.amountDue || 0)), 0);

    return { count, pieces, weight, productValue, codToCollect };
  }, [selectedShipments]);

  // Localized branch name helper for modalLang
  const getBranchNameInModalLang = (b?: Branch) => {
    if (!b) return '';
    if (modalLang === 'fa') return b.nameFa || b.name;
    if (modalLang === 'ps') return b.namePs || b.name;
    return b.name;
  };

  // Toggle single parcel selection
  const toggleShipmentSelection = (id: string) => {
    setSelectedShipmentIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Print Handler
  const handlePrint = () => {
    if (selectedShipments.length === 0) {
      showToast(localized.selectAtLeastOne);
      return;
    }
    if (stickerPrintRef.current) {
      const format = stickerFormat === 'thermal' ? 'thermal_80mm' : 'standard';
      printElementUsingIframe(
        stickerPrintRef.current, 
        `Carton_Sticker_${currentDestBranch?.code || 'DEST'}_${batchRefNumber}`,
        format
      );
    }
  };

  // Download PDF Handler
  const handleDownloadPdf = async () => {
    if (selectedShipments.length === 0) {
      showToast(localized.selectAtLeastOne);
      return;
    }
    if (!stickerPrintRef.current) return;

    setIsGeneratingPdf(true);
    try {
      const element = stickerPrintRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });
      const imgData = canvas.toDataURL('image/png');

      const isThermal = stickerFormat === 'thermal';
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: isThermal ? [100, 150] : 'a4'
      });

      const pdfWidth = isThermal ? 100 : 210;
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Carton_Sticker_${currentDestBranch?.code || 'DEST'}_${batchRefNumber}.pdf`);
      showToast('✓ Carton Sticker PDF downloaded successfully');
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
        className="relative w-full max-w-5xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[95vh] overflow-hidden my-auto"
        id="carton-sticker-modal"
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        {/* TOP HEADER WITH LANGUAGE SWITCHER */}
        <div className="flex flex-wrap items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-600 text-white flex items-center justify-center shadow-md shadow-red-600/20 shrink-0">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-900 dark:text-white">
                  {localized.title}
                </h2>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
                  {getBranchNameInModalLang(originBranch)} ➔ {getBranchNameInModalLang(currentDestBranch)}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 hidden sm:block">
                {localized.subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Direct Language Switcher in Header */}
            <div className="flex items-center bg-slate-200/80 dark:bg-slate-800 p-1 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold">
              <Globe className="w-3.5 h-3.5 text-slate-500 ms-1 me-1.5" />
              <button
                type="button"
                onClick={() => setModalLang('fa')}
                className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                  modalLang === 'fa' ? 'bg-red-600 text-white shadow-xs' : 'text-slate-700 dark:text-slate-300 hover:text-red-600'
                }`}
              >
                دری
              </button>
              <button
                type="button"
                onClick={() => setModalLang('ps')}
                className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                  modalLang === 'ps' ? 'bg-red-600 text-white shadow-xs' : 'text-slate-700 dark:text-slate-300 hover:text-red-600'
                }`}
              >
                پښتو
              </button>
              <button
                type="button"
                onClick={() => setModalLang('en')}
                className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                  modalLang === 'en' ? 'bg-red-600 text-white shadow-xs' : 'text-slate-700 dark:text-slate-300 hover:text-red-600'
                }`}
              >
                EN
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* MODAL BODY (TWO COLUMNS: CONTROLS & LIVE STICKER PREVIEW) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* LEFT COLUMN: BRANCH SELECTION & PARCEL PICKER (5 COLS) */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            
            {/* STEP 1: Branch Dropdown (Simplified: just branch name and number of parcels) */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/70 space-y-2.5">
              <label className="text-xs font-black text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-red-600" />
                <span>{localized.selectBranchLabel}</span>
              </label>

              <select
                value={selectedDestBranchId}
                onChange={(e) => setSelectedDestBranchId(e.target.value)}
                className="w-full px-3.5 py-3 bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:outline-none cursor-pointer"
                id="dest-branch-select"
              >
                {destinationBranches.map(b => {
                  const readyCount = availableShipments.filter(s => s.destinationBranchId === b.id).length;
                  return (
                    <option key={b.id} value={b.id}>
                      {getBranchNameInModalLang(b)} ({b.code}) — {readyCount} {localized.parcelsUnit}
                    </option>
                  );
                })}
              </select>

              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-1 font-medium">
                <span>{localized.selectedCount(selectedShipments.length, branchParcels.length)}</span>
                <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{metrics.weight} {localized.kgUnit}</span>
              </div>
            </div>

            {/* STEP 2: Parcels Selection Table & Fast Select Buttons */}
            <div className="flex-1 flex flex-col min-h-[300px] p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/70 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-red-600" />
                  <span>{localized.selectParcelsLabel}</span>
                </span>
                
                <div className="flex items-center gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setSelectedShipmentIds(branchParcels.map(s => s.id))}
                    className="px-2 py-1 rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-[11px] border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer"
                  >
                    {localized.selectAll}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedShipmentIds([])}
                    className="px-2 py-1 rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 font-bold text-[11px] border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer"
                  >
                    {localized.deselectAll}
                  </button>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-2.5 w-3.5 h-3.5 text-slate-400`} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={localized.searchPlaceholder}
                  className={`w-full ${isRTL ? 'pr-9 pl-3' : 'pl-9 pr-3'} py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500`}
                />
              </div>

              {/* Parcels List */}
              <div className="flex-1 overflow-y-auto max-h-[320px] space-y-2 pe-1">
                {displayedParcels.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">
                    <Package className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                    <p className="text-xs font-medium">{localized.noParcelsFound}</p>
                  </div>
                ) : (
                  displayedParcels.map(s => {
                    const isSelected = selectedShipmentIds.includes(s.id);
                    return (
                      <div
                        key={s.id}
                        onClick={() => toggleShipmentSelection(s.id)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer select-none flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-red-50/80 dark:bg-red-950/30 border-red-400 dark:border-red-700 shadow-xs'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-5 h-5 rounded-md flex items-center justify-center border shrink-0 transition-colors ${
                            isSelected
                              ? 'bg-red-600 border-red-600 text-white'
                              : 'border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800'
                          }`}>
                            {isSelected && <CheckSquare className="w-3.5 h-3.5" />}
                          </div>

                          <div className="min-w-0 space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-xs text-red-600 dark:text-red-400">
                                {s.cnNumber}
                              </span>
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                {s.packageInfo.weightKg} {localized.kgUnit}
                              </span>
                            </div>
                            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                              {s.receiver.name} <span className="text-[10px] text-slate-400 font-mono">({s.receiver.phone})</span>
                            </p>
                          </div>
                        </div>

                        <div className="text-end shrink-0">
                          <span className="text-xs font-bold font-mono text-slate-900 dark:text-white block">
                            {(s.financials.productPrice || s.financials.totalAmount || 0).toLocaleString()} {localized.afnUnit}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {s.packageInfo.pieces || 1} {localized.piecesUnit}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Print Size Selector (Thermal 4x6 vs Standard A4) */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs">
              <span className="font-bold text-slate-700 dark:text-slate-300">
                {modalLang === 'fa' ? 'سایز استیکر:' : modalLang === 'ps' ? 'د استیکر اندازه:' : 'Sticker Format:'}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setStickerFormat('thermal')}
                  className={`px-2.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    stickerFormat === 'thermal'
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {localized.thermalSticker}
                </button>
                <button
                  type="button"
                  onClick={() => setStickerFormat('a4')}
                  className={`px-2.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    stickerFormat === 'a4'
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {localized.standardA4}
                </button>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: LIVE HIGH-CONTRAST CARTON STICKER (7 COLS) */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            
            {/* Top Action Bar for Print & Download */}
            <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-slate-900 text-white shrink-0 shadow-md">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-slate-200">
                  {modalLang === 'fa' ? 'پیش‌نمایش استیکر زنده کارتن' : modalLang === 'ps' ? 'د کارټن استیکر ژوندی مخکتنه' : 'Live Carton Sticker Preview'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={isGeneratingPdf || selectedShipments.length === 0}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  title={localized.downloadPdf}
                >
                  <Download className="w-3.5 h-3.5 text-blue-400" />
                  <span className="hidden sm:inline">{localized.downloadPdf}</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  disabled={selectedShipments.length === 0}
                  className="px-4 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md shadow-red-600/30 transition-all cursor-pointer disabled:opacity-50"
                  id="btn-print-carton-sticker"
                >
                  <Printer className="w-4 h-4" />
                  <span>{localized.printSticker}</span>
                </button>
              </div>
            </div>

            {/* STICKER PRINT CANVAS (High-Visibility High-Contrast Design) */}
            <div className="flex-1 bg-slate-100 dark:bg-slate-950 p-4 rounded-3xl border border-slate-300 dark:border-slate-800 overflow-y-auto flex items-center justify-center">
              
              <div 
                ref={stickerPrintRef}
                className={`bg-white text-slate-950 shadow-2xl border-4 border-slate-900 rounded-2xl p-6 select-none ${
                  stickerFormat === 'thermal' ? 'w-full max-w-[420px]' : 'w-full max-w-[550px]'
                }`}
                style={{ fontFamily: 'sans-serif' }}
              >
                {/* 1. TOP BRAND HEADER */}
                <div className="border-b-2 border-slate-900 pb-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <img
                      src="/logo.jpg"
                      alt="Logo"
                      className="w-10 h-10 object-contain rounded-lg border border-slate-300"
                    />
                    <div>
                      <h1 className="text-sm font-black tracking-tight text-slate-950 leading-tight">
                        {localized.companyName}
                      </h1>
                      <p className="text-[10px] text-slate-600 font-bold uppercase tracking-wider">
                        {localized.masterStickerHeader}
                      </p>
                    </div>
                  </div>

                  <div className="text-end">
                    <span className="px-2 py-0.5 rounded bg-red-600 text-white font-mono font-bold text-[10px] block">
                      {batchRefNumber}
                    </span>
                    <span className="text-[9px] text-slate-500 font-mono mt-0.5 block">
                      {new Date().toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* 2. GIANT DESTINATION BRANCH BANNER */}
                <div className="my-4 p-4 rounded-xl bg-slate-950 text-white text-center shadow-inner">
                  <span className="text-[10px] font-bold text-amber-300 uppercase tracking-widest block">
                    {localized.destination}
                  </span>
                  <div className="text-2xl sm:text-3xl font-black text-white tracking-tight my-0.5">
                    {getBranchNameInModalLang(currentDestBranch)}
                  </div>
                  <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    {currentDestBranch?.city} • {currentDestBranch?.province} ({currentDestBranch?.code})
                  </div>
                </div>

                {/* 3. ORIGIN & METRIC HIGHLIGHTS GRID */}
                <div className="grid grid-cols-3 gap-2 text-center my-3 pb-3 border-b-2 border-slate-200">
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-[9px] font-bold text-slate-500 block uppercase">
                      {localized.parcelsCount}
                    </span>
                    <span className="text-xl font-black text-red-600 font-mono block">
                      {metrics.count}
                    </span>
                    <span className="text-[9px] text-slate-500 font-bold">
                      {localized.parcelsUnit}
                    </span>
                  </div>

                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-[9px] font-bold text-slate-500 block uppercase">
                      {localized.totalWeight}
                    </span>
                    <span className="text-xl font-black text-slate-900 font-mono block">
                      {metrics.weight}
                    </span>
                    <span className="text-[9px] text-slate-500 font-bold">
                      {localized.kgUnit} ({metrics.pieces} {localized.piecesUnit})
                    </span>
                  </div>

                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-[9px] font-bold text-slate-500 block uppercase">
                      {localized.codToCollect}
                    </span>
                    <span className="text-xl font-black text-emerald-700 font-mono block">
                      {metrics.codToCollect.toLocaleString()}
                    </span>
                    <span className="text-[9px] text-slate-500 font-bold">
                      {localized.afnUnit}
                    </span>
                  </div>
                </div>

                {/* 4. ORIGIN TERMINAL & ROUTE SUMMARY */}
                <div className="flex items-center justify-between text-xs py-2 px-3 rounded-lg bg-slate-100 font-bold text-slate-800 mb-3">
                  <div>
                    <span className="text-slate-500 text-[10px] block">{localized.origin}</span>
                    <span>{getBranchNameInModalLang(originBranch)} ({originBranch?.code})</span>
                  </div>
                  <ArrowRight className={`w-4 h-4 text-red-600 ${isRTL ? 'rotate-180' : ''}`} />
                  <div className="text-end">
                    <span className="text-slate-500 text-[10px] block">{localized.destination}</span>
                    <span>{getBranchNameInModalLang(currentDestBranch)} ({currentDestBranch?.code})</span>
                  </div>
                </div>

                {/* 5. INCLUDED CONSIGNMENT NOTES (CN) CHECKLIST */}
                <div className="space-y-1.5 mb-4">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 pb-1 border-b border-slate-200">
                    <span>{localized.includedParcels}</span>
                    <span className="font-mono text-[10px]">{selectedShipments.length} {localized.parcelsUnit}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 max-h-[140px] overflow-hidden text-[10px] font-mono">
                    {selectedShipments.slice(0, 10).map((s, idx) => (
                      <div key={s.id} className="p-1 rounded bg-slate-50 border border-slate-200 flex items-center justify-between">
                        <span className="font-bold text-red-700">{idx + 1}. {s.cnNumber}</span>
                        <span className="text-slate-600">{s.packageInfo.weightKg}k</span>
                      </div>
                    ))}
                    {selectedShipments.length > 10 && (
                      <div className="col-span-2 text-center text-[9px] font-bold text-slate-500 py-0.5">
                        +{selectedShipments.length - 10} more consignments inside
                      </div>
                    )}
                  </div>
                </div>

                {/* 6. MASTER BARCODE & QR CODE FOOTER */}
                <div className="pt-3 border-t-2 border-slate-900 flex items-center justify-between gap-4">
                  <div className="flex-1 flex flex-col items-center">
                    <BarcodeGenerator value={batchRefNumber} width={1.4} height={36} />
                    <span className="text-[10px] font-mono font-bold text-slate-900 tracking-widest mt-0.5">
                      *{batchRefNumber}*
                    </span>
                  </div>

                  <div className="shrink-0 p-1.5 rounded-lg border border-slate-300 bg-white flex flex-col items-center">
                    <QrCode className="w-10 h-10 text-slate-900" />
                    <span className="text-[8px] font-bold text-slate-500 mt-0.5">SCAN HUB</span>
                  </div>
                </div>

                {/* Security and Confidentiality Tagline */}
                <div className="text-[8px] text-center text-slate-400 font-semibold mt-2 pt-1 border-t border-slate-100">
                  {localized.tagline} • Rayan Tech Logistics Suite
                </div>

              </div>

            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
