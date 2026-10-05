import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { I18nProvider } from './context/I18nContext';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { ParcelInventory } from './components/ParcelInventory';
import { NewBookingModal } from './components/NewBookingModal';
import { TrackingPortal } from './components/TrackingPortal';
import { BranchManagement } from './components/BranchManagement';
import { UserManagement } from './components/UserManagement';
import { AnalyticsReports } from './components/AnalyticsReports';
import { ExpenseManager } from './components/ExpenseManager';
import { RemittanceManager } from './components/RemittanceManager';
import { CustomerPortal } from './components/CustomerPortal';
import { CustomerHistory } from './components/CustomerHistory';
import { CustomerFinances } from './components/CustomerFinances';
import { PrintReceiptModal } from './components/PrintReceiptModal';
import { LoginPage } from './components/LoginPage';
import { ToastContainer } from './components/ToastContainer';
import { PrintQueueFAB } from './components/PrintQueueFAB';
import { MobileBottomNav } from './components/MobileBottomNav';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = {
    hasError: false
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in UI component:', error, errorInfo);
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 max-w-lg mx-auto my-12 bg-white dark:bg-slate-900 rounded-3xl border border-red-200 dark:border-red-900 shadow-xl text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950 text-red-600 flex items-center justify-center mx-auto text-xl font-bold">
            ⚠️
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Something went wrong</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {this.state.error?.message || 'An unexpected error occurred while rendering the view.'}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: undefined });
              window.location.reload();
            }}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl cursor-pointer"
          >
            Reload Application
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const MainLayout: React.FC = () => {
  const { activeView, isAuthenticated, currentUser, selectedShipmentForReceipt } = useApp();

  if (!isAuthenticated) {
    return (
      <>
        <LoginPage />
        {selectedShipmentForReceipt && <PrintReceiptModal />}
        <ToastContainer />
      </>
    );
  }

  const renderActiveView = () => {
    // If logged in as customer, allow customer_portal, customer_finances, customer_history, and tracking
    if (currentUser?.role === 'customer') {
      if (activeView === 'customer_finances') return <CustomerFinances />;
      if (activeView === 'customer_history') return <CustomerHistory />;
      if (activeView === 'tracking') return <TrackingPortal />;
      return <CustomerPortal />;
    }

    switch (activeView) {
      case 'dashboard':
        return <Dashboard />;
      case 'customer_portal':
        return <CustomerPortal />;
      case 'customer_finances':
        return <CustomerFinances />;
      case 'customer_history':
        return <CustomerHistory />;
      case 'expenses':
        return <ExpenseManager />;
      case 'remittances':
        return <RemittanceManager />;
      case 'parcels':
        return <ParcelInventory />;
      case 'booking':
        return <NewBookingModal />;
      case 'tracking':
        return <TrackingPortal />;
      case 'branches':
        // Only super admin can access full branch network configuration
        return currentUser?.role === 'super_admin' ? <BranchManagement /> : <Dashboard />;
      case 'users':
        // Only super admin can access user & role management across all branches
        return currentUser?.role === 'super_admin' ? <UserManagement /> : <Dashboard />;
      case 'reports':
        return <AnalyticsReports />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col antialiased transition-colors">
      
      {/* Top Fixed Header */}
      <Header />

      {/* Main Container with Sidebar + Content */}
      <div className="flex-1 flex w-full max-w-[1600px] mx-auto overflow-hidden">
        
        {/* Navigation Sidebar */}
        <Sidebar />

        {/* Dynamic Content View Area */}
        <main className="flex-1 min-w-0 p-3 sm:p-6 md:p-8 pb-24 lg:pb-8 overflow-y-auto bg-slate-50 dark:bg-slate-950 transition-colors" id="main-content-area">
          <ErrorBoundary>
            {renderActiveView()}
          </ErrorBoundary>
        </main>
      </div>

      {/* Printable Consignment Waybill Modal (Branch Managers and Admin only) */}
      {selectedShipmentForReceipt && currentUser?.role !== 'customer' && <PrintReceiptModal />}

      {/* Global Toast Notification System */}
      <ToastContainer />

      {/* Offline Print Queue FAB */}
      <PrintQueueFAB />

      {/* Mobile Bottom Navigation Dock (sm/md screens) */}
      <MobileBottomNav />

    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <I18nProvider>
        <AppProvider>
          <ErrorBoundary>
            <MainLayout />
          </ErrorBoundary>
        </AppProvider>
      </I18nProvider>
    </ErrorBoundary>
  );
}

