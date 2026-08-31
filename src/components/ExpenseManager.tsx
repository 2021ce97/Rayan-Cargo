import React, { useState } from 'react';
import { 
  DollarSign, 
  Plus, 
  TrendingDown, 
  TrendingUp, 
  Calendar, 
  Building2, 
  Trash2, 
  Receipt, 
  User, 
  Tag, 
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  Filter,
  PieChart,
  Sparkles
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AddExpenseInput, BranchExpense, ExpenseCategory } from '../types';

export const ExpenseManager: React.FC = () => {
  const { 
    t, 
    currentUser, 
    branches, 
    activeBranchId, 
    setActiveBranchId,
    branchExpenses, 
    addExpense, 
    deleteExpense, 
    analytics,
    language 
  } = useApp();

  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Form State
  const defaultBranch = currentUser.role === 'super_admin' ? (activeBranchId !== 'all' ? activeBranchId : branches[0]?.id) : currentUser.branchId;
  const [formBranchId, setFormBranchId] = useState(defaultBranch || 'br_kabul');
  const [category, setCategory] = useState<ExpenseCategory>('food_tea');
  const [amount, setAmount] = useState<number>(500);
  const [description, setDescription] = useState('');
  const [paidTo, setPaidTo] = useState('');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);

  const handleAddExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || amount <= 0) {
      alert('Please enter a valid expense amount.');
      return;
    }
    if (!description.trim()) {
      alert('Please enter an expense description.');
      return;
    }

    const input: AddExpenseInput = {
      branchId: currentUser.role === 'super_admin' ? formBranchId : currentUser.branchId,
      category,
      amount: Number(amount),
      description: description.trim(),
      expenseDate,
      paidTo: paidTo.trim() || undefined,
      receiptNumber: receiptNumber.trim() || undefined
    };

    addExpense(input);
    setShowAddModal(false);
    // Reset form
    setDescription('');
    setPaidTo('');
    setReceiptNumber('');
    setAmount(500);
  };

  const getCategoryLabel = (cat: ExpenseCategory) => {
    switch (cat) {
      case 'rent':
        return t('cat_rent') || 'Shop / Warehouse Rent';
      case 'salary':
        return t('cat_salary') || 'Staff Salary & Wages';
      case 'food':
        return t('cat_food') || 'Staff Meals & Tea';
      case 'fuel_transport':
        return t('cat_fuel_transport') || 'Fuel, Diesel & Tolls';
      case 'utilities':
        return t('cat_utilities') || 'Electricity & Utilities';
      case 'maintenance':
        return t('cat_maintenance') || 'Maintenance & Repairs';
      case 'other':
      default:
        return t('cat_other') || 'Other Operational Costs';
    }
  };

  const getCategoryBadgeClass = (cat: ExpenseCategory) => {
    switch (cat) {
      case 'rent':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'salary':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'food':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'fuel_transport':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'utilities':
        return 'bg-cyan-100 text-cyan-800 border-cyan-200';
      case 'maintenance':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const filteredExpenses = branchExpenses.filter(e => {
    const matchesCat = selectedCategoryFilter === 'all' || e.category === selectedCategoryFilter;
    const matchesSearch = e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.paidTo && e.paidTo.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (e.receiptNumber && e.receiptNumber.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  const totalExpenseSum = branchExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const activeBranchObj = branches.find(b => b.id === (currentUser.role === 'super_admin' ? activeBranchId : currentUser.branchId));

  return (
    <div className="space-y-6">
      
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
              <DollarSign className="w-6 h-6 text-red-600" />
              <span>{t('expenses_title')}</span>
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">
              {activeBranchObj ? activeBranchObj.name : 'All Branches (HQ)'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {t('expenses_subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {currentUser.role === 'super_admin' && (
            <select
              value={activeBranchId}
              onChange={(e) => setActiveBranchId(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-800 shadow-xs focus:ring-2 focus:ring-red-500 focus:outline-none"
            >
              <option value="all">🏢 All Branches (HQ Network)</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.city})
                </option>
              ))}
            </select>
          )}

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-red-600/20 cursor-pointer transition-all shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>{t('add_new_expense')}</span>
          </button>
        </div>
      </div>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* Card 1: Gross Revenue */}
        <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>{t('metric_total_revenue')}</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {analytics.totalRevenue.toLocaleString()} <span className="text-xs font-bold text-slate-500">AFN</span>
          </div>
          <div className="text-[11px] text-emerald-600 font-medium">
            From {analytics.totalParcels} parcel consignments
          </div>
        </div>

        {/* Card 2: Total Expenses */}
        <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>{t('total_branch_expenses')}</span>
            <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-600 font-mono">
            {totalExpenseSum.toLocaleString()} <span className="text-xs font-bold text-slate-500">AFN</span>
          </div>
          <div className="text-[11px] text-slate-500 font-medium">
            {branchExpenses.length} operational expense entries
          </div>
        </div>

        {/* Card 3: Net Profit */}
        <div className="p-5 rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-300 font-semibold">
            <span>{t('net_operating_profit')}</span>
            <div className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-400 font-mono">
            {(analytics.totalRevenue - totalExpenseSum).toLocaleString()} <span className="text-xs font-bold text-slate-300">AFN</span>
          </div>
          <div className="text-[11px] text-slate-400 font-medium">
            Gross Revenue minus Branch Expenses
          </div>
        </div>

      </div>

      {/* Expense Entries Table & Filters */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
        
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-300 bg-slate-50 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-red-500 focus:outline-none"
            >
              <option value="all">All Categories</option>
              <option value="rent">Shop / Warehouse Rent</option>
              <option value="salary">Staff Salary & Wages</option>
              <option value="food_tea">Staff Meals & Tea</option>
              <option value="fuel_transport">Fuel & Transport</option>
              <option value="utilities">Electricity & Utilities</option>
              <option value="maintenance">Maintenance</option>
              <option value="other">Other Costs</option>
            </select>
          </div>

          <div className="relative w-full md:w-64">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search description, recipient, bill #..."
              className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 bg-slate-50 text-slate-900 focus:ring-2 focus:ring-red-500 focus:outline-none"
            />
          </div>
        </div>

        {filteredExpenses.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <Receipt className="w-10 h-10 text-slate-300 mx-auto" />
            <div className="text-xs font-bold text-slate-600">No Branch Expenses Recorded Yet</div>
            <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
              Add operational costs such as shop rent, meals, employee salaries, and fuel using the "Record Branch Expense" button.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 uppercase font-bold text-[10px]">
                  <th className="pb-3 text-start">Date</th>
                  <th className="pb-3 text-start">Category</th>
                  <th className="pb-3 text-start">Description</th>
                  <th className="pb-3 text-start">Paid To</th>
                  <th className="pb-3 text-start">Receipt #</th>
                  <th className="pb-3 text-end">Amount</th>
                  <th className="pb-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredExpenses.map(exp => {
                  const br = branches.find(b => b.id === exp.branchId);

                  return (
                    <tr key={exp.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 font-mono text-slate-600 whitespace-nowrap">
                        {exp.expenseDate}
                      </td>
                      <td className="py-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${getCategoryBadgeClass(exp.category)}`}>
                          {getCategoryLabel(exp.category)}
                        </span>
                      </td>
                      <td className="py-3 text-slate-900 font-medium">
                        <div>{exp.description}</div>
                        {currentUser.role === 'super_admin' && (
                          <div className="text-[10px] text-slate-400 font-semibold">{br?.name} ({br?.city})</div>
                        )}
                      </td>
                      <td className="py-3 text-slate-600 font-medium whitespace-nowrap">
                        {exp.paidTo || '—'}
                      </td>
                      <td className="py-3 font-mono text-slate-500 whitespace-nowrap">
                        {exp.receiptNumber || '—'}
                      </td>
                      <td className="py-3 text-end font-mono font-bold text-rose-600 whitespace-nowrap">
                        -{exp.amount.toLocaleString()} AFN
                      </td>
                      <td className="py-3 text-center whitespace-nowrap">
                        <button
                          onClick={() => deleteExpense(exp.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete expense"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* Add Expense Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-red-600" />
                <span>{t('add_new_expense')}</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddExpenseSubmit} className="space-y-4">
              
              {currentUser.role === 'super_admin' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Select Branch
                  </label>
                  <select
                    value={formBranchId}
                    onChange={(e) => setFormBranchId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-red-500 focus:outline-none"
                  >
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.city})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t('expense_category')}
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-red-500 focus:outline-none"
                  >
                    <option value="food_tea">{t('cat_food') || 'Staff Meals & Tea'}</option>
                    <option value="salary">{t('cat_salary') || 'Staff Salary & Wages'}</option>
                    <option value="rent">{t('cat_rent') || 'Shop / Warehouse Rent'}</option>
                    <option value="fuel_transport">{t('cat_fuel_transport') || 'Fuel, Diesel & Tolls'}</option>
                    <option value="utilities">{t('cat_utilities') || 'Electricity & Utilities'}</option>
                    <option value="maintenance">{t('cat_maintenance') || 'Maintenance & Repairs'}</option>
                    <option value="other">{t('cat_other') || 'Other Costs'}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t('expense_amount')}
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={amount}
                    onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-red-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('expense_desc')}
                </label>
                <input
                  type="text"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Monthly warehouse rent for Kabul Central Hub or Lunch for 4 cargo handlers"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t('expense_paid_to')}
                  </label>
                  <input
                    type="text"
                    value={paidTo}
                    onChange={(e) => setPaidTo(e.target.value)}
                    placeholder="e.g. Haji Qader (Landlord) or Ahmad (Worker)"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 focus:ring-2 focus:ring-red-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t('expense_receipt_no')}
                  </label>
                  <input
                    type="text"
                    value={receiptNumber}
                    onChange={(e) => setReceiptNumber(e.target.value)}
                    placeholder="e.g. BL-8492 or Inv-002"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-mono text-slate-900 focus:ring-2 focus:ring-red-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('expense_date')}
                </label>
                <input
                  type="date"
                  required
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-600 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-600/20 cursor-pointer"
                >
                  Record Expense
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
