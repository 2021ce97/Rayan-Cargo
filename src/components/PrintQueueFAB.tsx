import React, { useState } from 'react';
import { usePrintQueue } from '../hooks/usePrintQueue';
import { Printer } from 'lucide-react';
import { PrintQueue } from './PrintQueue';

export const PrintQueueFAB = () => {
  const { queue } = usePrintQueue();
  const [isOpen, setIsOpen] = useState(false);

  if (queue.length === 0) return null;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 bg-slate-900 hover:bg-slate-800 text-white rounded-full p-4 shadow-xl border border-slate-700 flex items-center justify-center gap-2 group animate-in slide-in-from-bottom-8"
      >
        <div className="relative">
          <Printer className="w-6 h-6" />
          <span className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-slate-900">
            {queue.length}
          </span>
        </div>
        <span className="font-bold text-sm max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 ease-in-out whitespace-nowrap">
          Offline Queue
        </span>
      </button>

      {isOpen && <PrintQueue onClose={() => setIsOpen(false)} />}
    </>
  );
};
