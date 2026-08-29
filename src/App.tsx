import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { ParcelInventory } from './components/ParcelInventory';
import { NewBookingModal } from './components/NewBookingModal';
import { TrackingPortal } from './components/TrackingPortal';
import { BranchManagement } from './components/BranchManagement';
import { UserManagement } from './components/UserManagement';
import { AnalyticsReports } from './components/AnalyticsReports';
import { PrintReceiptModal } from './components/PrintReceiptModal';
import { LoginPage } from './components/LoginPage';

const MainLayout: React.FC = () => {
  const { activeView, isAuthenticated, currentUser } = useApp();

  if (!isAuthenticated) {
    return (
      <>
        <LoginPage />
        <PrintReceiptModal />
      </>
    );
  }

  const renderActiveView = () => {
    switch (activeView) {
      case 'dashboard':
        return <Dashboard />;
      case 'parcels':
        return <ParcelInventory />;
      case 'booking':
        return <NewBookingModal />;
      case 'tracking':
        return <TrackingPortal />;
      case 'branches':
        // Only super admin can access full branch network configuration
        return currentUser.role === 'super_admin' ? <BranchManagement /> : <Dashboard />;
      case 'users':
        // Only super admin can access user & role management across all branches
        return currentUser.role === 'super_admin' ? <UserManagement /> : <Dashboard />;
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
        <main className="flex-1 min-w-0 p-4 sm:p-6 md:p-8 overflow-y-auto bg-slate-50 dark:bg-slate-950 transition-colors">
          {renderActiveView()}
        </main>
      </div>

      {/* Printable Consignment Waybill Modal */}
      <PrintReceiptModal />

    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
