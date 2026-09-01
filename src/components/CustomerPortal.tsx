import React, { useState } from 'react';
import { 
  Package, 
  Plus, 
  Clock, 
  MapPin, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Truck, 
  Calendar, 
  User, 
  Phone, 
  FileText, 
  Printer, 
  Search,
  Sparkles,
  Info,
  ShieldCheck,
  Scale,
  DollarSign
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { CustomerPreBookingInput, ParcelCategory, Shipment, ShipmentStatus } from '../types';

export const CustomerPortal: React.FC = () => {
  const { 
    t, 
    currentUser, 
    branches, 
    customerShipments, 
    createCustomerPreBooking, 
    setSelectedShipmentForReceipt,
    language 
  } = useApp();

  const [activeTab, setActiveTab] = useState<'history' | 'prebook'>('history');
  const [searchTerm, setSearchTerm] = useState('');
  const [submittedCn, setSubmittedCn] = useState<string | null>(null);

  // Pre-booking form state
  const [originBranchId, setOriginBranchId] = useState(branches[0]?.id || 'br_kabul');
  const [destinationBranchId, setDestinationBranchId] = useState(branches[1]?.id || 'br_herat');
  const [senderName, setSenderName] = useState(currentUser.name || '');
  const [senderPhone, setSenderPhone] = useState(currentUser.phone || '');
  const [senderEmail, setSenderEmail] = useState(currentUser.email || '');
  const [senderAddress, setSenderAddress] = useState('');
  const [senderCity, setSenderCity] = useState('Kabul');
  const [senderProvince, setSenderProvince] = useState('Kabul');

  const [receiverName, setReceiverName] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [receiverAddress, setReceiverAddress] = useState('');
  const [receiverCity, setReceiverCity] = useState('Herat');
  const [receiverProvince, setReceiverProvince] = useState('Herat');

  const [category, setCategory] = useState<ParcelCategory>('general');
  const [estimatedWeightKg, setEstimatedWeightKg] = useState<number>(5);
  const [pieces, setPieces] = useState<number>(1);
  const [declaredValueAfn, setDeclaredValueAfn] = useState<number>(3000);
  const [description, setDescription] = useState('');
  const [isFragile, setIsFragile] = useState(false);
  const [paymentPreference, setPaymentPreference] = useState<'pay_at_branch' | 'pay_on_delivery'>('pay_at_branch');

  // Handle origin branch change
  const handleOriginChange = (branchId: string) => {
    setOriginBranchId(branchId);
    const br = branches.find(b => b.id === branchId);
    if (br) {
      setSenderCity(br.city);
      setSenderProvince(br.province);
    }
  };

  // Handle destination branch change
  const handleDestChange = (branchId: string) => {
    setDestinationBranchId(branchId);
    const br = branches.find(b => b.id === branchId);
    if (br) {
      setReceiverCity(br.city);
      setReceiverProvince(br.province);
    }
  };

  const handlePreBookSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiverName || !receiverPhone || !senderName || !senderPhone) {
      alert('Please fill in sender and receiver contact details.');
      return;
    }

    const input: CustomerPreBookingInput = {
      originBranchId,
      destinationBranchId,
      senderName,
      senderPhone,
      senderEmail,
      senderAddress: senderAddress || `${senderCity} Central`,
      senderCity,
      senderProvince,
      receiverName,
      receiverPhone,
      receiverAddress: receiverAddress || `${receiverCity} Central`,
      receiverCity,
      receiverProvince,
      category,
      estimatedWeightKg: Number(estimatedWeightKg) || 1,
      pieces: Number(pieces) || 1,
      declaredValueAfn: Number(declaredValueAfn) || 0,
      description: description || `${category} - ${pieces} item(s)`,
      isFragile,
      paymentPreference
    };

    const newBooking = createCustomerPreBooking(input);
    setSubmittedCn(newBooking.cnNumber);
    setActiveTab('history');
  };

  const filteredHistory = customerShipments.filter(s => 
    s.cnNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.receiver.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.receiver.phone.includes(searchTerm) ||
    s.packageInfo.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: ShipmentStatus) => {
    switch (status) {
      case 'pre_booked':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'booked':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'in_transit':
        return 'bg-indigo-100 text-indigo-800 border-indigo-300';
      case 'received_at_branch':
        return 'bg-cyan-100 text-cyan-800 border-cyan-300';
      case 'out_for_delivery':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'delivered':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  const categoryOptions: { value: ParcelCategory; label: string }[] = [
    { value: 'general', label: 'Commercial & General Goods' },
    { value: 'garments', label: 'Clothing & Textiles' },
    { value: 'electronics', label: 'Electronics & IT Gadgets' },
    { value: 'foodstuff', label: 'Dry Fruits, Saffron & Foodstuff' },
    { value: 'document', label: 'Documents, Passports & Papers' },
    { value: 'machinery', label: 'Auto Parts & Machinery' },
    { value: 'fragile', label: 'Fragile & Glass Items' }
  ];

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 p-6 sm:p-8 text-white shadow-xl shadow-red-600/15">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Customer Self-Service Terminal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              {t('customer_portal_title')}
            </h1>
            <p className="text-xs sm:text-sm text-red-100 max-w-2xl leading-relaxed">
              {t('customer_portal_subtitle')}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('prebook')}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md ${
                activeTab === 'prebook'
                  ? 'bg-white text-red-600 shadow-white/20'
                  : 'bg-red-800/60 hover:bg-red-800 text-white'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>{t('prebook_new_parcel')}</span>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md ${
                activeTab === 'history'
                  ? 'bg-white text-red-600 shadow-white/20'
                  : 'bg-red-800/60 hover:bg-red-800 text-white'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>{t('customer_shipment_history')} ({customerShipments.length})</span>
            </button>
          </div>
        </div>

        {/* 4-Step Process Guide */}
        <div className="mt-6 pt-6 border-t border-white/20 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="flex items-center gap-2.5 bg-white/10 backdrop-blur-xs p-2.5 rounded-xl">
            <div className="w-6 h-6 rounded-full bg-amber-400 text-slate-900 font-black flex items-center justify-center text-xs shrink-0">1</div>
            <div>
              <div className="font-bold text-white">Pre-Book Online</div>
              <div className="text-[10px] text-red-100">Add cargo & contact details</div>
            </div>
          </div>
          <div className="flex items-center gap-2.5 bg-white/10 backdrop-blur-xs p-2.5 rounded-xl">
            <div className="w-6 h-6 rounded-full bg-amber-400 text-slate-900 font-black flex items-center justify-center text-xs shrink-0">2</div>
            <div>
              <div className="font-bold text-white">Drop at Origin Branch</div>
              <div className="text-[10px] text-red-100">Hand over package at branch</div>
            </div>
          </div>
          <div className="flex items-center gap-2.5 bg-white/10 backdrop-blur-xs p-2.5 rounded-xl">
            <div className="w-6 h-6 rounded-full bg-amber-400 text-slate-900 font-black flex items-center justify-center text-xs shrink-0">3</div>
            <div>
              <div className="font-bold text-white">Origin Branch Pricing</div>
              <div className="text-[10px] text-red-100">Scale weighed & price assigned</div>
            </div>
          </div>
          <div className="flex items-center gap-2.5 bg-white/10 backdrop-blur-xs p-2.5 rounded-xl">
            <div className="w-6 h-6 rounded-full bg-amber-400 text-slate-900 font-black flex items-center justify-center text-xs shrink-0">4</div>
            <div>
              <div className="font-bold text-white">Live Tracking & Invoicing</div>
              <div className="text-[10px] text-red-100">View price in portal & track</div>
            </div>
          </div>
        </div>
      </div>

      {submittedCn && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <div className="text-xs font-bold">Consignment Pre-Booked Successfully!</div>
              <div className="text-[11px] text-emerald-700">
                Your CN Reference Number is <span className="font-mono font-bold text-slate-900">{submittedCn}</span>. Please drop off the parcel at your selected Origin Branch. The Branch Manager will weigh it on the scale, set the official freight price, and it will immediately update in your account history.
              </div>
            </div>
          </div>
          <button
            onClick={() => setSubmittedCn(null)}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-900 underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* TAB 1: PRE-BOOKING FORM */}
      {activeTab === 'prebook' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Package className="w-5 h-5 text-red-600" />
                <span>{t('prebook_new_parcel')}</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {t('prebooking_notice')}
              </p>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-900 text-xs">
              <Scale className="w-4 h-4 text-amber-600 shrink-0" />
              <div className="text-start">
                <div className="font-bold text-[11px]">Pricing Policy: Branch Determined</div>
                <div className="text-[10px] text-amber-700">Calculated upon physical scale weighing at origin branch</div>
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-blue-50/80 border border-blue-200 text-blue-900 text-xs flex items-start gap-2.5">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-bold">{t('customer_pricing_policy_info')}</span> You only need to provide package details and receiver contacts. When you drop off the parcel at the origin branch, the branch manager will inspect and weigh it, enter the official freight price, and you will see the confirmed price in your account.
            </div>
          </div>

          <form onSubmit={handlePreBookSubmit} className="space-y-6">
            
            {/* 1. Branch Routing Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Origin Cargo Branch (Where you will drop the parcel)
                </label>
                <select
                  value={originBranchId}
                  onChange={(e) => handleOriginChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-red-500 focus:outline-none"
                >
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.city} Hub) - {b.code}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Destination Cargo Branch (Destination Province)
                </label>
                <select
                  value={destinationBranchId}
                  onChange={(e) => handleDestChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-red-500 focus:outline-none"
                >
                  {branches.map(b => (
                    <option key={b.id} value={b.id} disabled={b.id === originBranchId}>
                      {b.name} ({b.city} Hub) - {b.code} {b.id === originBranchId ? '(Origin)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 2. Sender & Receiver Contacts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Sender Info */}
              <div className="space-y-3 p-4 rounded-2xl border border-slate-200 bg-slate-50/50">
                <div className="text-xs font-bold text-red-600 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" />
                  <span>Sender Information (You)</span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Your Full Name</label>
                  <input
                    type="text"
                    required
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 focus:ring-2 focus:ring-red-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Phone Number</label>
                    <input
                      type="text"
                      required
                      value={senderPhone}
                      onChange={(e) => setSenderPhone(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 font-mono focus:ring-2 focus:ring-red-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Email (Optional)</label>
                    <input
                      type="email"
                      value={senderEmail}
                      onChange={(e) => setSenderEmail(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 focus:ring-2 focus:ring-red-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Sender Street Address</label>
                  <input
                    type="text"
                    value={senderAddress}
                    onChange={(e) => setSenderAddress(e.target.value)}
                    placeholder="e.g. Shahr-e-Naw, Street 4"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 focus:ring-2 focus:ring-red-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Receiver Info */}
              <div className="space-y-3 p-4 rounded-2xl border border-slate-200 bg-slate-50/50">
                <div className="text-xs font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Receiver Information (Destination)</span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Receiver Full Name</label>
                  <input
                    type="text"
                    required
                    value={receiverName}
                    onChange={(e) => setReceiverName(e.target.value)}
                    placeholder="e.g. Ghulam Farooq"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 focus:ring-2 focus:ring-red-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Receiver Phone Number</label>
                  <input
                    type="text"
                    required
                    value={receiverPhone}
                    onChange={(e) => setReceiverPhone(e.target.value)}
                    placeholder="0700 987 654"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 font-mono focus:ring-2 focus:ring-red-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Delivery / Street Address</label>
                  <input
                    type="text"
                    value={receiverAddress}
                    onChange={(e) => setReceiverAddress(e.target.value)}
                    placeholder="e.g. Chowk Gulha, Herat City"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 focus:ring-2 focus:ring-red-500 focus:outline-none"
                  />
                </div>
              </div>

            </div>

            {/* 3. Parcel Details */}
            <div className="space-y-4 p-4 rounded-2xl border border-slate-200 bg-slate-50/50">
              <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Parcel Specifications & Declared Value
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">{t('category_lbl')}</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ParcelCategory)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 focus:ring-2 focus:ring-red-500 focus:outline-none"
                  >
                    {categoryOptions.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Estimated Weight (KG)</label>
                  <input
                    type="number"
                    min="0.5"
                    step="0.5"
                    required
                    value={estimatedWeightKg}
                    onChange={(e) => setEstimatedWeightKg(parseFloat(e.target.value) || 1)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 font-mono focus:ring-2 focus:ring-red-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">No. of Pieces / Boxes</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={pieces}
                    onChange={(e) => setPieces(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 font-mono focus:ring-2 focus:ring-red-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Goods Value (AFN)</label>
                  <input
                    type="number"
                    min="0"
                    value={declaredValueAfn}
                    onChange={(e) => setDeclaredValueAfn(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 font-mono focus:ring-2 focus:ring-red-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Contents Description & Notes</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. 5 boxes of men's clothing items, high quality fabric"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={isFragile}
                    onChange={(e) => setIsFragile(e.target.checked)}
                    className="w-4 h-4 rounded text-red-600 focus:ring-red-500"
                  />
                  <span>Fragile Cargo (Requires special handling)</span>
                </label>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-700">Payment Preference:</span>
                  <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="paypref"
                      checked={paymentPreference === 'pay_at_branch'}
                      onChange={() => setPaymentPreference('pay_at_branch')}
                      className="text-red-600"
                    />
                    <span>Pay at Origin Branch</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="paypref"
                      checked={paymentPreference === 'pay_on_delivery'}
                      onChange={() => setPaymentPreference('pay_on_delivery')}
                      className="text-red-600"
                    />
                    <span>Receiver Pays (COD)</span>
                  </label>
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-2xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold text-xs shadow-lg shadow-red-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Package className="w-4 h-4" />
              <span>Submit Pre-Booking & Generate CN Reference</span>
            </button>

          </form>
        </div>
      )}

      {/* TAB 2: SHIPMENT HISTORY & RECORDS */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
          
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-black text-slate-900">
                {t('customer_shipment_history')}
              </h2>
              <p className="text-xs text-slate-500">
                Real-time records of all your dispatched and incoming cargo parcels
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search CN #, receiver..."
                className="w-full ps-9 pe-3 py-1.5 text-xs rounded-xl border border-slate-300 bg-slate-50 text-slate-900 focus:ring-2 focus:ring-red-500 focus:outline-none"
              />
            </div>
          </div>

          {filteredHistory.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Package className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-700">No Cargo Shipments Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                You have not registered any parcels yet. Click "Pre-book New Parcel" to add your first cargo consignment.
              </p>
              <button
                onClick={() => setActiveTab('prebook')}
                className="px-4 py-2 rounded-xl bg-red-600 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Pre-book Your First Parcel</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredHistory.map(shipment => {
                const originBr = branches.find(b => b.id === shipment.originBranchId);
                const destBr = branches.find(b => b.id === shipment.destinationBranchId);
                const isPrebookedAwaitingPrice = shipment.status === 'pre_booked' || shipment.financials.totalAmount === 0;

                return (
                  <div 
                    key={shipment.id}
                    className="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-red-200 hover:shadow-md transition-all space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono font-black text-slate-900 text-sm sm:text-base">
                          {shipment.cnNumber}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase border ${getStatusBadge(shipment.status)}`}>
                          {t(`status_${shipment.status}` as any) || shipment.status.replace(/_/g, ' ')}
                        </span>
                        {isPrebookedAwaitingPrice && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[10px] font-bold flex items-center gap-1 border border-amber-300">
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>{t('price_pending_branch_weighing')}</span>
                          </span>
                        )}
                        {!isPrebookedAwaitingPrice && shipment.isCustomerPrebooked && (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center gap-1 border border-emerald-300">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>{t('price_verified_by_branch')}</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {isPrebookedAwaitingPrice ? (
                          <div className="text-end">
                            <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 inline-flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>{t('price_awaiting_branch_eval')}</span>
                            </span>
                          </div>
                        ) : (
                          <div className="text-end">
                            <div className="text-[10px] text-emerald-700 font-bold uppercase flex items-center gap-1 justify-end">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>{t('price_set_notice')}</span>
                            </div>
                            <span className="text-xs font-mono font-black text-slate-900">
                              {shipment.financials.totalAmount.toLocaleString()} AFN ({shipment.financials.paymentStatus === 'to_pay' ? 'COD' : shipment.financials.paymentStatus.toUpperCase()})
                            </span>
                          </div>
                        )}
                        <button
                          onClick={() => setSelectedShipmentForReceipt(shipment)}
                          className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-red-500 hover:text-red-600 text-slate-700 text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer transition-colors"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Receipt</span>
                        </button>
                      </div>
                    </div>

                    {/* Route & Cargo details */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1 border-t border-slate-200">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">Route</span>
                        <div className="font-bold text-slate-900 mt-0.5 flex items-center gap-1.5">
                          <span>{originBr?.city || 'Origin'}</span>
                          <ArrowRight className="w-3 h-3 text-slate-400" />
                          <span>{destBr?.city || 'Destination'}</span>
                        </div>
                        <div className="text-[11px] text-slate-500">Receiver: {shipment.receiver.name} ({shipment.receiver.phone})</div>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">Cargo Specs</span>
                        <div className="font-bold text-slate-900 mt-0.5">
                          {shipment.packageInfo.category} • {shipment.packageInfo.weightKg} KG • {shipment.packageInfo.pieces} pcs
                        </div>
                        <div className="text-[11px] text-slate-500">{shipment.packageInfo.description || 'Standard Consignment'}</div>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">Latest Status / Branch Note</span>
                        <div className="font-bold text-slate-900 mt-0.5 text-[11px] leading-tight">
                          {shipment.statusHistory[shipment.statusHistory.length - 1]?.note || 'In system'}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-1">
                          {new Date(shipment.bookedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    {isPrebookedAwaitingPrice && (
                      <div className="p-2.5 rounded-xl bg-amber-50/90 border border-amber-200 text-amber-800 text-[11px] flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>Please drop off parcel at <strong>{originBr?.name || 'Origin Branch'} ({originBr?.city})</strong> to complete scale inspection and have the official price added.</span>
                        </div>
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">Origin: {originBr?.code || 'ORIG'}</span>
                      </div>
                    )}

                    {!isPrebookedAwaitingPrice && shipment.isCustomerPrebooked && (
                      <div className="p-2.5 rounded-xl bg-emerald-50/90 border border-emerald-200 text-emerald-800 text-[11px] flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>Official freight verified by <strong>{originBr?.name || 'Origin Branch'}</strong>: Base {shipment.financials.baseRate} AFN + Weight {shipment.financials.weightCost} AFN + Service {shipment.financials.serviceFee} AFN = <strong>{shipment.financials.totalAmount} AFN</strong></span>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">{shipment.financials.paymentStatus.toUpperCase()}</span>
                      </div>
                    )}

                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

    </div>
  );
};
