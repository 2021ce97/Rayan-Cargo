import React from 'react';
import { useApp } from '../context/AppContext';
import { Settings, X, Printer, Monitor, User as UserIcon } from 'lucide-react';

export const SystemSettingsModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const { receiptPrintMode, setReceiptPrintMode, updateUserPreferences, t, currentUser } = useApp();

  if (!isOpen) return null;

  const userPrintMode = currentUser.preferences?.receiptPrintMode || 'auto';

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

        <div className="p-6 flex-1 overflow-y-auto space-y-8 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
          
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300 pb-2 border-b border-slate-200 dark:border-slate-800">
              <UserIcon className="w-4 h-4" />
              <h3>My Printer Preference</h3>
            </div>
            
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Set your personal default printer format. This overrides the global setting and persists across your devices.
            </p>

            <div className="grid grid-cols-3 gap-2 mt-2">
              <button
                onClick={() => updateUserPreferences({ receiptPrintMode: 'auto' })}
                className={`p-3 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                  userPrintMode === 'auto'
                    ? 'border-red-600 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="text-center">
                  <div className="font-bold text-sm">Auto</div>
                  <div className="text-[10px] opacity-80">Use Global</div>
                </div>
              </button>

              <button
                onClick={() => updateUserPreferences({ receiptPrintMode: 'thermal' })}
                className={`p-3 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                  userPrintMode === 'thermal'
                    ? 'border-red-600 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="text-center">
                  <div className="font-bold text-sm">80mm</div>
                  <div className="text-[10px] opacity-80">Thermal</div>
                </div>
              </button>

              <button
                onClick={() => updateUserPreferences({ receiptPrintMode: 'a4' })}
                className={`p-3 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                  userPrintMode === 'a4'
                    ? 'border-red-600 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="text-center">
                  <div className="font-bold text-sm">A4</div>
                  <div className="text-[10px] opacity-80">Standard</div>
                </div>
              </button>
            </div>
          </div>

          {currentUser.role === 'super_admin' && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300 pb-2 border-b border-slate-200 dark:border-slate-800">
                <Printer className="w-4 h-4" />
                <h3>Global Printer Settings</h3>
              </div>
              
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Set the default global receipt format for all branches and customer portals (applies if user preference is Auto).
              </p>

              <div className="grid grid-cols-2 gap-3 mt-2">
                <button
                  onClick={() => setReceiptPrintMode('thermal')}
                  className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                    receiptPrintMode === 'thermal'
                      ? 'border-slate-800 bg-slate-800 text-white'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${receiptPrintMode === 'thermal' ? 'bg-slate-700 text-white' : 'bg-slate-100 dark:bg-slate-800'}`}>
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
                      ? 'border-slate-800 bg-slate-800 text-white'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${receiptPrintMode === 'a4' ? 'bg-slate-700 text-white' : 'bg-slate-100 dark:bg-slate-800'}`}>
                    <Printer className="w-4 h-4" />
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-sm">Legacy A4</div>
                    <div className="text-[10px] opacity-80">Standard Office Printer</div>
                  </div>
                </button>
              </div>
            </div>
          )}
          
        </div>
      </div>
    </div>
  );
};
