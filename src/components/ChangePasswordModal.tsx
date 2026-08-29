import React, { useState } from 'react';
import { KeyRound, Lock, Eye, EyeOff, CheckCircle2, ShieldCheck, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Branch } from '../types';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ isOpen, onClose }) => {
  const { t, language, currentUser, changePassword, branches } = useApp();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const currentBranch = branches.find(b => b.id === currentUser.branchId);

  const getLocalizedBranchName = (b: Branch | undefined) => {
    if (!b) return t('assigned_branch');
    if (language === 'fa' && b.nameFa) return b.nameFa;
    if (language === 'ps' && b.namePs) return b.namePs;
    return b.name;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 4) {
      setError(t('min_password_length'));
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t('passwords_dont_match'));
      return;
    }

    const ok = changePassword(newPassword);
    if (ok) {
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setNewPassword('');
        setConfirmPassword('');
        onClose();
      }, 1500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-400">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">{t('change_branch_password_title')}</h3>
              <p className="text-xs text-slate-400">
                {currentBranch ? getLocalizedBranchName(currentBranch) : t('role_branch_manager')}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-start gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-bold">{t('branch_revenue_privacy_enforced')}:</span>
              <p className="mt-0.5 text-slate-600">
                {t('branch_ownership_notice')}
              </p>
            </div>
          </div>

          {success ? (
            <div className="py-8 text-center space-y-3">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h4 className="text-base font-bold text-slate-900">{t('password_updated_success')}</h4>
              <p className="text-xs text-slate-500">{t('encrypted_badge')}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  {t('new_password_lbl')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder={t('login_password_placeholder')}
                    required
                    className="w-full ps-9 pe-10 py-2.5 rounded-xl border border-slate-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 text-sm outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 end-0 pe-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  {t('confirm_password_lbl')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={t('confirm_password_lbl')}
                    required
                    className="w-full ps-9 pe-3 py-2.5 rounded-xl border border-slate-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 text-sm outline-none transition-all"
                  />
                </div>
              </div>

              {error && (
                <p className="text-xs text-rose-600 font-semibold bg-rose-50 p-2.5 rounded-lg border border-rose-200">
                  {error}
                </p>
              )}

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  {t('close_button')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-md shadow-red-600/20 transition-all cursor-pointer"
                >
                  {t('btn_update_password')}
                </button>
              </div>

            </form>
          )}

        </div>

      </div>
    </div>
  );
};
