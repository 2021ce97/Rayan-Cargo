import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Package, 
  Truck, 
  MapPin, 
  CheckCircle2, 
  Clock, 
  Printer, 
  User, 
  Phone, 
  ShieldAlert, 
  ArrowRight, 
  Calendar, 
  FileText,
  Building2,
  Share2,
  Check,
  AlertCircle,
  Download
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { BarcodeGenerator, QRCodeVisual } from './BarcodeGenerator';
import { ShipmentStatus } from '../types';

export const TrackingPortal: React.FC = () => {
  const { 
    t, 
    trackedShipment, 
    trackByCnNumber, 
    branches, 
    setSelectedShipmentForReceipt,
    shipments
  } = useApp();

  const [inputCn, setInputCn] = useState(trackedShipment ? trackedShipment.cnNumber : '');
  const [searched, setSearched] = useState(!!trackedShipment);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (trackedShipment) {
      setInputCn(trackedShipment.cnNumber);
      setSearched(true);
      setNotFound(false);
    }
  }, [trackedShipment]);

  const handleSearch = (cnToSearch?: string) => {
    const target = (cnToSearch || inputCn).trim();
    if (!target) return;

    const result = trackByCnNumber(target);
    setSearched(true);
    if (!result) {
      setNotFound(true);
    } else {
      setNotFound(false);
      setInputCn(result.cnNumber);
    }
  };

  const getStatusColor = (status: ShipmentStatus) => {
    switch (status) {
      case 'delivered': return 'bg-emerald-500 text-white';
      case 'out_for_delivery': return 'bg-amber-500 text-white';
      case 'received_at_branch': return 'bg-blue-500 text-white';
      case 'in_transit': return 'bg-indigo-500 text-white';
      case 'booked': return 'bg-slate-600 text-white';
      case 'returned': return 'bg-rose-500 text-white';
      case 'cancelled': return 'bg-red-700 text-white';
      default: return 'bg-slate-500 text-white';
    }
  };

  const stages: { key: ShipmentStatus; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: 'booked', label: t('status_booked'), icon: FileText },
    { key: 'in_transit', label: t('status_in_transit'), icon: Truck },
    { key: 'received_at_branch', label: t('status_received_at_branch'), icon: Building2 },
    { key: 'out_for_delivery', label: t('status_out_for_delivery'), icon: Package },
    { key: 'delivered', label: t('status_delivered'), icon: CheckCircle2 }
  ];

  const getStageIndex = (status: ShipmentStatus) => {
    switch (status) {
      case 'booked': return 0;
      case 'in_transit': return 1;
      case 'received_at_branch': return 2;
      case 'out_for_delivery': return 3;
      case 'delivered': return 4;
      default: return 0;
    }
  };

  const originBranch = trackedShipment ? branches.find(b => b.id === trackedShipment.originBranchId) : null;
  const destBranch = trackedShipment ? branches.find(b => b.id === trackedShipment.destinationBranchId) : null;
  const currentStageIndex = trackedShipment ? getStageIndex(trackedShipment.status) : 0;

  const copyShareLink = () => {
    if (!trackedShipment) return;
    navigator.clipboard.writeText(`${window.location.origin}?track=${trackedShipment.cnNumber}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      
      {/* DHS Inspired Hero Search Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-red-700 via-red-600 to-amber-600 text-white shadow-xl shadow-red-700/20">
        
        {/* Background Decorative Pattern & Glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/20 via-transparent to-black/30 pointer-events-none" />
        <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-amber-400/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 p-6 sm:p-10 max-w-3xl">
          
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold uppercase tracking-wider mb-4">
            <span className="w-2 h-2 rounded-full bg-amber-300 animate-ping" />
            <span>Armaghan Sadeq Transfers • خدمات انتقالات ارمغان صادق</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight mb-2">
            {t('tracking_banner_title')}
          </h1>
          <p className="text-sm sm:text-base text-red-100 mb-6 max-w-xl font-normal leading-relaxed">
            {t('tracking_banner_subtitle')}
          </p>

          {/* Search Box matching the DHS screenshot */}
          <div className="bg-white/10 backdrop-blur-md p-2 rounded-2xl border border-white/30 shadow-2xl">
            <form 
              onSubmit={(e) => { e.preventDefault(); handleSearch(); }}
              className="flex flex-col sm:flex-row gap-2"
            >
              <div className="relative flex-1">
                <div className="absolute inset-y-0 start-0 flex items-center ps-3.5 pointer-events-none text-slate-400">
                  <Search className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  value={inputCn}
                  onChange={(e) => setInputCn(e.target.value)}
                  placeholder={t('enter_cn_placeholder')}
                  className="w-full h-12 ps-11 pe-4 bg-white text-slate-900 placeholder-slate-400 font-mono text-sm sm:text-base rounded-xl font-semibold focus:outline-none focus:ring-4 focus:ring-amber-400 transition-all shadow-inner"
                />
              </div>
              <button
                type="submit"
                className="h-12 px-8 bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-slate-950 font-extrabold rounded-xl transition-all shadow-lg shadow-amber-500/30 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{t('track_btn')}</span>
                <ArrowRight className="w-4 h-4 rtl:rotate-180" />
              </button>
            </form>
          </div>

          {/* Quick Demo CN Numbers */}
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-red-100 font-medium">{t('quick_track')}:</span>
            {shipments.slice(0, 4).map(s => (
              <button
                key={s.id}
                onClick={() => {
                  setInputCn(s.cnNumber);
                  handleSearch(s.cnNumber);
                }}
                className="px-2.5 py-1 rounded-md bg-white/20 hover:bg-white/30 text-white font-mono text-[11px] font-semibold transition-colors"
              >
                {s.cnNumber} ({s.receiver.city})
              </button>
            ))}
          </div>

        </div>
      </div>

      {/* Search Not Found State */}
      {searched && notFound && (
        <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-3 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            {t('no_parcel_found_msg')} "{inputCn}"
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            {t('verify_cn_prompt')}
          </p>
        </div>
      )}

      {/* Active Shipment Tracking Details */}
      {trackedShipment && (
        <div className="space-y-6">
          
          {/* Tracking Summary Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-6">
            
            {/* Top Bar with CN, Status and Actions */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-wider">
                    {trackedShipment.cnNumber}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${getStatusColor(trackedShipment.status)}`}>
                    {t(`status_${trackedShipment.status}`)}
                  </span>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-3">
                  <span>{t('booked_on')}: {new Date(trackedShipment.bookedAt).toLocaleDateString()}</span>
                  <span>•</span>
                  <span>{t('service_type')}: <strong className="text-slate-700 dark:text-slate-300">{t(`srv_${trackedShipment.packageInfo.serviceType}`)}</strong></span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={copyShareLink}
                  className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Share tracking link"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4 text-slate-500" />}
                  <span>{copied ? t('copied_btn') : t('copy_btn')}</span>
                </button>

                <button
                  onClick={() => setSelectedShipmentForReceipt(trackedShipment)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Download Official Waybill PDF"
                >
                  <Download className="w-4 h-4" />
                  <span>{t('btn_download_pdf')}</span>
                </button>

                <button
                  onClick={() => setSelectedShipmentForReceipt(trackedShipment)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Print Waybill Receipt"
                >
                  <Printer className="w-4 h-4" />
                  <span>{t('btn_print_receipt')}</span>
                </button>
              </div>
            </div>

            {/* Visual Tracking Progress Milestones */}
            <div className="py-4">
              <div className="relative">
                {/* Connecting Line */}
                <div className="absolute top-5 start-6 end-6 h-1 bg-slate-200 dark:bg-slate-800 -z-0" />
                <div 
                  className="absolute top-5 start-6 h-1 bg-red-600 transition-all duration-700 -z-0" 
                  style={{ width: `${(currentStageIndex / (stages.length - 1)) * 100}%` }}
                />

                <div className="grid grid-cols-5 gap-2 relative z-10">
                  {stages.map((stage, idx) => {
                    const isCompleted = idx <= currentStageIndex;
                    const isCurrent = idx === currentStageIndex;
                    const Icon = stage.icon;

                    return (
                      <div key={stage.key} className="flex flex-col items-center text-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                          isCompleted
                            ? isCurrent
                              ? 'bg-red-600 text-white ring-4 ring-red-100 dark:ring-red-950 scale-110 shadow-md'
                              : 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700'
                        }`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className={`text-[11px] sm:text-xs mt-2 font-bold leading-tight ${
                          isCompleted ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500'
                        }`}>
                          {stage.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Route & Hubs Bar */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
              
              {/* Origin */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">{t('sender_info')}</span>
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {trackedShipment.sender.name}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {originBranch ? originBranch.name : trackedShipment.sender.city} ({trackedShipment.sender.province})
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5 font-mono">
                    <Phone className="w-3 h-3 text-slate-400" />
                    {trackedShipment.sender.phone}
                  </div>
                </div>
              </div>

              {/* Destination */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">{t('receiver_info')}</span>
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {trackedShipment.receiver.name}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {destBranch ? destBranch.name : trackedShipment.receiver.city} ({trackedShipment.receiver.province})
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5 font-mono">
                    <Phone className="w-3 h-3 text-slate-400" />
                    {trackedShipment.receiver.phone}
                  </div>
                </div>
              </div>

            </div>

          </div>

          {/* Detailed Cargo Information & History Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Col: Package Details & Barcode */}
            <div className="space-y-6">
              
              {/* Package Specs */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-sm">
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Package className="w-4 h-4 text-red-600" />
                  <span>{t('parcel_details')}</span>
                </h4>

                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500">{t('parcel_category')}:</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{t(`cat_${trackedShipment.packageInfo.category}`)}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500">{t('weight_kg')}:</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">{trackedShipment.packageInfo.weightKg} KG</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500">{t('pieces_count')}:</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{trackedShipment.packageInfo.pieces} {t('pcs_unit')}</span>
                  </div>
                  {trackedShipment.packageInfo.dimensions && (
                    <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500">{t('dimensions')}:</span>
                      <span className="font-mono text-slate-900 dark:text-slate-100">{trackedShipment.packageInfo.dimensions}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500">{t('declared_value')}:</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{trackedShipment.packageInfo.declaredValueAfn.toLocaleString()} AFN</span>
                  </div>
                  <div className="py-1.5">
                    <span className="text-slate-500 block mb-1">{t('description')}:</span>
                    <p className="text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg">
                      {trackedShipment.packageInfo.description}
                    </p>
                  </div>
                </div>

                {/* Scannable Barcode & QR code */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col items-center">
                  <BarcodeGenerator value={trackedShipment.cnNumber} className="text-slate-900 dark:text-slate-100" />
                </div>
              </div>

              {/* Billing Summary */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-3 shadow-sm">
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {t('billing_details')}
                </h4>
                <div className="space-y-2 text-xs">
                  {trackedShipment.status === 'pre_booked' || trackedShipment.financials.totalAmount === 0 ? (
                    <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-300 space-y-1.5">
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        <span>{t('price_pending_branch_weighing')}</span>
                      </div>
                      <p className="text-[11px] text-amber-700 dark:text-amber-400">
                        {t('origin_drop_prompt')}
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between">
                        <span className="text-slate-500">{t('net_total')}:</span>
                        <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                          {trackedShipment.financials.totalAmount.toLocaleString()} {t('currency_symbol')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">{t('payment_status')}:</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          trackedShipment.financials.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {t(`pay_${trackedShipment.financials.paymentStatus}`)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">{t('payment_method')}:</span>
                        <span className="font-semibold uppercase text-slate-700 dark:text-slate-300">
                          {trackedShipment.financials.paymentMethod}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

            </div>

            {/* Right Col (2 spans): Milestone History Timeline */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-6 shadow-sm">
              <div className="flex items-center justify-between">
                <h4 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-red-600" />
                  <span>{t('timeline_title')}</span>
                </h4>
                <span className="text-xs text-slate-400 font-mono">
                  {trackedShipment.statusHistory.length} {t('operational_expense_entries') || 'Records'}
                </span>
              </div>

              {/* Timeline Items */}
              <div className="relative ps-6 space-y-6 before:absolute before:inset-0 before:left-2.5 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                {trackedShipment.statusHistory.slice().reverse().map((item, idx) => (
                  <div key={item.id || idx} className="relative group">
                    
                    {/* Milestone Pin */}
                    <div className={`absolute -left-6 top-1 w-5 h-5 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center ${
                      idx === 0 ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'
                    }`}>
                      <Check className="w-3 h-3" />
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 space-y-1.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
                          {t(`status_${item.status}`)}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {new Date(item.timestamp).toLocaleString()}
                        </span>
                      </div>

                      <div className="text-xs text-red-600 dark:text-red-400 font-medium flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        <span>{item.location} ({item.branchName})</span>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        {item.note}
                      </p>

                      {item.driverName && (
                        <div className="pt-2 mt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-[11px] text-slate-500">
                          <span>{t('driver_assigned')}: <strong>{item.driverName}</strong></span>
                          {item.driverPhone && <span>{t('phone')}: {item.driverPhone}</span>}
                        </div>
                      )}

                      <div className="text-[10px] text-slate-400 pt-1">
                        {t('booked_by_officer')}: {item.updatedBy}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Proof of Delivery (if delivered) */}
              {trackedShipment.status === 'delivered' && (
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>{t('proof_of_delivery')}</span>
                  </div>
                  <div className="text-xs text-emerald-900 dark:text-emerald-200">
                    <div>{t('signed_by')}: <strong>{trackedShipment.podSignature || trackedShipment.receiver.name}</strong></div>
                    {trackedShipment.receiverIdProof && <div>{t('receiver_tazkira_label')}: {trackedShipment.receiverIdProof}</div>}
                    {trackedShipment.actualDelivery && <div>{t('status_delivered')}: {new Date(trackedShipment.actualDelivery).toLocaleString()}</div>}
                  </div>
                </div>
              )}

            </div>

          </div>

        </div>
      )}

    </div>
  );
};
