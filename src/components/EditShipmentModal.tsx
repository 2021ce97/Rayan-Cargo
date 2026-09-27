import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  ShieldCheck, 
  DollarSign, 
  Package, 
  MapPin, 
  User, 
  Phone, 
  AlertCircle, 
  CheckCircle2, 
  Save, 
  Scale, 
  Boxes, 
  FileText,
  Building2,
  Lock,
  Calculator
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { 
  Shipment, 
  ShipmentStatus, 
  ParcelCategory, 
  PaymentStatus, 
  PaymentMethod,
  AdminEditShipmentInput 
} from '../types';
import { BranchSearchSelect } from './BranchSearchSelect';

interface EditShipmentModalProps {
  shipment: Shipment | null;
  isOpen: boolean;
  onClose: () => void;
}

export const EditShipmentModal: React.FC<EditShipmentModalProps> = ({
  shipment,
  isOpen,
  onClose
}) => {
  const { 
    t, 
    currentUser, 
    branches, 
    adminEditShipment,
    isRTL,
    language
  } = useApp();

  const isSuperAdmin = currentUser?.role === 'super_admin';

  // Form states
  const [productPrice, setProductPrice] = useState<number | "">("");
  const [serviceFee, setServiceFee] = useState<number | "">("");
  const [destBranchCommission, setDestBranchCommission] = useState<number | "">("");
  const [discountAmount, setDiscountAmount] = useState<number | "">("");
  const [discountMode, setDiscountMode] = useState<'afn' | 'percent'>('afn');
  const [discountInputValue, setDiscountInputValue] = useState<number | "">("");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('to_pay');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod');

  // Package info
  const [weightKg, setWeightKg] = useState<number>(1);
  const [pieces, setPieces] = useState<number>(1);
  const [category, setCategory] = useState<ParcelCategory>('general');
  const [description, setDescription] = useState<string>('');
  const [isFragile, setIsFragile] = useState<boolean>(false);

  // Sender info
  const [senderName, setSenderName] = useState<string>('');
  const [senderPhone, setSenderPhone] = useState<string>('');
  const [senderAddress, setSenderAddress] = useState<string>('');
  const [senderCity, setSenderCity] = useState<string>('');
  const [senderProvince, setSenderProvince] = useState<string>('');
  const [senderNationalId, setSenderNationalId] = useState<string>('');

  // Receiver info
  const [receiverName, setReceiverName] = useState<string>('');
  const [receiverPhone, setReceiverPhone] = useState<string>('');
  const [receiverAddress, setReceiverAddress] = useState<string>('');
  const [receiverCity, setReceiverCity] = useState<string>('');
  const [receiverProvince, setReceiverProvince] = useState<string>('');
  const [receiverNationalId, setReceiverNationalId] = useState<string>('');

  // Routing & Status
  const [originBranchId, setOriginBranchId] = useState<string>('');
  const [destinationBranchId, setDestinationBranchId] = useState<string>('');
  const [status, setStatus] = useState<ShipmentStatus>('booked');

  // Audit trail
  const [auditNote, setAuditNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Load existing shipment details into form state
  useEffect(() => {
    if (shipment && isOpen) {
      const f = shipment.financials || ({} as any);
      const pkg = shipment.packageInfo || ({} as any);
      const s = shipment.sender || ({} as any);
      const r = shipment.receiver || ({} as any);

      const pPrice = Number(f.productPrice) || Number(f.totalAmount) || Number(pkg.declaredValueAfn) || "";
      setProductPrice(pPrice);
      setServiceFee(typeof f.serviceFee === 'number' ? f.serviceFee : (pkg.isFragile ? 200 : 150));
      setDestBranchCommission(typeof f.destBranchCommission === 'number' ? f.destBranchCommission : (shipment.destBranchCommission || 70));
      const existingDisc = Number(f.discountAmount) || "";
      setDiscountAmount(existingDisc);
      setDiscountMode('afn');
      setDiscountInputValue(existingDisc);
      setPaymentStatus(f.paymentStatus || 'to_pay');
      setPaymentMethod(f.paymentMethod || 'cod');

      setWeightKg(pkg.weightKg || 1);
      setPieces(pkg.pieces || 1);
      setCategory(pkg.category || 'general');
      setDescription(pkg.description || '');
      setIsFragile(!!pkg.isFragile);

      setSenderName(s.name || '');
      setSenderPhone(s.phone || '');
      setSenderAddress(s.address || '');
      setSenderCity(s.city || '');
      setSenderProvince(s.province || '');
      setSenderNationalId(s.nationalId || '');

      setReceiverName(r.name || '');
      setReceiverPhone(r.phone || '');
      setReceiverAddress(r.address || '');
      setReceiverCity(r.city || '');
      setReceiverProvince(r.province || '');
      setReceiverNationalId(r.nationalId || '');

      setOriginBranchId(shipment.originBranchId || '');
      setDestinationBranchId(shipment.destinationBranchId || '');
      setStatus(shipment.status || 'booked');

      setAuditNote('');
      setErrorMsg('');
      setIsSubmitting(false);
    }
  }, [shipment, isOpen]);

  // Live financial calculations
  const calculatedDiscountAFN = useMemo(() => {
    const raw = Number(discountInputValue) || 0;
    const s = Number(serviceFee) || 0;
    return discountMode === 'percent' ? Math.round((s * raw) / 100) : raw;
  }, [discountMode, discountInputValue, serviceFee]);

  const sellerPayout = useMemo(() => {
    const p = Number(productPrice) || 0;
    const s = Number(serviceFee) || 0;
    const c = Number(destBranchCommission) || 0;
    const d = calculatedDiscountAFN;
    return Math.max(0, p - s - c + d);
  }, [productPrice, serviceFee, destBranchCommission, calculatedDiscountAFN]);

  const originRemittance = useMemo(() => {
    const p = Number(productPrice) || 0;
    const c = Number(destBranchCommission) || 0;
    return Math.max(0, p - c);
  }, [productPrice, destBranchCommission]);

  if (!isOpen || !shipment) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) {
      setErrorMsg(t('unauthorized_admin_only'));
      return;
    }

    if (Number(productPrice) < 0) {
      setErrorMsg(t('invalid_product_price') || 'Product price cannot be negative.');
      return;
    }

    if (!senderName.trim() || !senderPhone.trim()) {
      setErrorMsg(t('sender_fields_required') || 'Sender name and phone are required.');
      return;
    }

    if (!receiverName.trim() || !receiverPhone.trim()) {
      setErrorMsg(t('receiver_fields_required') || 'Receiver name and phone are required.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    const input: AdminEditShipmentInput = {
      productPrice: Number(productPrice) || 0,
      serviceFee: Number(serviceFee) || 0,
      destBranchCommission: Number(destBranchCommission) || 0,
      discountAmount: calculatedDiscountAFN,
      paymentStatus,
      paymentMethod,
      weightKg,
      pieces,
      description: description.trim(),
      category,
      isFragile,
      senderName: senderName.trim(),
      senderPhone: senderPhone.trim(),
      senderAddress: senderAddress.trim(),
      senderCity: senderCity.trim(),
      senderProvince: senderProvince.trim(),
      senderNationalId: senderNationalId.trim(),
      receiverName: receiverName.trim(),
      receiverPhone: receiverPhone.trim(),
      receiverAddress: receiverAddress.trim(),
      receiverCity: receiverCity.trim(),
      receiverProvince: receiverProvince.trim(),
      receiverNationalId: receiverNationalId.trim(),
      originBranchId,
      destinationBranchId,
      status,
      auditNote: auditNote.trim() || `Admin corrected parcel ${shipment.cnNumber} records and pricing`
    };

    try {
      const success = await adminEditShipment(shipment.id, input);
      if (success) {
        onClose();
      } else {
        setErrorMsg('Failed to update parcel. Please review your input.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error updating shipment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getBranchDisplayName = (branchId: string) => {
    const b = branches.find(item => item.id === branchId);
    if (!b) return branchId;
    if (language === 'fa' && b.nameFa) return b.nameFa;
    if (language === 'ps' && b.namePs) return b.namePs;
    return b.name;
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div className="relative w-full max-w-4xl my-6 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header Strip */}
        <div className="shrink-0 p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between border-b border-amber-500/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/20 border border-amber-500/40 rounded-xl text-amber-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                  {t('edit_parcel_modal_title')}
                </h2>
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {shipment.cnNumber}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30">
                  {t('admin_authority_badge')}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                {t('edit_parcel_modal_subtitle')}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-all cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Access Warning (if not admin) */}
        {!isSuperAdmin && (
          <div className="p-4 bg-red-50 dark:bg-red-950/40 border-b border-red-200 dark:border-red-900/50 flex items-center gap-3 text-red-700 dark:text-red-300 text-xs">
            <Lock className="w-5 h-5 shrink-0" />
            <span>{t('unauthorized_admin_only')}</span>
          </div>
        )}

        {/* Scrollable Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Real-time Calculation Ledger Preview */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-slate-50 to-amber-50/30 dark:from-slate-800/60 dark:to-slate-900/60 border border-amber-500/20 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Calculator className="w-4 h-4 text-amber-500" />
                {t('financial_recalc_notice')}
              </span>
              <span className="text-[11px] font-mono font-bold text-amber-600 dark:text-amber-400">
                AFN Ledger
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">
                  {t('base_fare')} (COD)
                </p>
                <p className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                  {productPrice.toLocaleString()} <span className="text-[10px] font-normal text-slate-500">AFN</span>
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">
                  {t('dest_retained_preview')}
                </p>
                <p className="text-base font-black text-blue-600 dark:text-blue-400 mt-0.5">
                  {destBranchCommission.toLocaleString()} <span className="text-[10px] font-normal text-slate-500">AFN</span>
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">
                  {t('service_fee')}
                </p>
                <p className="text-base font-black text-amber-600 dark:text-amber-400 mt-0.5">
                  {serviceFee.toLocaleString()} <span className="text-[10px] font-normal text-slate-500">AFN</span>
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/60">
                <p className="text-[10px] text-emerald-700 dark:text-emerald-400 uppercase font-bold">
                  {t('seller_payout_preview')}
                </p>
                <p className="text-base font-black text-emerald-700 dark:text-emerald-300 mt-0.5">
                  {sellerPayout.toLocaleString()} <span className="text-[10px] font-normal text-emerald-600">AFN</span>
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-1 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
              <span>{t('origin_remittance_preview')}: <strong className="text-slate-700 dark:text-slate-200">{originRemittance.toLocaleString()} AFN</strong></span>
              <span className="text-[10px] italic text-amber-600 dark:text-amber-400">{t('edit_warning_notice')}</span>
            </div>
          </div>

          {/* Section 1: Financial & Pricing Settings */}
          <div className="space-y-3">
            <h3 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-2">
              <DollarSign className="w-4 h-4 text-emerald-500" />
              {t('billing_details')} &amp; {t('pricing_model')}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('base_fare')} (COD / Product Price AFN) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    disabled={!isSuperAdmin}
                    value={productPrice}
                    onChange={(e) => setProductPrice(e.target.value === "" ? "" : Math.max(0, Number(e.target.value)))}
                    className="w-full px-3 py-2 text-sm font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                    required
                  />
                  <span className="absolute inset-y-0 right-3 flex items-center text-xs font-bold text-slate-400">
                    AFN
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('service_fee')} (Origin Transport AFN)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    disabled={!isSuperAdmin}
                    value={serviceFee}
                    onChange={(e) => setServiceFee(e.target.value === "" ? "" : Math.max(0, Number(e.target.value)))}
                    className="w-full px-3 py-2 text-sm font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  />
                  <span className="absolute inset-y-0 right-3 flex items-center text-xs font-bold text-slate-400">
                    AFN
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('dest_retained_preview')} (Commission AFN)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    disabled={!isSuperAdmin}
                    value={destBranchCommission}
                    onChange={(e) => setDestBranchCommission(e.target.value === "" ? "" : Math.max(0, Number(e.target.value)))}
                    className="w-full px-3 py-2 text-sm font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  />
                  <span className="absolute inset-y-0 right-3 flex items-center text-xs font-bold text-slate-400">
                    AFN
                  </span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Seller Fee Discount (Optional)
                  </label>
                  <div className="flex items-center gap-1 bg-slate-200 dark:bg-slate-700 p-0.5 rounded-lg text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => setDiscountMode('afn')}
                      className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${discountMode === 'afn' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-black' : 'text-slate-600 dark:text-slate-300'}`}
                    >
                      AFN
                    </button>
                    <button
                      type="button"
                      onClick={() => setDiscountMode('percent')}
                      className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${discountMode === 'percent' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-black' : 'text-slate-600 dark:text-slate-300'}`}
                    >
                      % Percent
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max={discountMode === 'percent' ? 100 : undefined}
                    disabled={!isSuperAdmin}
                    value={discountInputValue}
                    onChange={(e) => setDiscountInputValue(e.target.value === "" ? "" : Math.max(0, Number(e.target.value)))}
                    placeholder={discountMode === 'percent' ? "e.g. 10 (%)" : "e.g. 50 (AFN)"}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 font-mono font-bold"
                  />
                  <span className="absolute inset-y-0 right-3 flex items-center text-xs font-bold text-slate-400">
                    {discountMode === 'percent' ? '%' : 'AFN'}
                  </span>
                </div>
                {discountMode === 'percent' && typeof discountInputValue === 'number' && discountInputValue > 0 && (
                  <p className="text-[10px] text-emerald-600 font-bold mt-1">
                    ✓ {discountInputValue}% of {serviceFee || 0} AFN = {calculatedDiscountAFN} AFN discount.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('payment_status')}
                </label>
                <select
                  disabled={!isSuperAdmin}
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden cursor-pointer"
                >
                  <option value="to_pay">{t('payment_to_pay')}</option>
                  <option value="paid">{t('payment_paid')}</option>
                  <option value="unpaid">{t('payment_unpaid')}</option>
                  <option value="partial">{t('payment_partial')}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('payment_method')}
                </label>
                <select
                  disabled={!isSuperAdmin}
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden cursor-pointer"
                >
                  <option value="cod">{t('method_cod')}</option>
                  <option value="cash">{t('method_cash')}</option>
                  <option value="bank_transfer">{t('method_bank')}</option>
                  <option value="hawala">{t('method_hawala')}</option>
                  <option value="card">{t('method_card')}</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Parcel Physical Specifications */}
          <div className="space-y-3">
            <h3 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-2">
              <Package className="w-4 h-4 text-blue-500" />
              {t('parcel_details')}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('weight_kg')} *
                </label>
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  disabled={!isSuperAdmin}
                  value={weightKg}
                  onChange={(e) => setWeightKg(Math.max(0.1, Number(e.target.value) || 0.1))}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('pieces_count')} *
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  disabled={!isSuperAdmin}
                  value={pieces}
                  onChange={(e) => setPieces(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('parcel_category')}
                </label>
                <select
                  disabled={!isSuperAdmin}
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ParcelCategory)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden cursor-pointer"
                >
                  <option value="general">{t('cat_general')}</option>
                  <option value="electronics">{t('cat_electronics')}</option>
                  <option value="garments">{t('cat_garments')}</option>
                  <option value="fragile">{t('cat_fragile')}</option>
                  <option value="document">{t('cat_document')}</option>
                  <option value="machinery">{t('cat_machinery')}</option>
                  <option value="foodstuff">{t('cat_foodstuff')}</option>
                </select>
              </div>

              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={!isSuperAdmin}
                    checked={isFragile}
                    onChange={(e) => setIsFragile(e.target.checked)}
                    className="w-4 h-4 rounded text-red-600 focus:ring-red-500 border-slate-300 dark:border-slate-700"
                  />
                  <span>{t('is_fragile')}</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t('description')}
              </label>
              <input
                type="text"
                disabled={!isSuperAdmin}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. 2 cartons of textiles, 1 carton of shoes..."
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Section 3: Sender Information */}
          <div className="space-y-3">
            <h3 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-2">
              <User className="w-4 h-4 text-emerald-500" />
              {t('sender_details')}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('sender_name')} *
                </label>
                <input
                  type="text"
                  disabled={!isSuperAdmin}
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('sender_phone')} *
                </label>
                <input
                  type="text"
                  disabled={!isSuperAdmin}
                  value={senderPhone}
                  onChange={(e) => setSenderPhone(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('sender_address')}
                </label>
                <input
                  type="text"
                  disabled={!isSuperAdmin}
                  value={senderAddress}
                  onChange={(e) => setSenderAddress(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('sender_city')}
                </label>
                <input
                  type="text"
                  disabled={!isSuperAdmin}
                  value={senderCity}
                  onChange={(e) => setSenderCity(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Receiver Information */}
          <div className="space-y-3">
            <h3 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-2">
              <User className="w-4 h-4 text-purple-500" />
              {t('receiver_details')}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('receiver_name')} *
                </label>
                <input
                  type="text"
                  disabled={!isSuperAdmin}
                  value={receiverName}
                  onChange={(e) => setReceiverName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('receiver_phone')} *
                </label>
                <input
                  type="text"
                  disabled={!isSuperAdmin}
                  value={receiverPhone}
                  onChange={(e) => setReceiverPhone(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('receiver_address')}
                </label>
                <input
                  type="text"
                  disabled={!isSuperAdmin}
                  value={receiverAddress}
                  onChange={(e) => setReceiverAddress(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('receiver_city')}
                </label>
                <input
                  type="text"
                  disabled={!isSuperAdmin}
                  value={receiverCity}
                  onChange={(e) => setReceiverCity(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Section 5: Hub Routing & Shipment Status */}
          <div className="space-y-3">
            <h3 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-2">
              <Building2 className="w-4 h-4 text-amber-500" />
              {t('origin_branch')} &amp; {t('destination_branch')}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <BranchSearchSelect
                  branches={branches}
                  selectedBranchId={originBranchId}
                  onChange={setOriginBranchId}
                  label={t('origin_branch')}
                  disabled={!isSuperAdmin}
                  placeholder="Select origin branch..."
                />
              </div>

              <div>
                <BranchSearchSelect
                  branches={branches}
                  selectedBranchId={destinationBranchId}
                  onChange={setDestinationBranchId}
                  label={t('destination_branch')}
                  disabled={!isSuperAdmin}
                  placeholder="Select destination branch..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('status_update')}
                </label>
                <select
                  disabled={!isSuperAdmin}
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ShipmentStatus)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden cursor-pointer"
                >
                  <option value="pre_booked">{t('status_pre_booked')}</option>
                  <option value="verified">{t('status_verified')}</option>
                  <option value="booked">{t('status_booked')}</option>
                  <option value="in_transit">{t('status_in_transit')}</option>
                  <option value="received_at_branch">{t('status_received_at_branch')}</option>
                  <option value="out_for_delivery">{t('status_out_for_delivery')}</option>
                  <option value="delivered">{t('status_delivered')}</option>
                  <option value="returned">{t('status_returned')}</option>
                  <option value="cancelled">{t('status_cancelled')}</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 6: Audit Trail Note */}
          <div className="space-y-2 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
              <span className="flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-amber-500" />
                {t('audit_trail_note')}
              </span>
            </label>
            <input
              type="text"
              disabled={!isSuperAdmin}
              value={auditNote}
              onChange={(e) => setAuditNote(e.target.value)}
              placeholder={t('audit_trail_note_placeholder')}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
            />
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              {language === 'fa' 
                ? 'این یادداشت در تاریخچه رسمی بارنامه ثبت شده و توسط سیستم مانیتورینگ دفتر مرکزی رصد می‌شود.'
                : (language === 'ps'
                  ? 'دا یادښت د بارنامې په رسمي تاریخچه کې ثبتېږي او د مرکزي دفتر لخوا څارل کېږي.'
                  : 'This audit note will be permanently logged in the status history alongside your Super Admin credentials.')}
            </p>
          </div>

        </form>

        {/* Footer Actions */}
        <div className="shrink-0 p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all cursor-pointer"
          >
            {t('cancel')}
          </button>

          <button
            type="button"
            disabled={!isSuperAdmin || isSubmitting}
            onClick={handleSubmit}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider text-white flex items-center gap-2 transition-all shadow-md cursor-pointer ${
              !isSuperAdmin || isSubmitting
                ? 'bg-slate-400 dark:bg-slate-600 cursor-not-allowed opacity-60'
                : 'bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-500 shadow-amber-600/30 active:scale-98'
            }`}
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>{t('saving_changes')}</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{t('save_changes_btn')}</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
