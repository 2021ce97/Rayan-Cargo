import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, Building2, MapPin, X, Lock } from 'lucide-react';
import { Branch } from '../types';
import { useApp } from '../context/AppContext';

interface BranchSearchSelectProps {
  branches: Branch[];
  selectedBranchId: string;
  onChange: (branchId: string) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  disabledBadge?: string;
  error?: string;
  excludeBranchId?: string;
  className?: string;
  id?: string;
}

export const BranchSearchSelect: React.FC<BranchSearchSelectProps> = ({
  branches,
  selectedBranchId,
  onChange,
  label,
  placeholder,
  disabled = false,
  disabledBadge,
  error,
  excludeBranchId,
  className = '',
  id
}) => {
  const { language } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Helper to normalize strings for robust search across Dari, Pashto, English
  const normalize = (str: string = '') => {
    return str
      .toLowerCase()
      .replace(/[\u064A\u0649]/g, '\u06CC') // Arabic Yeh to Persian/Pashto Yeh
      .replace(/[\u0643]/g, '\u06A9')       // Arabic Kaf to Persian/Pashto Kaf
      .trim();
  };

  const getLocalizedBranchName = (b?: Branch | null): string => {
    if (!b) return '';
    if (language === 'fa' && b.nameFa) return b.nameFa;
    if (language === 'ps' && b.namePs) return b.namePs;
    return b.name || b.city || b.code;
  };

  const selectedBranch = branches.find(b => b.id === selectedBranchId);

  // Filter branches based on search query and excluded branch ID
  const filteredBranches = branches.filter(b => {
    if (excludeBranchId && b.id === excludeBranchId) return false;
    if (!searchQuery.trim()) return true;

    const query = normalize(searchQuery);
    const nameEn = normalize(b.name);
    const nameFa = normalize(b.nameFa);
    const namePs = normalize(b.namePs);
    const city = normalize(b.city);
    const province = normalize(b.province);
    const code = normalize(b.code);

    return (
      nameEn.includes(query) ||
      nameFa.includes(query) ||
      namePs.includes(query) ||
      city.includes(query) ||
      province.includes(query) ||
      code.includes(query)
    );
  });

  // Handle outside click to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Focus search input on open
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleSelect = (branchId: string) => {
    onChange(branchId);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div className={`relative ${className}`} ref={containerRef} id={id}>
      {label && (
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
          <span>{label}</span>
          {disabled && disabledBadge && (
            <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
              <Lock className="w-2.5 h-2.5" />
              {disabledBadge}
            </span>
          )}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setIsOpen(!isOpen);
            setSearchQuery('');
          }
        }}
        className={`w-full min-h-[44px] px-3.5 py-2 text-xs rounded-xl flex items-center justify-between gap-2 border transition-all text-start cursor-pointer ${
          disabled
            ? 'bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 cursor-not-allowed'
            : isOpen
            ? 'bg-white dark:bg-slate-900 border-red-500 ring-2 ring-red-500/20 shadow-md'
            : error
            ? 'bg-red-50/50 dark:bg-red-950/20 border-red-400 dark:border-red-600 text-slate-900 dark:text-white'
            : 'bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white shadow-xs'
        }`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
            selectedBranch ? 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
          }`}>
            <Building2 className="w-3.5 h-3.5" />
          </div>
          
          {selectedBranch ? (
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-black text-xs text-slate-900 dark:text-white truncate">
                  {getLocalizedBranchName(selectedBranch)}
                </span>
                <span className="px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-mono font-bold">
                  {selectedBranch.code}
                </span>
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 truncate">
                <MapPin className="w-2.5 h-2.5 shrink-0" />
                <span>{selectedBranch.city} {selectedBranch.province ? `• ${selectedBranch.province}` : ''}</span>
              </div>
            </div>
          ) : (
            <span className="text-slate-400 dark:text-slate-500 font-medium">
              {placeholder || (language === 'fa' ? 'انتخاب یا جستجوی نمایندگی...' : language === 'ps' ? 'د څانګې لټون یا ټاکل...' : 'Select or search branch...')}
            </span>
          )}
        </div>

        {!disabled && (
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ${isOpen ? 'rotate-180 text-red-500' : ''}`} />
        )}
      </button>

      {error && (
        <p className="text-[11px] text-red-500 dark:text-red-400 mt-1 font-medium">{error}</p>
      )}

      {/* Floating Dropdown with Search */}
      {isOpen && !disabled && (
        <div 
          className="absolute left-0 right-0 top-full mt-1.5 z-[100] bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 flex flex-col max-h-80"
          role="listbox"
        >
          {/* Search Header Input */}
          <div className="p-2.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700/80 flex items-center gap-2">
            <Search className="w-4 h-4 text-red-500 shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={language === 'fa' ? 'جستجوی نام شهر، ولایت یا کد نمایندگی...' : language === 'ps' ? 'د ښار، ولایت یا کوډ له مخې لټون...' : 'Search by name, city, province or code...'}
              className="w-full bg-transparent text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Counter */}
          <div className="px-3 py-1 bg-slate-100/70 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 text-[10px] text-slate-500 flex items-center justify-between font-mono">
            <span>{filteredBranches.length} {language === 'fa' ? 'نمایندگی یافت شد' : language === 'ps' ? 'څانګې وموندل شوې' : 'branches found'}</span>
            <span className="text-[9px] uppercase font-bold text-slate-400">ESC to close</span>
          </div>

          {/* Branch List */}
          <div className="overflow-y-auto max-h-56 divide-y divide-slate-100 dark:divide-slate-800/60 p-1">
            {filteredBranches.length === 0 ? (
              <div className="p-6 text-center space-y-2">
                <Building2 className="w-6 h-6 text-slate-300 dark:text-slate-600 mx-auto" />
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  {language === 'fa' ? 'هیچ نمایندگی با این مشخصات یافت نشد' : language === 'ps' ? 'هیڅ څانګه ونه موندل شوه' : 'No branches match your search'}
                </p>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-[11px] font-bold text-red-600 dark:text-red-400 hover:underline cursor-pointer"
                >
                  {language === 'fa' ? 'پاک کردن جستجو' : 'Clear search'}
                </button>
              </div>
            ) : (
              filteredBranches.map(branch => {
                const isSelected = branch.id === selectedBranchId;
                const localizedName = getLocalizedBranchName(branch);

                return (
                  <button
                    key={branch.id}
                    type="button"
                    onClick={() => handleSelect(branch.id)}
                    className={`w-full p-2.5 rounded-xl text-start flex items-center justify-between gap-2.5 transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-red-50 dark:bg-red-950/40 text-red-900 dark:text-red-200 font-bold'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-800 dark:text-slate-200'
                    }`}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected 
                          ? 'bg-red-600 text-white shadow-xs' 
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}>
                        <Building2 className="w-3.5 h-3.5" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs truncate">{localizedName}</span>
                          <span className="px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-300 text-[10px] font-mono font-bold">
                            {branch.code}
                          </span>
                          {branch.isHeadOffice && (
                            <span className="px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[9px] font-bold">
                              HQ
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                          <MapPin className="w-2.5 h-2.5 shrink-0" />
                          <span>{branch.city} {branch.province ? `(${branch.province})` : ''} {branch.phone ? `• ☎ ${branch.phone}` : ''}</span>
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3" />
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
