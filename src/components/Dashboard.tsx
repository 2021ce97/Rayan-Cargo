import React, { useMemo } from 'react';
import { 
  DollarSign, 
  Package, 
  Truck, 
  CheckCircle2, 
  Clock, 
  Building2, 
  Plus, 
  Search, 
  ArrowRight,
  ShieldCheck,
  Boxes
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar,
  XAxis,
  YAxis,
  Tooltip
} from 'recharts';
import { Branch } from '../types';

export const Dashboard: React.FC = () => {
  const { 
    t, 
    language,
    analytics, 
    filteredShipments, 
    branches, 
    users,
    shipments,
    activeBranchId, 
    setActiveBranchId,
    currentUser,
    setActiveView, 
    setSelectedShipmentForReceipt
  } = useApp();

  const isSuperAdmin = currentUser.role === 'super_admin';
  const mainBranch = branches.find(b => b.isHeadOffice) || branches[0];
  const currentBranchObj = branches.find(b => b.id === (isSuperAdmin ? activeBranchId : currentUser.branchId));

  // Branch revenue & operations matrix for Admin
  const branchMatrix = useMemo(() => {
    return branches.map(b => {
      const bOriginShipments = shipments.filter(s => s.originBranchId === b.id);
      const bDestShipments = shipments.filter(s => s.destinationBranchId === b.id);
      const grossRevenue = bOriginShipments.reduce((sum, s) => sum + s.financials.totalAmount, 0);
      const dispatched = bOriginShipments.length;
      const received = bDestShipments.length;
      return {
        ...b,
        grossRevenue,
        dispatched,
        received
      };
    });
  }, [branches, shipments]);

  const getLocalizedBranchName = (b: Branch | undefined) => {
    if (!b) return t('all_branches');
    if (language === 'fa' && b.nameFa) return b.nameFa;
    if (language === 'ps' && b.namePs) return b.namePs;
    return b.name;
  };

  const getLocalizedStatusName = (status: string) => {
    switch (status) {
      case 'booked': return t('status_booked');
      case 'in_transit': return t('status_in_transit');
      case 'received_at_branch': return t('status_received_at_branch');
      case 'out_for_delivery': return t('status_out_for_delivery');
      case 'delivered': return t('status_delivered');
      case 'returned': return t('status_returned');
      case 'cancelled': return t('status_cancelled');
      default: return status;
    }
  };

  // Status Distribution Pie Data
  const statusPieData = [
    { name: t('status_delivered'), value: Math.max(1, analytics.deliveredParcels), color: '#10b981' },
    { name: t('status_in_transit'), value: Math.max(1, analytics.inProgressParcels), color: '#6366f1' },
    { name: t('status_received_at_branch'), value: Math.max(1, analytics.receivedParcels), color: '#3b82f6' },
    { name: t('status_booked'), value: Math.max(1, Math.max(0, analytics.totalParcels - analytics.deliveredParcels - analytics.inProgressParcels - analytics.receivedParcels)), color: '#f59e0b' }
  ];

  // Hub Volume distribution
  const branchBarData = branches.map(b => {
    const outbound = filteredShipments.filter(s => s.originBranchId === b.id).length;
    const inbound = filteredShipments.filter(s => s.destinationBranchId === b.id).length;
    const name = getLocalizedBranchName(b).split(' ')[0];
    return {
      name: name || b.code,
      outbound: outbound || 0,
      inbound: inbound || 0
    };
  });

  return (
    <div className="space-y-6 pb-12 font-sans" id="dashboard-root">
      
      {/* Welcome Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-6 rounded-2xl bg-white border border-slate-200 shadow-xs" id="dashboard-banner">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-red-600 uppercase tracking-wider mb-1">
            <span className={`w-2 h-2 rounded-full ${branches.length > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            <span>{branches.length} {t('online_terminals_badge')}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {isSuperAdmin 
              ? t('network_command_hq')
              : `${getLocalizedBranchName(currentBranchObj)} - ${t('branch_operations_terminal')}`}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isSuperAdmin
              ? t('hq_welcome_desc')
              : `${t('branch_welcome_desc')} (${currentBranchObj?.city || 'Terminal'}, ${currentBranchObj?.province || 'Regional'})`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isSuperAdmin && mainBranch && (
            <button
              onClick={() => {
                setActiveBranchId(mainBranch.id);
                setActiveView('booking');
              }}
              className="px-4 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-xl text-xs font-bold shadow-md shadow-red-600/20 flex items-center gap-2 transition-all transform active:scale-98 cursor-pointer"
              title={t('admin_office_dispatch_desc')}
            >
              <Building2 className="w-4 h-4 text-amber-300" />
              <span>{t('send_from_admin_office', 'Send from Admin Office')}</span>
            </button>
          )}
          {branches.length >= 2 ? (
            <button
              onClick={() => setActiveView('booking')}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-2 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{t('new_consignment_btn')}</span>
            </button>
          ) : (
            <button
              onClick={() => setActiveView('branches')}
              className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md shadow-red-600/20 flex items-center gap-2 transition-all cursor-pointer"
            >
              <Building2 className="w-4 h-4" />
              <span>{t('btn_add_branch') || 'Add First Branch'}</span>
            </button>
          )}
          <button
            onClick={() => setActiveView('tracking')}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold border border-slate-200 flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Search className="w-4 h-4 text-slate-500" />
            <span>{t('quick_track')}</span>
          </button>
        </div>
      </div>

      {/* Clean Slate Notice when branches are empty */}
      {branches.length === 0 && (
        <div className="p-6 rounded-2xl bg-gradient-to-r from-red-50 to-amber-50 border border-red-200 text-slate-800 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center font-bold shrink-0 shadow-md shadow-red-600/20">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">
                {t('fresh_system_ready')}
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                {t('fresh_system_desc')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={() => setActiveView('branches')}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{t('configure_branches_btn')}</span>
            </button>
          </div>
        </div>
      )}


      {/* Admin Privacy & Ownership Banner */}
      {isSuperAdmin && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 text-white text-xs flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <span className="font-extrabold text-amber-300">
                {t('admin_owner_revenue_overview', 'Business Revenue (Owner Overview)')}:
              </span>{' '}
              <span className="text-slate-300">
                Full network visibility enabled. Individual provincial branch managers can only view their own branch data.
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {mainBranch && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                👑 {t('admin_main_office_badge', 'Main Branch (Admin HQ)')}
              </span>
            )}
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white/10 text-slate-200 border border-white/20">
              {branches.length} {t('active_terminals_status')}
            </span>
          </div>
        </div>
      )}

      {/* Core Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric 1: Financials */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {isSuperAdmin ? t('admin_owner_revenue_overview', 'Business Revenue') : t('metric_total_revenue')}
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 font-mono">
              {`${analytics.totalRevenue.toLocaleString()} ${t('currency_symbol')}`}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {isSuperAdmin 
                ? (activeBranchId === 'all' ? `${branches.length} ${t('all_branches')} (Consolidated HQ)` : `${getLocalizedBranchName(currentBranchObj)}`)
                : `${getLocalizedBranchName(currentBranchObj)} (${t('branch_isolated_revenue_badge', 'Isolated')})`}
            </p>
          </div>
        </div>

        {/* Metric 2: Volume / Dispatched */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {isSuperAdmin ? t('metric_total_bookings') : t('inv_tab_outbound')}
            </span>
            <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
              <Boxes className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 font-mono">
              {isSuperAdmin ? analytics.totalParcels : filteredShipments.filter(s => s.originBranchId === currentUser.branchId).length}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {isSuperAdmin ? `${branches.length} ${t('all_branches')}` : `Dispatched from ${getLocalizedBranchName(currentBranchObj)}`}
            </p>
          </div>
        </div>

        {/* Metric 3: Active in Transit */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {t('active_in_transit_metric')}
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Truck className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 font-mono">
              {analytics.inProgressParcels}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {t('afghan_highway_fleet')}
            </p>
          </div>
        </div>

        {/* Metric 4: Branch Terminals for Admin / Warehouse for Branch Manager */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {isSuperAdmin ? t('nav_branches') : t('received_at_hub_metric')}
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              {isSuperAdmin ? <Building2 className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 font-mono">
              {isSuperAdmin ? `${branches.length}` : analytics.receivedParcels}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {isSuperAdmin ? t('online_terminals_badge') : t('inv_tab_warehouse')}
            </p>
          </div>
        </div>

      </div>

      {/* Visual Charts & Network Balance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Hub Volume Bar Chart (2 Cols) */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                {t('chart_branch_volume')}
              </h2>
              <p className="text-xs text-slate-500">
                {t('chart_revenue_trends')}
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-semibold">
              <span className="flex items-center gap-1 text-red-600">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600" /> {t('inv_tab_outbound')}
              </span>
              <span className="flex items-center gap-1 text-blue-600">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600" /> {t('inv_tab_inbound')}
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={branchBarData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', fontSize: '12px' }}
                />
                <Bar dataKey="outbound" fill="#dc2626" radius={[4, 4, 0, 0]} />
                <Bar dataKey="inbound" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Milestone Distribution Pie Chart (1 Col) */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
          <div className="pb-2 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900">
              {t('chart_status_distribution')}
            </h2>
            <p className="text-xs text-slate-500">
              {t('milestone_timeline')}
            </p>
          </div>

          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {statusPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-1.5 text-xs">
            {statusPieData.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-slate-700">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span>{item.name}</span>
                </div>
                <span className="font-mono font-bold">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Recent Cargo Consignments Table */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              {t('recent_shipments')}
            </h2>
            <p className="text-xs text-slate-500">
              {t('afghan_highway_fleet')}
            </p>
          </div>
          <button
            onClick={() => setActiveView('parcels')}
            className="text-xs font-bold text-red-600 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>{t('view_all')} ({filteredShipments.length})</span>
            <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-bold bg-slate-50">
                <th className="p-3 text-start">{t('col_cn_number')}</th>
                <th className="p-3 text-start">{t('col_route')}</th>
                <th className="p-3 text-start">{t('col_sender')}</th>
                <th className="p-3 text-start">{t('col_receiver')}</th>
                <th className="p-3 text-center">{t('weight_kg')}</th>
                <th className="p-3 text-center">{t('col_status')}</th>
                <th className="p-3 text-end">{t('col_actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredShipments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 font-medium">
                    <Package className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="text-xs text-slate-500">{t('no_shipments_registered')}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{t('system_ready_booking')}</p>
                  </td>
                </tr>
              ) : (
                filteredShipments.slice(0, 5).map((s) => {
                  const orig = branches.find(b => b.id === s.originBranchId);
                  const dest = branches.find(b => b.id === s.destinationBranchId);

                  return (
                    <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-mono font-bold text-red-600">
                        {s.cnNumber}
                      </td>
                      <td className="p-3 font-medium text-slate-900">
                        {getLocalizedBranchName(orig) || s.sender.city} ➔ {getLocalizedBranchName(dest) || s.receiver.city}
                      </td>
                      <td className="p-3 text-slate-800 font-medium">
                        {s.sender.name}
                      </td>
                      <td className="p-3 text-slate-800 font-medium">
                        {s.receiver.name}
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-slate-800">
                        {s.packageInfo.weightKg} KG
                      </td>
                      <td className="p-3 text-center">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                          {getLocalizedStatusName(s.status)}
                        </span>
                      </td>
                      <td className="p-3 text-end">
                        <button
                          onClick={() => setSelectedShipmentForReceipt(s)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                        >
                          {t('btn_print_receipt')}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Super Admin: Branch Revenue & Operations Performance Matrix */}
      {isSuperAdmin && (
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-red-600" />
                <h2 className="text-base font-bold text-slate-900">
                  {t('branch_performance_owner_title', 'Branch Revenue & Operations Matrix')}
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {t('branch_performance_owner_subtitle', 'Complete financial and parcel volume breakdown per provincial branch terminal')}
              </p>
            </div>
            <span className="text-xs font-extrabold px-3 py-1 rounded-xl bg-amber-50 text-amber-800 border border-amber-200">
              👑 {t('admin_owner_revenue_overview', 'Owner Access')}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-bold bg-slate-50">
                  <th className="p-3 text-start">{t('nav_branches', 'Branch Terminal')}</th>
                  <th className="p-3 text-start">{t('city_province', 'Location')}</th>
                  <th className="p-3 text-center">{t('inv_tab_outbound', 'Dispatched')}</th>
                  <th className="p-3 text-center">{t('inv_tab_inbound', 'Received')}</th>
                  <th className="p-3 text-end">{t('branch_total_revenue', 'Gross Revenue (AFN)')}</th>
                  <th className="p-3 text-end">{t('col_actions', 'Quick Action')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {branchMatrix.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{b.isHeadOffice ? '👑' : '🏢'}</span>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span>{getLocalizedBranchName(b)}</span>
                            {b.isHeadOffice && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold border border-amber-300">
                                {t('admin_main_office_badge', 'Main Branch (Admin HQ)')}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">{b.code}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-slate-600">
                      <div>{b.city}</div>
                      <div className="text-[10px] text-slate-400">{b.province}</div>
                    </td>
                    <td className="p-3 text-center font-mono font-bold text-slate-800">
                      <span className="px-2 py-0.5 rounded bg-red-50 text-red-700">
                        {b.dispatched}
                      </span>
                    </td>
                    <td className="p-3 text-center font-mono font-bold text-slate-800">
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                        {b.received}
                      </span>
                    </td>
                    <td className="p-3 text-end font-mono font-black text-emerald-700 text-sm">
                      {b.grossRevenue.toLocaleString()} AFN
                    </td>
                    <td className="p-3 text-end">
                      <button
                        onClick={() => {
                          setActiveBranchId(b.id);
                          setActiveView('booking');
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5 ms-auto ${
                          b.isHeadOffice
                            ? 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-red-600/20'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200'
                        }`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>
                          {b.isHeadOffice
                            ? t('send_from_admin_office', 'Send from Admin Office')
                            : t('btn_send_from_here', 'Dispatch from here')}
                        </span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};
