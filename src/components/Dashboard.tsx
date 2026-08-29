import React from 'react';
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
    activeBranchId, 
    currentUser,
    setActiveView, 
    setSelectedShipmentForReceipt
  } = useApp();

  const isSuperAdmin = currentUser.role === 'super_admin';
  const currentBranchObj = branches.find(b => b.id === (isSuperAdmin ? activeBranchId : currentUser.branchId));

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
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
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
              : `${t('branch_welcome_desc')} (${currentBranchObj?.city}, ${currentBranchObj?.province})`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveView('booking')}
            className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md shadow-red-600/20 flex items-center gap-2 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t('new_consignment_btn')}</span>
          </button>
          <button
            onClick={() => setActiveView('tracking')}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold border border-slate-200 flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Search className="w-4 h-4 text-slate-500" />
            <span>{t('quick_track')}</span>
          </button>
        </div>
      </div>

      {/* Admin Privacy Guarantee Banner (when logged in as admin) */}
      {isSuperAdmin && (
        <div className="p-4 rounded-2xl bg-slate-100 border border-slate-200 text-xs text-slate-700 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>
              <strong>{t('branch_revenue_privacy_enforced')}:</strong> {t('branch_ownership_notice')}
            </span>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white text-slate-700 border border-slate-300">
            {branches.length} {t('active_terminals_status')}
          </span>
        </div>
      )}

      {/* Core Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric 1: Financials for Branch / Network Volume for Admin */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {isSuperAdmin ? t('metric_total_bookings') : t('metric_total_revenue')}
            </span>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              isSuperAdmin ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
            }`}>
              {isSuperAdmin ? <Boxes className="w-5 h-5" /> : <DollarSign className="w-5 h-5" />}
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 font-mono">
              {isSuperAdmin ? analytics.totalParcels : `${analytics.totalRevenue.toLocaleString()} ${t('currency_symbol')}`}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {isSuperAdmin ? `${branches.length} ${t('all_branches')}` : `${getLocalizedBranchName(currentBranchObj)}`}
            </p>
          </div>
        </div>

        {/* Metric 2: Active in Transit */}
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

        {/* Metric 3: Delivered Consignments */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {t('delivered_metric')}
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 font-mono">
              {analytics.deliveredParcels}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {t('metric_delivered')}
            </p>
          </div>
        </div>

        {/* Metric 4: Branch Terminals */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {isSuperAdmin ? t('nav_branches') : t('received_at_hub_metric')}
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              {isSuperAdmin ? <Building2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 font-mono">
              {isSuperAdmin ? `${branches.length} ${t('nav_branches')}` : analytics.receivedParcels}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {isSuperAdmin ? branches.map(b => b.code).join(', ') : t('inv_tab_warehouse')}
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
              {filteredShipments.slice(0, 5).map((s) => {
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
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
