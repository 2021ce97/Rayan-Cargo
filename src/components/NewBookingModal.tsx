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
  ShieldAlert
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
    branches, 
    currentUser, 
    addShipment, 
    setSelectedShipmentForReceipt,
    setActiveView 
  } = useApp();

  const isBranchUser = currentUser.role !== 'super_admin';
  const userBranchId = isBranchUser ? currentUser.branchId : (branches[0]?.id || 'br_kbl_01');

  // Origin Branch is defaulted & locked to current branch
  const [originBranchId, setOriginBranchId] = useState<string>(userBranchId);

  // Available destination branches (the other 5 branches)
  const availableDestinations = branches.filter(b => b.id !== originBranchId);

  // Selected Destination Branch
  const [destBranchId, setDestBranchId] = useState<string>(
    availableDestinations[0]?.id || (branches.find(b => b.id !== userBranchId)?.id || 'br_hrt_02')
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
        address: senderAddress || 'Direct Branch Dropoff',
        city: senderCity || originBranchObj?.city || 'Origin City',
        province: senderProvince || originBranchObj?.province || 'Origin Province'
      },
      receiver: {
        name: receiverName,
        phone: receiverPhone,
        altPhone: receiverAltPhone,
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
                Consignment Booking & Waybill Entry
              </h1>
              <p className="text-xs text-slate-500">
                Register sender, receiver, destination branch, weight specs, and print waybill
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleAutoFillSample}
            type="button"
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span>Auto-fill Sample Data</span>
          </button>
          <button
            onClick={handleReset}
            type="button"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            title="Clear Form"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Form Fields */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Section 1: Route & Branch Assignment */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-sm font-bold text-slate-900">
              <Building2 className="w-4 h-4 text-red-600" />
              <span>Inter-Branch Route Assignment</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Origin Branch: Available as default, locked for branch users */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>Origin / Sender Branch (مبدأ)</span>
                  {isBranchUser && (
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" />
                      Default (Locked)
                    </span>
                  )}
                </label>

                {isBranchUser ? (
                  <div className="w-full h-11 px-3.5 flex items-center justify-between text-xs font-bold bg-slate-100 border border-slate-300 rounded-xl text-slate-900">
                    <span className="truncate">🏢 {originBranchObj?.name}</span>
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
                        {b.name} ({b.city} - {b.code})
                      </option>
                    ))}
                  </select>
                )}
                <p className="text-[10px] text-slate-400 mt-1">
                  Located in: {originBranchObj?.city}, {originBranchObj?.province}
                </p>
              </div>

              {/* Destination Branch (Dropdown of other branches) */}
              <div>
                <label className="block text-xs font-bold text-red-600 mb-1.5 flex items-center justify-between">
                  <span>Destination Branch (مقصد) *</span>
                  <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">
                    Select Target Hub
                  </span>
                </label>
                <select
                  value={destBranchId}
                  onChange={(e) => handleDestChange(e.target.value)}
                  className="w-full h-11 px-3.5 text-xs font-bold bg-red-50/50 border-2 border-red-500/40 rounded-xl text-slate-900 focus:ring-2 focus:ring-red-500 focus:outline-none cursor-pointer"
                >
                  {availableDestinations.map(b => (
                    <option key={b.id} value={b.id}>
                      📍 {b.name} ({b.city}, {b.province} - {b.code})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  Receiver Terminal: {destBranchObj?.city}, {destBranchObj?.province}
                </p>
              </div>
            </div>

            {/* Route visual arrow */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
              <div className="font-bold text-slate-700">
                {originBranchObj?.name}
              </div>
              <div className="flex items-center gap-1.5 text-red-600 font-bold font-mono">
                <span>-----------</span>
                <ArrowRight className="w-4 h-4" />
              </div>
              <div className="font-bold text-red-700">
                {destBranchObj?.name}
              </div>
            </div>
          </div>

          {/* Section 2: Sender & Receiver Details */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-6">
            
            {/* Sender Box */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-700 pb-1 border-b border-slate-100">
                <span className="text-red-600">Sender Information (Origin)</span>
                <span className="text-[10px] text-slate-400 font-normal">Registered at {originBranchObj?.code}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Sender Full Name *</label>
                  <input
                    type="text"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    placeholder="e.g. Haji Mohammad Qasim"
                    className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-red-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Sender Phone / WhatsApp *</label>
                  <input
                    type="text"
                    value={senderPhone}
                    onChange={(e) => setSenderPhone(e.target.value)}
                    placeholder="e.g. +93 79 912 3456"
                    className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono focus:ring-2 focus:ring-red-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">National ID / Tazkira No.</label>
                  <input
                    type="text"
                    value={senderNid}
                    onChange={(e) => setSenderNid(e.target.value)}
                    placeholder="e.g. TK-892341"
                    className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono focus:ring-2 focus:ring-red-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Origin City & Province</label>
                  <input
                    type="text"
                    value={`${senderCity}, ${senderProvince}`}
                    disabled
                    className="w-full h-9 px-3 text-xs bg-slate-100 border border-slate-200 rounded-lg text-slate-600 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Sender Street Address / Market</label>
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
                <span className="text-emerald-600">Receiver Information (Destination)</span>
                <span className="text-[10px] text-slate-400 font-normal">Delivering via {destBranchObj?.code}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Receiver Full Name *</label>
                  <input
                    type="text"
                    value={receiverName}
                    onChange={(e) => setReceiverName(e.target.value)}
                    placeholder="e.g. Ahmad Fawad Nazari"
                    className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-red-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Receiver Phone Number *</label>
                  <input
                    type="text"
                    value={receiverPhone}
                    onChange={(e) => setReceiverPhone(e.target.value)}
                    placeholder="e.g. +93 70 882 1144"
                    className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono focus:ring-2 focus:ring-red-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Alternate Contact (Optional)</label>
                  <input
                    type="text"
                    value={receiverAltPhone}
                    onChange={(e) => setReceiverAltPhone(e.target.value)}
                    placeholder="e.g. +93 78 554 9900"
                    className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono focus:ring-2 focus:ring-red-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Destination City & Province</label>
                  <input
                    type="text"
                    value={`${receiverCity}, ${receiverProvince}`}
                    disabled
                    className="w-full h-9 px-3 text-xs bg-slate-100 border border-slate-200 rounded-lg text-slate-600 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Destination Delivery Address / Branch Pickup</label>
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
              <span>Cargo Specifications</span>
              <span className="text-xs font-normal text-slate-400">Weight & Category</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Cargo Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ParcelCategory)}
                  className="w-full h-9 px-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-red-500"
                >
                  <option value="general">General Goods</option>
                  <option value="electronics">Electronics & Gadgets</option>
                  <option value="garments">Garments & Textiles</option>
                  <option value="document">Documents & Envelopes</option>
                  <option value="foodstuff">Foodstuff & Dry Fruits</option>
                  <option value="machinery">Machinery & Spares</option>
                  <option value="fragile">Fragile Goods</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Total Weight (KG)</label>
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
                <label className="block text-xs font-semibold text-slate-600 mb-1">Pieces Count</label>
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
                <label className="block text-xs font-semibold text-slate-600 mb-1">Service Speed</label>
                <select
                  value={serviceType}
                  onChange={(e) => setServiceType(e.target.value as ServiceType)}
                  className="w-full h-9 px-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-red-500"
                >
                  <option value="standard">Standard Highway Ground (2-3 Days)</option>
                  <option value="express">Express Express Cargo (Next Day)</option>
                  <option value="same_day_air">Same-Day Air Cargo</option>
                  <option value="heavy_cargo">Heavy & Bulk Freight</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Declared Value (AFN)</label>
                <input
                  type="number"
                  value={declaredValueAfn}
                  onChange={(e) => setDeclaredValueAfn(parseInt(e.target.value) || 0)}
                  className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Contents Description</label>
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
                Fragile Cargo / Special Caution Required (+150 AFN handling)
              </label>
            </div>
          </div>

        </div>

        {/* Right Column: Pricing & Grand Total Summary */}
        <div className="space-y-6">
          
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-5 sticky top-20">
            <h3 className="font-bold text-sm text-slate-900 pb-2 border-b border-slate-100">
              Pricing & Invoice Breakdown
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-600">
                <span>Base Booking Rate:</span>
                <span className="font-mono font-bold text-slate-900">{baseRate} AFN</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>Weight Charge ({weightKg}kg @ {ratePerKg}/kg):</span>
                <span className="font-mono font-bold text-slate-900">{weightCost} AFN</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>Service & Handling:</span>
                <span className="font-mono font-bold text-slate-900">{serviceFee + fragileFee} AFN</span>
              </div>

              {calculatedDiscount > 0 && (
                <div className="flex items-center justify-between text-emerald-600 font-semibold">
                  <span>Applied Discount:</span>
                  <span className="font-mono font-bold">-{calculatedDiscount} AFN</span>
                </div>
              )}

              <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-base font-black text-slate-900">
                <span>Grand Total:</span>
                <span className="font-mono text-red-600">{grandTotal} AFN</span>
              </div>
            </div>

            {/* Discount Inputs */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="font-bold text-slate-700">Add Discount / Promo</div>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as 'percentage' | 'fixed')}
                  className="h-8 px-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-800"
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed (AFN)</option>
                </select>
                <input
                  type="number"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                  placeholder="Value"
                  className="h-8 px-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 font-mono"
                />
              </div>
            </div>

            {/* Payment Mode */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">Payment Status</label>
              <div className="grid grid-cols-2 gap-1.5">
                {(['paid', 'to_pay', 'partial', 'unpaid'] as PaymentStatus[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPaymentStatus(p)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-colors ${
                      paymentStatus === p
                        ? 'bg-red-600 text-white border-red-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {p === 'to_pay' ? 'COD (To-Pay)' : p.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit Action Buttons */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => handleSubmit(true)}
                className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md shadow-red-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <span>Book & Print Waybill Receipt</span>
              </button>

              <button
                type="button"
                onClick={() => handleSubmit(false)}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <span>Book Consignment Only</span>
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
