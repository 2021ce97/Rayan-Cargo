import React from 'react';
import { usePrintQueue } from '../hooks/usePrintQueue';
import { Printer, Trash2, X, AlertCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const PrintQueue = ({ onClose }: { onClose: () => void }) => {
  const { queue, removeJob, clearQueue } = usePrintQueue();
  const { setSelectedShipmentForReceipt, shipments, t } = useApp();

  const handlePrintJob = (shipmentId: string) => {
    const shipment = shipments.find(s => s.id === shipmentId);
    if (shipment) {
      setSelectedShipmentForReceipt(shipment);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="p-4 bg-slate-900 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-amber-400" />
            <h2 className="font-bold text-lg">Offline Print Queue</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto bg-slate-50">
          {queue.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Printer className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>No print jobs in the offline queue.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {queue.map(job => (
                <div key={job.id} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-800 font-mono text-sm flex items-center gap-2">
                      <span>{job.cnNumber}</span>
                      {(() => {
                        const s = shipments.find(item => item.id === job.shipmentId);
                        if (s && (s.printCount || 0) > 0) {
                          return (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                              Printed {s.printCount}x
                            </span>
                          );
                        }
                        return (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                            Pending Print
                          </span>
                        );
                      })()}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {new Date(job.timestamp).toLocaleString()} • {job.format.replace('thermal_', '')} • {job.role}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePrintJob(job.shipmentId)}
                      className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg font-bold text-xs"
                    >
                      Print Now
                    </button>
                    <button
                      onClick={() => removeJob(job.id)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {queue.length > 0 && (
          <div className="p-3 bg-white border-t border-slate-200 flex justify-end shrink-0">
            <button
              onClick={clearQueue}
              className="text-xs text-slate-500 hover:text-red-600 hover:underline px-3 py-1.5"
            >
              Clear Queue
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
