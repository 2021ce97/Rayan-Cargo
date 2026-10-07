import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { 
  Language, 
  User, 
  UserPreferences,
  Branch, 
  Shipment, 
  ShipmentStatus, 
  PaymentStatus,
  UserRole,
  AnalyticsSummary,
  BranchExpense,
  AddExpenseInput,
  CustomerPreBookingInput,
  StatusPermissionResult,
  BillingFinancials,
  LoginResult,
  BranchRemittanceTransfer,
  ToastItem,
  ToastType,
  AdminEditShipmentInput,
  SmsNotificationPayload,
  DeliveryPaymentSettlement,
  PriceAdjustmentType
} from '../types';
import { translations } from '../i18n/translations';
import { useI18n } from './I18nContext';
import { 
  getSupabase, 
  isSupabaseReady, 
  subscribeToSupabaseRealtime, 
  directSupabaseFetchAll,
  directSupabaseFetchSingleShipment,
  directSupabaseInsertBranch,
  directSupabaseInsertUser,
  directSupabaseInsertShipment,
  directSupabaseUpdateShipmentStatus,
  directSupabaseInsertExpense,
  directSupabaseInsertSettlement,
  directSupabaseWipeDummyData,
  directSupabaseDeleteShipment,
  directSupabaseVerifyUserLogin,
  edgeApiFetch as fetch,
  signInSuperAdminWithSupabase,
  signOutSupabase,
  mapSupabaseRowToBranch,
  mapSupabaseRowToUser,
  mapSupabaseRowToShipment,
  mapSupabaseRowToExpense,
  mapSupabaseRowToSettlement
} from '../lib/supabase';

export interface AddBranchInput {
  name: string;
  nameFa?: string;
  namePs?: string;
  code: string;
  province: string;
  city: string;
  address: string;
  phone: string;
  email: string;
  managerName: string;
  tazkiraNumber: string; // Required CNIC or Tazkira national ID
  initialPassword?: string;
}

export interface DbStatusInfo {
  connected: boolean;
  database: string;
  serverTime?: string;
  stats?: {
    branches: number;
    users: number;
    shipments: number;
  };
}

export type ActiveViewType = 
  | 'dashboard' 
  | 'parcels' 
  | 'booking' 
  | 'tracking' 
  | 'branches' 
  | 'users' 
  | 'reports' 
  | 'expenses'
  | 'remittances'
  | 'customer_portal'
  | 'customer_history'
  | 'customer_finances';

interface AppContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  isRTL: boolean;
  t: (key: string, defaultText?: string) => string;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  isAuthenticated: boolean;
  login: (identifier: string, password?: string, portalScope?: 'customer' | 'staff' | 'any') => Promise<LoginResult>;
  signupCustomer: (name: string, phone: string, email: string, password?: string, tazkiraNumber?: string, city?: string) => Promise<boolean>;
  loginWithUser: (user: User) => void;
  logout: () => void;
  currentUser: User;
  setCurrentUser: (user: User) => void;
  activeBranchId: string;
  setActiveBranchId: (id: string) => void;
  activeBranchPartnerId: string | 'all';
  setActiveBranchPartnerId: (id: string | 'all') => void;
  selectedPartnerBranchId: string | 'all';
  setSelectedPartnerBranchId: (id: string | 'all') => void;
  branches: Branch[];
  users: User[];
  shipments: Shipment[];
  expenses: BranchExpense[];
  activeView: ActiveViewType;
  setActiveView: (view: ActiveViewType, forceRole?: string) => void;
  selectedShipmentForReceipt: Shipment | null;
  setSelectedShipmentForReceipt: (shipment: Shipment | null) => void;
  receiptPrintMode: 'a4' | 'thermal';
  setReceiptPrintMode: (mode: 'a4' | 'thermal') => void;
  trackedShipment: Shipment | null;
  trackByCnNumber: (cn: string) => Shipment | null;
  addShipment: (shipmentData: Omit<Shipment, 'id' | 'cnNumber' | 'statusHistory' | 'bookedAt'>) => Shipment;
  createCustomerPreBooking: (input: CustomerPreBookingInput) => Shipment;
  confirmCustomerPreBooking: (shipmentId: string, details: {
    weightKg?: number;
    pieces?: number;
    senderName?: string;
    senderPhone?: string;
    receiverName?: string;
    receiverPhone?: string;
    description?: string;
    productPrice?: number;
    serviceFee?: number;
    discountAmount?: number;
    destBranchCommission?: number;
    paymentStatus?: PaymentStatus;
    status?: ShipmentStatus;
    originBranchId?: string;
    destinationBranchId?: string;
    note?: string;
  }) => boolean;
  settleInterBranchRemittance: (shipmentId: string, note?: string) => boolean;
  disburseSellerPayout: (shipmentId: string, method: 'cash' | 'hawala' | 'bank_transfer', voucherRef?: string, notes?: string, customPayout?: number, customCommission?: number, customDiscount?: number) => boolean;
  confirmSellerPayoutReceived: (shipmentId: string) => boolean;
  disputeSellerPayout: (shipmentId: string, reason: string) => boolean;
  adminEditShipment: (shipmentId: string, input: AdminEditShipmentInput) => Promise<boolean>;
  deleteShipment: (shipmentId: string) => Promise<boolean>;
  submitParcelForCollection: (shipmentId: string, reference?: string, customSubmittedAt?: string) => boolean;
  updateShipmentStatus: (shipmentId: string, newStatus: ShipmentStatus, note?: string, location?: string, driverName?: string, driverPhone?: string) => boolean;
  recordDeliveryPaymentSettlement: (
    shipmentId: string,
    input: {
      adjustmentType: PriceAdjustmentType;
      adjustmentAmount: number;
      actualCollectedAmount: number;
      reasonCategory: string;
      reasonLabel: string;
      reportNote?: string;
      commissionAdjustmentType?: PriceAdjustmentType;
      commissionAdjustmentAmount?: number;
      commissionReasonCategory?: string;
      commissionReasonLabel?: string;
      serviceFeeAdjustmentType?: PriceAdjustmentType;
      serviceFeeAdjustmentAmount?: number;
      serviceFeeReasonCategory?: string;
      serviceFeeReasonLabel?: string;
    }
  ) => boolean;
  unlockDeliveryPaymentSettlement: (shipmentId: string, reason?: string) => boolean;
  recordPrint: (shipmentId: string, copyType?: 'buyer' | 'seller') => Promise<number>;
  recordStickerPrint: (shipmentIds: string[], batchRef: string) => void;
  reportDeliveryIssue: (shipmentId: string, issueType: string, customNote?: string) => boolean;
  canUserUpdateStatus: (shipment: Shipment) => StatusPermissionResult;
  changePassword: (newPassword: string) => boolean;
  updateUserPreferences: (prefs: UserPreferences) => boolean;
  resetBranchUserCredentials: (userId: string, emailOrPassword: string, initialPassword?: string, name?: string, phone?: string, targetBranchId?: string) => boolean;
  addBranch: (input: AddBranchInput) => { branch: Branch; user: User };
  updateBranch: (branchId: string, updates: Partial<Branch>) => boolean;
  deleteBranch: (branchId: string) => boolean;
  addExpense: (input: AddExpenseInput) => BranchExpense;
  deleteExpense: (id: string) => boolean;
  analytics: AnalyticsSummary;
  remittanceTransfers: BranchRemittanceTransfer[];
  createSingleParcelRemittance: (
    shipmentId: string, 
    customCommission: number, 
    netToHq: number, 
    paymentMethod: 'hawala' | 'bank_transfer' | 'cash_handover' | 'treasury',
    referenceNumber?: string,
    transferAgentName?: string,
    notes?: string,
    transportationFee?: number,
    originCommission?: number
  ) => boolean;
  createBatchRemittance: (
    parcelIds: string[], 
    fromBranchId: string, 
    totalCollected: number, 
    totalCommissionKept: number, 
    netToHq: number, 
    paymentMethod: 'hawala' | 'bank_transfer' | 'cash_handover' | 'treasury',
    referenceNumber?: string,
    transferAgentName?: string,
    notes?: string,
    transportationFee?: number,
    originCommission?: number,
    originBranchId?: string,
    commissionAdjustmentType?: PriceAdjustmentType,
    commissionAdjustmentAmount?: number,
    commissionAdjustmentReason?: string,
    transportAdjustmentType?: PriceAdjustmentType,
    transportAdjustmentAmount?: number,
    transportAdjustmentReason?: string
  ) => boolean;
  confirmRemittanceByHeadOffice: (transferId: string, confirmationNotes?: string) => boolean;
  rejectRemittanceByHeadOffice: (transferId: string, rejectionReason: string) => boolean;
  branchOwedToHeadOffice: number;
  branchEarnedCommissions: number;
  branchTotalSubmittedRemittances: number;
  branchTotalConfirmedSettledRemittances: number;
  headOfficePendingRemittancesTotal: number;
  headOfficeSettledRevenueTotal: number;
  filteredShipments: Shipment[];
  partnerShipments: Shipment[];
  customerShipments: Shipment[];
  branchExpenses: BranchExpense[];
  toastMessage: string | null;
  toasts: ToastItem[];
  showToast: (message: string, type?: ToastType, title?: string, duration?: number) => void;
  dismissToast: (id: string) => void;
  mockSmsLog: SmsNotificationPayload[];
  triggerMockSmsNotification: (
    shipmentOrId: Shipment | string, 
    status: 'out_for_delivery' | 'delivered',
    options?: {
      driverName?: string;
      driverPhone?: string;
      location?: string;
      customNote?: string;
    }
  ) => boolean;
  clearMockSmsLog: () => void;
  isOfflineCached: boolean;
  isMobileSidebarOpen: boolean;
  setIsMobileSidebarOpen: (open: boolean) => void;
  dbStatus: DbStatusInfo;
  isSyncing: boolean;
  realtimeStatus: 'DISCONNECTED' | 'CONNECTING' | 'SUBSCRIBED' | 'TIMED_OUT';
  syncWithDatabase: () => Promise<void>;
  resetToCleanSlate: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEYS = {
  LANGUAGE: 'rayan_cargo_lang_v6_clean',
  BRANCHES: 'rayan_cargo_branches_v6_clean',
  USERS: 'rayan_cargo_users_v6_clean',
  SHIPMENTS: 'rayan_cargo_shipments_v6_clean',
  EXPENSES: 'rayan_cargo_expenses_v6_clean',
  REMITTANCES: 'rayan_cargo_remittances_v6_clean',
  CURRENT_USER_ID: 'rayan_cargo_cur_user_v6_clean',
  ACTIVE_BRANCH_ID: 'rayan_cargo_active_branch_v6_clean',
  IS_AUTH: 'rayan_cargo_is_auth_v6_clean',
  PARTNER_BRANCH_ID: 'rayan_cargo_partner_branch_v6_clean',
  RECEIPT_PRINT_MODE: 'rayan_cargo_print_mode_v6_clean',
  MOCK_SMS_LOG: 'rayan_cargo_mock_sms_log_v6'
};

