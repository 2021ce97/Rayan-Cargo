import React, { useState } from 'react';
import { 
  AlertTriangle, 
  X, 
  PhoneOff, 
  MapPinOff, 
  Clock, 
  FileQuestion, 
  UserX, 
  CheckCircle2, 
  User, 
  Phone, 
  MapPin 
} from 'lucide-react';
import { Shipment } from '../types';
import { useApp } from '../context/AppContext';

interface ReportDeliveryIssueModalProps {
  shipment: Shipment | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ReportDeliveryIssueModal: React.FC<ReportDeliveryIssueModalProps> = ({
  shipment,
  onClose,
  onSuccess
}) => {
  const { t, reportDeliveryIssue } = useApp();
  const [selectedReason, setSelectedReason] = useState<string>('no_answer');
  const [customNote, setCustomNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!shipment) return null;

  const reasonOptions = [
    {
      id: 'no_answer',
      label: t('issue_no_answer') || "Receiver Didn't Answer (تماس بی‌پاسخ)",
      icon: PhoneOff,
      color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800'
    },
    {
      id: 'incorrect_number',
      label: t('issue_wrong_number') || 'Incorrect / Inactive Phone Number (شماره اشتباه)',
      icon: PhoneOff,
      color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800'
    },
    {
      id: 'not_available',
      label: t('issue_not_available') || 'Receiver Not Available / Out of City (عدم حضور گیرنده)',
      icon: Clock,
      color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800'
    },
    {
      id: 'postponed',
      label: t('issue_postponed') || 'Postponed at Customer Request (به تعویق افتاد)',
      icon: Clock,
      color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800'
    },
    {
      id: 'wrong_address',
      label: t('issue_wrong_address') || 'Incomplete / Wrong Address (آدرس اشتباه یا ناقص)',
      icon: MapPinOff,
      color: 'text-orange-600 bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-800'
    },
    {
      id: 'refused',
      label: t('issue_refused') || 'Receiver Refused Package (بسته توسط گیرنده رد شد)',
      icon: UserX,
      color: 'text-red-600 bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800'
    },
    {
      id: 'other',
      label: t('issue_other') || 'Other Reason / Custom Note (سایر دلایل)',
      icon: FileQuestion,
      color: 'text-slate-600 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
    }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const ok = reportDeliveryIssue(shipment.id, selectedReason, customNote.trim() || undefined);
      if (ok) {
        if (onSuccess) onSuccess();
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-red-500/10 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
                <span>{t('report_not_delivered_title') || 'Report Delivery Issue / Undelivered'}</span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {t('delivery_issue_sub') || 'Select reason why order was not handed over to consignee'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Parcel Quick Reference Strip */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
            <User className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <span className="font-bold truncate">{shipment.receiver?.name}</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-mono" dir="ltr">
            <Phone className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span className="truncate">{shipment.receiver?.phone}</span>
          </div>
          <div className="col-span-2 flex items-center justify-between pt-1 border-t border-slate-200/50 dark:border-slate-700/50 text-[11px] text-slate-500">
            <span className="font-mono font-bold text-slate-900 dark:text-slate-100">CN: {shipment.cnNumber}</span>
            <span className="truncate">{shipment.receiver?.city} • {shipment.receiver?.address}</span>
          </div>
        </div>

        {/* Reason Selector Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              {t('issue_reason_lbl') || 'Select Reason for Non-Delivery (انتخاب دلیل عدم تحویل):'}
            </label>
            
            <div className="space-y-1.5 max-h-56 overflow-y-auto pe-1">
              {reasonOptions.map((opt) => {
                const Icon = opt.icon;
                const isSelected = selectedReason === opt.id;

                return (
                  <label
                    key={opt.id}
                    className={`flex items-center gap-3 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                      isSelected
                        ? 'border-amber-500 bg-amber-50/80 dark:bg-amber-950/40 text-amber-950 dark:text-amber-100 ring-2 ring-amber-500/20 shadow-xs'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="deliveryIssueReason"
                      value={opt.id}
                      checked={isSelected}
                      onChange={() => setSelectedReason(opt.id)}
                      className="w-4 h-4 text-amber-600 focus:ring-amber-500 cursor-pointer"
                    />
                    <Icon className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                    <span className="font-semibold flex-1">{opt.label}</span>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />}
                  </label>
                );
              })}
            </div>
          </div>

          {/* Additional Notes Textarea */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {t('custom_issue_note_lbl') || 'Detailed Explanation / Remarks (توضیحات تکمیلی):'}
            </label>
            <textarea
              rows={2}
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              placeholder="e.g. Called customer 3 times with no response. Will re-attempt delivery tomorrow."
              className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Notice will immediately be visible to customer on live tracking and within their portal account.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <AlertTriangle className="w-4 h-4" />
              <span>{t('btn_submit_issue') || 'Submit Issue Report (ثبت عدم تحویل)'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
