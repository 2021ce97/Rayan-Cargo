import React, { useState, useRef } from 'react';
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
  TrendingDown
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

export const AnalyticsReports: React.FC = () => {
  const { t, branches, shipments, filteredShipments, activeBranchId, currentUser, expenses } = useApp();

  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'year'>('month');
  const [selectedBranch, setSelectedBranch] = useState<string>(activeBranchId);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfSuccess, setPdfSuccess] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  // Financial calculations
  const totalRev = filteredShipments.reduce((acc, curr) => acc + curr.financials.totalAmount, 0);
  const totalPaid = filteredShipments.reduce((acc, curr) => acc + curr.financials.amountPaid, 0);
  const totalDue = filteredShipments.reduce((acc, curr) => acc + curr.financials.amountDue, 0);
  const totalWeight = filteredShipments.reduce((acc, curr) => acc + curr.packageInfo.weightKg, 0);
  const deliveredCount = filteredShipments.filter(s => s.status === 'delivered').length;
  const inTransitCount = filteredShipments.filter(s => s.status === 'in_transit' || s.status === 'dispatched').length;

  // Filtered expenses based on active view / branch
  const relevantExpenses = currentUser.role === 'super_admin' && activeBranchId === 'all'
    ? expenses
    : expenses.filter(e => e.branchId === (currentUser.role === 'super_admin' ? activeBranchId : currentUser.branchId));

  const totalExpenseAmount = relevantExpenses.reduce((sum, e) => sum + e.amount, 0);
  const netProfit = totalRev - totalExpenseAmount;

  // Branch Performance Data with Revenue, Expenses, and Net Profit
  const branchPerformance = branches.map(b => {
    const branchShipments = shipments.filter(s => s.originBranchId === b.id || s.destinationBranchId === b.id);
    const branchRev = branchShipments.reduce((acc, s) => acc + s.financials.totalAmount, 0);
    const dispatched = shipments.filter(s => s.originBranchId === b.id).length;
    const received = shipments.filter(s => s.destinationBranchId === b.id).length;
    const branchExp = expenses.filter(e => e.branchId === b.id).reduce((sum, e) => sum + e.amount, 0);
    const branchNet = branchRev - branchExp;

    return {
      id: b.id,
      name: b.name.split(' ')[0],
      fullName: b.name,
      city: b.city,
      revenue: branchRev,
      expenses: branchExp,
      netProfit: branchNet,
      dispatched,
      received,
      totalVolume: dispatched + received
    };
  });

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
  filteredShipments.forEach(s => {
    categoryCount[s.packageInfo.category] = (categoryCount[s.packageInfo.category] || 0) + 1;
  });

  const categoryPieData = Object.keys(categoryCount).map(cat => ({
    name: cat.toUpperCase(),
    value: categoryCount[cat]
  }));

  const COLORS = ['#dc2626', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

  const exportBranchReport = () => {
    const headers = ['Branch Name', 'City', 'Total Dispatched', 'Total Received', 'Total Revenue (AFN)', 'Total Expenses (AFN)', 'Net Profit (AFN)'];
    const rows = branchPerformance.map(b => [
      `"${b.fullName}"`,
      `"${b.city}"`,
      b.dispatched,
      b.received,
      b.revenue,
      b.expenses,
      b.netProfit
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Rayan_Cargo_Executive_Financial_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadPdf = () => {
    setIsGeneratingPdf(true);
    setPdfSuccess(false);

    try {
      const branchName = activeBranchId === 'all' 
        ? 'Headquarters (Nationwide Network)' 
        : (branches.find(b => b.id === activeBranchId)?.name || 'Branch');

      const ok = generateExecutiveReportPdf(
        dateRange,
        branchName,
        totalRev,
        filteredShipments.length,
        deliveredCount,
        inTransitCount,
        totalPaid
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

  const handlePrint = () => {
    if (reportRef.current) {
      printElementUsingIframe(reportRef.current, `Executive_Report_${dateRange}`);
    } else {
      window.print();
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300" id="analytics-reports-page">
      
      {/* Top Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-red-600 dark:text-red-400" />
            <span>Executive Revenue & Branch Audit</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Nationwide consignment freight totals, operating branch expenses, and net profit ledger
          </p>
        </div>

        {/* Action buttons */}
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
                {r === 'today' ? t('time_today') : r === 'week' ? t('time_this_week') : r === 'month' ? t('time_this_month') : t('time_this_year')}
              </button>
            ))}
          </div>

          <button
            onClick={exportBranchReport}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Export CSV Audit"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Export CSV</span>
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
            onClick={handlePrint}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Print report"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      <div ref={reportRef} className="space-y-6">
        
        {/* Printable Report Title Header */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">
              Rayan Cargo Nationwide Audit
            </div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white">
              Nationwide Revenue & Operations Audit — {dateRange.toUpperCase()}
            </h2>
            <p className="text-xs text-slate-500">
              Audit Date: {new Date().toLocaleDateString()} | Central Logistics Terminal
            </p>
          </div>
          <div className="text-end font-mono text-xs">
            <div className="font-bold text-slate-900 dark:text-white">
              Branch: {activeBranchId === 'all' ? 'All 6 Provincial Hubs' : activeBranchId}
            </div>
            <div className="text-slate-500">Consignments Audited: {filteredShipments.length}</div>
          </div>
        </div>

        {/* 4 Financial Highlight Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Total Revenue */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase">Total Gross Freight</span>
              <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center font-bold text-sm">
                AFN
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-2 font-mono">
              {totalRev.toLocaleString()} <span className="text-xs font-normal text-slate-500">AFN</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-bold mt-1">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Across {filteredShipments.length} consignments</span>
            </div>
          </div>

          {/* Total Expenses */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase">Branch Expenses</span>
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-sm">
                <Receipt className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-rose-600 mt-2 font-mono">
              {totalExpenseAmount.toLocaleString()} <span className="text-xs font-normal text-slate-500">AFN</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Shop rent, salaries, food & fuel ({relevantExpenses.length} entries)
            </div>
          </div>

          {/* Net Operating Profit */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase">Net Operating Profit</span>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                netProfit >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
              }`}>
                <Banknote className="w-4 h-4" />
              </div>
            </div>
            <div className={`text-2xl font-black mt-2 font-mono ${netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {netProfit.toLocaleString()} <span className="text-xs font-normal text-slate-500">AFN</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Gross Revenue minus Operating Costs
            </div>
          </div>

          {/* Total Freight Weight Moved */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase">Total Weight Moved</span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">
                <Truck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-2 font-mono">
              {totalWeight.toLocaleString()} <span className="text-xs font-normal text-slate-500">KG</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {deliveredCount} delivered, {inTransitCount} in transit
            </div>
          </div>

        </div>

        {/* Branch Performance Data Table (with Revenue, Expense & Profit Breakdown) */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                All Branches Revenue, Expense & Profit Breakdown
              </h3>
              <p className="text-xs text-slate-500">
                Full network ledger showing gross booking revenue, recorded branch expenses, and net profit
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                  <th className="p-3 text-start">Branch Terminal</th>
                  <th className="p-3 text-start">City & Province</th>
                  <th className="p-3 text-center">Dispatched</th>
                  <th className="p-3 text-center">Received</th>
                  <th className="p-3 text-end">Gross Revenue</th>
                  <th className="p-3 text-end">Branch Expenses</th>
                  <th className="p-3 text-end">Net Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {branchPerformance.map((b) => (
                  <tr key={b.fullName} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="p-3 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                      <span>{b.fullName}</span>
                    </td>
                    <td className="p-3 text-slate-600 dark:text-slate-400">{b.city}</td>
                    <td className="p-3 text-center font-mono">{b.dispatched} pkgs</td>
                    <td className="p-3 text-center font-mono">{b.received} pkgs</td>
                    <td className="p-3 text-end font-mono font-bold text-slate-900 dark:text-white">
                      {b.revenue.toLocaleString()} AFN
                    </td>
                    <td className="p-3 text-end font-mono font-bold text-rose-600 dark:text-rose-400">
                      {b.expenses > 0 ? `- ${b.expenses.toLocaleString()} AFN` : '0 AFN'}
                    </td>
                    <td className={`p-3 text-end font-mono font-black ${
                      b.netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                    }`}>
                      {b.netProfit.toLocaleString()} AFN
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Revenue & Volume Chart (2 Cols) */}
          <div className="lg:col-span-2 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Revenue & Volume Growth Trend
                </h3>
                <p className="text-xs text-slate-500">Daily financial throughput and delivery trajectory</p>
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
                  Cargo Categories Breakdown
                </h3>
                <p className="text-xs text-slate-500">Distribution by commodity type</p>
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

    </div>
  );
};