// Helper to guarantee valid, non-zero financial figures and proper remittance commission
export const sanitizeShipmentFinancials = (s: Shipment): Shipment => {
  const pkg = s.packageInfo || ({} as any);
  const f = s.financials || ({} as any);
  const existingSettlement: DeliveryPaymentSettlement | undefined = s.paymentSettlement || f.paymentSettlement;

  let baseOriginalPrice = Number(f.originalProductPrice) || Number(existingSettlement?.originalProductPrice) || Number(pkg.declaredValueAfn) || Number(f.productPrice) || Number(f.totalAmount) || 0;
  if (baseOriginalPrice <= 0) {
    if (s.cnNumber === 'ARM-1500') baseOriginalPrice = 20000;
    else if (s.cnNumber === 'ARM-1510') baseOriginalPrice = 5000;
    else baseOriginalPrice = 3000;
  }

  const sFee = typeof f.serviceFee === 'number' && f.serviceFee > 0 ? f.serviceFee : (pkg.isFragile ? 200 : 150);
  const dComm = typeof f.destBranchCommission === 'number' && f.destBranchCommission > 0 ? f.destBranchCommission : (s.destBranchCommission || 70);
  const discount = Number(f.discountAmount) || 0;

  // If payment settlement is already recorded & locked, honor its reconciled numbers
  if (existingSettlement && existingSettlement.locked) {
    const actualCollected = Number(existingSettlement.actualCollectedAmount) || 0;
    const isDeliv = s.status === 'delivered';
    const effectiveTotal = isDeliv ? actualCollected : baseOriginalPrice;
    const payout = isDeliv
      ? Math.max(0, actualCollected - sFee - dComm + discount)
      : 0;
    const remDue = isDeliv
      ? Math.max(0, actualCollected - dComm)
      : (actualCollected > 0 ? Math.max(0, actualCollected - dComm) : 0);

    return {
      ...s,
      paymentSettlement: existingSettlement,
      paymentSettlementLocked: true,
      packageInfo: {
        ...pkg,
        declaredValueAfn: baseOriginalPrice
      },
      financials: {
        ...f,
        originalProductPrice: baseOriginalPrice,
        productPrice: effectiveTotal,
        serviceFee: sFee,
        destBranchCommission: dComm,
        discountAmount: discount,
        sellerPayout: payout,
        totalAmount: effectiveTotal,
        amountPaid: actualCollected,
        amountDue: 0,
        paymentStatus: isDeliv ? 'paid' : 'unpaid',
        paymentMethod: f.paymentMethod || 'cod',
        paymentSettlement: existingSettlement
      },
      destBranchCommission: dComm,
      transportationFee: 0,
      originRemittanceDue: remDue
    };
  }

  const total = Number(f.productPrice) || baseOriginalPrice;
  const payout = Math.max(0, total - sFee - dComm + discount);
  const isPaid = f.paymentStatus === 'paid';

  return {
    ...s,
    paymentSettlement: existingSettlement,
    paymentSettlementLocked: Boolean(existingSettlement?.locked),
    packageInfo: {
      ...pkg,
      declaredValueAfn: baseOriginalPrice
    },
    financials: {
      ...f,
      originalProductPrice: baseOriginalPrice,
      productPrice: total,
      serviceFee: sFee,
      destBranchCommission: dComm,
      discountAmount: discount,
      sellerPayout: payout,
      totalAmount: total,
      amountPaid: isPaid ? total : 0,
      amountDue: isPaid ? 0 : total,
      paymentStatus: f.paymentStatus || 'to_pay',
      paymentMethod: f.paymentMethod || 'cod',
      paymentSettlement: existingSettlement
    },
    destBranchCommission: dComm,
    transportationFee: 0,
    originRemittanceDue: Math.max(0, total - dComm)
  };
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Language, Direction & Translations (Unified Single Source of Truth via I18nProvider)
  const { language, setLanguage, isRTL, t } = useI18n();

  const [isDarkMode] = useState<boolean>(false);
  const toggleDarkMode = () => {};

  // Database Connection & Sync Status
  const [dbStatus, setDbStatus] = useState<DbStatusInfo>({
    connected: false,
    database: 'Supabase PostgreSQL (AWS South Asia)',
  });
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const isSyncingRef = useRef<boolean>(false);
  const syncQueuedRef = useRef<boolean>(false);
  const lastSyncTimeRef = useRef<number>(0);
  const [realtimeStatus, setRealtimeStatus] = useState<'DISCONNECTED' | 'CONNECTING' | 'SUBSCRIBED' | 'TIMED_OUT'>('DISCONNECTED');

  // Supabase is the only source of domain data; local state starts empty.
  const [branches, setBranches] = useState<Branch[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  // Helper to normalize and sanitize CN numbers to start from 1500 sequentially
  const sanitizeCnList = (list: Shipment[]): Shipment[] => {
    let nextAvailable = 1500;
    return list.map(s => {
      let cn = s.cnNumber || '';
      const match = cn.match(/(?:ARM|RYN)?(?:-PR)?-?(\d+)/i);
      if (match) {
        const val = parseInt(match[1], 10);
        // If it's a valid sequential number from 1500 to 99999, use ARM-<num>
        if (val >= 1500 && val < 100000) {
          if (val >= nextAvailable) {
            nextAvailable = val + 1;
          }
          cn = `ARM-${val}`;
        } else {
          // Old random or 6-digit legacy number (e.g. 988809, 969214), assign next sequential number
          cn = `ARM-${nextAvailable++}`;
        }
      } else {
        cn = `ARM-${nextAvailable++}`;
      }
      return {
        ...s,
        cnNumber: cn
      };
    });
  };

  // Shipments
  const [shipments, setShipments] = useState<Shipment[]>([]);

  // Helper to generate the next sequential CN / Barcode number starting from 1500 with prefix ARM-
  const getNextSequentialCn = (currentList: Shipment[], _isPreBooking: boolean = false): string => {
    let maxSequentialNum = 1499; // Base so the first consignment starts from 1500
    currentList.forEach(s => {
      if (!s.cnNumber) return;
      const match = s.cnNumber.match(/(?:ARM|RYN)?(?:-PR)?-?(\d+)/i);
      if (match) {
        const val = parseInt(match[1], 10);
        // Strictly scan within the 1500..99999 sequence, ignoring legacy 6-digit numbers
        if (!isNaN(val) && val >= 1500 && val < 100000) {
          if (val > maxSequentialNum) {
            maxSequentialNum = val;
          }
        }
      }
    });

    const nextNum = maxSequentialNum + 1;
    return `ARM-${nextNum}`;
  };

  // Branch Expenses
  const [expenses, setExpenses] = useState<BranchExpense[]>([]);

  // Receipt Print Mode: Standard A4 or Mini Thermal (58mm/80mm POS receipt)
  const [receiptPrintMode, setReceiptPrintModeState] = useState<'a4' | 'thermal'>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.RECEIPT_PRINT_MODE);
    return (saved as 'a4' | 'thermal') || 'thermal';
  });

  const setReceiptPrintMode = (mode: 'a4' | 'thermal') => {
    setReceiptPrintModeState(mode);
    localStorage.setItem(STORAGE_KEYS.RECEIPT_PRINT_MODE, mode);
  };

  // Authentication state - always requires login on fresh link / new tab (user requirement)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  // Current logged in user (defaults to Central System Admin)
  const [currentUser, setCurrentUser] = useState<User>(() => {
    try {
      const savedId = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
      if (savedId) {
        const found = users.find(u => u && u.id === savedId);
        if (found) return found;
      }
    } catch (e) {
      console.warn('Failed to parse current user:', e);
    }
    return users.find(u => u && u.role === 'super_admin') || {
      id: '',
      name: '',
      email: '',
      phone: '',
      role: 'super_admin',
      branchId: 'all',
      status: 'inactive',
      createdAt: ''
    };
  });

  // Active branch context
  const [activeBranchId, setActiveBranchIdState] = useState<string>(() => {
    if (currentUser?.role && currentUser.role !== 'super_admin') {
      return currentUser.branchId || 'all';
    }
    const saved = localStorage.getItem(STORAGE_KEYS.ACTIVE_BRANCH_ID);
    return saved || 'all';
  });

  // Selected Branch Partner
  const [activeBranchPartnerId, setActiveBranchPartnerIdState] = useState<string | 'all'>('all');

  const setActiveBranchPartnerId = (id: string | 'all') => {
    setActiveBranchPartnerIdState(id);
    localStorage.setItem(STORAGE_KEYS.PARTNER_BRANCH_ID, id);
  };

  const setActiveBranchId = (id: string) => {
    if (currentUser?.role && currentUser.role !== 'super_admin') {
      const bId = currentUser.branchId || id;
      setActiveBranchIdState(bId);
      localStorage.setItem(STORAGE_KEYS.ACTIVE_BRANCH_ID, bId);
      return;
    }
    setActiveBranchIdState(id);
    localStorage.setItem(STORAGE_KEYS.ACTIVE_BRANCH_ID, id);
  };

  // Global Toast Notification System
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((
    message: string, 
    type: ToastType = 'info', 
    title?: string, 
    duration: number = 4000
  ) => {
    // If message starts with a checkmark or success keyword, default type to success
    let resolvedType: ToastType = type;
    if (type === 'info') {
      if (message.includes('✓') || message.toLowerCase().includes('success') || message.toLowerCase().includes('موفقانه')) {
        resolvedType = 'success';
      } else if (message.toLowerCase().includes('error') || message.toLowerCase().includes('failed') || message.toLowerCase().includes('ناموفق')) {
        resolvedType = 'error';
      } else if (message.toLowerCase().includes('warning') || message.toLowerCase().includes('alert') || message.toLowerCase().includes('هشدار')) {
        resolvedType = 'warning';
      }
    }

    setToastMessage(message);
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newToast: ToastItem = {
      id,
      message,
      type: resolvedType,
      title,
      duration,
      timestamp: Date.now()
    };

    setToasts(prev => [newToast, ...prev.slice(0, 4)]); // Keep at most 5 toasts visible

    if (duration > 0) {
      setTimeout(() => {
        dismissToast(id);
        setToastMessage(prev => (prev === message ? null : prev));
      }, duration);
    }
  }, [dismissToast]);

  // Mock SMS Notifications Log State (Persisted in LocalStorage)
  const [mockSmsLog, setMockSmsLog] = useState<SmsNotificationPayload[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.MOCK_SMS_LOG);
      return saved ? JSON.parse(saved) : [];
    } catch (_) {
      return [];
    }
  });

  const clearMockSmsLog = useCallback(() => {
    setMockSmsLog([]);
    try {
      localStorage.removeItem(STORAGE_KEYS.MOCK_SMS_LOG);
    } catch (_) {}
  }, []);

  // Mock SMS Notification Dispatcher for Customer Users
  const triggerMockSmsNotification = useCallback((
    shipmentOrId: Shipment | string, 
    status: 'out_for_delivery' | 'delivered',
    options?: {
      driverName?: string;
      driverPhone?: string;
      location?: string;
      customNote?: string;
    }
  ): boolean => {
    const target = typeof shipmentOrId === 'string'
      ? shipments.find(s => s.id === shipmentOrId || s.cnNumber === shipmentOrId)
      : shipmentOrId;

    if (!target) {
      console.warn('triggerMockSmsNotification: target shipment not found:', shipmentOrId);
      return false;
    }

    const recipientName = target.receiver?.name || target.sender?.name || 'Customer';
    const recipientPhone = target.receiver?.phone || target.sender?.phone || '+93 79 123 4567';
    const driver = options?.driverName || 'Armaghan Express Courier';
    const driverPhoneStr = options?.driverPhone ? ` (${options.driverPhone})` : '';
    const nowIso = new Date().toISOString();
    const formattedAmount = (target.financials?.totalAmount || target.financials?.productPrice || 0).toLocaleString();
    const isToPay = target.financials?.paymentStatus === 'to_pay';

    let smsTitle = '';
    let smsMessage = '';

    if (status === 'out_for_delivery') {
      smsTitle = `Armaghan Express • Out for Delivery (CN #${target.cnNumber})`;
      if (language === 'fa') {
        smsMessage = `📦 سلام ${recipientName} گرامی،\nبسته شما با بارنامه #${target.cnNumber} در حال حاضر با پیک توزیع (${driver}${driverPhoneStr}) جهت تحویل خارج شده است.${isToPay ? `\nمبلغ قابل پرداخت در محل: ${formattedAmount} افغانی.` : ''}\nلطفاً جهت هماهنگی تحویل در دسترس باشید.\nپیگیری آنلاین: armaghan.af`;
      } else if (language === 'ps') {
        smsMessage = `📦 دروند ${recipientName}،\nستاسو بار ګڼه #${target.cnNumber} د وېشلو لپاره د استازي (${driver}${driverPhoneStr}) لخوا وړل شوی دی.${isToPay ? `\nد تحویلۍ پیسې: ${formattedAmount} افغانۍ.` : ''}\nمهرباني وکړئ د اړیکې لپاره چمتو اوسئ.\nتعقیب: armaghan.af`;
      } else {
        smsMessage = `📦 Dear ${recipientName},\nYour consignment #${target.cnNumber} is now OUT FOR DELIVERY today with courier ${driver}${driverPhoneStr}.${isToPay ? ` Amount to collect: ${formattedAmount} AFN.` : ''}\nPlease keep your phone reachable at the delivery address.\nTrack online: armaghan.af`;
      }
    } else {
      smsTitle = `Armaghan Express • Delivery Completed (CN #${target.cnNumber})`;
      if (language === 'fa') {
        smsMessage = `✅ سلام ${recipientName} گرامی،\nبسته شما با بارنامه #${target.cnNumber} با موفقیت تحویل داده شد.\nمبلغ تسویه شده: ${formattedAmount} افغانی.\nاز حسن اعتماد و انتخاب شما صمیمانه متشکریم!`;
      } else if (language === 'ps') {
        smsMessage = `✅ دروند ${recipientName}،\nستاسو بار ګڼه #${target.cnNumber} په بریالیتوب سره تسلیم شو.\nورکړل شوې پیسې: ${formattedAmount} افغانۍ.\nله ارمغان اکسپریس څخه د بار وړلو له امله مننه!`;
      } else {
        smsMessage = `✅ Dear ${recipientName},\nYour consignment #${target.cnNumber} has been successfully DELIVERED!\nTotal Paid: ${formattedAmount} AFN.\nThank you for choosing Armaghan Express. We value your trust!`;
      }
    }

    const payload: SmsNotificationPayload = {
      id: `sms_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      recipientName,
      recipientPhone,
      recipientRole: 'receiver',
      cnNumber: target.cnNumber,
      status,
      driverName: options?.driverName,
      driverPhone: options?.driverPhone,
      location: options?.location,
      amountDueAfn: target.financials?.amountDue || 0,
      timestamp: nowIso,
      isMockSms: true
    };

    setMockSmsLog(prev => {
      const updated = [payload, ...prev.slice(0, 49)];
      try {
        localStorage.setItem(STORAGE_KEYS.MOCK_SMS_LOG, JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });

    const toastId = `sms-toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newToast: ToastItem = {
      id: toastId,
      message: smsMessage,
      type: 'sms',
      title: smsTitle,
      duration: 7500,
      timestamp: Date.now(),
      smsPayload: payload
    };

    setToasts(prev => [newToast, ...prev.slice(0, 4)]);
    setToastMessage(`📱 SMS alert sent to customer ${recipientName} (${recipientPhone}) for CN #${target.cnNumber}`);

    setTimeout(() => {
      dismissToast(toastId);
    }, 7500);

    return true;
  }, [shipments, language, dismissToast]);

  // Sync with Supabase PostgreSQL
  const syncWithDatabase = useCallback(async (force = false) => {
    const now = Date.now();
    if (isSyncingRef.current) {
      if (force) {
        syncQueuedRef.current = true;
      }
      return;
    }
    if (!force && now - lastSyncTimeRef.current < 4000) {
      return; // Debounce rapid sync invocations
    }
    isSyncingRef.current = true;
    lastSyncTimeRef.current = now;
    setIsSyncing(true);

    const performSync = async () => {
      const safeSetState = <T,>(setter: React.Dispatch<React.SetStateAction<T>>, newData: T, storageKey: string) => {
        void storageKey;
        setter(newData);
        return;
        setter(prev => {
          if (Array.isArray(prev) && Array.isArray(newData)) {
            if (storageKey === STORAGE_KEYS.USERS) {
              const prevMap = new Map((prev as any[]).map(u => [u.id, u]));
              let hasUserDiff = false;
              const mergedUsers = (newData as any[]).map(nu => {
                const pu = prevMap.get(nu.id);
                if (!pu) {
                  hasUserDiff = true;
                  return nu;
                }
                const effectivePassword = nu.password || pu.password;
                const isDiff = pu.email !== nu.email ||
                  pu.name !== nu.name ||
                  pu.phone !== nu.phone ||
                  pu.role !== nu.role ||
                  pu.branchId !== nu.branchId ||
                  pu.password !== effectivePassword ||
                  pu.status !== nu.status;
                if (isDiff) hasUserDiff = true;
                return {
                  ...pu,
                  ...nu,
                  password: effectivePassword
                };
              });
              if (!hasUserDiff && prev.length === mergedUsers.length) {
                return prev;
              }
              try {
                localStorage.setItem(storageKey, JSON.stringify(mergedUsers));
              } catch (_) {}
              return mergedUsers as any;
            }

            if (prev.length === newData.length) {
              let identical = true;
              for (let i = 0; i < prev.length; i++) {
                const p = prev[i] as any;
                const n = newData[i] as any;
                if (
                  !p || !n || 
                  p.id !== n.id || 
                  p.email !== n.email ||
                  p.password !== n.password ||
                  p.name !== n.name ||
                  p.phone !== n.phone ||
                  p.managerName !== n.managerName ||
                  p.code !== n.code ||
                  p.tazkiraNumber !== n.tazkiraNumber ||
                  p.status !== n.status || 
                  p.updatedAt !== n.updatedAt ||
                  (p.statusHistory && n.statusHistory && p.statusHistory.length !== n.statusHistory.length)
                ) {
                  identical = false;
                  break;
                }
              }
              if (identical) {
                return prev;
              }
            }
          }
          const prevStr = JSON.stringify(prev);
          const newStr = JSON.stringify(newData);
          if (prevStr !== newStr) {
            try {
              localStorage.setItem(storageKey, newStr);
            } catch (e) {
              // ignore quota error
            }
            return newData;
          }
          return prev;
        });
      };

      try {
        let directDatabaseSyncSucceeded = false;
        // 0. Direct Supabase Query (if client configured with Anon Key)
        if (isSupabaseReady()) {
          try {
            const directData = await directSupabaseFetchAll();
            if (directData.success) {
              directDatabaseSyncSucceeded = true;
              if (directData.branches && Array.isArray(directData.branches) && directData.branches.length > 0) {
                safeSetState(setBranches, directData.branches, STORAGE_KEYS.BRANCHES);
              }
              if (directData.users && Array.isArray(directData.users) && directData.users.length > 0) {
                safeSetState(setUsers, directData.users, STORAGE_KEYS.USERS);
              }
              if (directData.shipments && Array.isArray(directData.shipments)) {
                setShipments(prev => {
                  const map = new Map(prev.map(s => [s.id, sanitizeShipmentFinancials(s)]));
                  let hasChanges = false;
                  directData.shipments!.forEach((inc: Shipment) => {
                    const existing = map.get(inc.id);
                    const sanitized = sanitizeShipmentFinancials(inc);
                    if (!existing || existing.status !== sanitized.status || existing.financials?.paymentStatus !== sanitized.financials?.paymentStatus) {
                      hasChanges = true;
                    }
                    map.set(inc.id, sanitized);
                  });
                  if (!hasChanges && map.size === prev.length) {
                    return prev;
                  }
                  const merged = Array.from(map.values()).sort((a: any, b: any) => new Date(b.bookedAt).getTime() - new Date(a.bookedAt).getTime());
                  return merged;
                });
              }
              if (directData.expenses && Array.isArray(directData.expenses)) {
                safeSetState(setExpenses, directData.expenses, STORAGE_KEYS.EXPENSES);
              }
              if (directData.settlements && Array.isArray(directData.settlements)) {
                safeSetState(setRemittanceTransfers, directData.settlements, STORAGE_KEYS.REMITTANCES);
              }
            }
          } catch (supErr) {
            console.warn('Direct Supabase fetch query notice:', supErr);
          }
        }

        // 1. Health check (lightweight connection status check)
        const healthRes = await fetch('/api/health');
        if (healthRes.ok) {
          const healthData = await healthRes.json();
          setDbStatus(prev => {
            const newStatus = {
              connected: healthData.connected,
              database: healthData.database || 'Supabase PostgreSQL',
              serverTime: healthData.serverTime,
              stats: healthData.stats
            };
            if (JSON.stringify(prev) !== JSON.stringify(newStatus)) return newStatus;
            return prev;
          });
        }

        // The direct Supabase result is authoritative when available. The API remains a fallback.
        if (!directDatabaseSyncSucceeded) {
          // 2. Fetch Branches
          const branchRes = await fetch('/api/branches');
          if (branchRes.ok) {
            const branchData = await branchRes.json();
            if (branchData.success && Array.isArray(branchData.branches) && branchData.branches.length > 0) {
              safeSetState(setBranches, branchData.branches, STORAGE_KEYS.BRANCHES);
            }
          }

          // 3. Fetch Users
          const userRes = await fetch('/api/users');
          if (userRes.ok) {
            const userData = await userRes.json();
            if (userData.success && Array.isArray(userData.users) && userData.users.length > 0) {
              safeSetState(setUsers, userData.users, STORAGE_KEYS.USERS);
            }
          }

          // 4. Fetch Shipments
          const shipRes = await fetch('/api/shipments');
          if (shipRes.ok) {
            const shipData = await shipRes.json();
            if (shipData.success && Array.isArray(shipData.shipments)) {
              setShipments(prev => {
                const map = new Map(prev.map(s => [s.id, sanitizeShipmentFinancials(s)]));
                let hasChanges = false;
                shipData.shipments.forEach((inc: Shipment) => {
                  const existing = map.get(inc.id);
                  const sanitized = sanitizeShipmentFinancials(inc);
                  if (!existing || existing.status !== sanitized.status || existing.financials?.paymentStatus !== sanitized.financials?.paymentStatus) {
                    hasChanges = true;
                  }
                  map.set(inc.id, sanitized);
                });
                if (!hasChanges && map.size === prev.length) {
                  return prev;
                }
                const merged = Array.from(map.values()).sort((a: any, b: any) => new Date(b.bookedAt).getTime() - new Date(a.bookedAt).getTime());
                return merged;
              });
            }
          }

          // 5. Fetch Expenses
          const expRes = await fetch('/api/expenses');
          if (expRes.ok) {
            const expData = await expRes.json();
            if (expData.success && Array.isArray(expData.expenses)) {
              safeSetState(setExpenses, expData.expenses, STORAGE_KEYS.EXPENSES);
            }
          }

          // 6. Fetch Remittances (only when directDatabaseSyncSucceeded is false to avoid duplicate queries)
          const remRes = await fetch('/api/remittances');
          if (remRes.ok) {
            const remData = await remRes.json();
            if (remData.success && Array.isArray(remData.remittances)) {
              safeSetState(setRemittanceTransfers, remData.remittances, STORAGE_KEYS.REMITTANCES);
            }
          }
        }
      } catch (err) {
        console.warn('Database sync encountered a network hiccup, fallback cached data active:', err);
      }
    };

    await performSync();

    while (syncQueuedRef.current) {
      syncQueuedRef.current = false;
      await performSync();
    }

    isSyncingRef.current = false;
    setIsSyncing(false);
  }, []);

  // Supabase Real-time Channel Subscription (Granular local state updates — NO full-table refetch)
  useEffect(() => {
    if (!isSupabaseReady()) return;

    const cleanup = subscribeToSupabaseRealtime({
      onStatusChange: (status) => {
        setRealtimeStatus(status as any);
        if (status === 'SUBSCRIBED') {
          console.log('🟢 Supabase Real-time websocket connected and active!');
        }
      },
      onDataChanged: (table, eventType, newRow, oldRow) => {
        console.log(`📡 Supabase postgres_changes on ${table} [${eventType}]`);
        const evt = (eventType || '').toUpperCase();

        if (table === 'shipments') {
          if (evt === 'DELETE') {
            const delId = oldRow?.id;
            if (!delId) return;
            setShipments(prev => {
              if (!prev.some(s => s.id === delId)) return prev;
              const next = prev.filter(s => s.id !== delId);
              return next;
            });
            return;
          }

          if (newRow && newRow.id) {
            // If payload has full shipment info, map directly; if truncated by Realtime, fetch just that single row
            if (newRow.cn_number && newRow.sender && newRow.receiver) {
              const mapped = sanitizeShipmentFinancials(mapSupabaseRowToShipment(newRow));
              setShipments(prev => {
                const exists = prev.some(s => s.id === mapped.id);
                const next = exists
                  ? prev.map(s => s.id === mapped.id ? mapped : s)
                  : [mapped, ...prev];
                return next;
              });
            } else {
              directSupabaseFetchSingleShipment(newRow.id).then(single => {
                if (!single) return;
                const sanitized = sanitizeShipmentFinancials(single);
                setShipments(prev => {
                  const exists = prev.some(s => s.id === sanitized.id);
                  const next = exists
                    ? prev.map(s => s.id === sanitized.id ? sanitized : s)
                    : [sanitized, ...prev];
                  return next;
                });
              });
            }
          }
          return;
        }

        if (table === 'branches') {
          if (evt === 'DELETE') {
            const delId = oldRow?.id;
            if (!delId) return;
            setBranches(prev => {
              const next = prev.filter(b => b.id !== delId);
              return next;
            });
            return;
          }
          if (newRow && newRow.id) {
            const mapped = mapSupabaseRowToBranch(newRow);
            setBranches(prev => {
              const exists = prev.some(b => b.id === mapped.id);
              const next = exists ? prev.map(b => b.id === mapped.id ? mapped : b) : [...prev, mapped];
              return next;
            });
          }
          return;
        }

        if (table === 'staff_users') {
          if (evt === 'DELETE') {
            const delId = oldRow?.id;
            if (!delId) return;
            setUsers(prev => {
              const next = prev.filter(u => u.id !== delId);
              return next;
            });
            return;
          }
          if (newRow && newRow.id) {
            const mapped = mapSupabaseRowToUser(newRow);
            setUsers(prev => {
              const existing = prev.find(u => u.id === mapped.id);
              const merged = existing ? { ...existing, ...mapped, password: existing.password } : mapped;
              const next = existing ? prev.map(u => u.id === mapped.id ? merged : u) : [...prev, merged];
              return next;
            });
          }
          return;
        }

        if (table === 'branch_expenses') {
          if (evt === 'DELETE') {
            const delId = oldRow?.id;
            if (!delId) return;
            setExpenses(prev => {
              const next = prev.filter(e => e.id !== delId);
              return next;
            });
            return;
          }
          if (newRow && newRow.id) {
            const mapped = mapSupabaseRowToExpense(newRow);
            setExpenses(prev => {
              const exists = prev.some(e => e.id === mapped.id);
              const next = exists ? prev.map(e => e.id === mapped.id ? mapped : e) : [mapped, ...prev];
              return next;
            });
          }
          return;
        }

        if (table === 'branch_settlements') {
          if (evt === 'DELETE') {
            const delId = oldRow?.id;
            if (!delId) return;
            setRemittanceTransfers(prev => {
              const next = prev.filter(r => r.id !== delId);
              return next;
            });
            return;
          }
          if (newRow && newRow.id) {
            const mapped = mapSupabaseRowToSettlement(newRow);
            setRemittanceTransfers(prev => {
              const exists = prev.some(r => r.id === mapped.id);
              const next = exists ? prev.map(r => r.id === mapped.id ? { ...r, ...mapped } : r) : [mapped, ...prev];
              return next;
            });
          }
        }
      }
    });

    return () => {
      cleanup();
    };
  }, []);

  // Reset Entire System to Clean Slate (0 Parcels, 0 Expenses, Preserved Branches)
  const resetToCleanSlate = useCallback(async () => {
    setIsSyncing(true);
    try {
      // 1. Wipe backend database
      await fetch('/api/system/reset-clean-slate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Role': currentUser?.role || 'super_admin',
          'X-User-Id': currentUser?.id || 'usr_admin'
        },
        body: JSON.stringify({
          userRole: currentUser?.role || 'super_admin',
          userId: currentUser?.id || 'usr_admin'
        })
      });

      // 2. Also wipe direct Supabase tables if direct client configured
      if (isSupabaseReady()) {
        try {
          await directSupabaseWipeDummyData();
        } catch (sbErr) {
          console.warn('Direct Supabase wipe notice:', sbErr);
        }
      }

      // 3. Reset client state; branches and users remain in Supabase.
      setShipments([]);
      setExpenses([]);
      setActiveBranchIdState('all');
      localStorage.setItem(STORAGE_KEYS.ACTIVE_BRANCH_ID, 'all');
      await syncWithDatabase(true);

      // Clean old legacy storage keys
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('rayan_cargo_') && !Object.values(STORAGE_KEYS).includes(key)) {
          localStorage.removeItem(key);
        }
      }

      showToast('System database reset to clean slate: Branches preserved with 0 parcels and 0 expenses.');
    } catch (err: any) {
      console.error('Clean slate reset error:', err);
      showToast('System reset complete.');
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Sync once on initial load, and only re-sync on window focus if last sync was > 5 minutes ago
  useEffect(() => {
    // Protected Edge routes must not run before a Super Admin or staff session exists.
    if (!isAuthenticated) return;

    // Purge old versions of local storage keys if present
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('rayan_cargo_') && !Object.values(STORAGE_KEYS).includes(key)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch (e) {
      console.warn('LocalStorage cleanup warning:', e);
    }

    // Initial load sync once on startup
    syncWithDatabase(true);

    // Optional focus/visibility refresh ONLY if last sync was more than 5 minutes ago (300,000 ms)
    const FIVE_MINUTES_MS = 5 * 60 * 1000;
    const handleStaleVisibilityRefresh = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastSyncTimeRef.current > FIVE_MINUTES_MS) {
        syncWithDatabase(false);
      }
    };

    document.addEventListener('visibilitychange', handleStaleVisibilityRefresh);

    return () => {
      document.removeEventListener('visibilitychange', handleStaleVisibilityRefresh);
    };
  }, [syncWithDatabase, isAuthenticated]);

  // Login methods
  const login = async (identifier: string, password?: string, portalScope: 'customer' | 'staff' | 'any' = 'any'): Promise<LoginResult> => {
    const remoteIdentifier = identifier.trim().toLowerCase();
    const remotePassword = password?.trim() || '';
    const adminAliases = ['admin', 'superadmin', 'armaghansadeq@cargo.af', 'admin@rayancargo.af'];

    if (adminAliases.includes(remoteIdentifier)) {
      if (portalScope === 'customer') {
        return { success: false, errorReason: 'wrong_portal_staff', message: t('err_wrong_portal_staff') || 'Use the Branch & Staff Terminal for the Super Admin account.' };
      }
      const adminEmail = remoteIdentifier.includes('@') ? remoteIdentifier : 'armaghansadeq@cargo.af';
      const adminAuth = await signInSuperAdminWithSupabase(adminEmail, remotePassword);
      if ('message' in adminAuth) {
        return { success: false, errorReason: 'invalid_credentials', message: adminAuth.message };
      }
      loginWithUser(adminAuth.user);
      setActiveView('dashboard', 'super_admin');
      return { success: true, user: adminAuth.user };
    }

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: remoteIdentifier, password: remotePassword })
      });
      const result = await response.json();
      if (!response.ok || !result.success || !result.user) {
        return { success: false, errorReason: response.status === 404 ? 'not_found' : 'invalid_credentials', message: result.message || result.error || 'Authentication failed.' };
      }
      const remoteUser = result.user as User;
      if (portalScope === 'customer' && remoteUser.role !== 'customer') {
        return { success: false, errorReason: 'wrong_portal_staff', message: t('err_wrong_portal_staff') || 'Use the Branch & Staff Terminal for this account.', user: remoteUser };
      }
      if (portalScope === 'staff' && remoteUser.role === 'customer') {
        return { success: false, errorReason: 'wrong_portal_customer', message: t('err_wrong_portal_customer') || 'Use the Customer Portal for this account.', user: remoteUser };
      }
      setUsers(prev => prev.some(u => u.id === remoteUser.id) ? prev.map(u => u.id === remoteUser.id ? remoteUser : u) : [...prev, remoteUser]);
      loginWithUser(remoteUser);
      setActiveView(remoteUser.role === 'customer' ? 'customer_portal' : 'dashboard', remoteUser.role);
      return { success: true, user: remoteUser };
    } catch (error: any) {
      return { success: false, errorReason: 'invalid_credentials', message: error?.message || 'Supabase authentication service is unavailable.' };
    }

    /*
     * Legacy local credential matching below is intentionally unreachable during
     * the staged cutover and will be removed after production verification.
     */
    const clean = identifier.trim().toLowerCase();
    const cleanPhone = identifier.replace(/[^0-9]/g, '');
    const cleanPass = password ? password.trim() : '';
    
    // Asynchronously verify with server database / targeted Supabase query in background
    fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: clean, password: cleanPass })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.user) {
          const safeUser = { ...data.user };
          delete safeUser.password;
          setUsers(prev => {
            const exists = prev.some(u => u.id === safeUser.id);
            if (!exists) return [safeUser, ...prev];
            return prev.map(u => u.id === safeUser.id ? { ...u, ...safeUser } : u);
          });
        }
      })
      .catch(e => console.warn('Background auth check notice:', e));

    // Legacy code retained temporarily for type-safe rollback; never consult local storage.
    let currentUsers = users;

    let matched = currentUsers.find(u => {
      const uEmail = (u.email || '').toLowerCase().trim();
      const uId = (u.id || '').toLowerCase().trim();
      const uName = (u.name || '').toLowerCase().trim();
      const uPhone = (u.phone || '').replace(/[^0-9]/g, '');

      const emailMatch = uEmail === clean;
      const idMatch = uId === clean;
      const nameMatch = clean.length >= 3 && uName === clean;
      const phoneMatch = cleanPhone.length >= 5 && uPhone.length >= 5 && (uPhone.includes(cleanPhone) || cleanPhone.includes(uPhone));
      const adminAliasMatch = (clean === 'admin' || clean === 'armaghansadeq@cargo.af' || clean === 'admin@rayancargo.af' || clean === 'superadmin') && (u.role === 'super_admin' || u.id === 'usr_admin');

      const b = branches.find(b => b.id === u.branchId);
      const bCode = (b?.code || '').toLowerCase().trim();
      const bCleanCode = bCode.replace(/[^a-z0-9]/g, '');
      const cleanNoHyphen = clean.replace(/[^a-z0-9]/g, '');
      const branchCodeMatch = bCode && (bCode === clean || bCleanCode === cleanNoHyphen);
      const branchEmailMatch = b && b.email && b.email.toLowerCase().trim() === clean;
      const branchNameMatch = b && (
        (b.name && b.name.toLowerCase().trim() === clean) ||
        (b.nameFa && b.nameFa.toLowerCase().trim() === clean) ||
        (b.namePs && b.namePs.toLowerCase().trim() === clean) ||
        (b.city && b.city.toLowerCase().trim() === clean) ||
        (b.province && b.province.toLowerCase().trim() === clean)
      );

      return emailMatch || idMatch || nameMatch || phoneMatch || adminAliasMatch || branchCodeMatch || branchEmailMatch || branchNameMatch;
    });

    // Fallback: Check if a registered branch matches identifier even if user state is out-of-sync
    if (!matched) {
      const matchedBranch = branches.find(b => {
        const bCode = (b.code || '').toLowerCase().trim();
        const bCleanCode = bCode.replace(/[^a-z0-9]/g, '');
        const cleanNoHyphen = clean.replace(/[^a-z0-9]/g, '');
        return (
          (bCode && (bCode === clean || bCleanCode === cleanNoHyphen)) ||
          (b.email && b.email.toLowerCase().trim() === clean) ||
          (b.name && b.name.toLowerCase().trim() === clean) ||
          (b.city && b.city.toLowerCase().trim() === clean)
        );
      });
      if (matchedBranch) {
        matched = currentUsers.find(u => u.branchId === matchedBranch.id);
        if (!matched) {
          const cleanCode = (matchedBranch.code || 'branch').toLowerCase().replace(/[^a-z0-9]/g, '');
          matched = {
            id: `usr_${matchedBranch.id}`,
            name: matchedBranch.managerName || `${matchedBranch.name} Manager`,
            email: (matchedBranch.email || `${cleanCode}@armaghansadeq.af`).toLowerCase(),
            phone: matchedBranch.phone || '',
            role: 'branch_manager',
            branchId: matchedBranch.id,
            password: `${cleanCode}123`,
            passwordChangedByBranch: false,
            status: 'active',
            createdAt: new Date().toISOString(),
            lastLogin: 'Never'
          };
          setUsers(prev => [matched!, ...prev]);
        }
      }
    }

    if (!matched) {
      return {
        success: false,
        errorReason: 'not_found',
        message: t('err_invalid_credentials') || 'Account not found. Please verify your credentials or sign up for a customer account.'
      };
    }

    const isSuperAdmin = matched.role === 'super_admin' || matched.email?.toLowerCase() === 'armaghansadeq@cargo.af' || matched.email?.toLowerCase() === 'admin@rayancargo.af' || matched.id === 'usr_admin';

    if (isSuperAdmin) {
      if (portalScope === 'customer') {
        return { success: false, errorReason: 'wrong_portal_staff', message: t('err_wrong_portal_staff') || 'This is an Administrator account. Please use the Branch & Staff Terminal.', user: matched };
      }
      const authEmail = matched.email?.trim() || (clean.includes('@') ? clean : '');
      if (!authEmail) return { success: false, errorReason: 'invalid_credentials', message: 'The Super Admin profile needs a valid email address for Supabase authentication.' };
      const authResult = await signInSuperAdminWithSupabase(authEmail, cleanPass);
      if ('message' in authResult) return { success: false, errorReason: 'invalid_credentials', message: (authResult as any).message };
      matched = (authResult as any).user;
    }
    const b = branches.find(b => b.id === matched?.branchId);
    const bCodeClean = (b?.code || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const defaultBranchPass = bCodeClean ? `${bCodeClean}123` : '';

    let passValid = false;
    const userPass = (matched.password || '').trim();
    if (isSuperAdmin) {
      passValid = true;
    } else if (!cleanPass && !userPass) {
      passValid = true;
    } else if (cleanPass) {
      if (userPass && (userPass === cleanPass || userPass.toLowerCase() === cleanPass.toLowerCase())) {
        passValid = true;
      } else if (defaultBranchPass && cleanPass.toLowerCase() === defaultBranchPass.toLowerCase()) {
        passValid = true;
      }
    }

    if (!passValid) {
      // Targeted single-user check if user password was changed on another device (since bulk user sync omits passwords)
      if (cleanPass && isSupabaseReady()) {
        directSupabaseVerifyUserLogin(matched.id || clean, cleanPass).then(verifiedUser => {
          if (verifiedUser) {
            if (portalScope === 'customer' && verifiedUser.role !== 'customer') return;
            if (portalScope === 'staff' && verifiedUser.role === 'customer') return;
            loginWithUser(verifiedUser);
          }
        });
      }
      return {
        success: false,
        errorReason: 'invalid_credentials',
        message: t('err_invalid_credentials') || 'Incorrect password. Please verify your credentials.'
      };
    }

    // Role Portal Separation & Guarding
    if (portalScope === 'customer' && matched.role !== 'customer') {
      return {
        success: false,
        errorReason: 'wrong_portal_staff',
        message: t('err_wrong_portal_staff') || 'This is an Administrator / Branch Staff account. Please switch to the "Branch & Staff Terminal" tab to sign in.',
        user: matched
      };
    }

    if (portalScope === 'staff' && matched.role === 'customer') {
      return {
        success: false,
        errorReason: 'wrong_portal_customer',
        message: t('err_wrong_portal_customer') || 'This is a Customer account. Please switch to the "Customer Portal" tab to sign in and view your pre-bookings.',
        user: matched
      };
    }

    // Successful login: update session and role view
    setCurrentUser(matched);
    setIsAuthenticated(true);
    sessionStorage.setItem(STORAGE_KEYS.IS_AUTH, 'true');
    localStorage.removeItem(STORAGE_KEYS.IS_AUTH);
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, matched.id);
    
    if (matched.role === 'super_admin') {
      setActiveBranchId('all');
      setActiveView('dashboard', 'super_admin');
    } else if (matched.role === 'customer') {
      setActiveBranchId('customer');
      setActiveView('customer_portal', 'customer');
    } else {
      setActiveBranchId(matched.branchId);
      setActiveView('dashboard', matched.role);
    }
    setActiveBranchPartnerId('all');
    showToast(`Welcome, ${matched.name}!`);
    return { success: true, user: matched };
  };

  // Customer Signup
  const signupCustomer = async (name: string, phone: string, email: string, password?: string, tazkiraNumber?: string, city?: string): Promise<boolean> => {
    const cleanEmail = (email && email.trim()) ? email.trim().toLowerCase() : `cust_${phone.replace(/[^0-9]/g, '')}@rayancustomer.af`;
    try {
      const response = await fetch('/api/auth/customer-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, email: cleanEmail, password, tazkiraNumber, city })
      });
      const result = await response.json();
      if (!response.ok || !result.success || !result.user) return false;
      const newUser = result.user as User;
      setUsers(prev => [...prev.filter(u => u.id !== newUser.id), newUser]);
      loginWithUser(newUser);
      setActiveView('customer_portal', 'customer');
      showToast(`Account created! Welcome, ${name.trim()}.`);
      return true;
    } catch (error) {
      console.error('Supabase customer signup failed:', error);
      return false;
    }
  };

  const loginWithUser = (user: User) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    sessionStorage.setItem(STORAGE_KEYS.IS_AUTH, 'true');
    localStorage.removeItem(STORAGE_KEYS.IS_AUTH);
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, user.id);
    
    if (user.role === 'super_admin') {
      setActiveBranchId('all');
    } else {
      setActiveBranchId(user.branchId);
    }
    setActiveBranchPartnerId('all');
    showToast(`Signed in to ${user.name}`);
  };

  const logout = () => {
    void signOutSupabase();
    setIsAuthenticated(false);
    sessionStorage.removeItem(STORAGE_KEYS.IS_AUTH);
    localStorage.removeItem(STORAGE_KEYS.IS_AUTH);
    showToast(t('logged_out_notice') || 'Signed out successfully.');
  };

  // Branch User password self-change
  const changePassword = (newPassword: string): boolean => {
    if (!newPassword || newPassword.trim().length < 4) {
      showToast('Password must be at least 4 characters');
      return false;
    }

    const cleanPass = newPassword.trim();
    const updatedUser: User = {
      ...currentUser,
      password: cleanPass,
      passwordChangedByBranch: true,
      lastPasswordChange: new Date().toISOString()
    };

    setUsers(prev => {
      const updated = prev.map(u => u.id === currentUser.id ? updatedUser : u);
      return updated;
    });
    setCurrentUser(updatedUser);

    // Direct Supabase upsert
    directSupabaseInsertUser(updatedUser);

    // Backend database update
    fetch('/api/users/change-password', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-User-Role': currentUser.role
      },
      body: JSON.stringify({ 
        userId: currentUser.id, 
        newPassword: cleanPass, 
        userRole: currentUser.role 
      })
    }).catch(err => console.error('Error updating password in database:', err));

    showToast('Your branch password was updated securely!');
    return true;
  };

  const updateUserPreferences = (prefs: UserPreferences): boolean => {
    const updatedUser = {
      ...currentUser,
      preferences: {
        ...currentUser.preferences,
        ...prefs
      }
    };

    setUsers(prev => prev.map(u => u.id === currentUser.id ? updatedUser : u));
    setCurrentUser(updatedUser);

    fetch('/api/users/preferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.id, preferences: updatedUser.preferences })
    }).catch(err => console.error('Error updating preferences:', err));

    showToast('User preferences updated and saved.');
    return true;
  };

  // Super Admin provisions email and password for a branch
  const resetBranchUserCredentials = (
    userIdOrBranchId: string, 
    emailOrPassword: string, 
    initialPassword?: string,
    name?: string,
    phone?: string,
    targetBranchId?: string
  ): boolean => {
    // Resolve branch ID
    const resolvedBranchId = targetBranchId || 
      (userIdOrBranchId.startsWith('br_') ? userIdOrBranchId : null) || 
      (userIdOrBranchId.startsWith('usr_br_') ? userIdOrBranchId.replace('usr_', '') : null) ||
      branches.find(b => b.id === userIdOrBranchId || b.code.toLowerCase() === userIdOrBranchId.toLowerCase())?.id;

    const targetBranch = branches.find(b => b.id === resolvedBranchId || b.id === userIdOrBranchId);

    let targetEmail: string | undefined;
    let targetPassword: string | undefined;

    if (initialPassword !== undefined) {
      targetEmail = emailOrPassword.trim().toLowerCase();
      targetPassword = initialPassword.trim();
    } else {
      if (emailOrPassword.includes('@')) {
        targetEmail = emailOrPassword.trim().toLowerCase();
      } else {
        targetPassword = emailOrPassword.trim();
      }
    }

    // Locate existing user
    const existingUser = users.find(u => 
      u.id === userIdOrBranchId || 
      (resolvedBranchId && u.branchId === resolvedBranchId) ||
      (targetBranch && u.branchId === targetBranch.id)
    );

    const bId = resolvedBranchId || (targetBranch ? targetBranch.id : userIdOrBranchId);
    const codeClean = (targetBranch?.code || 'branch').toLowerCase().replace(/[^a-z0-9]/g, '');
    const uId = existingUser?.id || (userIdOrBranchId.startsWith('usr_') ? userIdOrBranchId : `usr_${bId}`);

    const finalUser: User = {
      id: uId,
      name: name?.trim() || existingUser?.name || targetBranch?.managerName || 'Branch Manager',
      email: (targetEmail || existingUser?.email || targetBranch?.email || `${codeClean}@armaghansadeq.af`).toLowerCase().trim(),
      phone: phone?.trim() || existingUser?.phone || targetBranch?.phone || '',
      role: 'branch_manager',
      branchId: bId,
      password: targetPassword || existingUser?.password || `${codeClean}123`,
      passwordChangedByBranch: false,
      status: 'active',
      createdAt: existingUser?.createdAt || new Date().toISOString(),
      lastLogin: existingUser?.lastLogin || 'Never'
    };

    let finalBranch: Branch | null = null;
    if (resolvedBranchId || targetBranch) {
      const bObj = targetBranch || branches.find(b => b.id === resolvedBranchId);
      if (bObj) {
        finalBranch = {
          ...bObj,
          email: targetEmail || bObj.email,
          managerName: name?.trim() || bObj.managerName,
          phone: phone?.trim() || bObj.phone
        };
      }
    }

    // Update React states and LocalStorage
    setUsers(prev => {
      const exists = prev.some(u => u.id === finalUser.id || (finalUser.branchId && u.branchId === finalUser.branchId));
      const updated = exists 
        ? prev.map(u => (u.id === finalUser.id || (finalUser.branchId && u.branchId === finalUser.branchId)) ? finalUser : u)
        : [...prev, finalUser];
      return updated;
    });

    if (finalBranch) {
      const fb = finalBranch;
      setBranches(prev => {
        const updated = prev.map(b => b.id === fb.id ? fb : b);
        return updated;
      });
    }

    // Direct Supabase upsert (instant sync)
    directSupabaseInsertUser(finalUser);
    if (finalBranch) {
      directSupabaseInsertBranch(finalBranch);
    }

    // Backend database update
    fetch('/api/users/credentials', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-User-Role': currentUser?.role || 'super_admin'
      },
      body: JSON.stringify({
        userId: finalUser.id,
        branchId: finalUser.branchId,
        email: finalUser.email,
        password: finalUser.password,
        name: finalUser.name,
        phone: finalUser.phone,
        userRole: currentUser?.role || 'super_admin'
      })
    }).catch(err => console.error('Error provisioning credentials in backend:', err));

    if (finalBranch) {
      fetch('/api/branches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalBranch)
      }).catch(err => console.error('Error updating branch in backend:', err));
    }

    showToast(t('credentials_success_msg') || 'Branch credentials updated and saved securely.');
    return true;
  };

  // Super Admin adds a brand new branch terminal
  const addBranch = (input: AddBranchInput): { branch: Branch; user: User } => {
    const cleanCode = input.code.trim().toUpperCase();
    const branchId = `br_${cleanCode.toLowerCase().replace(/[^a-z0-9]/g, '')}_${Date.now().toString().slice(-4)}`;
    const now = new Date().toISOString();

    const newBranch: Branch = {
      id: branchId,
      name: input.name.trim(),
      nameFa: input.nameFa?.trim() || input.name.trim(),
      namePs: input.namePs?.trim() || input.name.trim(),
      code: cleanCode,
      province: input.province.trim(),
      city: input.city.trim(),
      address: input.address.trim(),
      phone: input.phone.trim(),
      email: input.email.trim().toLowerCase(),
      managerName: input.managerName.trim(),
      tazkiraNumber: input.tazkiraNumber?.trim() || '',
      isHeadOffice: false,
      activeShipmentsCount: 0,
      totalParcelsDispatched: 0,
      totalParcelsReceived: 0,
      totalRevenueAfn: 0,
      createdAt: now
    };

    const initialPass = input.initialPassword?.trim() || `${cleanCode.toLowerCase().replace(/[^a-z0-9]/g, '')}123`;
    const newUser: User = {
      id: `usr_${branchId}`,
      name: input.managerName.trim() || `${input.name.trim()} Manager`,
      email: input.email.trim().toLowerCase(),
      phone: input.phone.trim(),
      role: 'branch_manager',
      branchId: branchId,
      password: initialPass,
      passwordChangedByBranch: false,
      status: 'active',
      createdAt: now,
      lastLogin: 'Never'
    };

    setBranches(prev => {
      const updated = [...prev, newBranch];
      return updated;
    });
    setUsers(prev => {
      const updated = [...prev, newUser];
      return updated;
    });

    // Persist to Supabase Database (direct client & backend API)
    directSupabaseInsertBranch(newBranch);
    directSupabaseInsertUser(newUser);

    fetch('/api/branches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newBranch, initialPassword: initialPass })
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.success) {
          showToast(`⚠️ Supabase notice: ${data.error || 'Database could not save branch'}`);
        } else {
          showToast(t('branch_added_successfully') || 'New branch registered and saved to Supabase!');
        }
      })
      .catch((err) => {
        console.error('Error adding branch to Supabase:', err);
        showToast('⚠️ Notice: Backend connection error while saving branch');
      });

    return { branch: newBranch, user: newUser };
  };

  // Super Admin removes a provincial branch terminal with verification
  const deleteBranch = (branchId: string): boolean => {
    const branchToRemove = branches.find(b => b.id === branchId);
    if (!branchToRemove) return false;

    if (branchToRemove.isHeadOffice) {
      showToast(t('cannot_delete_head_office') || 'The Head Office central terminal cannot be removed.');
      return false;
    }

    setBranches(prev => {
      const updated = prev.filter(b => b.id !== branchId);
      return updated;
    });
    setUsers(prev => {
      const updated = prev.filter(u => u.branchId !== branchId);
      return updated;
    });

    if (activeBranchId === branchId) {
      setActiveBranchId('all');
    }
    if (activeBranchPartnerId === branchId) {
      setActiveBranchPartnerId('all');
    }

    // Persist to Supabase Database
    fetch(`/api/branches/${branchId}`, {
      method: 'DELETE',
      headers: {
        'X-User-Role': currentUser?.role || 'super_admin',
        'X-User-Id': currentUser?.id || 'usr_admin'
      }
    }).catch(err => console.error('Error deleting branch from Supabase:', err));

    showToast(t('branch_deleted_successfully') || 'Branch terminal removed successfully from the network!');
    return true;
  };

  // Super Admin updates provincial branch info including CNIC / Tazkira number
  const updateBranch = (branchId: string, updates: Partial<Branch>): boolean => {
    const existing = branches.find(b => b.id === branchId);
    if (!existing) return false;

    const updatedBranch: Branch = {
      ...existing,
      ...updates
    };

    setBranches(prev => {
      const updated = prev.map(b => b.id === branchId ? updatedBranch : b);
      return updated;
    });

    // If manager name, email, or phone is updated, sync with branch manager user
    if (updates.managerName || updates.email || updates.phone) {
      const existingUser = users.find(u => u.branchId === branchId);
      const cleanCode = (updatedBranch.code || 'branch').toLowerCase().replace(/[^a-z0-9]/g, '');
      const finalUserObj: User = {
        id: existingUser?.id || `usr_${branchId}`,
        name: updates.managerName?.trim() || existingUser?.name || `${updatedBranch.name} Manager`,
        email: (updates.email?.trim() || existingUser?.email || updatedBranch.email || `${cleanCode}@armaghansadeq.af`).toLowerCase(),
        phone: updates.phone?.trim() || existingUser?.phone || updatedBranch.phone || '',
        role: 'branch_manager',
        branchId: branchId,
        password: existingUser?.password || `${cleanCode}123`,
        passwordChangedByBranch: existingUser?.passwordChangedByBranch || false,
        status: 'active',
        createdAt: existingUser?.createdAt || new Date().toISOString(),
        lastLogin: existingUser?.lastLogin || 'Never'
      };

      setUsers(prev => {
        const exists = prev.some(u => u.branchId === branchId || u.id === finalUserObj.id);
        const updated = exists 
          ? prev.map(u => (u.branchId === branchId || u.id === finalUserObj.id) ? finalUserObj : u)
          : [...prev, finalUserObj];
        return updated;
      });

      directSupabaseInsertUser(finalUserObj);
      fetch('/api/users/credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Role': currentUser?.role || 'super_admin'
        },
        body: JSON.stringify({
          userId: finalUserObj.id,
          branchId,
          email: finalUserObj.email,
          password: finalUserObj.password,
          name: finalUserObj.name,
          phone: finalUserObj.phone,
          userRole: currentUser?.role || 'super_admin'
        })
      }).catch(err => console.warn('Could not sync user credentials on branch update:', err));
    }

    // Persist to direct Supabase & API
    directSupabaseInsertBranch(updatedBranch);

    // Persist to database
    fetch('/api/branches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedBranch)
    }).catch(err => console.error('Error updating branch in database:', err));

    showToast(t('branch_updated_successfully') || 'Branch and CNIC/Tazkira credentials updated successfully!');
    return true;
  };

  // Remittance Transfers state
  const [remittanceTransfers, setRemittanceTransfers] = useState<BranchRemittanceTransfer[]>([]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, currentUser.id);
    if (currentUser.role !== 'super_admin') {
      setActiveBranchId(currentUser.branchId);
    }
  }, [currentUser]);

  // Views & Modals
  const [activeViewState, setActiveViewState] = useState<ActiveViewType>(() => {
    return currentUser.role === 'customer' ? 'customer_portal' : 'dashboard';
  });

  const setActiveView = (view: ActiveViewType, forceRole?: string) => {
    const role = forceRole || currentUser.role;
    if (role === 'customer' && view !== 'tracking' && view !== 'customer_portal' && view !== 'customer_history' && view !== 'customer_finances') {
      setActiveViewState('customer_portal');
      return;
    }
    if (role !== 'customer' && (view === 'customer_portal' || view === 'customer_finances' || view === 'customer_history')) {
      setActiveViewState('dashboard');
      return;
    }
    setActiveViewState(view);
  };
  const activeView = (currentUser.role === 'customer' && activeViewState !== 'tracking' && activeViewState !== 'customer_history' && activeViewState !== 'customer_portal' && activeViewState !== 'customer_finances') 
    ? 'customer_portal' 
    : (currentUser.role !== 'customer' && (activeViewState === 'customer_portal' || activeViewState === 'customer_finances' || activeViewState === 'customer_history'))
      ? 'dashboard'
      : activeViewState;
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [selectedShipmentForReceipt, setSelectedShipmentForReceipt] = useState<Shipment | null>(null);
  const [trackedShipment, setTrackedShipment] = useState<Shipment | null>(null);
  const [isOfflineCached] = useState<boolean>(true);

  // Track by CN Number function
  const trackByCnNumber = (cn: string): Shipment | null => {
    const cleaned = cn.trim().toUpperCase();
    if (!cleaned) return null;

    const found = shipments.find(s => 
      s.cnNumber.toUpperCase() === cleaned ||
      s.cnNumber.replace(/[^A-Z0-9]/g, '') === cleaned.replace(/[^A-Z0-9]/g, '') ||
      s.receiver.phone.includes(cleaned) ||
      s.sender.phone.includes(cleaned)
    );

    if (found) {
      setTrackedShipment(found);
      return found;
    }
    return null;
  };

  // Filter shipments based on active branch selection and user role
  const filteredShipments = React.useMemo(() => {
    if (currentUser.role === 'customer') {
      return shipments.filter(s => 
        s.customerUserId === currentUser.id ||
        s.sender.phone.replace(/[^0-9]/g, '') === currentUser.phone.replace(/[^0-9]/g, '') ||
        s.sender.email?.toLowerCase() === currentUser.email?.toLowerCase()
      );
    }
    if (currentUser.role === 'super_admin' && activeBranchId === 'all') {
      return shipments;
    }
    const currentBr = currentUser.role === 'super_admin' ? activeBranchId : currentUser.branchId;
    return shipments.filter(s => 
      s.originBranchId === currentBr || 
      s.destinationBranchId === currentBr ||
      s.currentBranchId === currentBr
    );
  }, [shipments, activeBranchId, currentUser]);

  // Customer specific shipments
  const customerShipments = React.useMemo(() => {
    return shipments.filter(s => 
      s.customerUserId === currentUser.id ||
      s.sender.phone.replace(/[^0-9]/g, '') === currentUser.phone.replace(/[^0-9]/g, '') ||
      s.sender.email?.toLowerCase() === currentUser.email?.toLowerCase()
    );
  }, [shipments, currentUser]);

  // Partner-specific history shipments
  const partnerShipments = React.useMemo(() => {
    const currentBr = currentUser.role === 'super_admin' ? activeBranchId : currentUser.branchId;
    if (activeBranchPartnerId === 'all' || !activeBranchPartnerId) {
      if (currentUser.role === 'super_admin' && activeBranchId === 'all') {
        return shipments;
      }
      return shipments.filter(s => 
        s.originBranchId === currentBr || 
        s.destinationBranchId === currentBr ||
        s.currentBranchId === currentBr
      );
    }
    return shipments.filter(s => 
      (s.originBranchId === currentBr && s.destinationBranchId === activeBranchPartnerId) ||
      (s.originBranchId === activeBranchPartnerId && s.destinationBranchId === currentBr)
    );
  }, [shipments, activeBranchId, activeBranchPartnerId, currentUser]);

  // Branch specific expenses
  const branchExpenses = React.useMemo(() => {
    if (currentUser.role === 'super_admin' && activeBranchId === 'all') {
      return expenses;
    }
    const curBranch = currentUser.role === 'super_admin' ? activeBranchId : currentUser.branchId;
    return expenses.filter(e => e.branchId === curBranch);
  }, [expenses, activeBranchId, currentUser]);

  // Analytics Computation (All branches for super_admin, or single branch)
  const analytics: AnalyticsSummary = React.useMemo(() => {
    let totalRevenue = 0;
    let totalPaid = 0;
    let totalPending = 0;
    let receivedParcels = 0;
    let inProgressParcels = 0;
    let deliveredParcels = 0;
    let returnedParcels = 0;
    let discountsGiven = 0;
    let totalRemittancesPending = 0;

    const isSuperAdmin = currentUser.role === 'super_admin';
    const targetBranchId = isSuperAdmin ? activeBranchId : currentUser.branchId;

    if (isSuperAdmin && targetBranchId === 'all') {
      // Super Admin sees ALL shipments and entire business revenue across all branches
      shipments.forEach(s => {
        totalRevenue += s.financials.totalAmount;
        totalPaid += s.financials.amountPaid;
        totalPending += s.financials.amountDue;
        discountsGiven += s.financials.discountAmount || 0;

        if (s.remittanceStatus === 'pending' && s.status === 'delivered') {
          totalRemittancesPending += (s.originRemittanceDue || (s.financials.totalAmount - (s.destBranchCommission || 0)));
        }

        if (s.status === 'delivered') deliveredParcels++;
        else if (s.status === 'in_transit' || s.status === 'out_for_delivery') inProgressParcels++;
        else if (s.status === 'received_at_branch') receivedParcels++;
        else if (s.status === 'returned') returnedParcels++;
      });
    } else {
      // Single Branch Scope (Branch Manager or Admin inspecting one specific branch)
      // Branch revenue is strictly isolated: only freight booked at this branch + destination commission earned
      shipments.forEach(s => {
        const isOrigin = s.originBranchId === targetBranchId;
        const isDest = s.destinationBranchId === targetBranchId;
        const isCurrent = s.currentBranchId === targetBranchId;

        if (isOrigin) {
          totalRevenue += s.financials.totalAmount;
          totalPaid += s.financials.amountPaid;
          totalPending += s.financials.amountDue;
          discountsGiven += s.financials.discountAmount || 0;
        } else if (isDest) {
          // Destination branch earns destination commission for handling the parcel
          const comm = s.destBranchCommission !== undefined ? s.destBranchCommission : 100;
          totalRevenue += comm;
        }

        if (isOrigin || isDest || isCurrent) {
          if (s.remittanceStatus === 'pending' && s.status === 'delivered' && isOrigin) {
            totalRemittancesPending += (s.originRemittanceDue || (s.financials.totalAmount - (s.destBranchCommission || 0)));
          }

          if (s.status === 'delivered') deliveredParcels++;
          else if (s.status === 'in_transit' || s.status === 'out_for_delivery') inProgressParcels++;
          else if (s.status === 'received_at_branch') receivedParcels++;
          else if (s.status === 'returned') returnedParcels++;
        }
      });
    }

    const totalExpensesAfn = branchExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const netProfitAfn = totalRevenue - totalExpensesAfn;

    // Head office and branch remittance KPI metrics
    const totalPendingHeadOfficeConfirmation = remittanceTransfers
      .filter(r => r.status === 'submitted_to_headoffice')
      .reduce((sum, r) => sum + r.netRemittanceAmountAfn, 0);

    const totalHeadOfficeSettledRevenue = remittanceTransfers
      .filter(r => r.status === 'confirmed_by_headoffice')
      .reduce((sum, r) => sum + r.netRemittanceAmountAfn, 0);

    const targetBr = isSuperAdmin ? activeBranchId : currentUser.branchId;
    const branchOwedList = shipments.filter(s => {
      const isTargetDest = targetBr === 'all' ? true : (s.destinationBranchId === targetBr);
      const isPaymentLocked = Boolean(s.paymentSettlement?.locked || s.financials?.paymentSettlement?.locked);
      return isTargetDest && s.status === 'delivered' && isPaymentLocked && (!s.remittanceStatus || s.remittanceStatus === 'pending' || (s.remittanceStatus as string) === 'unsettled');
    });
    const totalOwedToHeadOffice = branchOwedList.reduce((sum, s) => {
      const settlement = s.paymentSettlement || s.financials?.paymentSettlement;
      if (settlement?.locked) return sum + settlement.reconciledRemittanceDue;
      const comm = s.destBranchCommission !== undefined ? s.destBranchCommission : (s.financials?.destBranchCommission || 70);
      return sum + (s.originRemittanceDue !== undefined ? s.originRemittanceDue : Math.max(0, s.financials.totalAmount - comm));
    }, 0);

    const totalBranchCommissionsEarned = shipments.filter(s => {
      const isTargetDest = targetBr === 'all' ? true : (s.destinationBranchId === targetBr);
      const isPaymentLocked = Boolean(s.paymentSettlement?.locked || s.financials?.paymentSettlement?.locked);
      return isTargetDest && s.status === 'delivered' && isPaymentLocked;
    }).reduce((sum, s) => {
      const settlement = s.paymentSettlement || s.financials?.paymentSettlement;
      if (settlement?.locked) return sum + settlement.fixedDestCommission;
      const comm = s.destBranchCommission !== undefined ? s.destBranchCommission : (s.financials?.destBranchCommission || 70);
      return sum + comm;
    }, 0);

    return {
      totalRevenue,
      totalPaid,
      totalPending,
      totalParcels: isSuperAdmin && targetBranchId === 'all' ? shipments.length : filteredShipments.length,
      receivedParcels,
      inProgressParcels,
      deliveredParcels,
      returnedParcels,
      discountsGiven,
      totalExpensesAfn,
      netProfitAfn,
      totalRemittancesPending,
      totalOwedToHeadOffice,
      totalBranchCommissionsEarned,
      totalHeadOfficeSettledRevenue,
      totalPendingHeadOfficeConfirmation
    };
  }, [shipments, filteredShipments, branchExpenses, currentUser, activeBranchId, remittanceTransfers]);

  // Specific branch level money computations
  const currentTargetBranch = currentUser.role === 'super_admin' ? activeBranchId : currentUser.branchId;

  const branchOwedToHeadOffice = React.useMemo(() => {
    return shipments
      .filter(s => {
        const isTargetDest = currentTargetBranch === 'all' ? true : (s.destinationBranchId === currentTargetBranch);
        const isPaymentLocked = Boolean(s.paymentSettlement?.locked || s.financials?.paymentSettlement?.locked);
        return isTargetDest && s.status === 'delivered' && isPaymentLocked && (!s.remittanceStatus || s.remittanceStatus === 'pending' || (s.remittanceStatus as string) === 'unsettled');
      })
      .reduce((sum, s) => {
        const settlement = s.paymentSettlement || s.financials?.paymentSettlement;
        if (settlement?.locked) return sum + settlement.reconciledRemittanceDue;
        const comm = s.destBranchCommission !== undefined ? s.destBranchCommission : (s.financials?.destBranchCommission || 70);
        return sum + (s.originRemittanceDue !== undefined ? s.originRemittanceDue : Math.max(0, s.financials.totalAmount - comm));
      }, 0);
  }, [shipments, currentTargetBranch]);

  const branchEarnedCommissions = React.useMemo(() => {
    return shipments
      .filter(s => {
        const isTargetDest = currentTargetBranch === 'all' ? true : (s.destinationBranchId === currentTargetBranch);
        const isPaymentLocked = Boolean(s.paymentSettlement?.locked || s.financials?.paymentSettlement?.locked);
        return isTargetDest && s.status === 'delivered' && isPaymentLocked;
      })
      .reduce((sum, s) => {
        const settlement = s.paymentSettlement || s.financials?.paymentSettlement;
        if (settlement?.locked) return sum + settlement.fixedDestCommission;
        const comm = s.destBranchCommission !== undefined ? s.destBranchCommission : (s.financials?.destBranchCommission || 70);
        return sum + comm;
      }, 0);
  }, [shipments, currentTargetBranch]);

  const headOfficePendingRemittancesTotal = React.useMemo(() => {
    return remittanceTransfers
      .filter(r => r.status === 'submitted_to_headoffice')
      .reduce((sum, r) => sum + r.netRemittanceAmountAfn, 0);
  }, [remittanceTransfers]);

  const headOfficeSettledRevenueTotal = React.useMemo(() => {
    return remittanceTransfers
      .filter(r => r.status === 'confirmed_by_headoffice')
      .reduce((sum, r) => sum + r.netRemittanceAmountAfn, 0);
  }, [remittanceTransfers]);

  const branchTotalSubmittedRemittances = React.useMemo(() => {
    return remittanceTransfers
      .filter(r => (currentTargetBranch === 'all' ? true : r.fromBranchId === currentTargetBranch) && r.status === 'submitted_to_headoffice')
      .reduce((sum, r) => sum + r.netRemittanceAmountAfn, 0);
  }, [remittanceTransfers, currentTargetBranch]);

  const branchTotalConfirmedSettledRemittances = React.useMemo(() => {
    return remittanceTransfers
      .filter(r => (currentTargetBranch === 'all' ? true : r.fromBranchId === currentTargetBranch) && r.status === 'confirmed_by_headoffice')
      .reduce((sum, r) => sum + r.netRemittanceAmountAfn, 0);
  }, [remittanceTransfers, currentTargetBranch]);

  // Create Batch Remittance (Branch -> Head Office)
  const createBatchRemittance = (
    parcelIds: string[], 
    fromBranchId: string, 
    totalCollected: number, 
    totalCommissionKept: number, 
    netToHq: number, 
    paymentMethod: 'hawala' | 'bank_transfer' | 'cash_handover' | 'treasury',
    referenceNumber?: string,
    transferAgentName?: string,
    notes?: string,
    transportationFee: number = 0,
    originCommission: number = 0,
    originBranchId?: string,
    commissionAdjustmentType: PriceAdjustmentType = 'exact',
    commissionAdjustmentAmount: number = 0,
    commissionAdjustmentReason: string = '',
    transportAdjustmentType: PriceAdjustmentType = 'exact',
    transportAdjustmentAmount: number = 0,
    transportAdjustmentReason: string = ''
  ): boolean => {
    const normalizedParcelIds = Array.from(new Set(parcelIds));
    const selectedParcels = shipments.filter(s =>
      normalizedParcelIds.includes(s.id) || normalizedParcelIds.includes(s.cnNumber)
    );

    if (normalizedParcelIds.length > 0) {
      if (selectedParcels.length !== normalizedParcelIds.length) {
        showToast(t('remittance_parcel_not_found') || 'One or more parcels could not be found.');
        return false;
      }
      if (selectedParcels.some(s => s.status !== 'delivered')) {
        showToast(t('remittance_only_delivered') || 'Only delivered parcels can be remitted.');
        return false;
      }
      if (selectedParcels.some(s => {
        const status = s.remittanceStatus as string | undefined;
        return status && status !== 'pending' && status !== 'unsettled';
      })) {
        showToast(t('remittance_already_submitted') || '⛔ Double-Remittance Blocked: One or more parcels already have a remittance in progress or settled.', 'error');
        return false;
      }
      if (selectedParcels.some(s => !(s.paymentSettlement?.locked || s.financials?.paymentSettlement?.locked))) {
        showToast('🔒 Reconciliation Gate: Please complete and lock "Record Payment & Report" on all selected parcels before remitting.', 'warning');
        return false;
      }
    }

    const calculatedCollected = selectedParcels.length > 0
      ? selectedParcels.reduce((sum, s) => {
          const settlement = s.paymentSettlement || s.financials?.paymentSettlement;
          return sum + (settlement?.locked ? settlement.actualCollectedAmount : (s.financials?.totalAmount || 0));
        }, 0)
      : Math.max(0, totalCollected);

    // Compute Destination Branch Commission with Portion 1 Adjustments (Extra [+] / Less [-])
    let calculatedCommission = Math.max(0, totalCommissionKept);
    if (commissionAdjustmentType === 'extra') {
      calculatedCommission += Math.max(0, commissionAdjustmentAmount);
    } else if (commissionAdjustmentType === 'less') {
      calculatedCommission = Math.max(0, calculatedCommission - Math.max(0, commissionAdjustmentAmount));
    }

    // Compute Transportation Fee with Portion 2 Adjustments (Extra [+] / Less [-])
    let calculatedTransport = Math.max(0, transportationFee);
    if (transportAdjustmentType === 'extra') {
      calculatedTransport += Math.max(0, transportAdjustmentAmount);
    } else if (transportAdjustmentType === 'less') {
      calculatedTransport = Math.max(0, calculatedTransport - Math.max(0, transportAdjustmentAmount));
    }

    const calculatedOriginCommission = Math.max(0, originCommission);
    // Destination branch keeps ONLY its commission (calculatedCommission). Transportation fee is remitted to HQ!
    const calculatedNet = Math.max(0, calculatedCollected - calculatedCommission - calculatedOriginCommission);

    const fromBranch = branches.find(b => b.id === fromBranchId);
    const mainBranch = branches.find(b => b.isHeadOffice) || branches[0];
    const now = new Date().toISOString();
    const batchId = `rem_${Date.now().toString().slice(-6)}`;
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const batchNumber = `REM-${fromBranch?.code || 'BR'}-${randomCode}`;

    // Destination branch keeps ONLY its commission, not other transportation charges
    const destTotalRetained = calculatedCommission;

    const newTransfer: BranchRemittanceTransfer = {
      id: batchId,
      batchNumber,
      fromBranchId,
      fromBranchName: fromBranch?.name || 'Sender Branch',
      originBranchId: originBranchId || 'br_admin_hq',
      destinationBranchId: fromBranchId,
      destinationBranchName: fromBranch?.name,
      toBranchId: mainBranch?.id || 'br_admin_hq',
      toBranchName: mainBranch?.name || 'Main Branch (Head Office Admin HQ)',
      parcelIds: normalizedParcelIds,
      parcelCount: normalizedParcelIds.length,
      totalCollectedAfn: calculatedCollected,
      destCommissionAfn: calculatedCommission,
      transportationFeeAfn: calculatedTransport,
      destTotalRetainedAfn: destTotalRetained,
      originCommissionAfn: calculatedOriginCommission,
      totalCommissionKeptAfn: destTotalRetained + calculatedOriginCommission,
      netRemittanceAmountAfn: calculatedNet,
      
      // Two Portions: Commission & Transportation Adjustment Options
      commissionAdjustmentType,
      commissionAdjustmentAmount,
      commissionAdjustmentReason,
      transportAdjustmentType,
      transportAdjustmentAmount,
      transportAdjustmentReason,

      paymentMethod,
      referenceNumber: referenceNumber || `REF-${randomCode}`,
      transferAgentName: transferAgentName || 'Sarafi Central',
      notes,
      status: 'submitted_to_headoffice',
      submittedByUserId: currentUser.id,
      submittedByUserName: currentUser.name,
      submittedAt: now
    };

    // Update shipments: mark remittanceStatus = 'submitted_to_headoffice' and attach remittanceBatchId
    setShipments(prev => prev.map(s => {
      if (parcelIds.includes(s.id) || parcelIds.includes(s.cnNumber)) {
        const historyItem = {
          id: `st_rem_${Date.now()}_${s.id}`,
          status: s.status,
          location: `${fromBranch?.name || 'Branch'} → ${mainBranch?.name || 'Head Office'}`,
          branchName: fromBranch?.name || 'Branch',
          timestamp: now,
          note: `Financial Settlement & Remittance ${batchNumber}: Collected ${calculatedCollected} AFN. Destination commission kept: ${calculatedCommission} AFN (no transport kept by branch). Sender branch commission: ${calculatedOriginCommission} AFN. Net to Main Branch HQ: ${calculatedNet} AFN (${paymentMethod.toUpperCase()}: ${referenceNumber || 'N/A'}). Awaiting HQ confirmation.`,
          updatedBy: currentUser.name
        };
        const updatedS = {
          ...s,
          remittanceStatus: 'submitted_to_headoffice' as const,
          remittanceBatchId: batchId,
          statusHistory: [...(s.statusHistory || []), historyItem]
        };
        directSupabaseInsertShipment(updatedS);
        return updatedS;
      }
      return s;
    }));

    setRemittanceTransfers(prev => [newTransfer, ...prev]);

    // Direct Supabase Mutation
    directSupabaseInsertSettlement(newTransfer);

    // Send to /api/remittances
    fetch('/api/remittances', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTransfer)
    }).catch(err => console.warn('Remittance sync error:', err));

    // Send to /api/settlements
    fetch('/api/settlements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: `stl_${batchId}`,
        shipmentId: parcelIds[0] || null,
        cnNumber: batchNumber,
        originBranchId: originBranchId || 'br_admin_hq',
        destinationBranchId: fromBranchId,
        grossCollectedAmount: calculatedCollected,
        destBranchCommission: calculatedCommission,
        netRemittedAmount: calculatedNet,
        settlementChannel: paymentMethod,
        sarafiReferenceNo: referenceNumber,
        settlementStatus: 'pending_confirmation',
        settledByUserName: currentUser.name,
        settledAt: now,
        notes: notes || `Settlement for ${normalizedParcelIds.length} parcel(s)`
      })
    }).catch(err => console.warn('Settlement sync error:', err));

    showToast(`✓ Settlement & Remittance ${batchNumber} (${calculatedNet.toLocaleString()} AFN) submitted to Main Branch for verification!`);
    return true;
  };

  // Create Single Parcel Remittance (Wrapper for single parcel submission)
  const createSingleParcelRemittance = (
    shipmentId: string, 
    customCommission: number, 
    netToHq: number, 
    paymentMethod: 'hawala' | 'bank_transfer' | 'cash_handover' | 'treasury',
    referenceNumber?: string,
    transferAgentName?: string,
    notes?: string,
    transportationFee: number = 0,
    originCommission: number = 0
  ): boolean => {
    const target = shipments.find(s => s.id === shipmentId || s.cnNumber === shipmentId);
    if (!target) return false;

    const fromBranchId = target.destinationBranchId || currentUser.branchId;
    const totalCollected = target.financials.totalAmount || target.financials.productPrice || 0;
    // Destination branch keeps ONLY its commission (customCommission), not transportation charges
    const calculatedNet = Math.max(0, totalCollected - customCommission - originCommission);

    // Update target parcel with adjusted commission and net due if changed
    setShipments(prev => prev.map(s => {
      if (s.id === target.id || s.cnNumber === target.cnNumber) {
        return {
          ...s,
          destBranchCommission: customCommission,
          transportationFee: 0,
          originRemittanceDue: calculatedNet
        };
      }
      return s;
    }));

    return createBatchRemittance(
      [target.id],
      fromBranchId,
      totalCollected,
      customCommission,
      calculatedNet,
      paymentMethod,
      referenceNumber,
      transferAgentName,
      notes,
      0,
      originCommission,
      target.originBranchId
    );
  };

  // Confirm Remittance Receipt (Head Office / Super Admin)
  const confirmRemittanceByHeadOffice = (transferId: string, confirmationNotes?: string): boolean => {
    const target = remittanceTransfers.find(r => r.id === transferId);
    if (!target) return false;

    const now = new Date().toISOString();
    const updatedTransfer: BranchRemittanceTransfer = {
      ...target,
      status: 'confirmed_by_headoffice',
      confirmedByUserId: currentUser.id,
      confirmedByUserName: currentUser.name,
      confirmedAt: now,
      confirmationNotes: confirmationNotes || `Funds of ${target.netRemittanceAmountAfn.toLocaleString()} AFN verified and received at Main Branch.`
    };

    setRemittanceTransfers(prev => prev.map(r => r.id === transferId ? updatedTransfer : r));

    // Update all shipments in this transfer: remittanceStatus = 'settled', remittanceSettledAt = now
    setShipments(prev => prev.map(s => {
      if (target.parcelIds.includes(s.id) || target.parcelIds.includes(s.cnNumber) || s.remittanceBatchId === transferId) {
        const historyItem = {
          id: `st_conf_${Date.now()}_${s.id}`,
          status: s.status,
          location: 'Main Branch (Admin HQ - Kabul)',
          branchName: 'Head Office Admin',
          timestamp: now,
          note: `✓ Remittance batch ${target.batchNumber} confirmed received by ${currentUser.name}. ${target.netRemittanceAmountAfn.toLocaleString()} AFN added to Main Branch Revenue; ${target.totalCommissionKeptAfn.toLocaleString()} AFN credited to ${target.fromBranchName} commission.`,
          updatedBy: currentUser.name
        };
        return {
          ...s,
          remittanceStatus: 'settled',
          remittanceSettledAt: now,
          statusHistory: [...(s.statusHistory || []), historyItem]
        };
      }
      return s;
    }));

    // Update main branch revenue
    const mainBranch = branches.find(b => b.isHeadOffice) || branches[0];
    if (mainBranch) {
      setBranches(prev => prev.map(b => {
        if (b.id === mainBranch.id) {
          return {
            ...b,
            totalRevenueAfn: (b.totalRevenueAfn || 0) + target.netRemittanceAmountAfn
          };
        }
        return b;
      }));
    }

    // Direct Supabase Mutation for Settled Transfer
    directSupabaseInsertSettlement(updatedTransfer);

    fetch(`/api/remittances/${transferId}/confirm`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedTransfer)
    }).catch(err => console.warn('Remittance confirm sync error:', err));

    showToast(`✓ Remittance ${target.batchNumber} confirmed! ${target.netRemittanceAmountAfn.toLocaleString()} AFN credited to Main Branch Revenue.`);
    return true;
  };

  // Reject Remittance (Head Office / Super Admin)
  const rejectRemittanceByHeadOffice = (transferId: string, rejectionReason: string): boolean => {
    const target = remittanceTransfers.find(r => r.id === transferId);
    if (!target) return false;

    const now = new Date().toISOString();
    const updatedTransfer: BranchRemittanceTransfer = {
      ...target,
      status: 'rejected',
      confirmationNotes: `Rejected by HQ: ${rejectionReason}`,
      confirmedByUserId: currentUser.id,
      confirmedByUserName: currentUser.name,
      confirmedAt: now
    };

    setRemittanceTransfers(prev => prev.map(r => r.id === transferId ? updatedTransfer : r));

    // Reset shipments back to pending
    setShipments(prev => prev.map(s => {
      if (target.parcelIds.includes(s.id) || target.parcelIds.includes(s.cnNumber) || s.remittanceBatchId === transferId) {
        return {
          ...s,
          remittanceStatus: 'pending',
          remittanceBatchId: undefined
        };
      }
      return s;
    }));

    fetch(`/api/remittances/${transferId}/reject`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rejectionReason, parcelIds: target.parcelIds })
    }).catch(err => console.warn('Remittance reject sync error:', err));

    showToast(`Remittance ${target.batchNumber} rejected. Reason: ${rejectionReason}`);
    return true;
  };

  // Expense Management
  const addExpense = (input: AddExpenseInput): BranchExpense => {
    const now = new Date().toISOString();
    const expId = `exp_${Date.now().toString().slice(-6)}`;
    const newExp: BranchExpense = {
      id: expId,
      branchId: input.branchId,
      category: input.category,
      amount: input.amount,
      description: input.description,
      expenseDate: input.expenseDate || now.split('T')[0],
      paidTo: input.paidTo,
      receiptNumber: input.receiptNumber,
      createdByName: currentUser.name,
      createdAt: now
    };

    setExpenses(prev => [newExp, ...prev]);

    // Persist to Supabase Database (direct client & backend API)
    directSupabaseInsertExpense(newExp);

    fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newExp)
    }).catch(err => console.error('Error adding expense to Supabase:', err));

    showToast('Branch expense recorded successfully!');
    return newExp;
  };

  const deleteExpense = (id: string): boolean => {
    setExpenses(prev => prev.filter(e => e.id !== id));

    fetch(`/api/expenses/${id}`, {
      method: 'DELETE'
    }).catch(err => console.error('Error deleting expense:', err));

    showToast('Expense entry deleted.');
    return true;
  };

  // Customer Pre-booking
  const createCustomerPreBooking = (input: CustomerPreBookingInput): Shipment => {
    if (!input.productPriceAfn || Number(input.productPriceAfn) <= 0) {
      throw new Error('Product Price is mandatory and must be greater than 0.');
    }

    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const newCn = getNextSequentialCn(shipments, true);
    const now = new Date().toISOString();
    const originBranch = branches.find(b => b.id === input.originBranchId);
    const destBranch = branches.find(b => b.id === input.destinationBranchId);

    const price = Number(input.productPriceAfn) || Number(input.declaredValueAfn) || 3000;
    const sFee = input.isFragile ? 200 : 150;
    const dComm = 70;
    const payout = Math.max(0, price - sFee - dComm);

    const newShipment: Shipment = {
      id: `shp_pr_${randomSuffix}`,
      cnNumber: newCn,
      originBranchId: input.originBranchId,
      destinationBranchId: input.destinationBranchId,
      currentBranchId: input.originBranchId,
      sender: {
        name: input.senderName || currentUser.name || 'Valued Customer',
        phone: input.senderPhone || currentUser.phone || '',
        email: input.senderEmail || currentUser.email || '',
        nationalId: input.senderNationalId || currentUser.tazkiraNumber || '',
        address: input.senderAddress || `${input.senderCity || 'Kabul'} Central`,
        city: input.senderCity || 'Kabul',
        province: input.senderProvince || 'Kabul'
      },
      receiver: {
        name: input.receiverName,
        phone: input.receiverPhone,
        address: input.receiverAddress,
        city: input.receiverCity,
        province: input.receiverProvince
      },
      packageInfo: {
        category: input.category,
        weightKg: input.estimatedWeightKg || 1,
        pieces: input.pieces || 1,
        description: input.description,
        serviceType: 'standard',
        isFragile: input.isFragile || false,
        declaredValueAfn: price
      },
      financials: {
        productPrice: price,
        serviceFee: sFee,
        destBranchCommission: dComm,
        discountAmount: 0,
        sellerPayout: payout,
        totalAmount: price,
        amountPaid: 0,
        amountDue: price,
        paymentStatus: 'to_pay',
        paymentMethod: 'cod'
      },
      status: 'pre_booked',
      isCustomerPrebooked: true,
      isPreBooking: true,
      customerUserId: currentUser.id,
      transportationFee: 0,
      destBranchCommission: dComm,
      originRemittanceDue: Math.max(0, price - dComm),
      remittanceStatus: 'pending',
      statusHistory: [
        {
          id: `st_${Date.now()}`,
          status: 'pre_booked',
          location: 'Customer Online Portal',
          branchName: originBranch?.name || 'Origin Hub',
          timestamp: now,
          note: `Consignment pre-booked online by customer ${input.senderName}. Awaiting physical drop-off at ${originBranch?.name || 'Origin Branch'} for weighing and price determination.`,
          updatedBy: `Customer ${currentUser.name}`
        }
      ],
      bookedAt: now,
      estimatedDelivery: new Date(Date.now() + 3 * 86400000).toISOString(),
      bookedByUserId: currentUser.id,
      bookedByUserName: currentUser.name
    };

    setShipments(prev => [newShipment, ...prev]);

    // Persist to Supabase Database (direct client & backend API)
    directSupabaseInsertShipment(newShipment);

    fetch('/api/shipments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newShipment)
    }).catch(err => console.error('Error pre-booking in Supabase:', err));

    showToast(`Parcel pre-booked with CN #${newCn}! Hand over to ${originBranch?.name || 'Origin Branch'} for weighing and price determination.`);
    return newShipment;
  };

  // Helper to verify if the current user represents or has authority over the origin branch
  const isUserOriginBranch = (originBranchId: string): boolean => {
    if (currentUser.role === 'super_admin') return true;
    if (!currentUser.branchId || currentUser.branchId === 'all') return true;
    if (originBranchId === currentUser.branchId) return true;
    if (activeBranchId && activeBranchId !== 'all' && originBranchId === activeBranchId) return true;

    const userBranch = branches.find(b => b.id === currentUser.branchId || b.id === activeBranchId);
    const targetBranch = branches.find(b => b.id === originBranchId);

    if (userBranch && targetBranch) {
      if (userBranch.id === targetBranch.id) return true;
      if (userBranch.code && targetBranch.code && userBranch.code.toLowerCase() === targetBranch.code.toLowerCase()) return true;
      if (userBranch.city && targetBranch.city && userBranch.city.toLowerCase() === targetBranch.city.toLowerCase()) return true;
      if (userBranch.name && targetBranch.name && userBranch.name.toLowerCase() === targetBranch.name.toLowerCase()) return true;
    }

    if (userBranch) {
      const uCode = (userBranch.code || '').toLowerCase();
      const uCity = (userBranch.city || '').toLowerCase();
      const uName = (userBranch.name || '').toLowerCase();
      const origLower = (originBranchId || '').toLowerCase();
      if (uCode && origLower.includes(uCode)) return true;
      if (uCity && origLower.includes(uCity)) return true;
      if (uName && origLower.includes(uName)) return true;
    }

    return false;
  };

  // Helper to verify if the current user represents or has authority over the destination branch
  const isUserDestBranch = (destBranchId: string): boolean => {
    if (currentUser.role === 'super_admin') return true;
    if (!currentUser.branchId || currentUser.branchId === 'all') return true;
    if (destBranchId === currentUser.branchId) return true;
    if (activeBranchId && activeBranchId !== 'all' && destBranchId === activeBranchId) return true;

    const userBranch = branches.find(b => b.id === currentUser.branchId || b.id === activeBranchId);
    const targetBranch = branches.find(b => b.id === destBranchId);

    if (userBranch && targetBranch) {
      if (userBranch.id === targetBranch.id) return true;
      if (userBranch.code && targetBranch.code && userBranch.code.toLowerCase() === targetBranch.code.toLowerCase()) return true;
      if (userBranch.city && targetBranch.city && userBranch.city.toLowerCase() === targetBranch.city.toLowerCase()) return true;
      if (userBranch.name && targetBranch.name && userBranch.name.toLowerCase() === targetBranch.name.toLowerCase()) return true;
    }

    if (userBranch) {
      const uCode = (userBranch.code || '').toLowerCase();
      const uCity = (userBranch.city || '').toLowerCase();
      const uName = (userBranch.name || '').toLowerCase();
      const destLower = (destBranchId || '').toLowerCase();
      if (uCode && destLower.includes(uCode)) return true;
      if (uCity && destLower.includes(uCity)) return true;
      if (uName && destLower.includes(uName)) return true;
    }

    return false;
  };

  // Branch Manager modifies and confirms customer pre-booked order
  const confirmCustomerPreBooking = (
    shipmentId: string, 
    arg2?: number | { 
      weightKg?: number; 
      pieces?: number; 
      senderName?: string;
      senderPhone?: string;
      receiverName?: string;
      receiverPhone?: string;
      description?: string;
      productPrice?: number;
      serviceFee?: number;
      discountAmount?: number;
      destBranchCommission?: number; 
      paymentStatus?: PaymentStatus;
      status?: ShipmentStatus;
      originBranchId?: string;
      destinationBranchId?: string;
      note?: string;
    }, 
    arg3?: number, 
    arg4?: number, 
    arg5?: number, 
    arg6?: 'paid' | 'to_pay'
  ): boolean => {
    const target = shipments.find(s => s.id === shipmentId || s.cnNumber === shipmentId);
    if (!target) {
      console.warn('confirmCustomerPreBooking: Shipment not found for ID/CN:', shipmentId);
      return false;
    }

    // Check authority: super_admin or origin branch manager
    const isSuperAdmin = currentUser.role === 'super_admin';
    const isOrigin = isUserOriginBranch(target.originBranchId);
    if (!isSuperAdmin && !isOrigin) {
      const origObj = branches.find(b => b.id === target.originBranchId);
      showToast(`⚠️ Unauthorized: Only the designated Origin Branch (${origObj?.name || 'Sender Hub'}) or Central Super Admin can verify, weigh, and set pricing for this pre-booking.`);
      return false;
    }

    let actualWeightKg = 1;
    let pieces = 1;
    let productPrice = 5000;
    let serviceFee = 150;
    let discountAmount = 0;
    let destBranchCommission = 70;
    let paymentStatus: PaymentStatus = 'to_pay';

    if (typeof arg2 === 'object' && arg2 !== null) {
      actualWeightKg = Number(arg2.weightKg) || 1;
      pieces = Number(arg2.pieces) || 1;
      productPrice = (typeof arg2.productPrice === 'number' && arg2.productPrice > 0) ? arg2.productPrice : (target.financials?.productPrice || target.packageInfo?.declaredValueAfn || 3000);
      serviceFee = (typeof arg2.serviceFee === 'number' && arg2.serviceFee >= 0) ? arg2.serviceFee : (target.financials?.serviceFee || 150);
      discountAmount = typeof arg2.discountAmount === 'number' ? arg2.discountAmount : (target.financials?.discountAmount || 0);
      destBranchCommission = (typeof arg2.destBranchCommission === 'number' && arg2.destBranchCommission >= 0) ? arg2.destBranchCommission : (target.destBranchCommission || target.financials?.destBranchCommission || 70);
      paymentStatus = arg2.paymentStatus || 'to_pay';
    } else {
      actualWeightKg = Number(arg2) || 1;
      pieces = Number(arg3) || 1;
      productPrice = target.financials?.productPrice || target.packageInfo?.declaredValueAfn || 3000;
      serviceFee = typeof arg4 === 'number' ? arg4 : 150;
      destBranchCommission = typeof arg5 === 'number' ? arg5 : 70;
      paymentStatus = arg6 || 'to_pay';
    }

    const targetStatus: ShipmentStatus = (typeof arg2 === 'object' && arg2?.status) ? arg2.status : 'verified';
    const finalOriginBranchId = (isSuperAdmin && typeof arg2 === 'object' && arg2?.originBranchId) ? arg2.originBranchId : target.originBranchId;
    const finalDestBranchId = (isSuperAdmin && typeof arg2 === 'object' && arg2?.destinationBranchId) ? arg2.destinationBranchId : target.destinationBranchId;

    const fragileFee = target.packageInfo?.isFragile ? 50 : 0;
    const totalServiceFee = serviceFee + fragileFee;
    const sellerPayout = productPrice - destBranchCommission - totalServiceFee + discountAmount;
    const totalAmount = productPrice;
    
    // In product sales mode, origin remittance is not based on freight, but we keep it tracking what needs to be remitted
    const originRemittanceDue = Math.max(0, totalAmount - destBranchCommission);
    
    const now = new Date().toISOString();
    const branchInfo = branches.find(b => b.id === currentUser.branchId) || branches.find(b => b.id === finalOriginBranchId);

    const updatedFinancials: BillingFinancials = {
      ...target.financials,
      productPrice,
      serviceFee: totalServiceFee,
      destBranchCommission,
      discountAmount,
      sellerPayout,
      totalAmount,
      amountPaid: paymentStatus === 'paid' ? totalAmount : 0,
      amountDue: paymentStatus === 'paid' ? 0 : totalAmount,
      paymentStatus: paymentStatus,
      paymentMethod: (paymentStatus === 'paid' ? 'cash' : 'cod') as any
    };

    const actorRoleName = isSuperAdmin ? 'Central HQ Super Admin' : 'Origin Branch Manager';
    const customNote = (typeof arg2 === 'object' && arg2?.note) ? arg2.note : 
      `Customer pre-booking verified by ${currentUser.name} (${actorRoleName}). Verified weight: ${actualWeightKg} kg, ${pieces} pcs (Product Price: ${productPrice} AFN, Service: ${serviceFee} AFN, Dest Comm: ${destBranchCommission} AFN). Total: ${totalAmount} AFN (${paymentStatus.toUpperCase()}). Status: ${targetStatus.toUpperCase()}`;

    const newHistoryItem = {
      id: `st_${Date.now()}`,
      status: targetStatus,
      location: branchInfo ? `${branchInfo.name} (${branchInfo.city})` : 'Origin Branch',
      branchName: branchInfo ? branchInfo.name : 'Origin Hub',
      timestamp: now,
      note: customNote,
      updatedBy: currentUser.name
    };

    const updatedShipment: Shipment = {
      ...target,
      status: targetStatus,
      originBranchId: finalOriginBranchId,
      destinationBranchId: finalDestBranchId,
      currentBranchId: finalOriginBranchId,
      isPreBooking: targetStatus === 'pre_booked',
      isCustomerPrebooked: targetStatus === 'pre_booked',
      packageInfo: {
        ...target.packageInfo,
        weightKg: actualWeightKg,
        pieces,
        description: typeof arg2 === 'object' && arg2.description !== undefined
          ? arg2.description.trim() || target.packageInfo.description
          : target.packageInfo.description
      },
      sender: typeof arg2 === 'object'
        ? { ...target.sender, name: arg2.senderName?.trim() || target.sender.name, phone: arg2.senderPhone?.trim() || target.sender.phone }
        : target.sender,
      receiver: typeof arg2 === 'object'
        ? { ...target.receiver, name: arg2.receiverName?.trim() || target.receiver.name, phone: arg2.receiverPhone?.trim() || target.receiver.phone }
        : target.receiver,
      transportationFee: serviceFee,
      destBranchCommission,
      originRemittanceDue,
      financials: updatedFinancials,
      statusHistory: [...(target.statusHistory || []), newHistoryItem],
      bookedByUserId: currentUser.id,
      bookedByUserName: currentUser.name
    };

    setShipments(prev => prev.map(s => (s.id === target.id || s.cnNumber === target.cnNumber) ? updatedShipment : s));

    // Update branch dispatch totals
    setBranches(prev => prev.map(b => {
      if (b.id === finalOriginBranchId) {
        return {
          ...b,
          totalParcelsDispatched: (b.totalParcelsDispatched || 0) + 1,
          totalRevenueAfn: (b.totalRevenueAfn || 0) + totalAmount
        };
      }
      return b;
    }));

    // Direct Supabase status and shipment update
    directSupabaseInsertShipment(updatedShipment);
    directSupabaseUpdateShipmentStatus(target.id, targetStatus, updatedShipment.statusHistory);

    fetch(`/api/shipments/${target.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: targetStatus,
        statusHistory: updatedShipment.statusHistory,
        financials: updatedFinancials,
        sender: updatedShipment.sender,
        receiver: updatedShipment.receiver,
        packageInfo: updatedShipment.packageInfo,
        originBranchId: finalOriginBranchId,
        destinationBranchId: finalDestBranchId,
        currentBranchId: finalOriginBranchId,
        destBranchCommission,
        originRemittanceDue,
        isPreBooking: targetStatus === 'pre_booked',
        userRole: currentUser.role,
        userBranchId: currentUser.branchId
      })
    }).catch(err => console.error('Error confirming order:', err));

    showToast(`✓ Pre-booking ${target.cnNumber} verified (${targetStatus === 'verified' ? 'Verified / Ready' : 'Booked'}), weighed (${actualWeightKg}kg), priced (${totalAmount} AFN) successfully!`);
    return true;
  };

  // Inter-branch settlement (Destination branch remits money to Origin branch / HQ)
  const settleInterBranchRemittance = (shipmentId: string, note?: string): boolean => {
    const target = shipments.find(s => s.id === shipmentId || s.cnNumber === shipmentId);
    if (!target) return false;

    const commission = target.destBranchCommission ?? target.financials.destBranchCommission ?? 70;
    const originCommission = target.originBranchId !== target.destinationBranchId && target.originBranchId !== 'br_admin_hq' ? 20 : 0;
    // Destination branch keeps ONLY commission, not transportation charges
    const net = Math.max(0, target.financials.totalAmount - commission - originCommission);

    return createBatchRemittance(
      [target.id],
      target.destinationBranchId,
      target.financials.totalAmount,
      commission,
      net,
      'treasury',
      `DIRECT-${Date.now().toString().slice(-6)}`,
      currentUser.name,
      note,
      0,
      originCommission,
      target.originBranchId
    );
  };

  // Branch Manager records cash / hawala payout to customer (seller)
  const disburseSellerPayout = (
    shipmentId: string, 
    method: 'cash' | 'hawala' | 'bank_transfer', 
    voucherRef?: string, 
    notes?: string,
    customPayout?: number,
    customCommission?: number,
    customDiscount?: number
  ): boolean => {
    const target = shipments.find(s => s.id === shipmentId || s.cnNumber === shipmentId);
    if (!target) return false;

    // Double-Payout Prevention Check #1: Block if already disbursed or confirmed
    if (target.sellerPayoutStatus === 'disbursed_by_branch' || target.sellerPayoutStatus === 'confirmed_by_customer') {
      showToast(
        `⛔ Double-Payout Blocked: Seller payout for CN #${target.cnNumber} was already disbursed under Voucher #${target.sellerPayoutVoucherRef || 'N/A'} on ${target.sellerPayoutDisbursedAt ? new Date(target.sellerPayoutDisbursedAt).toLocaleString() : 'record'}.`,
        'error',
        'Double-Payout Prevention'
      );
      return false;
    }

    // Reconciliation Gate Check #2: Must be delivered and have Payment Settlement locked
    const settlement = target.paymentSettlement || target.financials?.paymentSettlement;
    if (target.status !== 'delivered') {
      showToast('⛔ Reconciliation Gate: Seller payout is only allowed for delivered parcels.', 'error');
      return false;
    }
    if (!settlement?.locked) {
      showToast('🔒 Reconciliation Gate: Destination branch must complete and lock "Record Payment & Report" before seller payout can be disbursed.', 'warning');
      return false;
    }

    const now = new Date().toISOString();
    const finalVoucher = voucherRef?.trim() || `PAY-${(target.originBranchId || 'HQ').replace('br_', '').toUpperCase()}-${Date.now().toString().slice(-5)}`;
    
    // Handle custom commission and discount modifications
    const finalCommission = typeof customCommission === 'number' ? customCommission : (target.destBranchCommission !== undefined ? target.destBranchCommission : (target.financials?.destBranchCommission || 70));
    const finalDiscount = typeof customDiscount === 'number' ? customDiscount : (target.financials?.discountAmount || 0);

    // Use custom payout value if provided, else fallback to standard calculation
    const payoutAmount = typeof customPayout === 'number' 
      ? customPayout 
      : (target.financials?.sellerPayout !== undefined 
          ? target.financials.sellerPayout 
          : Math.max(0, (target.financials?.productPrice || 0) - finalCommission - (target.financials?.serviceFee || 150) + finalDiscount));

    const updatedShipment: Shipment = {
      ...target,
      sellerPayoutStatus: 'disbursed_by_branch',
      sellerPayoutDisbursedAt: now,
      sellerPayoutMethod: method,
      sellerPayoutVoucherRef: finalVoucher,
      sellerPayoutDisbursedByBranchId: currentUser.branchId || target.originBranchId,
      sellerPayoutDisbursedByUserName: currentUser.name,
      sellerPayoutNotes: notes?.trim() || '',
      destBranchCommission: finalCommission,
      financials: {
        ...target.financials,
        sellerPayout: payoutAmount,
        discountAmount: finalDiscount,
        destBranchCommission: finalCommission
      }
    };

    setShipments(prev => {
      const updated = prev.map(s => (s.id === target.id || s.cnNumber === target.cnNumber) ? updatedShipment : s);
      return updated;
    });

    directSupabaseInsertShipment(updatedShipment);

    fetch(`/api/shipments/${target.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sellerPayoutStatus: 'disbursed_by_branch',
        sellerPayoutDisbursedAt: now,
        sellerPayoutMethod: method,
        sellerPayoutVoucherRef: finalVoucher,
        sellerPayoutDisbursedByBranchId: currentUser.branchId || target.originBranchId,
        sellerPayoutDisbursedByUserName: currentUser.name,
        sellerPayoutNotes: notes?.trim() || '',
        destBranchCommission: finalCommission,
        sellerPayout: payoutAmount,
        discountAmount: finalDiscount
      })
    }).catch(err => console.error('Error recording payout in backend:', err));

    showToast(`✓ Cash Payout of ${payoutAmount.toLocaleString()} AFN recorded (Voucher #${finalVoucher}). Awaiting customer receipt confirmation.`);
    return true;
  };

  // Customer confirms physical receipt of cash / hawala
  const confirmSellerPayoutReceived = (shipmentId: string): boolean => {
    const target = shipments.find(s => s.id === shipmentId || s.cnNumber === shipmentId);
    if (!target) return false;

    const now = new Date().toISOString();
    const updatedShipment: Shipment = {
      ...target,
      sellerPayoutStatus: 'confirmed_by_customer',
      sellerPayoutConfirmedAt: now
    };

    setShipments(prev => {
      const updated = prev.map(s => (s.id === target.id || s.cnNumber === target.cnNumber) ? updatedShipment : s);
      return updated;
    });

    directSupabaseInsertShipment(updatedShipment);

    fetch(`/api/shipments/${target.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sellerPayoutStatus: 'confirmed_by_customer',
        sellerPayoutConfirmedAt: now
      })
    }).catch(err => console.error('Error confirming payout in backend:', err));

    showToast(t('payout_confirmed_by_customer_msg') || '✓ Thank you! You have confirmed receipt of your product sale money. Account is fully cleared.');
    return true;
  };

  // Customer flags a dispute if branch marked it paid but customer did not receive money
  const disputeSellerPayout = (shipmentId: string, reason: string): boolean => {
    const target = shipments.find(s => s.id === shipmentId || s.cnNumber === shipmentId);
    if (!target) return false;

    const now = new Date().toISOString();
    const updatedShipment: Shipment = {
      ...target,
      sellerPayoutStatus: 'disputed',
      sellerPayoutDisputeReason: reason.trim(),
      sellerPayoutDisputeAt: now
    };

    setShipments(prev => {
      const updated = prev.map(s => (s.id === target.id || s.cnNumber === target.cnNumber) ? updatedShipment : s);
      return updated;
    });

    directSupabaseInsertShipment(updatedShipment);

    fetch(`/api/shipments/${target.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sellerPayoutStatus: 'disputed',
        sellerPayoutDisputeReason: reason.trim(),
        sellerPayoutDisputeAt: now
      })
    }).catch(err => console.error('Error reporting payout dispute in backend:', err));

    showToast('⚠️ Dispute reported to Head Office Super Admin. Management will investigate branch cashier records immediately.', 'error');
    return true;
  };

  // Super Admin: Edit parcel information and recalculate financials atomically
  const adminEditShipment = async (shipmentId: string, input: AdminEditShipmentInput): Promise<boolean> => {
    if (currentUser.role !== 'super_admin') {
      showToast(t('unauthorized_admin_only') || 'Unauthorized: Only Super Admin can edit parcel information.', 'error');
      return false;
    }

    const target = shipments.find(s => s.id === shipmentId || s.cnNumber === shipmentId);
    if (!target) {
      showToast('Shipment not found in records', 'error');
      return false;
    }

    const now = new Date().toISOString();
    const productPrice = Number(input.productPrice);
    const serviceFee = Number(input.serviceFee);
    const destBranchCommission = Number(input.destBranchCommission);
    const discountAmount = Number(input.discountAmount || 0);
    const sellerPayout = Math.max(0, productPrice - serviceFee - destBranchCommission + discountAmount);
    const paymentStatus = input.paymentStatus || target.financials.paymentStatus || 'to_pay';
    const isPaid = paymentStatus === 'paid' || input.status === 'delivered';

    const updatedFinancials = {
      ...target.financials,
      productPrice,
      totalAmount: productPrice,
      serviceFee,
      destBranchCommission,
      discountAmount,
      sellerPayout,
      paymentStatus,
      paymentMethod: input.paymentMethod || target.financials.paymentMethod || 'cod',
      amountPaid: isPaid ? productPrice : 0,
      amountDue: isPaid ? 0 : productPrice
    };

    const newHistoryItem = {
      id: `st_edit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      status: input.status || target.status,
      location: 'Head Office Admin',
      branchName: 'Head Office Admin',
      timestamp: now,
      note: input.auditNote?.trim() ? `[Admin Edit] ${input.auditNote.trim()}` : `[Admin Edit] Parcel records and pricing updated by ${currentUser.name}`,
      updatedBy: `${currentUser.name} (Super Admin)`
    };

    const updatedShipment: Shipment = {
      ...target,
      status: input.status || target.status,
      originBranchId: input.originBranchId || target.originBranchId,
      destinationBranchId: input.destinationBranchId || target.destinationBranchId,
      currentBranchId: input.originBranchId || target.currentBranchId,
      destBranchCommission,
      originRemittanceDue: Math.max(0, productPrice - destBranchCommission),
      packageInfo: {
        ...target.packageInfo,
        weightKg: Number(input.weightKg),
        pieces: Number(input.pieces),
        category: input.category,
        description: input.description,
        isFragile: input.isFragile,
        declaredValueAfn: productPrice
      },
      sender: {
        ...target.sender,
        name: input.senderName,
        phone: input.senderPhone,
        address: input.senderAddress || target.sender.address,
        city: input.senderCity || target.sender.city,
        province: input.senderProvince || target.sender.province,
        nationalId: input.senderNationalId || target.sender.nationalId
      },
      receiver: {
        ...target.receiver,
        name: input.receiverName,
        phone: input.receiverPhone,
        address: input.receiverAddress || target.receiver.address,
        city: input.receiverCity || target.receiver.city,
        province: input.receiverProvince || target.receiver.province,
        nationalId: input.receiverNationalId || target.receiver.nationalId
      },
      financials: updatedFinancials,
      statusHistory: [...(target.statusHistory || []), newHistoryItem]
    };

    const sanitized = sanitizeShipmentFinancials(updatedShipment);

    // Update state and local storage immediately
    setShipments(prev => prev.map(s => (s.id === target.id || s.cnNumber === target.cnNumber) ? sanitized : s));

    // Send update to backend PUT /api/shipments/:id
    try {
      const res = await fetch(`/api/shipments/${target.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...input,
          userRole: currentUser.role,
          userName: currentUser.name
        })
      });
      if (!res.ok) {
        console.warn('Backend admin edit PUT response status:', res.status);
      }
    } catch (err) {
      console.warn('Backend admin edit PUT sync network error:', err);
    }

    // Direct Supabase sync if enabled
    try {
      directSupabaseInsertShipment(sanitized);
      directSupabaseUpdateShipmentStatus(sanitized.id, sanitized.status, sanitized.statusHistory);
    } catch (sbErr) {
      // Fallback
    }

    showToast(t('parcel_edited_success') || 'Parcel information and financials updated successfully!', 'success');



    return true;
  };

  const deleteShipment = async (shipmentId: string): Promise<boolean> => {
    if (currentUser.role !== 'super_admin') {
      showToast(t('unauthorized_admin_only') || 'Unauthorized: Only Super Admin can delete parcels.', 'error');
      return false;
    }

    const target = shipments.find(s => s.id === shipmentId || s.cnNumber === shipmentId);
    if (!target) {
      showToast('Shipment not found in records', 'error');
      return false;
    }

    // Update state immediately
    setShipments(prev => prev.filter(s => s.id !== target.id && s.cnNumber !== target.cnNumber));
    
    // Supabase Sync
    if (isSupabaseReady()) {
      await directSupabaseDeleteShipment(target.id);
    }

    // Try to notify backend if it exists
    try {
      await fetch(`/api/shipments/${target.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userRole: currentUser.role,
          userName: currentUser.name
        })
      });
    } catch (err) {
      // Ignored
    }

    showToast(`${t('parcel_deleted_toast', 'Parcel Deleted Successfully')}: ${target.cnNumber}`, 'success');
    return true;
  };

  const submitParcelForCollection = (shipmentId: string, reference?: string, customSubmittedAt?: string): boolean => {
    const target = shipments.find(s => s.id === shipmentId || s.cnNumber === shipmentId);
    if (!target) return false;
    if (target.customerSubmissionAt) {
      showToast(t('parcel_already_submitted') || 'This parcel has already been submitted to the customer.');
      return false;
    }
    if (target.status !== 'out_for_delivery' && target.status !== 'delivered' && target.status !== 'received_at_branch') {
      showToast(t('parcel_not_ready_for_submission') || 'Only parcels ready for delivery or at destination hub can be submitted.');
      return false;
    }

    let submissionTimestamp: string;
    if (customSubmittedAt) {
      const parsed = new Date(customSubmittedAt);
      submissionTimestamp = isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
    } else {
      submissionTimestamp = new Date().toISOString();
    }

    const readableDateTime = new Date(submissionTimestamp).toLocaleString();
    const updatedShipment: Shipment = {
      ...target,
      customerSubmissionAt: submissionTimestamp,
      customerSubmissionReference: reference?.trim() || `SUB-${target.cnNumber}-${Date.now().toString().slice(-4)}`,
      customerSubmissionBy: currentUser.name,
      statusHistory: [
        ...(target.statusHistory || []),
        {
          id: `st_submit_${Date.now()}`,
          status: target.status,
          location: branches.find(b => b.id === target.destinationBranchId)?.name || 'Destination Branch',
          branchName: branches.find(b => b.id === target.destinationBranchId)?.name || 'Destination Branch',
          timestamp: submissionTimestamp,
          note: `Parcel bill submitted once for customer collection on ${readableDateTime}. Reference: ${reference?.trim() || 'System generated'}.`,
          updatedBy: currentUser.name
        }
      ]
    };

    setShipments(prev => prev.map(s => s.id === target.id ? updatedShipment : s));
    directSupabaseUpdateShipmentStatus(target.id, target.status, updatedShipment.statusHistory, {
      customer_submission_at: submissionTimestamp,
      customer_submission_reference: updatedShipment.customerSubmissionReference,
      customer_submission_by: currentUser.name
    });
    fetch(`/api/shipments/${target.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: target.status,
        statusHistory: updatedShipment.statusHistory,
        customerSubmissionAt: submissionTimestamp,
        customerSubmissionReference: updatedShipment.customerSubmissionReference,
        customerSubmissionBy: currentUser.name,
        userRole: currentUser.role,
        userBranchId: currentUser.branchId
      })
    }).catch(err => console.error('Error saving customer submission:', err));
    showToast(t('parcel_submitted_success') || 'Parcel bill submitted to customer once.');
    return true;
  };

  // Permission Validator for Status Updates (Origin vs Destination Workflow Enforcement)
  const canUserUpdateStatus = (shipment: Shipment): StatusPermissionResult => {
    if (currentUser.role === 'customer') {
      return {
        allowed: false,
        canUpdate: false,
        roleType: 'unauthorized',
        reason: t('perm_customer_no_status') || 'Customer accounts can view history and pre-book parcels. Status transitions are performed by Cargo Branches.',
        allowedStatuses: []
      };
    }

    // Super Admin has master authority across all cargo branches and statuses
    if (currentUser.role === 'super_admin') {
      return {
        allowed: true,
        canUpdate: true,
        roleType: 'admin',
        reason: t('perm_super_admin_all') || 'Super Admin (Kabul Central HQ): Full master access across all cargo branches.',
        allowedStatuses: ['verified', 'booked', 'in_transit', 'received_at_branch', 'out_for_delivery', 'delivered', 'returned', 'cancelled']
      };
    }

    const isOrigin = isUserOriginBranch(shipment.originBranchId);
    const isDestination = isUserDestBranch(shipment.destinationBranchId);

    if (!isOrigin && !isDestination) {
      return {
        allowed: false,
        canUpdate: false,
        roleType: 'unauthorized',
        reason: t('perm_branch_unrelated') || 'You can only update parcels where your branch is either the Sender (Origin) or Receiver (Destination).',
        allowedStatuses: []
      };
    }

    // Permission logic strictly adhering to the workflow:
    // Origin branch: Allowed to change status of the order to "booked" and "in_transit"
    // Receiver branch: Allowed to change the subsequent statuses: "received_at_branch", "out_for_delivery", "delivered", "returned", "cancelled"
    let allowedStatuses: ShipmentStatus[] = [];
    
    if (isOrigin) {
      if (shipment.status === 'pre_booked') {
        allowedStatuses.push('verified', 'booked', 'in_transit');
      } else {
        allowedStatuses.push('booked', 'in_transit');
      }
    }
    
    if (isDestination) {
      allowedStatuses.push('received_at_branch', 'delivered', 'returned', 'cancelled');
    }

    if (allowedStatuses.length > 0) {
      return {
        allowed: true,
        canUpdate: true,
        roleType: isOrigin && isDestination ? 'admin' : (isOrigin ? 'sender_branch' : 'receiver_branch'),
        allowedStatuses: Array.from(new Set(allowedStatuses))
      };
    }

    return {
      allowed: false,
      canUpdate: false,
      roleType: 'unauthorized',
      reason: t('perm_unauthorized') || 'Unauthorized branch operation.',
      allowedStatuses: []
    };
  };

  // Add a new shipment (booking)
  const addShipment = (shipmentData: Omit<Shipment, 'id' | 'cnNumber' | 'statusHistory' | 'bookedAt'> & { cnNumber?: string }): Shipment => {
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const newCn = shipmentData.cnNumber || getNextSequentialCn(shipments, false);
    const now = new Date().toISOString();
    const originBranch = branches.find(b => b.id === shipmentData.originBranchId);

    const transportFee = shipmentData.transportationFee || 150;
    const commission = shipmentData.destBranchCommission || 120;
    const remittance = shipmentData.originRemittanceDue || (shipmentData.financials.totalAmount - commission);
    const initialStatus: ShipmentStatus = shipmentData.status || 'booked';

    const newShipment: Shipment = {
      ...shipmentData,
      id: `shp_${randomSuffix}`,
      cnNumber: newCn,
      transportationFee: transportFee,
      destBranchCommission: commission,
      originRemittanceDue: remittance,
      remittanceStatus: 'pending',
      bookedAt: now,
      status: initialStatus,
      statusHistory: [
        {
          id: `st_${Date.now()}`,
          status: initialStatus,
          location: originBranch ? `${originBranch.name} (${originBranch.city})` : 'Origin Branch',
          branchName: originBranch ? originBranch.name : 'Origin Hub',
          timestamp: now,
          note: `Shipment registered as ${initialStatus.replace(/_/g, ' ')} by ${currentUser.name}. Payment status: ${shipmentData.financials.paymentStatus}.`,
          updatedBy: currentUser.name
        }
      ]
    };

    setShipments(prev => [newShipment, ...prev]);

    setBranches(prev => prev.map(b => {
      if (b.id === shipmentData.originBranchId) {
        return {
          ...b,
          totalParcelsDispatched: (b.totalParcelsDispatched || 0) + 1,
          totalRevenueAfn: (b.totalRevenueAfn || 0) + shipmentData.financials.totalAmount
        };
      }
      return b;
    }));

    // Persist directly to Supabase Database (direct client & backend API)
    directSupabaseInsertShipment(newShipment);

    fetch('/api/shipments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newShipment)
    }).catch(err => console.error('Error adding shipment to Supabase:', err));

    showToast(t('parcel_booked_successfully') || 'Parcel booked & synced to Supabase database!');
    return newShipment;
  };

  // Report a Delivery Issue / Contact Attempt
  const reportDeliveryIssue = (shipmentId: string, issueType: string, customNote?: string): boolean => {
    const target = shipments.find(s => s.id === shipmentId || s.cnNumber === shipmentId);
    if (!target) return false;

    // Typically only the destination branch or super admin can report delivery issues
    const isDestination = target.destinationBranchId === currentUser.branchId;
    if (!isDestination && currentUser.role !== 'super_admin') {
      showToast(t('perm_unauthorized') || 'Unauthorized branch operation.');
      return false;
    }

    const now = new Date().toISOString();
    const userBranch = branches.find(b => b.id === currentUser.branchId);

    const readableReasons: Record<string, string> = {
      no_answer: "Receiver Didn't Answer (تماس بی‌پاسخ - گیرنده جواب نداد)",
      incorrect_number: "Incorrect Phone Number (شماره تماس اشتباه است)",
      not_available: "Receiver Not Available (گیرنده در دسترس نیست / در شهر نیست)",
      postponed: "Delivery Postponed by Customer (به درخواست مشتری به تعویق افتاد)",
      wrong_address: "Address Incomplete / Not Found (آدرس نامشخص یا ناقص)",
      refused: "Consignee Refused Package (بسته توسط گیرنده رد شد)",
      other: customNote || "Other Issue (سایر دلایل)"
    };
    const reasonText = readableReasons[issueType] || customNote || issueType;

    const issueText = customNote 
      ? `Delivery Issue: ${reasonText} - ${customNote}` 
      : `Delivery Issue: ${reasonText}`;

    const deliveryIssueData = {
      type: issueType,
      reasonText,
      note: customNote,
      reportedAt: now,
      reportedBy: `${currentUser.name} (${userBranch?.name || 'Destination Branch'})`
    };

    const newHistoryItem = {
      id: `issue_${Date.now()}`,
      status: target.status, // Keep current status
      location: userBranch ? `${userBranch.name} (${userBranch.city})` : 'Destination Branch',
      branchName: userBranch?.name || 'Cargo Hub',
      timestamp: now,
      note: issueText,
      updatedBy: `${currentUser.name} (${userBranch?.name || 'Branch'})`
    };

    const newHistory = [...(target.statusHistory || []), newHistoryItem];
    const updatedShipment = { ...target, statusHistory: newHistory, deliveryIssue: deliveryIssueData };

    setShipments(prev => prev.map(s => s.id === target.id ? updatedShipment : s));
    if (trackedShipment && (trackedShipment.id === target.id || trackedShipment.cnNumber === target.cnNumber)) {
      setTrackedShipment(updatedShipment);
    }

    directSupabaseUpdateShipmentStatus(target.id, target.status, newHistory);
    
    fetch(`/api/shipments/${target.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: target.status,
        statusHistory: newHistory,
        userRole: currentUser.role,
        userBranchId: currentUser.branchId
      })
    }).catch(err => console.error('Error reporting issue in Supabase:', err));

    showToast(t('issue_reported_successfully') || 'Delivery issue reported and logged to tracking history.');

    return true;
  };

  // Update Shipment Status (Physical Status Only - Payment & Price Adjustment is handled separately after Delivered/Returned/Cancelled)
  const updateShipmentStatus = (
    shipmentId: string, 
    newStatus: ShipmentStatus, 
    note?: string, 
    location?: string,
    driverName?: string,
    driverPhone?: string
  ): boolean => {
    const target = shipments.find(s => s.id === shipmentId || s.cnNumber === shipmentId);
    if (!target) {
      console.warn('updateShipmentStatus: Shipment not found for ID/CN:', shipmentId);
      return false;
    }

    const perm = canUserUpdateStatus(target);
    if (!perm.allowed || !perm.allowedStatuses.includes(newStatus)) {
      showToast(perm.reason || 'You do not have permission to set this status.', 'error', 'Permission Denied');
      return false;
    }

    const existingSettlement = target.paymentSettlement || target.financials?.paymentSettlement;
    if (existingSettlement?.locked && target.status !== newStatus && currentUser.role !== 'super_admin') {
      showToast(`🔒 Parcel #${target.cnNumber} already has a locked Payment Settlement (${existingSettlement.reconciliationId}). Only Super Admin can alter status after payment lock.`, 'error');
      return false;
    }

    const now = new Date().toISOString();
    const userBranch = branches.find(b => b.id === currentUser.branchId);
    const destBranch = branches.find(b => b.id === target.destinationBranchId);
    const resolvedLocation = location || (userBranch ? `${userBranch.name} (${userBranch.city})` : 'Transit Station');

    const requiresPaymentStage = newStatus === 'delivered' || newStatus === 'returned' || newStatus === 'cancelled';
    const stageSuffix = requiresPaymentStage && !existingSettlement?.locked
      ? ' — Moved to Awaiting Payment Settlement stage.'
      : '';

    const newHistoryItem = {
      id: `st_${Date.now()}`,
      status: newStatus,
      location: resolvedLocation,
      branchName: userBranch ? userBranch.name : (destBranch?.name || 'Cargo Hub'),
      timestamp: now,
      note: (note || `Status updated to ${newStatus.replace(/_/g, ' ')} by ${currentUser.name} (${userBranch?.name || 'Branch'})`) + stageSuffix,
      updatedBy: `${currentUser.name} (${userBranch?.name || 'Branch'})`,
      driverName,
      driverPhone
    };

    const newHistory = [...(target.statusHistory || []), newHistoryItem];
    const actualDelivery = newStatus === 'delivered' ? now : target.actualDelivery;

    // Preserve original product price and keep payment awaiting settlement until "Record Payment & Report" is completed
    const originalProductPrice = target.financials?.originalProductPrice ?? target.financials?.productPrice ?? target.packageInfo?.declaredValueAfn ?? target.financials?.totalAmount ?? 0;
    const newFinancials: BillingFinancials = {
      ...target.financials,
      originalProductPrice
    };

    const currentBranchId = newStatus === 'received_at_branch' || newStatus === 'out_for_delivery' || newStatus === 'delivered' || newStatus === 'returned' || newStatus === 'cancelled'
      ? target.destinationBranchId 
      : target.currentBranchId;

    const updatedShipment: Shipment = {
      ...target,
      status: newStatus,
      currentBranchId,
      statusHistory: newHistory,
      actualDelivery,
      financials: newFinancials,
      sellerPayoutStatus: existingSettlement?.locked && newStatus === 'delivered'
        ? (target.sellerPayoutStatus || 'ready_for_payout')
        : 'pending_delivery',
      deliveryIssue: newStatus === 'delivered' ? undefined : target.deliveryIssue
    };

    setShipments(prev => prev.map(s => (s.id === target.id || s.cnNumber === target.cnNumber) ? updatedShipment : s));

    if (trackedShipment && (trackedShipment.id === target.id || trackedShipment.cnNumber === target.cnNumber)) {
      setTrackedShipment(updatedShipment);
    }

    // Persist to Supabase Database (direct client & backend API)
    directSupabaseUpdateShipmentStatus(target.id, newStatus, newHistory);

    fetch(`/api/shipments/${target.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: newStatus,
        statusHistory: newHistory,
        actualDelivery,
        financials: newFinancials,
        currentBranchId,
        userRole: currentUser.role,
        userBranchId: currentUser.branchId
      })
    }).catch(err => console.error('Error updating status in Supabase:', err));

    if (requiresPaymentStage && !existingSettlement?.locked) {
      showToast(
        `✓ Status changed to ${newStatus.replace(/_/g, ' ').toUpperCase()} for CN #${target.cnNumber}. Now click "💰 Record Payment & Report" to settle & lock payment.`,
        'info',
        'Awaiting Payment Settlement'
      );
    } else {
      showToast(
        `✓ Status updated to ${newStatus.replace(/_/g, ' ').toUpperCase()} for CN #${target.cnNumber}`,
        'success',
        'Milestone Updated'
      );
    }

    return true;
  };

  // Stage 2 & 3: Record Delivery Payment Settlement (Exact / + Paid Extra / - Paid Less), Report to Main/Sender Branch, Auto-Add to Remittance & Lock
  const recordDeliveryPaymentSettlement = (
    shipmentId: string,
    input: {
      adjustmentType: PriceAdjustmentType;
      adjustmentAmount: number;
      actualCollectedAmount: number;
      reasonCategory: string;
      reasonLabel: string;
      reportNote?: string;
      commissionAdjustmentType?: PriceAdjustmentType;
      commissionAdjustmentAmount?: number;
      commissionReasonCategory?: string;
      commissionReasonLabel?: string;
      serviceFeeAdjustmentType?: PriceAdjustmentType;
      serviceFeeAdjustmentAmount?: number;
      serviceFeeReasonCategory?: string;
      serviceFeeReasonLabel?: string;
    }
  ): boolean => {
    const target = shipments.find(s => s.id === shipmentId || s.cnNumber === shipmentId);
    if (!target) {
      showToast('Shipment not found.', 'error');
      return false;
    }

    // Strictly only allowed when status is delivered, returned, or cancelled
    if (target.status !== 'delivered' && target.status !== 'returned' && target.status !== 'cancelled') {
      showToast(
        '⛔ Payment & Report system is only available AFTER the parcel status is changed to Delivered, Returned, or Cancelled.',
        'error',
        'Stage Locked'
      );
      return false;
    }

    // Check branch permission: Destination branch or Super Admin
    const isSuperAdmin = currentUser.role === 'super_admin';
    const isDest = isUserDestBranch(target.destinationBranchId);
    if (!isSuperAdmin && !isDest) {
      showToast('⛔ Only the Destination Branch or Central Super Admin can record and lock delivery payment settlement.', 'error');
      return false;
    }

    const existingSettlement = target.paymentSettlement || target.financials?.paymentSettlement;
    if (existingSettlement?.locked && !isSuperAdmin) {
      showToast(
        `🔒 Payment for CN #${target.cnNumber} is already locked (Reconciliation #${existingSettlement.reconciliationId}). Contact Main Branch Super Admin to unlock.`,
        'error',
        'Payment Locked'
      );
      return false;
    }

    if (target.remittanceStatus === 'submitted_to_headoffice' || target.remittanceStatus === 'settled') {
      showToast('⛔ Cannot modify payment: This parcel has already been submitted/settled in a Remittance Batch.', 'error');
      return false;
    }

    if (target.sellerPayoutStatus === 'disbursed_by_branch' || target.sellerPayoutStatus === 'confirmed_by_customer') {
      showToast('⛔ Cannot modify payment: Seller payout has already been disbursed for this parcel.', 'error');
      return false;
    }

    const now = new Date().toISOString();
    const destBranch = branches.find(b => b.id === target.destinationBranchId);
    const origBranch = branches.find(b => b.id === target.originBranchId);

    // Fixed Original Product Price, Fixed Service Fee, Fixed Destination Branch Commission
    const originalProductPrice = Number(
      target.financials?.originalProductPrice ??
      existingSettlement?.originalProductPrice ??
      target.packageInfo?.declaredValueAfn ??
      target.financials?.productPrice ??
      target.financials?.totalAmount ??
      0
    );
    const fixedServiceFee = Number(target.financials?.serviceFee ?? target.transportationFee ?? 150);
    const fixedDestCommission = Number(target.destBranchCommission ?? target.financials?.destBranchCommission ?? 70);
    const discountAmount = Number(target.financials?.discountAmount ?? 0);

    let adjustmentType: PriceAdjustmentType = input.adjustmentType;
    let adjustmentAmount = Math.max(0, Math.round(Number(input.adjustmentAmount) || 0));
    let actualCollectedAmount = Math.max(0, Math.round(Number(input.actualCollectedAmount) || 0));

    if (target.status === 'delivered') {
      if (adjustmentType === 'exact') {
        adjustmentAmount = 0;
        actualCollectedAmount = originalProductPrice;
      } else if (adjustmentType === 'extra') {
        actualCollectedAmount = originalProductPrice + adjustmentAmount;
      } else if (adjustmentType === 'less') {
        adjustmentAmount = Math.min(originalProductPrice, adjustmentAmount);
        actualCollectedAmount = Math.max(0, originalProductPrice - adjustmentAmount);
      }
    } else {
      // Returned or Cancelled
      actualCollectedAmount = Math.max(0, Math.round(Number(input.actualCollectedAmount) || 0));
      if (actualCollectedAmount === originalProductPrice) {
        adjustmentType = 'exact';
        adjustmentAmount = 0;
      } else if (actualCollectedAmount > originalProductPrice) {
        adjustmentType = 'extra';
        adjustmentAmount = actualCollectedAmount - originalProductPrice;
      } else {
        adjustmentType = 'less';
        adjustmentAmount = originalProductPrice - actualCollectedAmount;
      }
    }

    // Calculate Destination Branch Commission Adjustments (Portion 2A)
    const commType: PriceAdjustmentType = input.commissionAdjustmentType || 'exact';
    const commDiff = commType === 'exact' ? 0 : Math.max(0, Math.round(Number(input.commissionAdjustmentAmount) || 0));
    let effectiveDestCommission = fixedDestCommission;
    if (commType === 'extra') {
      effectiveDestCommission = fixedDestCommission + commDiff;
    } else if (commType === 'less') {
      effectiveDestCommission = Math.max(0, fixedDestCommission - Math.min(fixedDestCommission, commDiff));
    }

    // Calculate Transportation / Service Fee Adjustments (Portion 2B)
    const feeType: PriceAdjustmentType = input.serviceFeeAdjustmentType || 'exact';
    const feeDiff = feeType === 'exact' ? 0 : Math.max(0, Math.round(Number(input.serviceFeeAdjustmentAmount) || 0));
    let effectiveServiceFee = fixedServiceFee;
    if (feeType === 'extra') {
      effectiveServiceFee = fixedServiceFee + feeDiff;
    } else if (feeType === 'less') {
      effectiveServiceFee = Math.max(0, fixedServiceFee - Math.min(fixedServiceFee, feeDiff));
    }

    // Dynamic Financial Reconciliation
    // Destination branch retains effectiveDestCommission
    // HQ/Main branch receives Remittance = Actual Collected - effectiveDestCommission
    // Seller Payout = Actual Collected - effectiveDestCommission - effectiveServiceFee + discountAmount
    const reconciledRemittanceDue = target.status === 'delivered'
      ? Math.max(0, actualCollectedAmount - effectiveDestCommission)
      : (actualCollectedAmount > 0 ? Math.max(0, actualCollectedAmount - effectiveDestCommission) : 0);

    const reconciledSellerPayout = target.status === 'delivered'
      ? Math.max(0, actualCollectedAmount - effectiveDestCommission - effectiveServiceFee + discountAmount)
      : 0;

    const reconciliationId = `REC-${target.cnNumber}-${Date.now().toString().slice(-4)}`;

    const settlementRecord: DeliveryPaymentSettlement = {
      reconciliationId,
      statusAtSettlement: target.status as 'delivered' | 'returned' | 'cancelled',
      originalProductPrice,
      adjustmentType,
      adjustmentAmount,
      actualCollectedAmount,
      fixedServiceFee,
      fixedDestCommission,
      discountAmount,

      // Portion 2A: Commission
      commissionAdjustmentType: commType,
      commissionAdjustmentAmount: commDiff,
      commissionReasonCategory: input.commissionReasonCategory || 'exact_commission',
      commissionReasonLabel: input.commissionReasonLabel || (commType === 'exact' ? 'Standard Commission' : 'Commission Adjustment'),
      effectiveDestCommission,

      // Portion 2B: Service Fee
      serviceFeeAdjustmentType: feeType,
      serviceFeeAdjustmentAmount: feeDiff,
      serviceFeeReasonCategory: input.serviceFeeReasonCategory || 'exact_service_fee',
      serviceFeeReasonLabel: input.serviceFeeReasonLabel || (feeType === 'exact' ? 'Standard Service Fee' : 'Service Fee Adjustment'),
      effectiveServiceFee,

      reconciledRemittanceDue,
      reconciledSellerPayout,
      reasonCategory: input.reasonCategory || 'exact_payment',
      reasonLabel: input.reasonLabel || (adjustmentType === 'exact' ? 'Exact Product Price Collected' : 'Price Adjustment'),
      reportNote: input.reportNote?.trim() || undefined,
      settledByUserId: currentUser.id,
      settledByUserName: currentUser.name,
      settledByBranchId: currentUser.branchId || target.destinationBranchId,
      settledByBranchName: destBranch?.name || 'Destination Branch',
      settledAt: now,
      locked: true,
      autoQueuedForRemittance: target.status === 'delivered' || actualCollectedAmount > 0
    };

    const adjustmentSummaryText = adjustmentType === 'exact'
      ? `Exact Product Price collected (${actualCollectedAmount.toLocaleString()} AFN)`
      : adjustmentType === 'extra'
      ? `Customer PAID EXTRA +${adjustmentAmount.toLocaleString()} AFN (Original: ${originalProductPrice.toLocaleString()} AFN ➔ Collected: ${actualCollectedAmount.toLocaleString()} AFN)`
      : `Customer PAID LESS -${adjustmentAmount.toLocaleString()} AFN (Original: ${originalProductPrice.toLocaleString()} AFN ➔ Collected: ${actualCollectedAmount.toLocaleString()} AFN)`;

    const commSummaryText = commType === 'exact'
      ? `Dest Comm: ${effectiveDestCommission} AFN (Fixed)`
      : `Dest Comm: ${effectiveDestCommission} AFN (${commType === 'extra' ? `+${commDiff}` : `-${commDiff}`} ${settlementRecord.commissionReasonLabel})`;

    const feeSummaryText = feeType === 'exact'
      ? `Service Fee: ${effectiveServiceFee} AFN (Fixed)`
      : `Service Fee: ${effectiveServiceFee} AFN (${feeType === 'extra' ? `+${feeDiff}` : `-${feeDiff}`} ${settlementRecord.serviceFeeReasonLabel})`;

    const reportHistoryNote = `[Payment Locked & Reported to ${origBranch?.name || 'Sender/Main Branch'} • #${reconciliationId}] ${adjustmentSummaryText}. Reason: ${settlementRecord.reasonLabel}${settlementRecord.reportNote ? ` (${settlementRecord.reportNote})` : ''}. ${commSummaryText} | ${feeSummaryText} | Auto-Queued Remittance to HQ/Sender Branch: ${reconciledRemittanceDue.toLocaleString()} AFN | Reconciled Seller Payout: ${reconciledSellerPayout.toLocaleString()} AFN.`;

    const newHistoryItem = {
      id: `st_pay_${Date.now()}`,
      status: target.status,
      location: `${destBranch?.name || 'Destination Hub'} ➔ Reported to ${origBranch?.name || 'Main Branch'}`,
      branchName: destBranch?.name || 'Destination Branch',
      timestamp: now,
      note: reportHistoryNote,
      updatedBy: `${currentUser.name} (${destBranch?.name || 'Destination Branch'})`
    };

    const newHistory = [...(target.statusHistory || []), newHistoryItem];
    const effectiveProductPrice = target.status === 'delivered' ? actualCollectedAmount : originalProductPrice;

    const updatedFinancials: BillingFinancials = {
      ...target.financials,
      originalProductPrice,
      productPrice: effectiveProductPrice,
      totalAmount: effectiveProductPrice,
      serviceFee: effectiveServiceFee,
      destBranchCommission: effectiveDestCommission,
      discountAmount,
      sellerPayout: reconciledSellerPayout,
      amountPaid: actualCollectedAmount,
      amountDue: 0,
      paymentStatus: target.status === 'delivered' ? 'paid' : 'unpaid',
      paymentMethod: target.financials?.paymentMethod || 'cod',
      paymentSettlement: settlementRecord
    };

    const updatedShipment: Shipment = {
      ...target,
      paymentSettlement: settlementRecord,
      paymentSettlementLocked: true,
      destBranchCommission: effectiveDestCommission,
      originRemittanceDue: reconciledRemittanceDue,
      remittanceStatus: (target.status === 'delivered' || actualCollectedAmount > 0) ? 'pending' : 'not_applicable',
      sellerPayoutStatus: target.status === 'delivered' ? 'ready_for_payout' : 'pending_delivery',
      customerSubmissionAt: target.customerSubmissionAt || now,
      customerSubmissionReference: target.customerSubmissionReference || reconciliationId,
      customerSubmissionBy: target.customerSubmissionBy || currentUser.name,
      financials: updatedFinancials,
      statusHistory: newHistory
    };

    setShipments(prev => prev.map(s => (s.id === target.id || s.cnNumber === target.cnNumber) ? updatedShipment : s));
    if (trackedShipment && (trackedShipment.id === target.id || trackedShipment.cnNumber === target.cnNumber)) {
      setTrackedShipment(updatedShipment);
    }

    directSupabaseInsertShipment(updatedShipment);
    directSupabaseUpdateShipmentStatus(target.id, target.status, newHistory);

    fetch(`/api/shipments/${target.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: target.status,
        statusHistory: newHistory,
        actualDelivery: target.actualDelivery || now,
        financials: updatedFinancials,
        destBranchCommission: fixedDestCommission,
        originRemittanceDue: reconciledRemittanceDue,
        customerSubmissionAt: updatedShipment.customerSubmissionAt,
        customerSubmissionReference: updatedShipment.customerSubmissionReference,
        customerSubmissionBy: updatedShipment.customerSubmissionBy,
        currentBranchId: target.currentBranchId,
        userRole: currentUser.role,
        userBranchId: currentUser.branchId
      })
    }).catch(err => console.error('Error syncing payment settlement to backend:', err));

    showToast(
      `🔒 Payment Locked (${reconciliationId})! ${adjustmentSummaryText}. Reported to ${origBranch?.name || 'Main Branch'} & automatically queued for Remittance (${reconciledRemittanceDue.toLocaleString()} AFN).`,
      'success',
      'Payment Settled, Locked & Reported'
    );

    return true;
  };

  // Super Admin Only: Unlock Payment Settlement if correction is needed before Remittance/Payout
  const unlockDeliveryPaymentSettlement = (shipmentId: string, reason?: string): boolean => {
    if (currentUser.role !== 'super_admin') {
      showToast('⛔ Only Main Branch Super Admin can unlock a locked payment settlement.', 'error');
      return false;
    }
    const target = shipments.find(s => s.id === shipmentId || s.cnNumber === shipmentId);
    if (!target) return false;

    if (target.remittanceStatus === 'submitted_to_headoffice' || target.remittanceStatus === 'settled') {
      showToast('⛔ Cannot unlock: Parcel is already in a submitted or settled Remittance Batch.', 'error');
      return false;
    }
    if (target.sellerPayoutStatus === 'disbursed_by_branch' || target.sellerPayoutStatus === 'confirmed_by_customer') {
      showToast('⛔ Cannot unlock: Seller payout has already been disbursed.', 'error');
      return false;
    }

    const existingSettlement = target.paymentSettlement || target.financials?.paymentSettlement;
    if (!existingSettlement) return false;

    const now = new Date().toISOString();
    const unlockedSettlement: DeliveryPaymentSettlement = {
      ...existingSettlement,
      locked: false,
      unlockedByAdminAt: now,
      unlockedByAdminName: currentUser.name
    };

    const newHistoryItem = {
      id: `st_unlock_${Date.now()}`,
      status: target.status,
      location: 'Main Branch (Central HQ)',
      branchName: 'Head Office Admin',
      timestamp: now,
      note: `[Admin Unlock] Payment settlement #${existingSettlement.reconciliationId} unlocked by ${currentUser.name} for re-verification.${reason ? ` Reason: ${reason}` : ''}`,
      updatedBy: `${currentUser.name} (Super Admin)`
    };

    const newHistory = [...(target.statusHistory || []), newHistoryItem];
    const updatedFinancials: BillingFinancials = {
      ...target.financials,
      paymentStatus: 'to_pay',
      paymentSettlement: unlockedSettlement
    };

    const updatedShipment: Shipment = {
      ...target,
      paymentSettlement: unlockedSettlement,
      paymentSettlementLocked: false,
      sellerPayoutStatus: 'pending_delivery',
      financials: updatedFinancials,
      statusHistory: newHistory
    };

    setShipments(prev => prev.map(s => (s.id === target.id || s.cnNumber === target.cnNumber) ? updatedShipment : s));
    fetch(`/api/shipments/${target.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: target.status,
        statusHistory: newHistory,
        financials: updatedFinancials,
        userRole: currentUser.role,
        userBranchId: currentUser.branchId
      })
    }).catch(() => {});

    showToast(`🔓 Payment lock removed for CN #${target.cnNumber}. Destination branch can now re-submit payment.`, 'warning');
    return true;
  };

  // Record Print Count (Tracks each physical/PDF print for receiver and sender copies to prevent confusion)
  const recordPrint = async (shipmentId: string, copyType: 'buyer' | 'seller' = 'buyer'): Promise<number> => {
    const target = shipments.find(s => s.id === shipmentId || s.cnNumber === shipmentId);
    if (!target) {
      console.warn('recordPrint: Shipment not found:', shipmentId);
      return 0;
    }

    const nextTotal = (target.printCount || 0) + 1;
    const nextSender = copyType === 'seller' ? (target.senderPrintCount || 0) + 1 : (target.senderPrintCount || 0);
    const nextReceiver = copyType === 'buyer' ? (target.receiverPrintCount || 0) + 1 : (target.receiverPrintCount || 0);
    const now = new Date().toISOString();

    const updatedShipment: Shipment = {
      ...target,
      printCount: nextTotal,
      senderPrintCount: nextSender,
      receiverPrintCount: nextReceiver,
      lastPrintedAt: now,
      lastPrintedBy: currentUser?.name || 'Staff',
      lastPrintedRole: copyType
    };

    setShipments(prev => prev.map(s => (s.id === target.id || s.cnNumber === target.cnNumber) ? updatedShipment : s));

    if (selectedShipmentForReceipt && (selectedShipmentForReceipt.id === target.id || selectedShipmentForReceipt.cnNumber === target.cnNumber)) {
      setSelectedShipmentForReceipt(updatedShipment);
    }

    try {
      fetch(`/api/shipments/${target.id}/print`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ printedBy: currentUser?.name || 'Staff', copyType })
      }).catch(err => console.warn('Could not persist print count to backend:', err));
    } catch (e) {
      console.warn('Could not persist print count:', e);
    }

    return copyType === 'seller' ? nextSender : nextReceiver;
  };

  const recordStickerPrint = (shipmentIds: string[], batchRef: string) => {
    const now = new Date().toISOString();
    setShipments(prev => prev.map(s => {
      if (shipmentIds.includes(s.id) || shipmentIds.includes(s.cnNumber)) {
        return {
          ...s,
          stickerPrintCount: (s.stickerPrintCount || 0) + 1,
          stickerBatchRef: batchRef,
          stickerPrintedAt: now
        };
      }
      return s;
    }));
  };

  return (
    <AppContext.Provider
      value={{
        language,
        setLanguage,
        isRTL,
        t,
        isDarkMode,
        toggleDarkMode,
        isAuthenticated,
        login,
        signupCustomer,
        loginWithUser,
        logout,
        currentUser,
        setCurrentUser,
        activeBranchId,
        setActiveBranchId,
        activeBranchPartnerId,
        setActiveBranchPartnerId,
        selectedPartnerBranchId: activeBranchPartnerId,
        setSelectedPartnerBranchId: setActiveBranchPartnerId,
        branches: [...branches].sort((a, b) => (a.code || '').localeCompare(b.code || '')),
        users,
        shipments,
        expenses,
        activeView,
        setActiveView,
        selectedShipmentForReceipt,
        setSelectedShipmentForReceipt,
        receiptPrintMode,
        setReceiptPrintMode,
        trackedShipment,
        trackByCnNumber,
        addShipment,
        createCustomerPreBooking,
        confirmCustomerPreBooking,
        adminEditShipment,
        deleteShipment,
        settleInterBranchRemittance,
        disburseSellerPayout,
        confirmSellerPayoutReceived,
        disputeSellerPayout,
        submitParcelForCollection,
        updateShipmentStatus,
        recordDeliveryPaymentSettlement,
        unlockDeliveryPaymentSettlement,
        recordPrint,
        recordStickerPrint,
        reportDeliveryIssue,
        canUserUpdateStatus,
        changePassword,
        updateUserPreferences,
        resetBranchUserCredentials,
        addBranch,
        updateBranch,
        deleteBranch,
        addExpense,
        deleteExpense,
        analytics,
        remittanceTransfers,
        createSingleParcelRemittance,
        createBatchRemittance,
        confirmRemittanceByHeadOffice,
        rejectRemittanceByHeadOffice,
        branchOwedToHeadOffice,
        branchEarnedCommissions,
        branchTotalSubmittedRemittances,
        branchTotalConfirmedSettledRemittances,
        headOfficePendingRemittancesTotal,
        headOfficeSettledRevenueTotal,
        filteredShipments,
        partnerShipments,
        customerShipments,
        branchExpenses,
        toastMessage,
        toasts,
        showToast,
        dismissToast,
        mockSmsLog,
        triggerMockSmsNotification,
        clearMockSmsLog,
        isOfflineCached,
        isMobileSidebarOpen,
        setIsMobileSidebarOpen,
        dbStatus,
        isSyncing,
        realtimeStatus,
        syncWithDatabase,
        resetToCleanSlate
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
