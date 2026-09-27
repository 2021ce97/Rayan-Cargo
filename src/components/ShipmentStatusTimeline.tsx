import React from 'react';
import { 
  CheckCircle2, 
  Clock, 
  Truck, 
  Building2, 
  Navigation, 
  Package, 
  AlertTriangle, 
  XCircle, 
  UserCheck, 
  Phone,
  FileCheck,
  MapPin,
  Calendar
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
  const { t, language } = useApp();

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

  const getStatusConfig = (status: ShipmentStatus, isIssue: boolean = false) => {
    if (isIssue) {
      return {
        label: t('delivery_attempt_failed') || 'Delivery Issue Reported',
        icon: <AlertTriangle className="w-4 h-4 text-amber-600" />,
        bg: 'bg-amber-100 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-100',
        dot: 'bg-amber-500 ring-amber-200 dark:ring-amber-900',
        badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200'
      };
    }

    switch (status) {
      case 'pre_booked':
        return {
          label: t('status_pre_booked') || 'Pre-Booked Online',
          icon: <Clock className="w-4 h-4 text-purple-600 dark:text-purple-400" />,
          bg: 'bg-purple-50/80 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800 text-purple-950 dark:text-purple-100',
          dot: 'bg-purple-600 ring-purple-200 dark:ring-purple-900',
          badge: 'bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-200'
        };
      case 'verified':
        return {
          label: t('status_verified') || 'Verified at Origin Scale',
          icon: <FileCheck className="w-4 h-4 text-teal-600 dark:text-teal-400" />,
          bg: 'bg-teal-50/80 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800 text-teal-950 dark:text-teal-100',
          dot: 'bg-teal-600 ring-teal-200 dark:ring-teal-900',
          badge: 'bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-200'
        };
      case 'booked':
        return {
          label: t('status_booked') || 'Booked & Manifested',
          icon: <Package className="w-4 h-4 text-blue-600 dark:text-blue-400" />,
          bg: 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-950 dark:text-blue-100',
          dot: 'bg-blue-600 ring-blue-200 dark:ring-blue-900',
          badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200'
        };
      case 'in_transit':
        return {
          label: t('status_in_transit') || 'In-Transit Freight',
          icon: <Truck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />,
          bg: 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 text-indigo-950 dark:text-indigo-100',
          dot: 'bg-indigo-600 ring-indigo-200 dark:ring-indigo-900',
          badge: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200'
        };
      case 'received_at_branch':
        return {
          label: t('status_received_at_branch') || 'Arrived at Destination Hub',
          icon: <Building2 className="w-4 h-4 text-sky-600 dark:text-sky-400" />,
          bg: 'bg-sky-50/80 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800 text-sky-950 dark:text-sky-100',
          dot: 'bg-sky-600 ring-sky-200 dark:ring-sky-900',
          badge: 'bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-200'
        };
      case 'out_for_delivery':
        return {
          label: t('status_out_for_delivery') || 'Out for Rider Delivery',
          icon: <Navigation className="w-4 h-4 text-orange-600 dark:text-orange-400" />,
          bg: 'bg-orange-50/80 dark:bg-orange-950/40 border-orange-200 dark:border-orange-800 text-orange-950 dark:text-orange-100',
          dot: 'bg-orange-600 ring-orange-200 dark:ring-orange-900',
          badge: 'bg-orange-100 text-orange-800 dark:bg-orange-900/60 dark:text-orange-200'
        };
      case 'delivered':
        return {
          label: t('status_delivered') || 'Delivered to Consignee',
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
          bg: 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-950 dark:text-emerald-100',
          dot: 'bg-emerald-600 ring-emerald-200 dark:ring-emerald-900',
          badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200'
        };
      case 'returned':
      case 'cancelled':
        return {
          label: t(`status_${status}`) || status.toUpperCase(),
          icon: <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />,
          bg: 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-950 dark:text-rose-100',
          dot: 'bg-rose-600 ring-rose-200 dark:ring-rose-900',
          badge: 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200'
        };
      default: {
        const rawStr = String(status || 'unknown');
        return {
          label: rawStr.replace(/_/g, ' ').toUpperCase(),
          icon: <Clock className="w-4 h-4 text-slate-600 dark:text-slate-400" />,
          bg: 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100',
          dot: 'bg-slate-600 ring-slate-200 dark:ring-slate-800',
          badge: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200'
        };
      }
    }
  };

  const formatTimestamp = (iso: string): { dateStr: string; timeStr: string; full: string } => {
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return { dateStr: iso, timeStr: '', full: iso };
      
      const dateStr = d.toLocaleDateString(language === 'fa' ? 'fa-AF' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
      const timeStr = d.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });

      return { dateStr, timeStr, full: `${dateStr} • ${timeStr}` };
    } catch {
      return { dateStr: iso, timeStr: '', full: iso };
    }
  };

  return (
    <div className={`space-y-4 ${className}`} id="shipment-status-timeline">
      <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-red-600" />
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200">
            {t('status_history_timeline') || 'Status Transition Timeline (تاریخچه و مراحل انتقال)'}
          </h4>
        </div>
        <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
          {items.length} {t('records_count') || 'Milestones'}
        </span>
      </div>

      <div className="relative ps-6 sm:ps-8 space-y-4 before:absolute before:inset-y-2 before:start-2.5 sm:before:start-3.5 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
        {items.map((item, index) => {
          const isLatest = index === items.length - 1;
          const isIssue = item.note?.startsWith('Delivery Issue:') || false;
          const config = getStatusConfig(item.status, isIssue);
          const timeData = formatTimestamp(item.timestamp);

          return (
            <div key={item.id || `hist-${index}`} className="relative group">
              
              {/* Timeline Pin Circle */}
              <div 
                className={`absolute -start-6 sm:-start-8 top-1.5 w-5 sm:w-7 h-5 sm:h-7 rounded-full flex items-center justify-center text-white ring-4 transition-transform group-hover:scale-110 shadow-xs ${config.dot}`}
              >
                <div className="scale-75 sm:scale-90">
                  {config.icon}
                </div>
              </div>

              {/* Card Body */}
              <div className={`rounded-2xl border p-3.5 sm:p-4 transition-all shadow-2xs ${config.bg} ${
                isLatest ? 'ring-2 ring-red-500/20 dark:ring-red-500/30' : ''
              }`}>
                
                {/* Header: Status Name & Date/Time */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-1.5 border-b border-slate-200/60 dark:border-slate-700/60">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider ${config.badge}`}>
                      {config.label}
                    </span>
                    {isLatest && (
                      <span className="px-1.5 py-0.5 rounded text-[9.5px] font-extrabold bg-emerald-500 text-white uppercase animate-pulse">
                        Current
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                    <Calendar className="w-3.5 h-3.5 opacity-70" />
                    <span className="font-semibold">{timeData.dateStr}</span>
                    <span className="text-slate-400 dark:text-slate-500">at</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">{timeData.timeStr}</span>
                  </div>
                </div>

                {/* Location & Operator info */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                    <MapPin className="w-3.5 h-3.5 text-red-600 shrink-0" />
                    <span>{item.location || item.branchName || 'Cargo Terminal'}</span>
                    {item.branchName && item.location !== item.branchName && (
                      <span className="text-[11px] font-normal text-slate-500">({item.branchName})</span>
                    )}
                  </div>

                  {item.updatedBy && (
                    <div className="flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-400">
                      <UserCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                      <span>Officer: <strong>{item.updatedBy}</strong></span>
                    </div>
                  )}
                </div>

                {/* Notes and description - Only show issue reasons, custom remarks, or bill submission (no large boilerplate) */}
                {item.note && (
                  (() => {
                    const isBoilerplate = 
                      item.note.startsWith('Status updated to') || 
                      item.note.startsWith('Parcel pre-registered online by sender');
                    
                    if (isBoilerplate && !isIssue) return null;

                    const isBillSubmission = item.note.includes('bill submitted') || item.note.includes('Bill submitted');

                    return (
                      <div className={`mt-2 p-2.5 rounded-xl border text-xs leading-relaxed ${
                        isIssue
                          ? 'bg-amber-100/90 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-100 font-semibold'
                          : isBillSubmission
                          ? 'bg-blue-50/90 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800 text-blue-950 dark:text-blue-100 font-semibold'
                          : 'bg-white/70 dark:bg-slate-900/60 border-slate-200/50 dark:border-slate-700/50 text-slate-700 dark:text-slate-300'
                      }`}>
                        {isIssue ? (
                          <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-200">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>{t('issue_reason_lbl') || 'Reason'}: {item.note.replace('Delivery Issue:', '').trim()}</span>
                          </div>
                        ) : isBillSubmission ? (
                          <div className="flex items-center gap-1.5 font-bold text-blue-700 dark:text-blue-300 text-[11px]">
                            <FileCheck className="w-3.5 h-3.5" />
                            <span>{t('parcel_submitted_badge') || 'One-Time Bill Submitted'}</span>
                          </div>
                        ) : (
                          item.note
                        )}
                      </div>
                    );
                  })()
                )}

                {/* Driver / Courier if recorded */}
                {(item.driverName || item.driverPhone) && (
                  <div className="mt-2 pt-2 border-t border-slate-200/50 dark:border-slate-700/50 flex flex-wrap items-center justify-between text-[11px] text-slate-600 dark:text-slate-400">
                    <span className="font-semibold">Assigned Rider: {item.driverName || 'Rider'}</span>
                    {item.driverPhone && (
                      <span className="font-mono font-bold flex items-center gap-1" dir="ltr">
                        <Phone className="w-3 h-3 text-emerald-600" />
                        {item.driverPhone}
                      </span>
                    )}
                  </div>
                )}

              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
