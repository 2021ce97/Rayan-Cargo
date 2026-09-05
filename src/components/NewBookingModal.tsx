import React, { useState, useEffect } from 'react';
import { 
  PackagePlus, 
  Building2, 
  MapPin, 
  Sparkles, 
  RotateCcw,
  Check,
  Lock,
  ArrowRight,
  ShieldAlert,
  Calculator,
  SlidersHorizontal,
  Info,
  Banknote,
  Receipt,
  HelpCircle
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { 
  ParcelCategory, 
  ServiceType, 
  PaymentMethod, 
  PaymentStatus,
  Shipment 
} from '../types';
import confetti from 'canvas-confetti';

export const NewBookingModal: React.FC = () => {
  const { 
    t, 
    language,
    branches, 
    currentUser, 
    activeBranchId,
    addShipment, 
    setSelectedShipmentForReceipt,
    setActiveView 
  } = useApp();

  const getLocalizedBranchName = (b: { name: string; nameFa?: string; namePs?: string } | undefined) => {
    if (!b) return '';
    if (language === 'fa' && b.nameFa) return b.nameFa;
    if (language === 'ps' && b.namePs) return b.namePs;
    return b.name;
  };

  const isBranchUser = currentUser.role !== 'super_admin';
  const mainBranch = branches.find(b => b.isHeadOffice) || branches[0];
  const defaultOrigin = isBranchUser 
    ? currentUser.branchId 
    : (activeBranchId && activeBranchId !== 'all' ? activeBranchId : (mainBranch?.id || 'br_kbl_01'));

  // Origin Branch is defaulted & locked to current branch
  const [originBranchId, setOriginBranchId] = useState<string>(defaultOrigin);

  // Available destination branches (the other 5 branches)
  const availableDestinations = branches.filter(b => b.id !== originBranchId);

  // Selected Destination Branch
  const [destBranchId, setDestBranchId] = useState<string>(
    availableDestinations[0]?.id || (branches.find(b => b.id !== defaultOrigin)?.id || 'br_hrt_02')
  );

  // Sender Info
  const [senderName, setSenderName] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [senderEmail, setSenderEmail] = useState('');
  const [senderNid, setSenderNid] = useState('');
  const [senderAddress, setSenderAddress] = useState('');
  const [senderCity, setSenderCity] = useState('');
  const [senderProvince, setSenderProvince] = useState('');

  // Receiver Info
  const [receiverName, setReceiverName] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [receiverAltPhone, setReceiverAltPhone] = useState('');
  const [receiverNid, setReceiverNid] = useState(''); // Optional: Receiver's Tazkira number
  const [receiverAddress, setReceiverAddress] = useState('');
  const [receiverCity, setReceiverCity] = useState('');
  const [receiverProvince, setReceiverProvince] = useState('');

  // Parcel Info
  const [category, setCategory] = useState<ParcelCategory>('general');
  const [weightKg, setWeightKg] = useState<number>(5.0);
  const [pieces, setPieces] = useState<number>(1);
  const [dimensions, setDimensions] = useState<string>('30x25x20 cm');
  const [declaredValueAfn, setDeclaredValueAfn] = useState<number>(10000);
  const [description, setDescription] = useState<string>('');
  const [serviceType, setServiceType] = useState<ServiceType>('express');
  const [isFragile, setIsFragile] = useState<boolean>(false);

  // Billing & Discounts
  const [baseRate, setBaseRate] = useState<number>(300);
  const [ratePerKg, setRatePerKg] = useState<number>(40);
  const [serviceFee, setServiceFee] = useState<number>(100);
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [discountReason, setDiscountReason] = useState<string>('');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('paid');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');

  // Initialize and sync origin and destination details
  useEffect(() => {
    const origin = branches.find(b => b.id === originBranchId);
    if (origin) {
      setSenderCity(origin.city);
      setSenderProvince(origin.province);
    }
  }, [originBranchId, branches]);

  useEffect(() => {
    const dest = branches.find(b => b.id === destBranchId);
    if (dest) {
      setReceiverCity(dest.city);
      setReceiverProvince(dest.province);
    }
  }, [destBranchId, branches]);

  // Handle origin change (if super admin)
  const handleOriginChange = (bId: string) => {
    setOriginBranchId(bId);
    const newAvailable = branches.filter(b => b.id !== bId);
    if (!newAvailable.some(b => b.id === destBranchId)) {
      setDestBranchId(newAvailable[0]?.id || '');
    }
  };

  const handleDestChange = (bId: string) => {
    setDestBranchId(bId);
  };

  // Calculations
  const weightCost = Math.round(weightKg * ratePerKg);
  const fragileFee = isFragile ? 150 : 0;
  const subtotal = baseRate + weightCost + serviceFee + fragileFee;

  let calculatedDiscount = 0;
  if (discountType === 'percentage') {
    calculatedDiscount = Math.round((subtotal * Math.min(discountValue, 100)) / 100);
  } else {
    calculatedDiscount = Math.min(discountValue, subtotal);
  }

  const grandTotal = Math.max(0, subtotal - calculatedDiscount);
  const amountPaid = paymentStatus === 'paid' ? grandTotal : (paymentStatus === 'partial' ? Math.round(grandTotal / 2) : 0);
  const amountDue = grandTotal - amountPaid;

  const originBranchObj = branches.find(b => b.id === originBranchId);
  const destBranchObj = branches.find(b => b.id === destBranchId);

  // Auto-fill Demo Data helper
  const handleAutoFillSample = () => {
    const orig = originBranchObj || branches[0];
    const dest = destBranchObj || branches[1];

    setSenderName('Haji Mohammad Hashim Trading Ltd');
    setSenderPhone('+93 79 881 2244');
    setSenderEmail('hashim.trade@gmail.com');
    setSenderNid('TK-9923812');
    setSenderAddress('Mandawi Market, Plaza 3, Ground Floor');
    setSenderCity(orig.city);
    setSenderProvince(orig.province);

    setReceiverName('Safi Brothers Electronics');
    setReceiverPhone('+93 70 334 9911');
    setReceiverAltPhone('+93 78 554 1122');
    setReceiverAddress('Near Main City Chowk, Electronic Commercial Center');
    setReceiverCity(dest.city);
    setReceiverProvince(dest.province);

    setCategory('electronics');
    setWeightKg(14.5);
    setPieces(3);
    setDimensions('45x35x30 cm');
    setDeclaredValueAfn(180000);
    setDescription('3 Boxes of Smart Security Cameras, Network Adapters and Inverters');
    setServiceType('express');
    setIsFragile(true);

    setBaseRate(350);
    setRatePerKg(45);
    setDiscountType('percentage');
    setDiscountValue(10);
    setDiscountReason('Merchant Regular 10%');
    setPaymentStatus('paid');
    setPaymentMethod('cash');
  };

  const handleReset = () => {
    setSenderName('');
    setSenderPhone('');
    setSenderEmail('');
    setSenderNid('');
    setSenderAddress('');
    setReceiverName('');
    setReceiverPhone('');
    setReceiverAltPhone('');
    setReceiverNid('');
    setReceiverAddress('');
    setDescription('');
    setWeightKg(5);
    setPieces(1);
    setDiscountValue(0);
  };

  const handleSubmit = (andPrint: boolean) => {
    if (!senderName.trim() || !senderPhone.trim()) {
      alert('Please provide Sender Name and Phone Number');
      return;
    }
    if (!receiverName.trim() || !receiverPhone.trim()) {
      alert('Please provide Receiver Name and Destination Phone Number');
      return;
    }

    const newShipment = addShipment({
      originBranchId,
      destinationBranchId: destBranchId,
      currentBranchId: originBranchId,
      sender: {
        name: senderName,
        phone: senderPhone,
        email: senderEmail,
        nationalId: senderNid,
        receiverTazkira: receiverNid.trim() || undefined,
        address: senderAddress || 'Direct Branch Dropoff',
        city: senderCity || originBranchObj?.city || 'Origin City',
        province: senderProvince || originBranchObj?.province || 'Origin Province'
      },
      receiver: {
        name: receiverName,
        phone: receiverPhone,
        altPhone: receiverAltPhone,
        nationalId: receiverNid.trim() || undefined,
        address: receiverAddress || 'Destination Branch Pickup',
        city: receiverCity || destBranchObj?.city || 'Destination City',
        province: receiverProvince || destBranchObj?.province || 'Destination Province'
      },
      packageInfo: {
        category,
        weightKg,
        pieces,
        dimensions,
        declaredValueAfn,
        description: description || `${pieces} package(s) of ${category}`,
        serviceType,
        isFragile
      },
      financials: {
        baseRate,
        weightCost,
        serviceFee: serviceFee + fragileFee,
        discountType,
        discountValue,
        discountAmount: calculatedDiscount,
        tax: 0,
        totalAmount: grandTotal,
        amountPaid,
        amountDue,
        paymentStatus,
        paymentMethod,
        discountReason
      },
      bookedByUserId: currentUser.id,
      bookedByUserName: currentUser.name,
      status: 'booked'
    });

    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (e) {
      // ignore
    }

    if (andPrint) {
      setSelectedShipmentForReceipt(newShipment);
    } else {
      setActiveView('parcels');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-6 rounded-2xl bg-white border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-md shadow-red-600/20">
              <PackagePlus className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {t('booking_page_title')}
              </h1>
              <p className="text-xs text-slate-500">
                {t('booking_page_subtitle')}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isBranchUser && mainBranch && (
            <button
              onClick={() => handleOriginChange(mainBranch.id)}
              type="button"
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border ${
                originBranchId === mainBranch.id
                  ? 'bg-red-600 text-white border-red-600 shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
              }`}
              title={t('admin_office_dispatch_desc')}
            >
              <Building2 className="w-4 h-4 text-amber-300" />
              <span>{t('send_from_admin_office')}</span>
            </button>
          )}
          {branches.length >= 2 && (
            <button
              onClick={handleAutoFillSample}
              type="button"
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>{t('autofill_sample_btn')}</span>
            </button>
          )}
          <button
            onClick={handleReset}
            type="button"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            title={t('clear_form_btn')}
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Notice if less than 2 branches */}
      {branches.length < 2 && (
        <div className="p-6 rounded-2xl bg-amber-50 border border-amber-200 text-slate-800 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold shrink-0 shadow-md">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">
                {t('branch_setup_required_title')}
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                {t('branch_setup_required_desc')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={() => setActiveView('branches')}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Building2 className="w-4 h-4 text-amber-400" />
              <span>{t('go_to_branches_btn')}</span>
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Form Fields */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Section 1: Route & Branch Assignment */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-sm font-bold text-slate-900">
              <Building2 className="w-4 h-4 text-red-600" />
              <span>{t('route_assignment_title')}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Origin Branch: Available as default, locked for branch users */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>{t('origin_branch_lbl')}</span>
                  {isBranchUser && (
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" />
                      {t('default_locked_badge')}
                    </span>
                  )}
                </label>

                {isBranchUser ? (
                  <div className="w-full h-11 px-3.5 flex items-center justify-between text-xs font-bold bg-slate-100 border border-slate-300 rounded-xl text-slate-900">
                    <span className="truncate">🏢 {getLocalizedBranchName(originBranchObj)}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white text-slate-700 border border-slate-200">
                      {originBranchObj?.code}
                    </span>
                  </div>
                ) : (
                  <select
                    value={originBranchId}
                    onChange={(e) => handleOriginChange(e.target.value)}
                    className="w-full h-11 px-3 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-red-500 focus:outline-none"
                  >
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.isHeadOffice ? `👑 [${t('admin_main_office_badge', 'Main Branch (Admin HQ)')}] ` : '📍 '}
                        {getLocalizedBranchName(b)} ({b.city} - {b.code})
                      </option>
                    ))}
                  </select>
                )}
                <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1.5 flex-wrap">
                  {originBranchObj?.isHeadOffice && (
                    <span className="font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded text-[10px] border border-amber-200">
                      👑 {t('admin_main_office_badge', 'Main Branch (Admin HQ)')}
                    </span>
                  )}
                  <span>{t('located_in_prefix')} {originBranchObj?.city}, {originBranchObj?.province}</span>
                </div>
              </div>

              {/* Destination Branch (Dropdown of other branches) */}
              <div>
                <label className="block text-xs font-bold text-red-600 mb-1.5 flex items-center justify-between">
                  <span>{t('dest_branch_lbl')}</span>
                  <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">
                    {t('select_target_hub')}
                  </span>
                </label>
                <select
                  value={destBranchId}
                  onChange={(e) => handleDestChange(e.target.value)}
                  className="w-full h-11 px-3.5 text-xs font-bold bg-red-50/50 border-2 border-red-500/40 rounded-xl text-slate-900 focus:ring-2 focus:ring-red-500 focus:outline-none cursor-pointer"
                >
                  {availableDestinations.map(b => (
                    <option key={b.id} value={b.id}>
                      📍 {getLocalizedBranchName(b)} ({b.city}, {b.province} - {b.code})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  {t('receiver_terminal_prefix')} {destBranchObj?.city}, {destBranchObj?.province}
                </p>
              </div>
            </div>

            {/* Route visual arrow */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
              <div className="font-bold text-slate-700">
                {getLocalizedBranchName(originBranchObj)}
              </div>
              <div className="flex items-center gap-1.5 text-red-600 font-bold font-mono">
                <span>-----------</span>
                <ArrowRight className="w-4 h-4" />
              </div>
              <div className="font-bold text-red-700">
                {getLocalizedBranchName(destBranchObj)}
              </div>
            </div>
          </div>

          {/* Section 2: Sender & Receiver Details */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-6">
            
            {/* Sender Box */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-700 pb-1 border-b border-slate-100">
                <span className="text-red-600">{t('sender_info_origin')}</span>
                <span className="text-[10px] text-slate-400 font-normal">{t('registered_at_branch')} {originBranchObj?.code}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">{t('sender_full_name')}</label>
                  <input
                    type="text"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    placeholder="e.g. Haji Mohammad Qasim"
                    className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-red-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">{t('sender_phone_whatsapp')}</label>
                  <input
                    type="text"
                    value={senderPhone}
                    onChange={(e) => setSenderPhone(e.target.value)}
                    placeholder="e.g. +93 79 912 3456"
                    className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono focus:ring-2 focus:ring-red-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">{t('national_id_tazkira')}</label>
                  <input
                    type="text"
                    value={senderNid}
                    onChange={(e) => setSenderNid(e.target.value)}
                    placeholder="e.g. TK-892341"
                    className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono focus:ring-2 focus:ring-red-500 focus:outline-none"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      {t('receiver_tazkira_optional')}
                    </label>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-200">
                      {t('optional_badge', 'Optional')}
                    </span>
                  </div>
                  <input
                    type="text"
                    value={receiverNid}
                    onChange={(e) => setReceiverNid(e.target.value)}
                    placeholder="e.g. 1401-1234567-8 / TK-99120"
                    className="w-full h-9 px-3 text-xs bg-amber-50/50 border border-amber-300 rounded-lg text-slate-900 font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                  <p className="text-[9.5px] text-slate-400 mt-0.5">
                    {t('receiver_tazkira_optional_desc')}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">{t('origin_city_prov')}</label>
                  <input
                    type="text"
                    value={`${senderCity}, ${senderProvince}`}
                    disabled
                    className="w-full h-9 px-3 text-xs bg-slate-100 border border-slate-200 rounded-lg text-slate-600 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">{t('sender_address_street')}</label>
                <input
                  type="text"
                  value={senderAddress}
                  onChange={(e) => setSenderAddress(e.target.value)}
                  placeholder="e.g. Mandawi Market, Gate 4, Shop #12"
                  className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Receiver Box */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-700 pb-1 border-b border-slate-100">
                <span className="text-emerald-600">{t('receiver_info_dest')}</span>
                <span className="text-[10px] text-slate-400 font-normal">{t('delivering_via')} {destBranchObj?.code}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">{t('receiver_full_name')}</label>
                  <input
                    type="text"
                    value={receiverName}
                    onChange={(e) => setReceiverName(e.target.value)}
                    placeholder="e.g. Ahmad Fawad Nazari"
                    className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-red-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">{t('receiver_phone_num')}</label>
                  <input
                    type="text"
                    value={receiverPhone}
                    onChange={(e) => setReceiverPhone(e.target.value)}
                    placeholder="e.g. +93 70 882 1144"
                    className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono focus:ring-2 focus:ring-red-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">{t('receiver_alt_phone')}</label>
                  <input
                    type="text"
                    value={receiverAltPhone}
                    onChange={(e) => setReceiverAltPhone(e.target.value)}
                    placeholder="e.g. +93 78 554 9900"
                    className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono focus:ring-2 focus:ring-red-500 focus:outline-none"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      {t('receiver_tazkira_optional')}
                    </label>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-200">
                      {t('optional_badge', 'Optional')}
                    </span>
                  </div>
                  <input
                    type="text"
                    value={receiverNid}
                    onChange={(e) => setReceiverNid(e.target.value)}
                    placeholder="e.g. 1401-1234567-8 / TK-99120"
                    className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">{t('dest_city_prov')}</label>
                  <input
                    type="text"
                    value={`${receiverCity}, ${receiverProvince}`}
                    disabled
                    className="w-full h-9 px-3 text-xs bg-slate-100 border border-slate-200 rounded-lg text-slate-600 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">{t('dest_delivery_address')}</label>
                <input
                  type="text"
                  value={receiverAddress}
                  onChange={(e) => setReceiverAddress(e.target.value)}
                  placeholder="e.g. Main Bazaar Road, Near City Center"
                  className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>
            </div>

          </div>

          {/* Section 3: Cargo & Package Specifications */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-sm font-bold text-slate-900">
              <span>{t('cargo_specifications')}</span>
              <span className="text-xs font-normal text-slate-400">{t('weight_and_category')}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">{t('cargo_category_lbl')}</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ParcelCategory)}
                  className="w-full h-9 px-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-red-500"
                >
                  <option value="general">{t('cat_general')}</option>
                  <option value="electronics">{t('cat_electronics')}</option>
                  <option value="garments">{t('cat_garments')}</option>
                  <option value="document">{t('cat_document')}</option>
                  <option value="foodstuff">{t('cat_foodstuff')}</option>
                  <option value="machinery">{t('cat_machinery')}</option>
                  <option value="fragile">{t('cat_fragile')}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">{t('total_weight_kg')}</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={weightKg}
                  onChange={(e) => setWeightKg(parseFloat(e.target.value) || 1)}
                  className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">{t('pieces_count_lbl')}</label>
                <input
                  type="number"
                  min="1"
                  value={pieces}
                  onChange={(e) => setPieces(parseInt(e.target.value) || 1)}
                  className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">{t('service_speed_lbl')}</label>
                <select
                  value={serviceType}
                  onChange={(e) => setServiceType(e.target.value as ServiceType)}
                  className="w-full h-9 px-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-red-500"
                >
                  <option value="standard">{t('speed_standard')}</option>
                  <option value="express">{t('speed_express')}</option>
                  <option value="same_day_air">{t('speed_same_day')}</option>
                  <option value="heavy_cargo">{t('speed_heavy')}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">{t('declared_value_afn')}</label>
                <input
                  type="number"
                  value={declaredValueAfn}
                  onChange={(e) => setDeclaredValueAfn(parseInt(e.target.value) || 0)}
                  className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">{t('contents_description')}</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. 4 Cartons of clothing fabric and accessories"
                className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="fragile-check"
                checked={isFragile}
                onChange={(e) => setIsFragile(e.target.checked)}
                className="w-4 h-4 rounded text-red-600 focus:ring-red-500 border-slate-300"
              />
              <label htmlFor="fragile-check" className="text-xs font-semibold text-slate-700 cursor-pointer">
                {t('fragile_checkbox_lbl')}
              </label>
            </div>
          </div>

        </div>

        {/* Right Column: Pricing & Grand Total Summary */}
        <div className="space-y-6">
          
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-5 sticky top-20">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center font-bold">
                  <Calculator className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    {t('pricing_breakdown_title')}
                  </h3>
                  <p className="text-[10px] text-slate-500">
                    {t('pricing_breakdown_subtitle')}
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Pricing Presets */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                <span>{t('pricing_rates_presets')}</span>
                <span className="text-[10px] text-slate-400 font-normal">Click to apply</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setBaseRate(300);
                    setRatePerKg(40);
                    setServiceFee(100);
                  }}
                  className={`py-1.5 px-2 rounded-lg text-[10px] font-bold border transition-all text-center cursor-pointer ${
                    baseRate === 300 && ratePerKg === 40
                      ? 'bg-red-50 text-red-700 border-red-300 ring-1 ring-red-400'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span className="block truncate">Standard</span>
                  <span className="text-[9px] font-mono text-slate-500 font-normal">300 + 40/kg</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setBaseRate(400);
                    setRatePerKg(30);
                    setServiceFee(120);
                  }}
                  className={`py-1.5 px-2 rounded-lg text-[10px] font-bold border transition-all text-center cursor-pointer ${
                    baseRate === 400 && ratePerKg === 30
                      ? 'bg-red-50 text-red-700 border-red-300 ring-1 ring-red-400'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span className="block truncate">Heavy Bulk</span>
                  <span className="text-[9px] font-mono text-slate-500 font-normal">400 + 30/kg</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setBaseRate(500);
                    setRatePerKg(70);
                    setServiceFee(150);
                  }}
                  className={`py-1.5 px-2 rounded-lg text-[10px] font-bold border transition-all text-center cursor-pointer ${
                    baseRate === 500 && ratePerKg === 70
                      ? 'bg-red-50 text-red-700 border-red-300 ring-1 ring-red-400'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span className="block truncate">Express VIP</span>
                  <span className="text-[9px] font-mono text-slate-500 font-normal">500 + 70/kg</span>
                </button>
              </div>
            </div>

            {/* Editable Rate Inputs Section (Branch Manager Controls) */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="text-[11px] font-black uppercase tracking-wider text-slate-700 flex items-center justify-between pb-1 border-b border-slate-200">
                <span className="flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-red-600" />
                  <span>{t('set_rates_title')}</span>
                </span>
                <span className="text-[9px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                  {t('editable_by_mgr')}
                </span>
              </div>

              {/* Base Booking Rate */}
              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1">
                  <span>{t('base_booking_rate_lbl')}:</span>
                  <span className="text-[10px] text-slate-400 font-normal">{t('fixed_intake_fee')}</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="10"
                    value={baseRate}
                    onChange={(e) => setBaseRate(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full h-9 pl-3 pr-12 text-xs font-mono font-bold bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-red-500"
                  />
                  <span className="absolute right-3 top-2 text-xs font-mono font-bold text-slate-400">
                    AFN
                  </span>
                </div>
              </div>

              {/* Rate Per KG */}
              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1">
                  <span>{t('rate_per_kg_lbl')}:</span>
                  <span className="text-[10px] text-slate-400 font-normal">{t('highway_freight_per_kg')}</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="5"
                    value={ratePerKg}
                    onChange={(e) => setRatePerKg(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full h-9 pl-3 pr-16 text-xs font-mono font-bold bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-red-500"
                  />
                  <span className="absolute right-3 top-2 text-xs font-mono font-bold text-slate-400">
                    AFN / kg
                  </span>
                </div>
              </div>

              {/* Service & Handling Fee */}
              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1">
                  <span>{t('service_handling_fee_lbl')}:</span>
                  <span className="text-[10px] text-slate-400 font-normal">{t('loading_storage_fee')}</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="10"
                    value={serviceFee}
                    onChange={(e) => setServiceFee(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full h-9 pl-3 pr-12 text-xs font-mono font-bold bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-red-500"
                  />
                  <span className="absolute right-3 top-2 text-xs font-mono font-bold text-slate-400">
                    AFN
                  </span>
                </div>
              </div>
            </div>

            {/* Live Calculations Summary Box */}
            <div className="p-3.5 rounded-xl bg-slate-900 text-white space-y-2 text-xs shadow-inner">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 pb-1 border-b border-slate-800 flex items-center justify-between">
                <span>{t('calculated_invoice_math')}</span>
                <span className="font-mono text-emerald-400">{t('live_auto_update')}</span>
              </div>

              <div className="flex items-center justify-between text-slate-300">
                <span>{t('base_booking_rate_lbl')}:</span>
                <span className="font-mono font-bold text-white">{baseRate} AFN</span>
              </div>

              <div className="flex items-center justify-between text-slate-300">
                <span>{t('weight_charge_lbl')} ({weightKg} kg × {ratePerKg} AFN):</span>
                <span className="font-mono font-bold text-white">{weightCost} AFN</span>
              </div>

              <div className="flex items-center justify-between text-slate-300">
                <span>{t('service_handling_fee')}:</span>
                <span className="font-mono font-bold text-white">{serviceFee} AFN</span>
              </div>

              {isFragile && (
                <div className="flex items-center justify-between text-amber-300">
                  <span>{t('fragile_fee_lbl')}:</span>
                  <span className="font-mono font-bold">+{fragileFee} AFN</span>
                </div>
              )}

              {calculatedDiscount > 0 && (
                <div className="flex items-center justify-between text-emerald-400 font-bold">
                  <span>{t('applied_discount_lbl')}:</span>
                  <span className="font-mono">-{calculatedDiscount} AFN</span>
                </div>
              )}

              <div className="pt-2.5 border-t border-slate-800 flex items-center justify-between text-base font-black">
                <span className="text-white">{t('grand_total_lbl')}:</span>
                <span className="font-mono text-red-400 text-lg">{grandTotal} AFN</span>
              </div>
            </div>

            {/* Discount Inputs */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="font-bold text-slate-700 flex items-center justify-between">
                <span>{t('applied_discount_lbl')}</span>
                <span className="text-[10px] text-slate-400">{t('optional_badge')}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as 'percentage' | 'fixed')}
                  className="h-8 px-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 font-medium"
                >
                  <option value="percentage">{t('disc_percentage')}</option>
                  <option value="fixed">{t('disc_fixed')}</option>
                </select>
                <input
                  type="number"
                  min="0"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="h-8 px-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 font-mono font-bold"
                />
              </div>
            </div>

            {/* Payment Mode */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">{t('payment_status')}</label>
              <div className="grid grid-cols-2 gap-1.5">
                {(['paid', 'to_pay', 'partial', 'unpaid'] as PaymentStatus[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPaymentStatus(p)}
                    className={`py-2 px-2 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                      paymentStatus === p
                        ? 'bg-red-600 text-white border-red-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {p === 'to_pay' ? t('cod_topay') : t(`payment_status_${p}` as any) || p.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Explainer Note */}
            <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200/80 text-[11px] text-blue-900 space-y-1">
              <div className="font-bold flex items-center gap-1 text-blue-950">
                <HelpCircle className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>{t('pricing_how_it_works')}</span>
              </div>
              <p className="text-blue-800 leading-relaxed">
                {t('pricing_formula_explainer')}
              </p>
            </div>

            {/* Submit Action Buttons */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => handleSubmit(true)}
                className="w-full py-3.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs shadow-lg shadow-red-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Receipt className="w-4 h-4" />
                <span>{t('btn_book_and_print')}</span>
              </button>

              <button
                type="button"
                onClick={() => handleSubmit(false)}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <span>{t('btn_book_only')}</span>
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
