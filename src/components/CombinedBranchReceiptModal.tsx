import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
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
  ShieldCheck,
  Send,
  CornerDownRight,
  Truck,
  CheckCheck,
  RefreshCw
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useI18n } from '../context/I18nContext';
import { Shipment, Branch, Language } from '../types';
import { printElementUsingIframe, generateBranchBulkDispatchPdf, generateThermalPdfFromElement } from '../utils/pdfExport';
import { BarcodeGenerator } from './BarcodeGenerator';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas-pro';

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
  const { 
    shipments: allShipments, 
    branches, 
    currentUser, 
    activeBranchId, 
    showToast,
    updateShipmentStatus 
  } = useApp();
  const { language: globalLang } = useI18n();
  const { getLocalizedBranchName: i18nGetLocalizedBranchName } = useI18n();

  // Local language switcher for the Carton Sticker & Modal
  const [modalLang, setModalLang] = useState<Language>(globalLang);
  const isRTL = modalLang === 'fa' || modalLang === 'ps';

  // Helper for translations in the modal scope
  const l = (en: string, fa: string) => (modalLang === 'fa' || modalLang === 'ps') ? fa : en;

  // Sync global getLocalizedBranchName to work with modalLang
  const getLocalizedBranchName = useCallback((b: Branch | undefined, lang?: Language) => {
    // We ignore the lang param and use the branch data or translations directly if we must,
    // but the i18nGetLocalizedBranchName is already bound to global language.
    // To respect modalLang, we'll implement a local version or use the global one if it's fine.
    // The safest is to use the global one but here we need it for modalLang.
    if (!b) return '';
    const name = (modalLang === 'fa' && b.nameFa) ? b.nameFa : ((modalLang === 'ps' && b.namePs) ? b.namePs : b.name);
    return name.replace(/Armaghan Sadeq|Transfers sadeq|انتقالات ارمغان صادق|انتقالات صادق/gi, '').trim() || b.city;
  }, [modalLang]);

  const getCleanBranchName = (b: Branch | undefined) => getLocalizedBranchName(b);

  // State
  const [selectedSenderBranchId, setSelectedSenderBranchId] = useState<string>('');
  const [selectedDestBranchId, setSelectedDestBranchId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedShipmentIds, setSelectedShipmentIds] = useState<string[]>([]);
  // Default to 80mm Roll thermal format as requested
  const [stickerFormat, setStickerFormat] = useState<'thermal_80mm' | 'thermal_4x6' | 'a4'>('thermal_80mm');
  const [batchRefNumber, setBatchRefNumber] = useState('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);

  const stickerPrintRef = useRef<HTMLDivElement>(null);
  const prevIsOpenRef = useRef(false);

  // Clean, de-duplicated branches list (ensures Kabul is clear and no duplicate entries exist)
  const uniqueBranches = useMemo(() => {
    const seen = new Set<string>();
    const list: Branch[] = [];
    for (const b of branches) {
      const cleanName = getLocalizedBranchName(b).trim().toLowerCase();
      if (!cleanName || seen.has(cleanName)) continue;
      seen.add(cleanName);
      list.push(b);
    }
    // Sort with Head Office / Kabul first, then alphabetical
    return list.sort((a, b) => {
      if (a.isHeadOffice || a.code === 'KBL-HQ' || a.id === 'br_admin_hq' || a.city === 'Kabul' || a.province === 'Kabul') return -1;
      if (b.isHeadOffice || b.code === 'KBL-HQ' || b.id === 'br_admin_hq' || b.city === 'Kabul' || b.province === 'Kabul') return 1;
      return getLocalizedBranchName(a).localeCompare(getLocalizedBranchName(b));
    });
  }, [branches, modalLang, getLocalizedBranchName]);

  // Clean branch name display helper (simple, no extra text, exactly as requested)
  const getBranchLabel = (b?: Branch | null): string => {
    if (!b) return '';
    return getLocalizedBranchName(b);
  };

  // Helper translations based on active modalLang
  const localized = useMemo(() => {
    const isFa = modalLang === 'fa';
    const isPs = modalLang === 'ps';

    return {
      title: isFa ? 'ارسال تجمیعی و استیکر کارتن نمایندگی' : isPs ? 'څانګې ته ټولیز لېږل او د کارټن استیکر' : 'Branch Bulk Dispatch & Carton Sticker',
      subtitle: isFa ? 'صدور بارنامه تجمیعی و چاپ استیکر کارتن برای نمایندگی مقصد' : isPs ? 'د مقصد څانګې لپاره د ټولیز بارنامه او کارټن استیکر چاپ' : 'Branch bulk parcel dispatch manifest & master carton sticker',
      selectSenderBranchLabel: isFa ? 'نمایندگی فرستنده (مبدأ):' : isPs ? 'لېږونکې څانګه (پیل):' : 'Sender Branch (Origin):',
      selectReceiverBranchLabel: isFa ? 'نمایندگی گیرنده (مقصد):' : isPs ? 'ترلاسه کوونکې څانګه (مقصد):' : 'Receiver Branch (Destination):',
      selectParcelsLabel: isFa ? 'انتخاب بسته‌ها برای ارسال تجمیعی:' : isPs ? 'د دې استیکر لپاره بارونه وټاکئ:' : 'Select Parcels for Bulk Dispatch:',
      selectAll: isFa ? 'انتخاب همه' : isPs ? 'ټول انتخاب کړئ' : 'Select All',
      deselectAll: isFa ? 'لغو انتخاب' : isPs ? 'انتخاب لغوه' : 'Deselect All',
      selectedCount: (count: number, total: number) => isFa ? `${count} از ${total} بسته انتخاب شد` : isPs ? `${count} له ${total} څخه انتخاب شو` : `${count} of ${total} parcels selected`,
      printSticker: isFa ? 'چاپ استیکر کارتن' : isPs ? 'د کارټن استیکر چاپ' : 'Print Sticker',
      downloadPdf: isFa ? 'دانلود PDF استیکر' : isPs ? 'د استیکر PDF' : 'Sticker PDF',
      downloadWaybillPdf: isFa ? 'دانلود بارنامه تجمیعی (A4)' : isPs ? 'ټولیز بارنامه (A4)' : 'Dispatch Waybill (A4)',
      dispatchToTransit: isFa ? 'ثبت ارسال تجمیعی (به موتر)' : isPs ? 'لېږل ثبت کړئ (په موټر کې)' : 'Dispatch to Transit',
      masterStickerHeader: isFa ? 'برچسب بوجی و کارتن تجمیعی باربری' : isPs ? 'د کاروان او کارټن باربري عمومي استیکر' : 'MASTER CARGO CARTON & BAG STICKER',
      origin: isFa ? 'نمایندگی فرستنده (مبدأ):' : isPs ? 'لېږونکې څانګه (پیل):' : 'Sender Branch (Origin):',
      destination: isFa ? 'نمایندگی گیرنده (مقصد):' : isPs ? 'ترلاسه کوونکې څانګه (مقصد):' : 'Receiver Branch (Destination):',
      parcelsCount: isFa ? 'تعداد بسته‌ها' : isPs ? 'د بارونو شمېر' : 'Total Parcels',
      totalWeight: isFa ? 'وزن مجموعی' : isPs ? 'ټول وزن' : 'Total Weight',
      totalPieces: isFa ? 'تعداد کل اجناس' : isPs ? 'د ټوټو شمېر' : 'Total Pieces',
      totalProductVal: isFa ? 'ارزش اظهاری اموال' : isPs ? 'د توکو ارزښت' : 'Declared Value',
      codToCollect: isFa ? 'طلب کرایه و تسلیمی' : isPs ? 'د ترلاسه کولو کرایه' : 'COD / Due to Collect',
      date: isFa ? 'تاریخ صدور:' : isPs ? 'د صدور نېټه:' : 'Issue Date:',
      batchCode: isFa ? 'کد مرجع ارسال:' : isPs ? 'د لېږلو کود:' : 'Batch Ref #:',
      includedParcels: isFa ? 'لیست بارنامه‌های این کارتن:' : isPs ? 'په دې کارټن کې شامل بارونه:' : 'Manifest of Included Consignments:',
      noParcelsFound: isFa ? 'هیچ بسته‌ای در این مسیر برای ارسال تجمیعی موجود نیست' : isPs ? 'په دې لار کې کوم بار د لېږلو لپاره نشته' : 'No available parcels on this route for dispatch',
      selectAtLeastOne: isFa ? 'لطفاً حداقل یک بسته را برای ارسال یا چاپ استیکر انتخاب کنید' : isPs ? 'مهرباني وکړئ لږترلږه یو بار وټاکئ' : 'Please select at least one parcel',
      companyName: isFa ? 'خدمات انتقالات ارمغان صادق' : isPs ? 'د ارمغان صادق باربري او انتقالات' : 'Armaghan Sadeq Transfers',
      tagline: isFa ? 'شبکه سراسری انتقال سریع و مصئون اموال در افغانستان' : isPs ? 'په ټول افغانستان کې د کارګو چټک او باوري خدمتونه' : 'Nationwide Fast & Secure Cargo Logistics',
      piecesUnit: isFa ? 'عدد' : isPs ? 'عدده' : 'Pcs',
      parcelsUnit: isFa ? 'بسته' : isPs ? 'بستې' : 'Parcels',
      kgUnit: isFa ? 'کیلو' : isPs ? 'کیلو' : 'KG',
      afnUnit: isFa ? 'افغانی' : isPs ? 'افغانۍ' : 'AFN',
      searchPlaceholder: isFa ? 'جستجوی بارنامه یا نام گیرنده...' : isPs ? 'د بارنامه یا ترلاسه کوونکي لټون...' : 'Search CN or receiver...',
      format80mm: isFa ? 'رول حرارتی ۸۰mm (POS Roll)' : isPs ? '۸۰ ملي‌متر حرارتي رول' : '80mm Roll (Thermal POS)',
      format4x6: isFa ? 'برچسب ۴×۶ اینچ (Label)' : isPs ? 'د ۴×۶ انچه برچسپ' : 'Thermal 4x6" Label',
      formatA4: isFa ? 'برگه A4 معمول' : isPs ? 'معمول A4 پاڼه' : 'Standard A4 Sheet'
    };
  }, [modalLang]);

  // Destination branches list for current sender (all branches except current sender)
  const destinationBranches = useMemo(() => {
    return uniqueBranches.filter(b => b.id !== selectedSenderBranchId);
  }, [uniqueBranches, selectedSenderBranchId]);

  // STABLE INITIALIZATION: only trigger when modal changes from closed to open
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setModalLang(globalLang);
      const randomSuffix = Math.floor(100000 + Math.random() * 900000);
      setBatchRefNumber(`AST-DSP-${randomSuffix}`);

      // 1. Resolve Sender Branch
      let initSenderId = '';
      if (currentUser.role === 'super_admin') {
        if (activeBranchId && activeBranchId !== 'all') {
          initSenderId = activeBranchId;
        } else {
          // Default super admin to Kabul Head Office
          const hq = uniqueBranches.find(b => b.isHeadOffice || b.code === 'KBL-HQ' || b.id === 'br_admin_hq');
          initSenderId = hq ? hq.id : (uniqueBranches[0]?.id || '');
        }
      } else {
        initSenderId = currentUser.branchId || uniqueBranches[0]?.id || '';
      }

      // 2. Resolve Receiver Branch
      const otherBranches = uniqueBranches.filter(b => b.id !== initSenderId);
      let initDestId = otherBranches[0]?.id || '';

      if (preselectedBranchId && preselectedBranchId !== 'all' && preselectedBranchId !== initSenderId) {
        initDestId = preselectedBranchId;
      }

      // 3. Resolve initial shipments if provided
      if (initialSelectedShipmentIds && initialSelectedShipmentIds.length > 0) {
        const firstShipment = allShipments.find(s => s.id === initialSelectedShipmentIds[0]);
        if (firstShipment) {
          if (firstShipment.originBranchId) initSenderId = firstShipment.originBranchId;
          if (firstShipment.destinationBranchId) initDestId = firstShipment.destinationBranchId;
        }
        setSelectedShipmentIds(initialSelectedShipmentIds);
      } else {
        // Auto-select all available parcels for the initial route
        const routeShipments = allShipments.filter(s =>
          s.originBranchId === initSenderId &&
          s.destinationBranchId === initDestId &&
          s.status !== 'cancelled' && s.status !== 'delivered' && s.status !== 'returned'
        );
        setSelectedShipmentIds(routeShipments.map(s => s.id));
      }

      setSelectedSenderBranchId(initSenderId);
      setSelectedDestBranchId(initDestId);
      setSearchTerm('');
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, globalLang, currentUser, activeBranchId, uniqueBranches, preselectedBranchId, initialSelectedShipmentIds, allShipments]);

  // Handler when user changes Sender Branch
  const handleSenderBranchChange = (newSenderId: string) => {
    setSelectedSenderBranchId(newSenderId);
    let newDestId = selectedDestBranchId;
    if (newDestId === newSenderId) {
      const other = uniqueBranches.find(b => b.id !== newSenderId);
      newDestId = other?.id || '';
      setSelectedDestBranchId(newDestId);
    }
    // Auto-select all ready parcels for the new route
    const routeParcels = allShipments.filter(s =>
      s.originBranchId === newSenderId &&
      s.destinationBranchId === newDestId &&
      s.status !== 'cancelled' && s.status !== 'delivered' && s.status !== 'returned'
    );
    setSelectedShipmentIds(routeParcels.map(s => s.id));
  };

  // Handler when user changes Receiver Branch
  const handleDestBranchChange = (newDestId: string) => {
    setSelectedDestBranchId(newDestId);
    // Auto-select all ready parcels for the chosen destination
    const routeParcels = allShipments.filter(s =>
      s.originBranchId === selectedSenderBranchId &&
      s.destinationBranchId === newDestId &&
      s.status !== 'cancelled' && s.status !== 'delivered' && s.status !== 'returned'
    );
    setSelectedShipmentIds(routeParcels.map(s => s.id));
  };

  // All eligible parcels on this specific Sender ➔ Receiver route
  const availableRouteParcels = useMemo(() => {
    if (!selectedSenderBranchId || !selectedDestBranchId) return [];
    return allShipments.filter(s =>
      s.originBranchId === selectedSenderBranchId &&
      s.destinationBranchId === selectedDestBranchId &&
      s.status !== 'cancelled' && s.status !== 'delivered' && s.status !== 'returned'
    );
  }, [allShipments, selectedSenderBranchId, selectedDestBranchId]);

  // Filtered parcels by search query
  const displayedParcels = useMemo(() => {
    return availableRouteParcels.filter(s => {
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
  }, [availableRouteParcels, searchTerm]);

  // Selected shipments objects
  const selectedShipments = useMemo(() => {
    return availableRouteParcels.filter(s => selectedShipmentIds.includes(s.id));
  }, [availableRouteParcels, selectedShipmentIds]);

  // Current selected branch objects
  const currentSenderBranch = useMemo(() => {
    return uniqueBranches.find(b => b.id === selectedSenderBranchId) || uniqueBranches[0];
  }, [uniqueBranches, selectedSenderBranchId]);

  const currentDestBranch = useMemo(() => {
    return uniqueBranches.find(b => b.id === selectedDestBranchId) || destinationBranches[0];
  }, [uniqueBranches, selectedDestBranchId, destinationBranches]);

  // Aggregated summary metrics for selected parcels
  const metrics = useMemo(() => {
    const count = selectedShipments.length;
    const pieces = selectedShipments.reduce((sum, s) => sum + (s.packageInfo.pieces || 1), 0);
    const weight = selectedShipments.reduce((sum, s) => sum + (s.packageInfo.weightKg || 0), 0);
    const productValue = selectedShipments.reduce((sum, s) => sum + (s.financials.productPrice || s.packageInfo.declaredValueAfn || 0), 0);
    const codToCollect = selectedShipments.reduce((sum, s) => sum + (s.financials.paymentStatus === 'to_pay' ? s.financials.totalAmount : (s.financials.amountDue || 0)), 0);

    return { count, pieces, weight, productValue, codToCollect };
  }, [selectedShipments]);

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
      const format = stickerFormat === 'thermal_80mm' 
        ? 'thermal_80mm' 
        : stickerFormat === 'thermal_4x6' 
        ? 'thermal_4x6' 
        : 'standard';
      printElementUsingIframe(
        stickerPrintRef.current,
        `Carton_Sticker_${currentDestBranch?.code || 'DEST'}_${batchRefNumber}`,
        format
      );
    }
  };

  // Download Sticker PDF Handler
  const handleDownloadPdf = async () => {
    if (selectedShipments.length === 0) {
      showToast(localized.selectAtLeastOne);
      return;
    }
    if (!stickerPrintRef.current) return;

    setIsGeneratingPdf(true);
    try {
      const filename = `Carton_Sticker_${currentDestBranch?.code || 'DEST'}_${batchRefNumber}_${stickerFormat}.pdf`;
      if (stickerFormat === 'thermal_80mm') {
        const ok = await generateThermalPdfFromElement(stickerPrintRef.current, filename, 80);
        if (ok) {
          showToast('✓ 80mm Carton Sticker PDF downloaded successfully');
        } else {
          showToast('❌ Failed to generate PDF');
        }
        return;
      }

      const element = stickerPrintRef.current;
      const canvas = await html2canvas(element, {
        scale: 2.5,
        useCORS: true,
        backgroundColor: '#ffffff'
      });
      const imgData = canvas.toDataURL('image/png');

      let pdf: jsPDF;
      if (stickerFormat === 'thermal_4x6') {
        pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: [100, 150]
        });
        const pdfWidth = 100;
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, Math.min(150, pdfHeight));
      } else {
        pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4'
        });
        const pdfWidth = 190;
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', 10, 10, pdfWidth, Math.min(277, pdfHeight));
      }

      pdf.save(filename);
      showToast('✓ Carton Sticker PDF downloaded successfully');
    } catch (err) {
      console.error(err);
      showToast('❌ Failed to generate PDF');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Download Official Bulk Dispatch Waybill PDF (A4)
  const handleDownloadDispatchWaybill = () => {
    if (selectedShipments.length === 0) {
      showToast(localized.selectAtLeastOne);
      return;
    }
    try {
      const ok = generateBranchBulkDispatchPdf(
        {
          batchNumber: batchRefNumber,
          originBranch: currentSenderBranch,
          destinationBranch: currentDestBranch,
          dispatchDate: new Date().toLocaleString()
        },
        selectedShipments,
        branches
      );
      if (ok) {
        showToast(
          modalLang === 'fa' 
            ? '✓ بارنامه رسمی تجمیعی ارسال با موفقیت دانلود شد' 
            : modalLang === 'ps'
            ? '✓ د لېږلو ټولیز بارنامه په بریا سره ډاونلوډ شوه'
            : '✓ Bulk Dispatch Waybill PDF generated successfully'
        );
      } else {
        showToast('❌ Failed to generate Dispatch Waybill PDF');
      }
    } catch (err) {
      console.error('Error generating dispatch waybill:', err);
      showToast('❌ Error generating Dispatch Waybill PDF');
    }
  };

  // One-click Dispatch to Transit Execution
  const handleDispatchBatch = () => {
    if (selectedShipments.length === 0) {
      showToast(localized.selectAtLeastOne);
      return;
    }

    setIsDispatching(true);
    try {
      let updatedCount = 0;
      const note = `Dispatched in Bulk Batch ${batchRefNumber} from ${currentSenderBranch.name} to ${currentDestBranch.name}`;
      for (const s of selectedShipments) {
        if (s.status === 'booked' || s.status === 'received_at_branch' || s.status === 'verified' || s.status === 'pre_booked') {
          updateShipmentStatus(s.id, 'in_transit', note, currentSenderBranch.name);
          updatedCount++;
        }
      }
      showToast(
        modalLang === 'fa' 
          ? `✓ تعداد ${updatedCount} بسته با موفقیت به وضعیت «در حال انتقال» تغییر یافت.` 
          : modalLang === 'ps'
          ? `✓ ${updatedCount} بارونه په بریا سره «په لاره» حالت ته بدل شول.`
          : `✓ ${updatedCount} parcels dispatched to in-transit status successfully.`
      );
    } catch (err) {
      console.error('Error dispatching batch:', err);
      showToast('❌ Error updating shipment status');
    } finally {
      setIsDispatching(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-6xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[95vh] overflow-hidden my-auto"
        id="carton-sticker-modal"
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        {/* TOP HEADER WITH ESSENTIAL INFO & LANGUAGE SWITCHER */}
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
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
                  {getCleanBranchName(currentSenderBranch)} ➔ {getCleanBranchName(currentDestBranch)}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 hidden sm:block">
                {localized.subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Language Switcher in Header */}
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
          
          {/* LEFT COLUMN: PURE CLEAN SENDER & RECEIVER BRANCH SELECTION + PARCEL PICKER (5 COLS) */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            
            {/* STEP 1: PURE CLEAN BRANCH SELECTION (Sender & Receiver) */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/70 space-y-3.5">
              
              {/* Sender Branch (Origin) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Send className="w-3.5 h-3.5 text-blue-600" />
                    <span>{localized.selectSenderBranchLabel}</span>
                  </span>
                  <span className="text-[11px] font-normal text-slate-400">
                    {modalLang === 'fa' ? 'مبدأ انتقال' : modalLang === 'ps' ? 'د انتقال پیل' : 'Dispatch Terminal'}
                  </span>
                </label>
                <select
                  value={selectedSenderBranchId}
                  onChange={(e) => handleSenderBranchChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:outline-none cursor-pointer"
                  id="sender-branch-select"
                >
                  {uniqueBranches.map(b => (
                    <option key={b.id} value={b.id}>
                      {getBranchLabel(b)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Receiver Branch (Destination) - Only shows simple branch name and number of parcels */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-red-600" />
                    <span>{localized.selectReceiverBranchLabel}</span>
                  </span>
                  <span className="text-[11px] font-normal text-slate-400">
                    {modalLang === 'fa' ? 'مقصد نهایی' : modalLang === 'ps' ? 'وروستی مقصد' : 'Destination'}
                  </span>
                </label>
                <select
                  value={selectedDestBranchId}
                  onChange={(e) => handleDestBranchChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:outline-none cursor-pointer"
                  id="receiver-branch-select"
                >
                  {destinationBranches.map(b => (
                    <option key={b.id} value={b.id}>
                      {getBranchLabel(b)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Batch Reference # - Essential, clean reference badge with quick regenerate */}
              <div className="flex items-center justify-between pt-2 text-xs border-t border-slate-200 dark:border-slate-700">
                <span className="text-slate-600 dark:text-slate-400 font-bold flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-slate-400" />
                  <span>{localized.batchCode}</span>
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-red-600 dark:text-red-400">
                    {batchRefNumber}
                  </span>
                  <button
                    type="button"
                    onClick={() => setBatchRefNumber(`AST-DSP-${Math.floor(100000 + Math.random() * 900000)}`)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Generate new Reference #"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

            </div>

            {/* STEP 2: ESSENTIAL PARCEL SELECTION TABLE */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/70 flex-1 flex flex-col gap-3">
              
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-red-600" />
                  <span>{localized.selectParcelsLabel}</span>
                </span>
                
                <div className="flex items-center gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setSelectedShipmentIds(availableRouteParcels.map(s => s.id))}
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
              <div className="flex-1 overflow-y-auto max-h-[280px] space-y-2 pe-1">
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

            {/* STEP 3: STICKER FORMAT SELECTOR (80mm Roll, 4x6" Label, A4 Sheet) */}
            <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs flex flex-wrap items-center justify-between gap-2">
              <span className="font-bold text-slate-700 dark:text-slate-300">
                {modalLang === 'fa' ? 'سایز چاپ استیکر:' : modalLang === 'ps' ? 'د چاپ اندازه:' : 'Sticker Print Format:'}
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setStickerFormat('thermal_80mm')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    stickerFormat === 'thermal_80mm'
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>{localized.format80mm}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStickerFormat('thermal_4x6')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    stickerFormat === 'thermal_4x6'
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <span>{localized.format4x6}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStickerFormat('a4')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    stickerFormat === 'a4'
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <span>{localized.formatA4}</span>
                </button>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: LIVE STICKER PREVIEW & ESSENTIAL ACTION TOOLBAR (7 COLS) */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            
            {/* Top Action Bar for PDF Generation & Printing */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-slate-900 text-white shrink-0 shadow-md">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-slate-200">
                  {modalLang === 'fa' ? 'پیش‌نمایش استیکر کارتن' : modalLang === 'ps' ? 'د کارټن استیکر مخکتنه' : 'Carton Sticker Preview'}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-amber-300 border border-slate-700">
                  {stickerFormat === 'thermal_80mm' ? '80mm POS Roll' : stickerFormat === 'thermal_4x6' ? '4x6" Label' : 'Standard A4'}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Download Official Combined Bulk Dispatch Waybill PDF (A4) */}
                <button
                  type="button"
                  onClick={handleDownloadDispatchWaybill}
                  disabled={selectedShipments.length === 0}
                  className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  title="Generate Official Bulk Consignment Dispatch Manifest (A4)"
                >
                  <FileText className="w-3.5 h-3.5 text-emerald-200" />
                  <span>{localized.downloadWaybillPdf}</span>
                </button>

                {/* Download Sticker PDF */}
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={isGeneratingPdf || selectedShipments.length === 0}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  title={localized.downloadPdf}
                >
                  <Download className="w-3.5 h-3.5 text-blue-400" />
                  <span>{localized.downloadPdf}</span>
                </button>

                {/* Print Sticker */}
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

                {/* One-click Dispatch to Transit Execution */}
                <button
                  type="button"
                  onClick={handleDispatchBatch}
                  disabled={isDispatching || selectedShipments.length === 0}
                  className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  title="Mark all selected shipments as dispatched / in-transit"
                >
                  <Truck className="w-3.5 h-3.5 text-blue-200" />
                  <span>{localized.dispatchToTransit}</span>
                </button>
              </div>
            </div>

            {/* STICKER PRINT CANVAS */}
            <div className="flex-1 bg-slate-100 dark:bg-slate-950 p-4 rounded-3xl border border-slate-300 dark:border-slate-800 overflow-y-auto flex items-center justify-center min-h-[460px]">
              
              {/* DEDICATED 80MM ROLL LAYOUT */}
              {stickerFormat === 'thermal_80mm' ? (
                <div 
                  ref={stickerPrintRef}
                  className="bg-white text-black shadow-xl border-2 border-black rounded-lg p-3 select-none carton-sticker-80mm"
                  style={{
                    width: '72mm',
                    maxWidth: '72mm',
                    minWidth: '72mm',
                    boxSizing: 'border-box',
                    fontFamily: "'Vazirmatn', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
                  }}
                >
                  {/* 1. Header (Compact) */}
                  <div className="border-b-2 border-black pb-2 text-center">
                    <h1 className="text-xs font-black tracking-tight text-black leading-tight uppercase">
                      {localized.companyName}
                    </h1>
                    <p className="text-[9px] font-bold text-slate-700">
                      خدمات انتقالات ارمغان صادق
                    </p>
                    <div className="mt-1 px-1.5 py-0.5 bg-black text-white text-[9px] font-black tracking-wider uppercase inline-block rounded">
                      {localized.masterStickerHeader}
                    </div>
                    <div className="flex items-center justify-between text-[8px] font-mono font-bold text-slate-700 mt-1">
                      <span>REF: {batchRefNumber}</span>
                      <span>{new Date().toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* 2. GIANT DESTINATION TERMINAL (Prominent for 80mm) */}
                  <div className="my-2 p-2.5 rounded bg-black text-white text-center">
                    <span className="text-[8px] font-bold text-amber-300 uppercase tracking-widest block">
                      {localized.destination}
                    </span>
                    <div className="text-xl font-black text-white tracking-tight my-0.5 uppercase">
                      {getBranchLabel(currentDestBranch)}
                    </div>
                  </div>

                  {/* 3. Origin Hub Banner */}
                  <div className="text-[9px] font-bold text-black border border-black p-1 rounded mb-2 flex items-center justify-between">
                    <span className="text-slate-600">{localized.origin}</span>
                    <span className="font-black">{getBranchLabel(currentSenderBranch)}</span>
                  </div>

                  {/* 4. High-Contrast 2x2 Metrics Table */}
                  <div className="border border-black rounded mb-2 text-center text-[9px] font-mono">
                    <div className="grid grid-cols-2 border-b border-black">
                      <div className="p-1 border-r border-black">
                        <span className="text-slate-600 block text-[8px] uppercase">{localized.parcelsCount}</span>
                        <span className="font-black text-base text-black">{metrics.count}</span>
                        <span className="text-[8px] text-slate-600 block">{localized.parcelsUnit}</span>
                      </div>
                      <div className="p-1">
                        <span className="text-slate-600 block text-[8px] uppercase">{localized.totalWeight}</span>
                        <span className="font-black text-base text-black">{metrics.weight}</span>
                        <span className="text-[8px] text-slate-600 block">{localized.kgUnit} ({metrics.pieces} {localized.piecesUnit})</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 bg-slate-50">
                      <div className="p-1 border-r border-black">
                        <span className="text-slate-600 block text-[8px] uppercase">{localized.codToCollect}</span>
                        <span className="font-black text-xs text-black">{metrics.codToCollect.toLocaleString()} AFN</span>
                      </div>
                      <div className="p-1">
                        <span className="text-slate-600 block text-[8px] uppercase">{localized.totalProductVal}</span>
                        <span className="font-black text-xs text-black">{metrics.productValue.toLocaleString()} AFN</span>
                      </div>
                    </div>
                  </div>

                  {/* 5. Included Consignment Notes (CN) Checklist */}
                  <div className="border border-black rounded p-1 mb-2">
                    <div className="flex items-center justify-between text-[8px] font-bold text-black pb-0.5 border-b border-black mb-1">
                      <span>{localized.includedParcels}</span>
                      <span className="font-mono">{selectedShipments.length} {localized.parcelsUnit}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-[8px] font-mono max-h-[100px] overflow-hidden">
                      {selectedShipments.slice(0, 10).map((s, idx) => (
                        <div key={s.id} className="truncate border-b border-slate-200 pb-0.5">
                          <span className="font-bold">{idx + 1}. {s.cnNumber}</span> ({s.packageInfo.weightKg}k)
                        </div>
                      ))}
                    </div>
                    {selectedShipments.length > 10 && (
                      <div className="text-[7px] text-center font-bold text-slate-600 pt-0.5">
                        +{selectedShipments.length - 10} more consignments inside
                      </div>
                    )}
                  </div>

                  {/* 6. Contact Info Footer (Shortened) */}
                  <div className="pt-1.5 border-t border-dashed border-black flex justify-between items-center text-[8.5px] font-bold">
                    <span>{l('Origin:', 'مبدأ:')} <span className="font-mono">{currentSenderBranch?.phone || '0799001122'}</span></span>
                    <span>{l('Complaints:', 'شکایات:')} <span className="font-mono">0711299680</span></span>
                  </div>
                </div>
              ) : (
                /* WIDE FORMAT LAYOUT (Thermal 4x6" or Standard A4) */
                <div 
                  ref={stickerPrintRef}
                  className={`bg-white text-slate-950 shadow-2xl border-4 border-slate-900 rounded-2xl p-6 select-none ${
                    stickerFormat === 'thermal_4x6' ? 'w-full max-w-[420px]' : 'w-full max-w-[550px]'
                  }`}
                  style={{ fontFamily: "'Vazirmatn', sans-serif" }}
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
                      {getBranchLabel(currentDestBranch)}
                    </div>
                  </div>

                  {/* 3. METRIC HIGHLIGHTS GRID */}
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

                  {/* 4. ROUTE BANNER (Sender ➔ Receiver) */}
                  <div className="flex items-center justify-between text-xs py-2.5 px-3 rounded-lg bg-slate-100 font-bold text-slate-800 mb-3">
                    <div className="min-w-0">
                      <span className="text-slate-500 text-[10px] block">{localized.origin}</span>
                      <span className="text-blue-800 font-black truncate">{getBranchLabel(currentSenderBranch)}</span>
                    </div>
                    <ArrowRight className={`w-4 h-4 text-red-600 shrink-0 mx-2 ${isRTL ? 'rotate-180' : ''}`} />
                    <div className="text-end min-w-0">
                      <span className="text-slate-500 text-[10px] block">{localized.destination}</span>
                      <span className="text-red-700 font-black truncate">{getBranchLabel(currentDestBranch)}</span>
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
                    <div className="flex-1 flex flex-col items-center text-slate-900">
                      <BarcodeGenerator value={batchRefNumber} showText={false} width={1.4} height={36} className="text-slate-900" />
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
                    {localized.tagline} • Armaghan Sadeq Logistics System
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
