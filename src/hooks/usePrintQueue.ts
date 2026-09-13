import { useState, useEffect } from 'react';

export interface PrintJob {
  id: string;
  timestamp: number;
  cnNumber: string;
  format: 'standard' | 'thermal_80mm' | 'thermal_80x80';
  role: 'buyer' | 'seller';
  shipmentId: string;
}

export function usePrintQueue() {
  const [queue, setQueue] = useState<PrintJob[]>(() => {
    try {
      const saved = localStorage.getItem('rayan_offline_print_queue');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('rayan_offline_print_queue', JSON.stringify(queue));
  }, [queue]);

  const enqueue = (job: Omit<PrintJob, 'id' | 'timestamp'>) => {
    const newJob: PrintJob = {
      ...job,
      id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
      timestamp: Date.now(),
    };
    setQueue(prev => [newJob, ...prev]);
  };

  const removeJob = (id: string) => {
    setQueue(prev => prev.filter(j => j.id !== id));
  };

  const clearQueue = () => {
    setQueue([]);
  };

  return { queue, enqueue, removeJob, clearQueue };
}
