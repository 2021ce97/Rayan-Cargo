import React, { useState, useRef, useMemo } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Calendar, 
  Download, 
  Printer, 
  Building2, 
  Filter, 
  DollarSign, 
  Package, 
  Truck, 
  FileSpreadsheet,
  PieChart as PieIcon,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Loader2,
  FileCheck,
  Receipt,
  Banknote,
  MinusCircle,
  TrendingDown,
  Percent,
  Layers,
  ArrowDownRight,
  Scale,
  ShieldCheck,
  ArrowLeftRight
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { generateExecutiveReportPdf, printElementUsingIframe } from '../utils/pdfExport';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  LineChart, 
  Line, 
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Branch } from '../types';

export const AnalyticsReports: React.FC = () => {
  const { 
    t, 
    language,
    branches, 
    shipments, 
    filteredShipments, 
    activeBranchId, 
    currentUser, 
    expenses 
  } = useApp();

  const [activeTab, setActiveTab] = useState<'revenue_overview' | 'operations'>('revenue_overview');
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'year'>('month');
  const [selectedBranchId, setSelectedBranchId] = useState<string>(activeBranchId || 'all');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfSuccess, setPdfSuccess] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const pnlReportRef = useRef<HTMLDivElement>(null);

  const getLocalizedBranchName = (b: Branch | undefined) => {
    if (!b) return t('all_branches', 'All Branches');
    if (language === 'fa' && b.nameFa) return b.nameFa;
    if (language === 'ps' && b.namePs) return b.namePs;
    return b.name;
  };

  // Scope shipments based on selectedBranchId
  const scopedShipments = useMemo(() => {
    if (selectedBranchId === 'all') return shipments;
    return shipments.filter(s => s.originBranchId === selectedBranchId || s.destinationBranchId === selectedBranchId);
  }, [shipments, selectedBranchId]);

  // Scope expenses based on selectedBranchId
  const scopedExpenses = useMemo(() => {
    if (selectedBranchId === 'all') return expenses;
    return expenses.filter(e => e.branchId === selectedBranchId);
  }, [expenses, selectedBranchId]);

  // Financial calculations
  const totalGrossRevenue = scopedShipments.reduce((acc, curr) => acc + curr.financials.totalAmount, 0);
  const totalPaidAtOrigin = scopedShipments.reduce((acc, curr) => acc + curr.financials.amountPaid, 0);
  const totalCodDue = scopedShipments.reduce((acc, curr) => acc + curr.financials.amountDue, 0);
  const totalWeight = scopedShipments.reduce((acc, curr) => acc + curr.packageInfo.weightKg, 0);
  const deliveredCount = scopedShipments.filter(s => s.status === 'delivered').length;
  const inTransitCount = scopedShipments.filter(s => s.status === 'in_transit' || s.status === 'received_at_branch').length;

  // Destination commissions total
  const totalDestCommissions = scopedShipments.reduce((acc, curr) => {
    const comm = curr.destBranchCommission !== undefined ? curr.destBranchCommission : 100;
    return acc + comm;
  }, 0);

  // Total Operational Expenses
  const totalExpenseAmount = scopedExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Net Profitability
  const netProfit = totalGrossRevenue - totalExpenseAmount;
  const profitMarginPercent = totalGrossRevenue > 0 
    ? Math.round(((netProfit / totalGrossRevenue) * 100) * 10) / 10 
    : 0;

  // Expense breakdown by category
  const expenseCategoryBreakdown = useMemo(() => {
    const cats: Record<string, number> = {
      salary: 0,
      rent: 0,
      fuel_transport: 0,
      food: 0,
      utilities: 0,
      maintenance: 0,
      other: 0
    };
    scopedExpenses.forEach(e => {
      const catKey = (e.category === 'transport' ? 'fuel_transport' : e.category === 'food_tea' ? 'food' : e.category) || 'other';
      cats[catKey] = (cats[catKey] || 0) + e.amount;
    });
    return Object.keys(cats).map(k => ({
      name: k,
      amount: cats[k],
      label: k === 'salary' ? t('cat_salary', 'Salaries')
        : k === 'rent' ? t('cat_rent', 'Rent')
        : k === 'fuel_transport' ? t('cat_fuel_transport', 'Fuel & Tolls')
        : k === 'food' ? t('cat_food', 'Food & Meals')
        : k === 'utilities' ? t('cat_utilities', 'Utilities')
        : k === 'maintenance' ? t('cat_maintenance', 'Repairs')
        : t('cat_other', 'Other')
    })).filter(item => item.amount > 0);
  }, [scopedExpenses, t]);

  // Branch Performance Matrix with Gross, Commission, Expense & Net Profit
  const branchPerformance = useMemo(() => {
    return branches.map(b => {
      // Shipments originated at this branch (Gross booking freight)
      const originShipments = shipments.filter(s => s.originBranchId === b.id);
      const grossOriginRev = originShipments.reduce((acc, s) => acc + s.financials.totalAmount, 0);

      // Shipments destined to this branch (COD collections & Commissions)
      const destShipments = shipments.filter(s => s.destinationBranchId === b.id);
      const destCodCollected = destShipments
        .filter(s => s.financials.paymentStatus === 'to_pay' || s.financials.paymentMethod === 'cod')
        .reduce((acc, s) => acc + s.financials.totalAmount, 0);

      const destCommissionEarned = destShipments.reduce((acc, s) => {
        return acc + (s.destBranchCommission !== undefined ? s.destBranchCommission : 100);
      }, 0);

      // Expenses recorded for this specific branch
      const branchExp = expenses
        .filter(e => e.branchId === b.id)
        .reduce((sum, e) => sum + e.amount, 0);

      // Net profit for this branch hub
      const branchNet = grossOriginRev - branchExp;
      const margin = grossOriginRev > 0 ? Math.round(((branchNet / grossOriginRev) * 100) * 10) / 10 : 0;

      const dispatched = originShipments.length;
      const received = destShipments.length;

      return {
        id: b.id,
        name: b.name.split(' ')[0],
        fullName: getLocalizedBranchName(b),
        rawName: b.name,
        code: b.code,
        city: b.city,
        province: b.province,
        grossRevenue: grossOriginRev,
        destCodCollected,
        destCommissionEarned,
        expenses: branchExp,
        netProfit: branchNet,
        profitMargin: margin,
        dispatched,
        received,
        totalVolume: dispatched + received
      };
    });
  }, [branches, shipments, expenses, language, t]);

  // Chart data for Branch Comparison (Gross vs Expenses vs Net Profit)
  const branchChartData = useMemo(() => {
    return branchPerformance.map(b => ({
      name: b.code,
      gross: b.grossRevenue,
      expenses: b.expenses,
      net: b.netProfit
    }));
  }, [branchPerformance]);

  // Daily Trend Data
  const trendData = [
    { day: 'Day 1', revenue: 35000, volume: 18, delivered: 15 },
    { day: 'Day 5', revenue: 52000, volume: 27, delivered: 24 },
    { day: 'Day 10', revenue: 68000, volume: 34, delivered: 31 },
    { day: 'Day 15', revenue: 84000, volume: 42, delivered: 39 },
    { day: 'Day 20', revenue: 95000, volume: 49, delivered: 46 },
    { day: 'Day 25', revenue: 110000, volume: 58, delivered: 54 },
    { day: 'Day 30', revenue: 125000, volume: 64, delivered: 60 },
  ];

  // Category distribution
  const categoryCount: Record<string, number> = {};
  scopedShipments.forEach(s => {
    categoryCount[s.packageInfo.category] = (categoryCount[s.packageInfo.category] || 0) + 1;
  });

  const categoryPieData = Object.keys(categoryCount).map(cat => ({
    name: cat.toUpperCase(),
    value: categoryCount[cat]
  }));

  const COLORS = ['#dc2626', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
  const EXPENSE_COLORS = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#06b6d4', '#ec4899', '#64748b'];

  const exportBranchPnlReport = () => {
    const headers = [
      'Branch Code', 
      'Branch Name', 
      'City & Province', 
      'Dispatched Volume', 
      'Received Volume', 
      'Gross Freight Revenue (AFN)', 
      'Dest Commissions (AFN)', 
      'Branch Expenses (AFN)', 
      'Net Profit (AFN)', 
      'Profit Margin (%)'
    ];
    const rows = branchPerformance.map(b => [
      `"${b.code}"`,
      `"${b.rawName}"`,
      `"${b.city}, ${b.province}"`,
      b.dispatched,
      b.received,
      b.grossRevenue,
      b.destCommissionEarned,
      b.expenses,
      b.netProfit,
      `${b.profitMargin}%`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Armaghan_Sadeq_Transfers_Revenue_PnL_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadPdf = () => {
    setIsGeneratingPdf(true);
    setPdfSuccess(false);

    try {
      const branchName = selectedBranchId === 'all' 
        ? 'Headquarters (Nationwide Network)' 
        : (branches.find(b => b.id === selectedBranchId)?.name || 'Branch');

      const ok = generateExecutiveReportPdf(
        dateRange,
        branchName,
        totalGrossRevenue,
        scopedShipments.length,
        deliveredCount,
        inTransitCount,
        totalPaidAtOrigin
      );

      if (ok) {
        setPdfSuccess(true);
        setTimeout(() => setPdfSuccess(false), 4000);
      }
    } catch (err) {
      console.error('Report PDF error:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrintPnl = () => {
    if (pnlReportRef.current) {
      printElementUsingIframe(pnlReportRef.current, `Revenue_PnL_Audit_${dateRange}`);
    } else {
      window.print();
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300 font-sans" id="analytics-reports-page">
      
      {/* Top Header & Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
            <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-red-600 dark:text-red-400" />
              <span>{t('revenue_overview_title', 'Revenue Overview & Inter-Branch Profitability')}</span>
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t('revenue_overview_subtitle', 'Consolidated gross freight income, destination branch commission breakdowns, operational expenses, and net profit.')}
          </p>
        </div>

        {/* Top Tab Toggle */}
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setActiveTab('revenue_overview')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'revenue_overview'
                ? 'bg-white dark:bg-slate-900 text-red-600 dark:text-red-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Banknote className="w-4 h-4" />
            <span>{t('tab_revenue_overview', 'Revenue & Profitability')}</span>
          </button>

          <button
            onClick={() => setActiveTab('operations')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'operations'
                ? 'bg-white dark:bg-slate-900 text-red-600 dark:text-red-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>{t('tab_financial_reports', 'Operations & Freight Traffic')}</span>
          </button>
        </div>
      </div>

      {/* Filter & Action Controls Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-4">
        
        {/* Branch Scope Selector */}
        <div className="flex items-center gap-3">
          <Building2 className="w-4 h-4 text-slate-500" />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
            {t('filter_branch_select', 'Target Branch Scope')}:
          </span>
          <select
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white cursor-pointer focus:ring-2 focus:ring-red-500"
          >
            <option value="all">🏢 {t('all_terminals_pnl', 'All Provincial Terminals (HQ Consolidated)')}</option>
            {branches.map(b => (
              <option key={b.id} value={b.id}>
                📍 {getLocalizedBranchName(b)} ({b.city})
              </option>
            ))}
          </select>
        </div>

        {/* Actions (Export CSV, PDF, Print) */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Time range selector */}
          <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold">
            {(['today', 'week', 'month', 'year'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setDateRange(r)}
                className={`px-3 py-1.5 rounded-lg transition-all capitalize cursor-pointer ${
                  dateRange === r
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {r === 'today' ? t('time_today', 'Today') : r === 'week' ? t('time_this_week', 'This Week') : r === 'month' ? t('time_this_month', 'This Month') : t('time_this_year', 'This Year')}
              </button>
            ))}
          </div>

          <button
            onClick={exportBranchPnlReport}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Export CSV Audit"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>{t('btn_export_revenue_csv', 'Export Revenue CSV')}</span>
          </button>

          <button
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Download PDF report document"
          >
            {isGeneratingPdf ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Generating PDF...</span>
              </>
            ) : pdfSuccess ? (
              <>
                <FileCheck className="w-4 h-4 text-emerald-200" />
                <span>PDF Downloaded!</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Executive PDF</span>
              </>
            )}
          </button>

          <button
            onClick={handlePrintPnl}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Print report"
          >
            <Printer className="w-4 h-4" />
            <span>{t('btn_print_pnl', 'Print P&L Statement')}</span>
          </button>
        </div>
      </div>

      {/* Main View Tab 1: REVENUE OVERVIEW & NET PROFITABILITY */}
      {activeTab === 'revenue_overview' && (
        <div ref={pnlReportRef} className="space-y-6">
          
          {/* Printable Scope Header */}
          <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">
                {t('revenue_overview_title', 'Inter-Branch Revenue & Profitability')}
              </div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                {selectedBranchId === 'all' 
                  ? `Nationwide Consolidated Financial Ledger — ${dateRange.toUpperCase()}`
                  : `${getLocalizedBranchName(branches.find(b => b.id === selectedBranchId))} Terminal P&L — ${dateRange.toUpperCase()}`}
              </h2>
              <p className="text-xs text-slate-500">
                Generated: {new Date().toLocaleDateString()} | {t('system_name')}
              </p>
            </div>

            <div className="text-end font-mono text-xs">
              <div className="font-bold text-slate-900 dark:text-white">
                Consignments Count: {scopedShipments.length}
              </div>
              <div className="text-emerald-600 font-bold">
                {t('net_profitability_rate', 'Net Operating Margin')}: {profitMarginPercent}%
              </div>
            </div>
          </div>

          {/* 4 Financial Highlight KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* 1. Gross Freight Income */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {t('gross_freight_revenue', 'Gross Freight Revenue')}
                </span>
                <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 flex items-center justify-center font-bold text-sm">
                  AFN
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                {totalGrossRevenue.toLocaleString()} <span className="text-xs font-normal text-slate-500">{t('afn_curr', 'AFN')}</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800">
                <span>{t('origin_bookings_rev', 'Origin Bookings')}:</span>
                <span className="font-bold text-slate-700 dark:text-slate-300 font-mono">
                  {totalPaidAtOrigin.toLocaleString()} AFN
                </span>
              </div>
            </div>

            {/* 2. Destination Branch Commissions */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {t('total_dest_commissions', 'Dest Commissions')}
                </span>
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 flex items-center justify-center font-bold text-sm">
                  <Percent className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-blue-600 dark:text-blue-400 font-mono">
                {totalDestCommissions.toLocaleString()} <span className="text-xs font-normal text-slate-500">{t('afn_curr', 'AFN')}</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800">
                <span>{t('dest_cod_collected', 'Destination COD')}:</span>
                <span className="font-bold text-slate-700 dark:text-slate-300 font-mono">
                  {totalCodDue.toLocaleString()} AFN
                </span>
              </div>
            </div>

            {/* 3. Branch Operating Expenses */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {t('total_operational_expenses', 'Branch Operating Costs')}
                </span>
                <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 flex items-center justify-center font-bold text-sm">
                  <Receipt className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-rose-600 font-mono">
                {totalExpenseAmount.toLocaleString()} <span className="text-xs font-normal text-slate-500">{t('afn_curr', 'AFN')}</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800">
                <span>{scopedExpenses.length} {t('recorded_entries', 'recorded vouchers')}</span>
                <span className="font-bold text-rose-600 font-mono">
                  {scopedExpenses.length > 0 ? Math.round(totalExpenseAmount / scopedExpenses.length).toLocaleString() : 0} AFN/avg
                </span>
              </div>
            </div>

            {/* 4. Consolidated Net Profit */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {t('consolidated_net_profit', 'Consolidated Net Profit')}
                </span>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm ${
                  netProfit >= 0 
                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400' 
                    : 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'
                }`}>
                  <Banknote className="w-4 h-4" />
                </div>
              </div>
              <div className={`text-2xl font-black font-mono ${netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {netProfit.toLocaleString()} <span className="text-xs font-normal text-slate-500">{t('afn_curr', 'AFN')}</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800">
                <span>{t('profit_margin', 'Net Margin')}:</span>
                <span className={`font-bold font-mono px-2 py-0.5 rounded ${
                  profitMarginPercent >= 40 
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' 
                    : profitMarginPercent >= 15 
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                }`}>
                  {profitMarginPercent}%
                </span>
              </div>
            </div>

          </div>

          {/* Branch Profit & Loss Matrix Table */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-red-600" />
                  <span>{t('branch_pnl_matrix', 'Branch Profit & Loss (P&L) Ledger')}</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Detailed cross-branch breakdown: Gross freight income, retained handling commissions, operational costs, and bottom-line margin.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" /> {t('high_profit', 'High Margin (>40%)')}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-bold border border-blue-200 dark:bg-blue-950/30 dark:border-blue-800">
                  <span className="w-2 h-2 rounded-full bg-blue-500" /> {t('moderate_profit', 'Moderate (15-40%)')}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-start text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                    <th className="p-3 text-start">{t('col_branch', 'Branch Terminal')}</th>
                    <th className="p-3 text-start">{t('branch_province', 'Province & City')}</th>
                    <th className="p-3 text-center">{t('total_dispatched', 'Dispatched')}</th>
                    <th className="p-3 text-center">{t('total_received', 'Received')}</th>
                    <th className="p-3 text-end">{t('col_gross_rev', 'Gross Freight (AFN)')}</th>
                    <th className="p-3 text-end">{t('col_dest_comm', 'Dest Commission (AFN)')}</th>
                    <th className="p-3 text-end">{t('col_expenses', 'Expenses (AFN)')}</th>
                    <th className="p-3 text-end">{t('col_net_profit', 'Net Profit (AFN)')}</th>
                    <th className="p-3 text-center">{t('col_margin', 'Margin %')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-sans">
                  {branchPerformance.map((b) => (
                    <tr key={b.code} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="p-3 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-600" />
                        <span>{b.fullName}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
                          {b.code}
                        </span>
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-400">
                        {b.city}, {b.province}
                      </td>
                      <td className="p-3 text-center font-mono font-semibold text-slate-700 dark:text-slate-300">
                        {b.dispatched}
                      </td>
                      <td className="p-3 text-center font-mono font-semibold text-slate-700 dark:text-slate-300">
                        {b.received}
                      </td>
                      <td className="p-3 text-end font-mono font-bold text-slate-900 dark:text-white">
                        {b.grossRevenue.toLocaleString()}
                      </td>
                      <td className="p-3 text-end font-mono font-semibold text-blue-600 dark:text-blue-400">
                        +{b.destCommissionEarned.toLocaleString()}
                      </td>
                      <td className="p-3 text-end font-mono font-bold text-rose-600 dark:text-rose-400">
                        {b.expenses > 0 ? `- ${b.expenses.toLocaleString()}` : '0'}
                      </td>
                      <td className={`p-3 text-end font-mono font-black ${
                        b.netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      }`}>
                        {b.netProfit.toLocaleString()} AFN
                      </td>
                      <td className="p-3 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded-md text-[11px] font-bold font-mono ${
                          b.profitMargin >= 40
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200'
                            : b.profitMargin >= 15
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200'
                        }`}>
                          {b.profitMargin}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 dark:bg-slate-800/80 font-bold border-t-2 border-slate-300 dark:border-slate-600">
                    <td className="p-3 text-slate-900 dark:text-white uppercase tracking-wider" colSpan={4}>
                      {t('all_terminals_pnl', 'Total Consolidated Network')}
                    </td>
                    <td className="p-3 text-end font-mono font-black text-slate-900 dark:text-white">
                      {totalGrossRevenue.toLocaleString()} AFN
                    </td>
                    <td className="p-3 text-end font-mono font-black text-blue-600 dark:text-blue-400">
                      +{totalDestCommissions.toLocaleString()} AFN
                    </td>
                    <td className="p-3 text-end font-mono font-black text-rose-600 dark:text-rose-400">
                      -{totalExpenseAmount.toLocaleString()} AFN
                    </td>
                    <td className={`p-3 text-end font-mono font-black text-sm ${
                      netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                    }`}>
                      {netProfit.toLocaleString()} AFN
                    </td>
                    <td className="p-3 text-center font-mono font-black text-emerald-600">
                      {profitMarginPercent}%
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Visual Breakdown Grid (Branch Comparison Bar + Expense Categories Pie) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Branch Revenue vs Expense vs Profit Bar Chart (2 cols) */}
            <div className="lg:col-span-2 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    Branch Revenue vs Expenses vs Net Profit
                  </h3>
                  <p className="text-xs text-slate-500">Comparative financial throughput per provincial cargo hub</p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                    <span className="w-3 h-3 rounded-sm bg-red-600" /> Gross Revenue
                  </span>
                  <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                    <span className="w-3 h-3 rounded-sm bg-rose-500" /> Expenses
                  </span>
                  <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                    <span className="w-3 h-3 rounded-sm bg-emerald-500" /> Net Profit
                  </span>
                </div>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={branchChartData}>
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '0.75rem', color: '#0f172a' }}
                    />
                    <Bar dataKey="gross" fill="#dc2626" radius={[4, 4, 0, 0]} name="Gross Revenue" />
                    <Bar dataKey="expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} name="Expenses" />
                    <Bar dataKey="net" fill="#10b981" radius={[4, 4, 0, 0]} name="Net Profit" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Expense Categories Breakdown (1 col) */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    Expense Cost Centers
                  </h3>
                  <p className="text-xs text-slate-500">Distribution of operating overhead</p>
                </div>
                <Receipt className="w-4 h-4 text-rose-500" />
              </div>

              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expenseCategoryBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={3}
                      dataKey="amount"
                    >
                      {expenseCategoryBreakdown.map((entry, index) => (
                        <Cell key={`exp-cell-${index}`} fill={EXPENSE_COLORS[index % EXPENSE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-1.5 mt-2 max-h-36 overflow-y-auto pr-1 text-xs">
                {expenseCategoryBreakdown.map((item, idx) => (
                  <div key={item.name} className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: EXPENSE_COLORS[idx % EXPENSE_COLORS.length] }} />
                      <span>{item.label}</span>
                    </div>
                    <span className="font-bold text-slate-900 dark:text-white font-mono">
                      {item.amount.toLocaleString()} AFN
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* Main View Tab 2: OPERATIONS & FREIGHT TRAFFIC */}
      {activeTab === 'operations' && (
        <div ref={reportRef} className="space-y-6">
          
          {/* Printable Report Title Header */}
          <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">
                Rayan Cargo Nationwide Audit
              </div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                Operations & Cargo Traffic Report — {dateRange.toUpperCase()}
              </h2>
              <p className="text-xs text-slate-500">
                Audit Date: {new Date().toLocaleDateString()} | Central Logistics Terminal
              </p>
            </div>
            <div className="text-end font-mono text-xs">
              <div className="font-bold text-slate-900 dark:text-white">
                Branch: {selectedBranchId === 'all' ? 'All 6 Provincial Hubs' : selectedBranchId}
              </div>
              <div className="text-slate-500">Consignments Audited: {scopedShipments.length}</div>
            </div>
          </div>

          {/* Operational Highlight Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="text-xs font-bold text-slate-500 uppercase">Total Parcels Handled</div>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-2 font-mono">
                {scopedShipments.length}
              </div>
              <div className="text-[11px] text-emerald-600 font-bold mt-1">
                {deliveredCount} delivered successfully
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="text-xs font-bold text-slate-500 uppercase">Total Weight Moved</div>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-2 font-mono">
                {totalWeight.toLocaleString()} <span className="text-xs font-normal text-slate-500">KG</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {inTransitCount} packages currently on highway routes
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="text-xs font-bold text-slate-500 uppercase">Delivery Success Rate</div>
              <div className="text-2xl font-black text-emerald-600 mt-2 font-mono">
                {scopedShipments.length > 0 ? Math.round((deliveredCount / scopedShipments.length) * 100) : 0}%
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Verified with receiver signature & POD
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="text-xs font-bold text-slate-500 uppercase">Avg Consignment Weight</div>
              <div className="text-2xl font-black text-indigo-600 mt-2 font-mono">
                {scopedShipments.length > 0 ? Math.round(totalWeight / scopedShipments.length) : 0} <span className="text-xs font-normal text-slate-500">KG</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Standard & express cargo mix
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Revenue & Volume Chart (2 Cols) */}
            <div className="lg:col-span-2 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    Delivery & Revenue Trajectory Trend
                  </h3>
                  <p className="text-xs text-slate-500">Daily logistics throughput and completion velocity</p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-red-600" /> Revenue (AFN)
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-blue-600" /> Deliveries
                  </span>
                </div>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} />
                    <YAxis yAxisId="left" stroke="#dc2626" fontSize={11} />
                    <YAxis yAxisId="right" orientation="right" stroke="#3b82f6" fontSize={11} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '0.75rem', color: '#0f172a' }}
                    />
                    <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="#dc2626" strokeWidth={3} dot={{ r: 4 }} />
                    <Line yAxisId="right" type="monotone" dataKey="delivered" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Category Distribution Pie Chart (1 Col) */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    Cargo Commodity Types
                  </h3>
                  <p className="text-xs text-slate-500">Breakdown by cargo category</p>
                </div>
                <PieIcon className="w-4 h-4 text-slate-400" />
              </div>

              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {categoryPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-1.5 mt-2 max-h-28 overflow-y-auto pr-1 text-xs">
                {categoryPieData.map((item, idx) => (
                  <div key={item.name} className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                      <span className="capitalize">{item.name.toLowerCase()}</span>
                    </div>
                    <span className="font-bold text-slate-900 dark:text-white">{item.value} items</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
};
