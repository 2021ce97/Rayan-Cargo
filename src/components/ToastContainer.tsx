import React from 'react';
import { 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle, 
  Info, 
  X
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ToastItem, ToastType } from '../types';

export const ToastContainer: React.FC = () => {
  const { 
    toasts, 
    dismissToast, 
    isRTL
  } = useApp();

  if (!toasts || toasts.length === 0) return null;

  const getStandardToastStyles = (type: ToastType) => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-emerald-50 dark:bg-emerald-950/90 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100 shadow-emerald-500/10',
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />,
          accent: 'bg-emerald-600 dark:bg-emerald-500'
        };
      case 'error':
        return {
          bg: 'bg-rose-50 dark:bg-rose-950/90 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-100 shadow-rose-500/10',
          icon: <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />,
          accent: 'bg-rose-600 dark:bg-rose-500'
        };
      case 'warning':
        return {
          bg: 'bg-amber-50 dark:bg-amber-950/90 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-100 shadow-amber-500/10',
          icon: <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />,
          accent: 'bg-amber-600 dark:bg-amber-500'
        };
      case 'info':
      default:
        return {
          bg: 'bg-slate-900/95 dark:bg-slate-900 border-slate-700 text-white shadow-slate-950/20',
          icon: <Info className="w-5 h-5 text-blue-400 shrink-0" />,
          accent: 'bg-blue-500'
        };
    }
  };

  return (
    <div 
      className="fixed top-4 end-4 z-[99999] flex flex-col gap-3 max-w-md w-full pointer-events-none p-3 sm:p-0 no-print"
      dir={isRTL ? 'rtl' : 'ltr'}
      id="global-toast-container"
    >
      {toasts.map((toast: ToastItem) => {
        // Standard System Toasts (Success, Error, Warning, Info)
        const styles = getStandardToastStyles(toast.type);
        return (
          <div
            key={toast.id}
            className={`pointer-events-auto relative overflow-hidden rounded-2xl border p-4 shadow-xl backdrop-blur-md transition-all animate-in fade-in slide-in-from-top-3 duration-300 ${styles.bg}`}
            role="alert"
          >
            {/* Top accent bar */}
            <div className={`absolute top-0 inset-x-0 h-1 ${styles.accent}`} />

            <div className="flex items-start gap-3">
              <div className="mt-0.5">{styles.icon}</div>
              
              <div className="flex-1 min-w-0 pr-2">
                {toast.title && (
                  <h5 className="text-xs font-bold uppercase tracking-wider mb-0.5 opacity-90">
                    {toast.title}
                  </h5>
                )}
                <p className="text-xs font-medium leading-relaxed break-words">
                  {toast.message}
                </p>
              </div>

              <button
                onClick={() => dismissToast(toast.id)}
                className="p-1 -mr-1 -mt-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                aria-label="Dismiss toast notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
