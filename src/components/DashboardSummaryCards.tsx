import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  DollarSign, 
  Package, 
  Truck, 
  CheckCircle2, 
  Clock, 
  TrendingUp, 
  Building2, 
  RefreshCw, 
  ArrowUpRight, 
  Wallet,
  Receipt,
  Percent
} from 'lucide-react';
import { edgeApiFetch as fetch } from '../lib/supabase';
import { useApp } from '../context/AppContext';
import { Branch } from '../types';

interface AnalyticsApiResponse {
  success: boolean;
  summary: {
    consolidatedGrossFreight: number;
    consolidatedDestCommissions: number;
    consolidatedExpenses: number;
    consolidatedNetProfit: number;
    consolidatedMarginPercent: number;
  };
  branches: Array<{
    branchId: string;
    name: string;
    nameFa?: string;
    namePs?: string;
    code: string;
    city: string;
    province: string;
    grossFreight: number;
    destCodCollected: number;
    destCommission: number;
    expenses: number;
    netProfit: number;
    profitMarginPercent: number;
    dispatchedVolume: number;
    receivedVolume: number;
  }>;
}

export const DashboardSummaryCards: React.FC = () => {
  const { 
    t, 
    language, 
    currentUser, 
    branches, 
    shipments, 
    expenses, 
    analytics, 
    activeBranchId, 
    setActiveBranchId,
    setActiveView,
    showToast
  } = useApp();

  const isSuperAdmin = currentUser.role === 'super_admin';
  const effectiveBranchId = isSuperAdmin ? activeBranchId : currentUser.branchId;
  const isAllBranches = effectiveBranchId === 'all';

  const [apiData, setApiData] = useState<AnalyticsApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/analytics/revenue-overview');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setApiData(data);
          setLastRefreshed(new Date());
        }
      }
    } catch (err) {
      console.warn('Analytics API fetch fallback to local computed state:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics, shipments.length, expenses.length]);

  // Compute aggregated data with real-time reactive fallback
  const computedMetrics = useMemo(() => {
    // Shipments filtering
    const relevantShipments = isAllBranches 
      ? shipments 
      : shipments.filter(s => s.originBranchId === effectiveBranchId || s.destinationBranchId === effectiveBranchId || s.currentBranchId === effectiveBranchId);

    const relevantExpenses = isAllBranches
      ? expenses
      : expenses.filter(e => e.branchId === effectiveBranchId);

    // Revenue calculations
    let totalRevenue = 0;
    let totalPaid = 0;
    let totalPendingCod = 0;
    let totalBranchCommission = 0;
    let pendingCount = 0;
    let inTransitCount = 0;
    let deliveredCount = 0;
    let prebookedCount = 0;

    relevantShipments.forEach(s => {
      const amount = s.financials?.totalAmount || s.financials?.productPrice || 0;
      totalRevenue += amount;

      if (s.financials?.paymentStatus === 'paid') {
        totalPaid += (s.financials.amountPaid || amount);
      } else {
        totalPendingCod += (s.financials?.amountDue || amount);
      }

      // Branch commissions
      const comm = s.destBranchCommission || s.financials?.destBranchCommission || 0;
      totalBranchCommission += comm;

      // Status aggregation
      if (s.status === 'pre_booked' || s.status === 'verified') {
        prebookedCount++;
        pendingCount++;
      } else if (s.status === 'booked' || s.status === 'in_transit' || s.status === 'received_at_branch' || s.status === 'out_for_delivery') {
        inTransitCount++;
        pendingCount++;
      } else if (s.status === 'delivered') {
        deliveredCount++;
      }
    });

    const totalExpenseAmount = relevantExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    // If API data is available and viewing all branches, blend high-fidelity DB values
    if (apiData && isAllBranches) {
      totalRevenue = apiData.summary.consolidatedGrossFreight || totalRevenue;
      totalBranchCommission = apiData.summary.consolidatedDestCommissions || totalBranchCommission;
    } else if (apiData && !isAllBranches) {
      const branchEntry = apiData.branches?.find(b => b.branchId === effectiveBranchId);
      if (branchEntry) {
        totalRevenue = branchEntry.grossFreight || totalRevenue;
        totalBranchCommission = branchEntry.destCommission || totalBranchCommission;
      }
    }

    const netOperatingProfit = totalRevenue - totalExpenseAmount;
    const profitMargin = totalRevenue > 0 ? (netOperatingProfit / totalRevenue) * 100 : 0;
    const collectionRate = totalRevenue > 0 ? Math.round((totalPaid / totalRevenue) * 100) : 0;

    return {
      totalRevenue,
      totalPaid,
      totalPendingCod,
      collectionRate,
      pendingCount,
      prebookedCount,
      inTransitCount,
      deliveredCount,
      totalBranchCommission,
      totalExpenseAmount,
      netOperatingProfit,
      profitMargin,
      totalParcelsCount: relevantShipments.length
    };
  }, [shipments, expenses, apiData, isAllBranches, effectiveBranchId]);

  const handleRefresh = async () => {
    await fetchAnalytics();
    showToast('✓ Analytics summary updated with latest database state', 'info', 'Analytics Refreshed');
  };

  return (
    <div className="space-y-3 mb-6" id="dashboard-summary-cards-section">
      
      {/* Top Header Bar for Analytics */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <h2 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
            <span>{t('analytics_overview') || 'Consolidated Network Performance'}</span>
            <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400 font-mono">
              ({isAllBranches ? t('all_branches') : branches.find(b => b.id === effectiveBranchId)?.name || 'Branch'})
            </span>
          </h2>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            Updated: {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
          
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5 font-semibold text-xs shadow-2xs cursor-pointer"
            title="Refresh analytics data"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isLoading ? 'animate-spin text-red-600' : ''}`} />
            <span>{isLoading ? 'Syncing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Grid of 4 Key Aggregated Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Total Revenue & Freight */}
        <div 
          onClick={() => setActiveView('reports')}
          className="group relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-xs hover:shadow-md transition-all cursor-pointer"
          id="summary-card-total-revenue"
        >
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {t('total_revenue') || 'Total Revenue'}
              </span>
              <div className="text-2xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
                {computedMetrics.totalRevenue.toLocaleString()} <span className="text-sm font-bold text-slate-500">AFN</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{computedMetrics.collectionRate}% Paid</span>
            </div>
            <span className="text-slate-400 font-mono text-[11px]">
              COD Due: {computedMetrics.totalPendingCod.toLocaleString()} AFN
            </span>
          </div>
        </div>

        {/* Card 2: Pending & In-Transit Shipments */}
        <div 
          onClick={() => setActiveView('parcels')}
          className="group relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-xs hover:shadow-md transition-all cursor-pointer"
          id="summary-card-pending-shipments"
        >
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {t('pending_shipments') || 'Active & Pending Cargo'}
              </span>
              <div className="text-2xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
                {computedMetrics.pendingCount} <span className="text-sm font-bold text-slate-500">Parcels</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
              <Truck className="w-3.5 h-3.5" />
              {computedMetrics.inTransitCount} In-Transit
            </span>
            <span className="text-purple-600 dark:text-purple-400 font-semibold font-mono text-[11px]">
              {computedMetrics.prebookedCount} Pre-Booked
            </span>
          </div>
        </div>

        {/* Card 3: Branch Commission Totals */}
        <div 
          onClick={() => setActiveView('remittances')}
          className="group relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-xs hover:shadow-md transition-all cursor-pointer"
          id="summary-card-branch-commissions"
        >
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {t('branch_commissions') || 'Branch Commission Totals'}
              </span>
              <div className="text-2xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
                {computedMetrics.totalBranchCommission.toLocaleString()} <span className="text-sm font-bold text-slate-500">AFN</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1">
              <Wallet className="w-3.5 h-3.5" />
              Dest. Commissions
            </span>
            <span className="text-slate-400 text-[11px] font-mono flex items-center gap-0.5 group-hover:text-blue-600 transition-colors">
              Remittances <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Card 4: Delivered Parcels & Net Operating P&L */}
        <div 
          onClick={() => setActiveView('expenses')}
          className="group relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-xs hover:shadow-md transition-all cursor-pointer"
          id="summary-card-delivered-pnl"
        >
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-rose-500 to-red-500" />
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {t('delivered_parcels') || 'Delivered & Net Profit'}
              </span>
              <div className="text-2xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
                {computedMetrics.deliveredCount} <span className="text-sm font-bold text-emerald-600">Delivered</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
            <span className={`font-bold flex items-center gap-1 ${
              computedMetrics.netOperatingProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`}>
              <Percent className="w-3.5 h-3.5" />
              Margin: {Math.round(computedMetrics.profitMargin)}%
            </span>
            <span className="text-slate-400 font-mono text-[11px]">
              Exp: {computedMetrics.totalExpenseAmount.toLocaleString()} AFN
            </span>
          </div>
        </div>

      </div>
    </div>
  );
};
