import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Language, Branch, ShipmentStatus } from '../types';
import { translations } from '../i18n/translations';

export interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  isRTL: boolean;
  dir: 'rtl' | 'ltr';
  t: (key: string, defaultText?: string) => string;
  formatAfn: (amount: number | string | undefined) => string;
  formatNumber: (num: number | string | undefined) => string;
  formatDate: (dateStr: string | undefined | null) => string;
  getLocalizedBranchName: (branch: Branch | undefined) => string;
  getLocalizedStatusName: (status: ShipmentStatus | string | undefined) => string;
  getLocalizedCategory: (category: string | undefined) => string;
  getLocalizedExpenseCategory: (category: string | undefined) => string;
}

const STORAGE_KEY_LANGUAGE = 'rayan_cargo_language';

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_LANGUAGE);
    return (saved as Language) || 'en';
  });

  const isRTL = language === 'fa' || language === 'ps';
  const dir = isRTL ? 'rtl' : 'ltr';

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem(STORAGE_KEY_LANGUAGE, lang);
  }, []);

  // Update HTML DOM attributes for RTL / LTR layout and font pairing
  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = language;
  }, [dir, language]);

  const t = useCallback((key: string, defaultText?: string): string => {
    if (!key) return defaultText || '';
    const localized = translations[language]?.[key];
    if (localized !== undefined && localized !== '') return localized;
    const fallbackEn = translations['en']?.[key];
    if (fallbackEn !== undefined && fallbackEn !== '') return fallbackEn;
    return defaultText || key;
  }, [language]);

  const formatAfn = useCallback((amount: number | string | undefined): string => {
    if (amount === undefined || amount === null) return `0 ${t('afn_curr', 'AFN')}`;
    const val = typeof amount === 'string' ? parseFloat(amount) || 0 : amount;
    const formatted = Math.round(val).toLocaleString(language === 'en' ? 'en-US' : 'fa-AF');
    return `${formatted} ${t('afn_curr', 'AFN')}`;
  }, [language, t]);

  const formatNumber = useCallback((num: number | string | undefined): string => {
    if (num === undefined || num === null) return '0';
    const val = typeof num === 'string' ? parseFloat(num) || 0 : num;
    return val.toLocaleString(language === 'en' ? 'en-US' : 'fa-AF');
  }, [language]);

  const formatDate = useCallback((dateStr: string | undefined | null): string => {
    if (!dateStr) return '---';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      
      if (language === 'fa' || language === 'ps') {
        return d.toLocaleDateString('fa-AF', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  }, [language]);

  const getLocalizedBranchName = useCallback((branch: Branch | undefined): string => {
    if (!branch) return t('all_branches', 'All Branches');
    if (language === 'fa' && branch.nameFa) return branch.nameFa;
    if (language === 'ps' && branch.namePs) return branch.namePs;
    return branch.name;
  }, [language, t]);

  const getLocalizedStatusName = useCallback((status: ShipmentStatus | string | undefined): string => {
    if (!status) return '';
    switch (status) {
      case 'pre_booked': return t('status_pre_booked', 'Pre-Booked');
      case 'booked': return t('status_booked', 'Booked / Registered');
      case 'in_transit': return t('status_in_transit', 'In Transit');
      case 'received_at_branch': return t('status_received_at_branch', 'Received at Destination');
      case 'out_for_delivery': return t('status_out_for_delivery', 'Out for Delivery');
      case 'delivered': return t('status_delivered', 'Delivered');
      case 'returned': return t('status_returned', 'Returned');
      case 'cancelled': return t('status_cancelled', 'Cancelled');
      default: return status.replace(/_/g, ' ');
    }
  }, [t]);

  const getLocalizedCategory = useCallback((category: string | undefined): string => {
    if (!category) return '';
    switch (category) {
      case 'document': return t('cat_document', 'Documents & Papers');
      case 'electronics': return t('cat_electronics', 'Electronics & Gadgets');
      case 'garments': return t('cat_garments', 'Clothing & Textiles');
      case 'fragile': return t('cat_fragile', 'Fragile Goods & Glass');
      case 'machinery': return t('cat_machinery', 'Machinery & Spare Parts');
      case 'foodstuff':
      case 'food_dryfruit': return t('cat_foodstuff', 'Food & Dry Fruits');
      case 'general':
      default: return t('cat_general', 'General Merchandise');
    }
  }, [t]);

  const getLocalizedExpenseCategory = useCallback((category: string | undefined): string => {
    if (!category) return '';
    switch (category) {
      case 'rent': return t('cat_rent', 'Shop / Warehouse Rent');
      case 'salary': return t('cat_salary', 'Staff Salary & Wages');
      case 'food':
      case 'food_tea': return t('cat_food', 'Staff Meals & Tea');
      case 'fuel_transport':
      case 'transport': return t('cat_fuel_transport', 'Fuel, Diesel & Tolls');
      case 'utilities': return t('cat_utilities', 'Electricity & Utilities');
      case 'maintenance': return t('cat_maintenance', 'Maintenance & Repairs');
      case 'other':
      default: return t('cat_other', 'Other Operational Costs');
    }
  }, [t]);

  const value = useMemo(() => ({
    language,
    setLanguage,
    isRTL,
    dir,
    t,
    formatAfn,
    formatNumber,
    formatDate,
    getLocalizedBranchName,
    getLocalizedStatusName,
    getLocalizedCategory,
    getLocalizedExpenseCategory
  }), [
    language,
    setLanguage,
    isRTL,
    dir,
    t,
    formatAfn,
    formatNumber,
    formatDate,
    getLocalizedBranchName,
    getLocalizedStatusName,
    getLocalizedCategory,
    getLocalizedExpenseCategory
  ]);

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};
