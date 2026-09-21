import React from 'react';
import { 
  LayoutDashboard, 
  Boxes, 
  PackagePlus, 
  Search, 
  ArrowRightLeft, 
  FileText, 
  Menu 
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ActiveView } from '../types';

export const MobileBottomNav: React.FC = () => {
  const { 
    currentUser, 
    activeView, 
    setActiveView, 
    isMobileSidebarOpen, 
    setIsMobileSidebarOpen, 
    t,
    language 
  } = useApp();

  const isCustomer = currentUser?.role === 'customer';
  const isSuperAdmin = currentUser?.role === 'super_admin';

  interface NavItem {
    id: ActiveView | 'menu';
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
    onClick: () => void;
    isActive: boolean;
  }

  const navItems: NavItem[] = isCustomer
    ? [
        {
          id: 'customer_portal',
          label: language === 'fa' ? 'پیشخوان' : language === 'ps' ? 'اصلي پاڼه' : 'Portal',
          icon: PackagePlus,
          onClick: () => {
            setActiveView('customer_portal');
            setIsMobileSidebarOpen(false);
          },
          isActive: activeView === 'customer_portal' && !isMobileSidebarOpen
        },
        {
          id: 'customer_history',
          label: language === 'fa' ? 'بسته‌ها' : language === 'ps' ? 'بارونه' : 'Orders',
          icon: FileText,
          onClick: () => {
            setActiveView('customer_history');
            setIsMobileSidebarOpen(false);
          },
          isActive: activeView === 'customer_history' && !isMobileSidebarOpen
        },
        {
          id: 'tracking',
          label: language === 'fa' ? 'پیگیری' : language === 'ps' ? 'څارنه' : 'Track',
          icon: Search,
          onClick: () => {
            setActiveView('tracking');
            setIsMobileSidebarOpen(false);
          },
          isActive: activeView === 'tracking' && !isMobileSidebarOpen
        },
        {
          id: 'menu',
          label: language === 'fa' ? 'بیشتر' : language === 'ps' ? 'نور' : 'Menu',
          icon: Menu,
          onClick: () => setIsMobileSidebarOpen(!isMobileSidebarOpen),
          isActive: isMobileSidebarOpen
        }
      ]
    : [
        {
          id: 'dashboard',
          label: language === 'fa' ? 'داشبورد' : language === 'ps' ? 'ډشبورډ' : 'Dashboard',
          icon: LayoutDashboard,
          onClick: () => {
            setActiveView('dashboard');
            setIsMobileSidebarOpen(false);
          },
          isActive: activeView === 'dashboard' && !isMobileSidebarOpen
        },
        {
          id: 'parcels',
          label: language === 'fa' ? 'محموله‌ها' : language === 'ps' ? 'بارونه' : 'Parcels',
          icon: Boxes,
          onClick: () => {
            setActiveView('parcels');
            setIsMobileSidebarOpen(false);
          },
          isActive: activeView === 'parcels' && !isMobileSidebarOpen
        },
        {
          id: 'booking',
          label: language === 'fa' ? 'ثبت بار' : language === 'ps' ? 'نوی بار' : 'Booking',
          icon: PackagePlus,
          onClick: () => {
            setActiveView('booking');
            setIsMobileSidebarOpen(false);
          },
          isActive: activeView === 'booking' && !isMobileSidebarOpen
        },
        ...(isSuperAdmin
          ? [
              {
                id: 'remittances' as ActiveView,
                label: language === 'fa' ? 'حواله‌ها' : language === 'ps' ? 'حوالې' : 'Remit',
                icon: ArrowRightLeft,
                onClick: () => {
                  setActiveView('remittances');
                  setIsMobileSidebarOpen(false);
                },
                isActive: activeView === 'remittances' && !isMobileSidebarOpen
              }
            ]
          : [
              {
                id: 'tracking' as ActiveView,
                label: language === 'fa' ? 'پیگیری' : language === 'ps' ? 'څارنه' : 'Track',
                icon: Search,
                onClick: () => {
                  setActiveView('tracking');
                  setIsMobileSidebarOpen(false);
                },
                isActive: activeView === 'tracking' && !isMobileSidebarOpen
              }
            ]),
        {
          id: 'menu',
          label: language === 'fa' ? 'منو' : language === 'ps' ? 'مینو' : 'Menu',
          icon: Menu,
          onClick: () => setIsMobileSidebarOpen(!isMobileSidebarOpen),
          isActive: isMobileSidebarOpen
        }
      ];

  return (
    <nav 
      aria-label="Mobile Navigation"
      className="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] no-print pb-[env(safe-area-inset-bottom)]"
    >
      <div className="flex items-center justify-around h-16 px-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={item.onClick}
              type="button"
              className={`flex-1 flex flex-col items-center justify-center h-full py-1 px-1 transition-all relative cursor-pointer select-none ${
                item.isActive
                  ? 'text-red-600 dark:text-red-400 font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium'
              }`}
            >
              {item.isActive && (
                <span className="absolute top-0 inset-x-4 h-0.5 bg-red-600 dark:bg-red-400 rounded-full" />
              )}
              <div className={`p-1 rounded-xl transition-transform ${item.isActive ? 'scale-110 bg-red-50 dark:bg-red-950/40' : ''}`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] leading-tight truncate mt-0.5 max-w-[64px]">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
