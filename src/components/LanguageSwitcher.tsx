import React, { useState, useRef, useEffect } from 'react';
import { Languages, ChevronDown, Check } from 'lucide-react';
import { useI18n } from '../context/I18nContext';
import { Language } from '../types';

interface LanguageSwitcherProps {
  variant?: 'compact' | 'dropdown' | 'segmented';
  className?: string;
}

interface LanguageOption {
  code: Language;
  label: string;
  nativeLabel: string;
  flagText: string;
  dir: 'ltr' | 'rtl';
}

const LANGUAGES: LanguageOption[] = [
  {
    code: 'en',
    label: 'English',
    nativeLabel: 'English (US)',
    flagText: 'EN',
    dir: 'ltr'
  },
  {
    code: 'fa',
    label: 'Dari',
    nativeLabel: 'دری (افغانستان)',
    flagText: 'دری',
    dir: 'rtl'
  },
  {
    code: 'ps',
    label: 'Pashto',
    nativeLabel: 'پښتو (افغانستان)',
    flagText: 'پښتو',
    dir: 'rtl'
  }
];

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  variant = 'dropdown',
  className = ''
}) => {
  const { language, setLanguage, t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentOption = LANGUAGES.find(l => l.code === language) || LANGUAGES[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (variant === 'segmented') {
    return (
      <div className={`inline-flex items-center p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/80 ${className}`}>
        {LANGUAGES.map(opt => {
          const isActive = language === opt.code;
          return (
            <button
              key={opt.code}
              type="button"
              onClick={() => setLanguage(opt.code)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                isActive
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>{opt.flagText}</span>
              <span className="hidden sm:inline text-[11px] font-medium opacity-90">{opt.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        id="btn-language-switcher"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Select Application Language"
        className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer shadow-2xs"
        title="Switch Language: English / دری / پښتو"
      >
        <Languages className="w-3.5 h-3.5 text-red-600 dark:text-red-400 shrink-0" />
        <span className="font-bold text-[11px] sm:text-xs tracking-wide">{currentOption.flagText}</span>
        <ChevronDown className={`w-3 h-3 text-slate-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div 
          className="absolute end-0 mt-2 w-52 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100"
          role="listbox"
        >
          <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>{t('theme_toggle', 'Application Language')}</span>
            <span className="text-[9px] font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-500">
              3 Languages
            </span>
          </div>

          {LANGUAGES.map(opt => {
            const isSelected = language === opt.code;
            return (
              <button
                key={opt.code}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  setLanguage(opt.code);
                  setIsOpen(false);
                }}
                className={`w-full text-start px-3.5 py-2.5 text-xs flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors cursor-pointer ${
                  isSelected
                    ? 'text-red-600 dark:text-red-400 font-bold bg-red-50/60 dark:bg-red-950/30'
                    : 'text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className={`w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-black border ${
                    isSelected 
                      ? 'bg-red-600 text-white border-red-600' 
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                  }`}>
                    {opt.flagText.slice(0, 2)}
                  </span>
                  <div>
                    <div className="font-semibold">{opt.nativeLabel}</div>
                    <div className="text-[10px] text-slate-400 font-normal">{opt.label} • {opt.dir.toUpperCase()}</div>
                  </div>
                </div>

                {isSelected && (
                  <Check className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
