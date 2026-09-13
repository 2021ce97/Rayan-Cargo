import React from 'react';
import { useApp } from '../context/AppContext';
import { Settings, X, Printer, Monitor } from 'lucide-react';

export const SystemSettingsModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const { receiptPrintMode, setReceiptPrintMode, t, currentUser } = useApp();

  if (!isOpen || currentUser.role !== 'super_admin') return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        <div className="p-4 bg-slate-900 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-slate-300" />
            <h2 className="font-bold text-lg">System Settings</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto space-y-6 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
          
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300 pb-2 border-b border-slate-200 dark:border-slate-800">
              <Printer className="w-4 h-4" />
              <h3>Global Printer Settings</h3>
            </div>
            
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Set the default global receipt format for all branches and customer portals.
            </p>

            <div className="grid grid-cols-2 gap-3 mt-2">
              <button
                onClick={() => setReceiptPrintMode('thermal')}
                className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                  receiptPrintMode === 'thermal'
                    ? 'border-red-600 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                  <Monitor className="w-4 h-4" />
                </div>
                <div className="text-center">
                  <div className="font-bold text-sm">80mm Thermal</div>
                  <div className="text-[10px] opacity-80">Default Point of Sale</div>
                </div>
              </button>

              <button
                onClick={() => setReceiptPrintMode('a4')}
                className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                  receiptPrintMode === 'a4'
                    ? 'border-red-600 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                  <Printer className="w-4 h-4" />
                </div>
                <div className="text-center">
                  <div className="font-bold text-sm">Legacy A4</div>
                  <div className="text-[10px] opacity-80">Standard Office Printer</div>
                </div>
              </button>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
};
