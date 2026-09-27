import React from 'react';
import { 
  Clock, 
  AlertTriangle, 
  Check
} from 'lucide-react';
import { StatusHistoryItem, ShipmentStatus } from '../types';
import { useApp } from '../context/AppContext';

interface ShipmentStatusTimelineProps {
  history?: StatusHistoryItem[];
  currentStatus?: ShipmentStatus;
  bookedAt?: string;
  className?: string;
}

export const ShipmentStatusTimeline: React.FC<ShipmentStatusTimelineProps> = ({
  history = [],
  currentStatus,
  bookedAt,
  className = ''
}) => {
  const { t } = useApp();

  // Sort history chronologically or fallback
  const items: StatusHistoryItem[] = history && history.length > 0 
    ? [...history].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    : bookedAt ? [{
        id: 'init-0',
        status: currentStatus || 'booked',
        location: 'Origin Terminal',
        branchName: 'Origin Hub',
        timestamp: bookedAt,
        note: 'Consignment booked in system',
        updatedBy: 'Terminal Officer'
      }] : [];

  const getStatusLabel = (status: ShipmentStatus, isIssue: boolean = false) => {
    if (isIssue) {
      return t('delivery_attempt_failed') || 'Delivery Attempt Failed';
    }

    switch (status) {
      case 'pre_booked':
        return t('status_pre_booked') || 'Pre-Booked';
      case 'verified':
        return t('status_verified') || 'Verified at Scale';
      case 'booked':
        return t('status_booked') || 'Drop at Origin';
      case 'in_transit':
        return t('status_in_transit') || 'In Transit';
      case 'received_at_branch':
        return t('status_received_at_branch') || 'At Destination Hub';
      case 'out_for_delivery':
        return t('status_out_for_delivery') || 'Out for Delivery';
      case 'delivered':
        return t('status_delivered') || 'Delivered';
      case 'returned':
        return t('status_returned') || 'Returned';
      case 'cancelled':
        return t('status_cancelled') || 'Cancelled';
      default: {
        const rawStr = String(status || 'unknown');
        return t(`status_${status}` as any) || rawStr.replace(/_/g, ' ').toUpperCase();
      }
    }
  };

  return (
    <div className={`space-y-3 ${className}`} id="shipment-status-timeline">
      <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-red-600" />
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200">
            {t('timeline_title') || t('status_history_timeline') || 'Consignment Tracking History'}
          </h4>
        </div>
        <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
          {items.length} {t('records_count') || 'Milestones'}
        </span>
      </div>

      <div className="relative ps-6 space-y-2.5 before:absolute before:inset-y-1 before:start-2.5 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
        {items.map((item, index) => {
          const isLatest = index === items.length - 1;
          const isIssue = item.note?.startsWith('Delivery Issue:') || false;
          const label = getStatusLabel(item.status, isIssue);

          return (
            <div key={item.id || `hist-${index}`} className="relative group">
              {/* Timeline Pin Circle */}
              <div 
                className={`absolute -start-6 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center text-white ring-2 ring-white dark:ring-slate-900 shadow-xs ${
                  isIssue 
                    ? 'bg-amber-500' 
                    : isLatest 
                    ? 'bg-red-600' 
                    : 'bg-emerald-600'
                }`}
              >
                {isIssue ? (
                  <AlertTriangle className="w-3 h-3" />
                ) : (
                  <Check className="w-3 h-3" />
                )}
              </div>

              {/* Just Status Name */}
              <div className={`rounded-xl border px-3.5 py-2.5 flex items-center justify-between transition-all ${
                isIssue 
                  ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/60' 
                  : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200/60 dark:border-slate-800'
              } ${isLatest ? 'ring-2 ring-red-500/20 dark:ring-red-500/30' : ''}`}>
                <span className={`font-bold text-xs sm:text-sm ${
                  isIssue 
                    ? 'text-amber-900 dark:text-amber-200' 
                    : 'text-slate-900 dark:text-slate-100'
                }`}>
                  {label}
                </span>
                {isLatest && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-500 text-white uppercase">
                    Current
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
