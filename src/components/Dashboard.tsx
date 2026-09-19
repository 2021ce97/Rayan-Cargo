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
  Boxes,
  Activity,
  UserCheck
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
import { DashboardSummaryCards } from './DashboardSummaryCards';

export const Dashboard: React.FC = () => {
  const { 
    t, 
    language,
    analytics, 
    filteredShipments, 
    branches, 
    users,
    shipments,
    expenses,
    activeBranchId, 
    setActiveBranchId,
    currentUser,
    setActiveView, 
    setSelectedShipmentForReceipt,
    trackByCnNumber
  } = useApp();

  const isSuperAdmin = currentUser.role === 'super_admin';
  const mainBranch = branches.find(b => b.isHeadOffice) || branches[0];
  const currentBranchObj = branches.find(b => b.id === (isSuperAdmin ? activeBranchId : currentUser.branchId));

  const getLocalizedBranchName = (b: any | undefined) => {
    if (!b) return t('all_branches');
    const cleanMap: Record<string, { en: string; fa: string; ps: string }> = {
      'br_admin_hq': { en: 'Kabul', fa: 'کابل', ps: 'کابل' },
      'br_mzk_02': { en: 'Mazar-i-Sharif', fa: 'مزار شریف', ps: 'مزار شریف' },
      'br_hrt_03': { en: 'Herat', fa: 'هرات', ps: 'هرات' },
      'br_kdh_04': { en: 'Kandahar', fa: 'کندهار', ps: 'کندهار' },
      'br_kho06_0281': { en: 'Khost', fa: 'خوست', ps: 'خوست' },
      'br_far01_8916': { en: 'Maymana', fa: 'میمنه', ps: 'میمنه' },
      'br_jaw08_6896': { en: 'Sheberghan', fa: 'شبرغان', ps: 'شبرغان' },
      'br_tak08_7293': { en: 'Taloqan', fa: 'تالقان', ps: 'تالقان' },
      'br_bad09_9209': { en: 'Faizabad', fa: 'فیض آباد', ps: 'فیض آباد' },
      'br_gzn12_8926': { en: 'Ghazni', fa: 'غزنی', ps: 'غزنی' },
      'br_nan014_3445': { en: 'Jalalabad', fa: 'جلال‌آباد', ps: 'جلال اباد' },
      'br_kun010_8767': { en: 'Kunduz', fa: 'کندز', ps: 'کندز' },
      'br_nim013_1433': { en: 'Nimroz', fa: 'نیمروز', ps: 'نیمروز' },
      'br_sar011_2621': { en: 'Sar-e Pol', fa: 'سرپل', ps: 'سرپل' }
    };
    if (b.id && cleanMap[b.id]) {
      const entry = cleanMap[b.id];
      if (language === 'fa') return entry.fa;
      if (language === 'ps') return entry.ps;
      return entry.en;
    }
    if (b.isHeadOffice || b.code === 'KBL-HQ' || b.id === 'br_admin_hq') {
      return (language === 'fa' || language === 'ps') ? 'کابل' : 'Kabul';
    }
    const rawName = (language === 'fa' && b.nameFa) ? b.nameFa : ((language === 'ps' && b.namePs) ? b.namePs : b.name);
    return (rawName || b.city || '').replace(/Armaghan Sadeq|Transfers sadeq|انتقالات ارمغان صادق|انتقالات صادق/gi, '').trim() || b.city;
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

  // Generate recent activity feed
  const recentActivity = useMemo(() => {
    const events: Array<{
      id: string;
      type: 'booking' | 'status' | 'expense';
      date: string;
      title: string;
      subtitle: string;
      user: string;
      iconType: 'package' | 'truck' | 'dollar';
    }> = [];

    shipments.forEach(s => {
      // Allow visibility filtering based on branch
      if (!isSuperAdmin && s.originBranchId !== currentUser.branchId && s.destinationBranchId !== currentUser.branchId && s.currentBranchId !== currentUser.branchId) return;

      events.push({
        id: `book-${s.id}`,
        type: 'booking',
        date: s.bookedAt || new Date().toISOString(),
        title: `New Booking: ${s.cnNumber}`,
        subtitle: `${s.sender?.city || ''} to ${s.receiver?.city || ''} (${s.packageInfo?.weightKg || 1}kg)`,
        user: s.bookedByUserName || 'System',
        iconType: 'package'
      });

      if (s.statusHistory && Array.isArray(s.statusHistory)) {
        s.statusHistory.forEach((h, idx) => {
          const itemDate = h.timestamp || (h as any).date || s.bookedAt;
          if (h.status === 'booked' && itemDate && new Date(itemDate).getTime() === new Date(s.bookedAt).getTime()) return;
          events.push({
            id: `hist-${s.id}-${idx}`,
            type: 'status',
            date: itemDate || new Date().toISOString(),
            title: `Status Updated: ${s.cnNumber}`,
            subtitle: `Changed to ${getLocalizedStatusName(h.status)} ${h.location ? `at ${h.location}` : ''}`,
            user: h.updatedBy || (h as any).updatedByUserName || 'System',
            iconType: 'truck'
          });
        });
      }
    });

    if (expenses && Array.isArray(expenses)) {
      expenses.forEach(e => {
        if (!isSuperAdmin && e.branchId !== currentUser.branchId) return;
        events.push({
          id: `exp-${e.id}`,
          type: 'expense',
          date: e.createdAt || e.expenseDate || new Date().toISOString(),
          title: `Expense Logged: ${e.category}`,
          subtitle: `Amount: ${(e.amount || 0).toLocaleString()} AFN - ${e.description || 'No description'}`,
          user: e.createdByName || (e as any).submittedByName || 'System',
          iconType: 'dollar'
        });
      });
    }

    return events.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()).slice(0, 10);
  }, [shipments, expenses, isSuperAdmin, currentUser.branchId]);

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

      {/* Recent Cargo Consignments Table (Full Width Focus) */}
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
                filteredShipments.slice(0, 10).map((s) => {
                  const orig = branches.find(b => b.id === s.originBranchId);
                  const dest = branches.find(b => b.id === s.destinationBranchId);

                  return (
                    <tr 
                      key={s.id} 
                      className="hover:bg-slate-50 transition-colors cursor-pointer"
                      onClick={() => {
                        trackByCnNumber(s.cnNumber);
                        setActiveView('tracking');
                      }}
                    >
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
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedShipmentForReceipt(s);
                          }}
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
