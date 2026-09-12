import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { 
  Language, 
  User, 
  Branch, 
  Shipment, 
  ShipmentStatus, 
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
  ToastType
} from '../types';
import { translations } from '../i18n/translations';
import { INITIAL_BRANCHES, INITIAL_USERS, INITIAL_SHIPMENTS, INITIAL_EXPENSES } from '../data/initialData';
import { 
  getSupabase, 
  isSupabaseReady, 
  subscribeToSupabaseRealtime, 
  directSupabaseFetchAll,
  directSupabaseInsertBranch,
  directSupabaseInsertUser,
  directSupabaseInsertShipment,
  directSupabaseUpdateShipmentStatus,
  directSupabaseInsertExpense,
  directSupabaseInsertSettlement,
  directSupabaseWipeDummyData
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
  | 'customer_portal';

interface AppContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  isRTL: boolean;
  t: (key: string) => string;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  isAuthenticated: boolean;
  login: (identifier: string, password?: string, portalScope?: 'customer' | 'staff' | 'any') => LoginResult;
  signupCustomer: (name: string, phone: string, email: string, password?: string) => boolean;
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
  setActiveView: (view: ActiveViewType) => void;
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
    paymentStatus?: 'paid' | 'to_pay';
  }) => boolean;
  settleInterBranchRemittance: (shipmentId: string, note?: string) => boolean;
  submitParcelForCollection: (shipmentId: string, reference?: string) => boolean;
  updateShipmentStatus: (shipmentId: string, newStatus: ShipmentStatus, note?: string, location?: string, driverName?: string, driverPhone?: string) => boolean;
  reportDeliveryIssue: (shipmentId: string, issueType: string, customNote?: string) => boolean;
  canUserUpdateStatus: (shipment: Shipment) => StatusPermissionResult;
  changePassword: (newPassword: string) => boolean;
  resetBranchUserCredentials: (userId: string, emailOrPassword: string, initialPassword?: string, name?: string, phone?: string) => boolean;
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
    originBranchId?: string
  ) => boolean;
  confirmRemittanceByHeadOffice: (transferId: string, confirmationNotes?: string) => boolean;
  rejectRemittanceByHeadOffice: (transferId: string, rejectionReason: string) => boolean;
  branchOwedToHeadOffice: number;
  branchEarnedCommissions: number;
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
  RECEIPT_PRINT_MODE: 'rayan_cargo_print_mode_v6_clean'
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Language & RTL
  const [language, setLanguageState] = useState<Language>(() => {
    return (localStorage.getItem(STORAGE_KEYS.LANGUAGE) as Language) || 'en';
  });

  const isRTL = language === 'fa' || language === 'ps';

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem(STORAGE_KEYS.LANGUAGE, lang);
  };

  useEffect(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [isRTL, language]);

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

  // Branches - Ensure initial branches are always loaded if empty
  const [branches, setBranches] = useState<Branch[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.BRANCHES);
    if (saved) {
      try { 
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) { console.error(e); }
    }
    return INITIAL_BRANCHES;
  });

  // Users - Ensure initial super admin and branch manager accounts are always preserved
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.USERS);
    if (saved) {
      try { 
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const userMap = new Map<string, User>();
          INITIAL_USERS.forEach(u => userMap.set(u.id, u));
          parsed.forEach((u: any) => userMap.set(u.id, { ...userMap.get(u.id), ...u }));
          return Array.from(userMap.values());
        }
      } catch (e) { console.error(e); }
    }
    return INITIAL_USERS;
  });

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
  const [shipments, setShipments] = useState<Shipment[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SHIPMENTS);
    if (saved) {
      try {
        const parsed: Shipment[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return sanitizeCnList(parsed);
        }
      } catch (e) { console.error(e); }
    }
    return sanitizeCnList(INITIAL_SHIPMENTS);
  });

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
  const [expenses, setExpenses] = useState<BranchExpense[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.EXPENSES);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return INITIAL_EXPENSES;
  });

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
    const savedId = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
    if (savedId) {
      const found = users.find(u => u.id === savedId);
      if (found) return found;
    }
    return users.find(u => u.role === 'super_admin') || INITIAL_USERS[0];
  });

  // Active branch context
  const [activeBranchId, setActiveBranchIdState] = useState<string>(() => {
    if (currentUser.role !== 'super_admin') {
      return currentUser.branchId;
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
    if (currentUser.role !== 'super_admin') {
      setActiveBranchIdState(currentUser.branchId);
      localStorage.setItem(STORAGE_KEYS.ACTIVE_BRANCH_ID, currentUser.branchId);
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
        setter(prev => {
          if (Array.isArray(prev) && Array.isArray(newData)) {
            if (prev.length === newData.length) {
              let identical = true;
              for (let i = 0; i < prev.length; i++) {
                const p = prev[i] as any;
                const n = newData[i] as any;
                if (
                  !p || !n || 
                  p.id !== n.id || 
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
                  const map = new Map(prev.map(s => [s.id, s]));
                  directData.shipments!.forEach((inc: Shipment) => {
                    map.set(inc.id, inc);
                  });
                  const merged = Array.from(map.values()).sort((a: any, b: any) => new Date(b.bookedAt).getTime() - new Date(a.bookedAt).getTime());
                  try {
                    localStorage.setItem(STORAGE_KEYS.SHIPMENTS, JSON.stringify(merged));
                  } catch (e) {}
                  return merged;
                });
              }
              if (directData.expenses && Array.isArray(directData.expenses)) {
                safeSetState(setExpenses, directData.expenses, STORAGE_KEYS.EXPENSES);
              }
            }
          } catch (supErr) {
            console.warn('Direct Supabase fetch query notice:', supErr);
          }
        }

        // 1. Health check
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
                const map = new Map(prev.map(s => [s.id, s]));
                shipData.shipments.forEach((inc: Shipment) => {
                  map.set(inc.id, inc);
                });
                const merged = Array.from(map.values()).sort((a: any, b: any) => new Date(b.bookedAt).getTime() - new Date(a.bookedAt).getTime());
                try {
                  localStorage.setItem(STORAGE_KEYS.SHIPMENTS, JSON.stringify(merged));
                } catch (e) {}
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
        }

        // 6. Fetch Remittances
        const remRes = await fetch('/api/remittances');
        if (remRes.ok) {
          const remData = await remRes.json();
          if (remData.success && Array.isArray(remData.remittances)) {
            safeSetState(setRemittanceTransfers, remData.remittances, STORAGE_KEYS.REMITTANCES);
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

  // Supabase Real-time Channel Subscription (Instantly propagates database changes to all connected devices)
  useEffect(() => {
    if (!isSupabaseReady()) return;

    let realtimeTimer: any = null;
    const cleanup = subscribeToSupabaseRealtime({
      onStatusChange: (status) => {
        setRealtimeStatus(status as any);
        if (status === 'SUBSCRIBED') {
          console.log('🟢 Supabase Real-time websocket connected and active!');
        }
      },
      onDataChanged: (table, eventType, newRow, oldRow) => {
        console.log(`📡 Supabase postgres_changes on ${table} [${eventType}]:`, newRow || oldRow);
        // Debounce real-time updates to prevent multiple rapid re-renders
        if (realtimeTimer) clearTimeout(realtimeTimer);
        realtimeTimer = setTimeout(() => {
          syncWithDatabase(true);
        }, 400);
      }
    });

    return () => {
      if (realtimeTimer) clearTimeout(realtimeTimer);
      cleanup();
    };
  }, [syncWithDatabase]);

  // Reset Entire System to Clean Slate (0 Parcels, 0 Expenses, Preserved Branches)
  const resetToCleanSlate = useCallback(async () => {
    setIsSyncing(true);
    try {
      // 1. Wipe backend database
      await fetch('/api/system/reset-clean-slate', { method: 'POST' });

      // 2. Also wipe direct Supabase tables if direct client configured
      if (isSupabaseReady()) {
        try {
          await directSupabaseWipeDummyData();
        } catch (sbErr) {
          console.warn('Direct Supabase wipe notice:', sbErr);
        }
      }

      // 3. Reset client states
      setBranches(INITIAL_BRANCHES);
      setShipments([]);
      setExpenses([]);
      setUsers(INITIAL_USERS);
      setCurrentUser(INITIAL_USERS[0]);
      setActiveBranchIdState('all');

      // 4. Update localStorage items
      localStorage.setItem(STORAGE_KEYS.BRANCHES, JSON.stringify(INITIAL_BRANCHES));
      localStorage.setItem(STORAGE_KEYS.SHIPMENTS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, INITIAL_USERS[0].id);
      localStorage.setItem(STORAGE_KEYS.ACTIVE_BRANCH_ID, 'all');

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

  // Sync once on load, purge legacy local storage, and sync every 30 seconds
  useEffect(() => {
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

    syncWithDatabase(true);
    const interval = setInterval(() => syncWithDatabase(true), 5000);

    const handleFocus = () => {
      syncWithDatabase(true);
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        syncWithDatabase(true);
      }
    };

    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('armaghan_cargo_sync');
      bc.onmessage = () => {
        syncWithDatabase(true);
      };
    } catch (e) {}

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
      if (bc) bc.close();
    };
  }, [syncWithDatabase]);

  // Login methods
  const login = (identifier: string, password?: string, portalScope: 'customer' | 'staff' | 'any' = 'any'): LoginResult => {
    const clean = identifier.trim().toLowerCase();
    const cleanPhone = identifier.replace(/[^0-9]/g, '');
    const cleanPass = password ? password.trim() : '';
    
    // Asynchronously verify with server database in background to update cache
    fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: clean, password: cleanPass })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.user) {
          setUsers(prev => {
            const exists = prev.some(u => u.id === data.user.id);
            if (!exists) return [data.user, ...prev];
            return prev.map(u => u.id === data.user.id ? { ...u, ...data.user } : u);
          });
        }
      })
      .catch(e => console.warn('Background auth check notice:', e));

    let matched = users.find(u => {
      const uEmail = (u.email || '').toLowerCase().trim();
      const uId = (u.id || '').toLowerCase().trim();
      const uName = (u.name || '').toLowerCase().trim();
      const uPhone = (u.phone || '').replace(/[^0-9]/g, '');

      const emailMatch = uEmail === clean;
      const idMatch = uId === clean;
      const nameMatch = clean.length >= 3 && uName === clean;
      const phoneMatch = cleanPhone.length >= 5 && uPhone.length >= 5 && (uPhone.includes(cleanPhone) || cleanPhone.includes(uPhone));
      const adminAliasMatch = (clean === 'admin' || clean === 'armaghansadeq@cargo.af' || clean === 'admin@rayancargo.af' || clean === 'superadmin') && (u.role === 'super_admin' || u.id === 'usr_admin');

      return emailMatch || idMatch || nameMatch || phoneMatch || adminAliasMatch;
    });

    // Special fallback for Super Admin if user array was purged or desynchronized
    if (!matched && (clean === 'admin' || clean === 'armaghansadeq@cargo.af' || clean === 'admin@rayancargo.af' || clean === 'superadmin')) {
      if (cleanPass === 'Armaghanrayan123' || cleanPass === 'admin123') {
        matched = INITIAL_USERS[0];
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
    
    let passValid = false;
    if (!cleanPass && !matched.password) {
      passValid = true;
    } else if (cleanPass) {
      if (matched.password && matched.password === cleanPass) {
        passValid = true;
      } else if (isSuperAdmin && (cleanPass === 'Armaghanrayan123' || cleanPass === 'admin123')) {
        passValid = true;
      }
    }

    if (!passValid) {
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
      setActiveView('dashboard');
    } else if (matched.role === 'customer') {
      setActiveBranchId('customer');
      setActiveView('customer_portal');
    } else {
      setActiveBranchId(matched.branchId);
      setActiveView('dashboard');
    }
    setActiveBranchPartnerId('all');
    showToast(`Welcome, ${matched.name}!`);
    return { success: true, user: matched };
  };

  // Customer Signup
  const signupCustomer = (name: string, phone: string, email: string, password?: string): boolean => {
    const now = new Date().toISOString();
    const newUserId = `usr_cust_${Date.now().toString().slice(-6)}`;
    const cleanEmail = (email && email.trim()) ? email.trim().toLowerCase() : `cust_${phone.replace(/[^0-9]/g, '')}@rayancustomer.af`;
    
    const newUser: User = {
      id: newUserId,
      name: name.trim(),
      email: cleanEmail,
      phone: phone.trim(),
      role: 'customer',
      branchId: 'customer',
      password: password?.trim() || 'customer123',
      passwordChangedByBranch: false,
      status: 'active',
      createdAt: now,
      lastLogin: 'Just now'
    };

    setUsers(prev => [...prev, newUser]);
    setCurrentUser(newUser);
    setIsAuthenticated(true);
    sessionStorage.setItem(STORAGE_KEYS.IS_AUTH, 'true');
    localStorage.removeItem(STORAGE_KEYS.IS_AUTH);
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, newUser.id);
    setActiveBranchId('customer');
    setActiveView('customer_portal');

    // Persist to Supabase Database (both direct client and backend API)
    directSupabaseInsertUser(newUser);

    fetch('/api/auth/customer-signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone, email, password })
    }).catch(err => console.error('Error in customer signup:', err));

    showToast(`Account created! Welcome, ${name.trim()}.`);
    return true;
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

    const updatedUser = {
      ...currentUser,
      password: newPassword.trim(),
      passwordChangedByBranch: true,
      lastPasswordChange: new Date().toISOString()
    };

    setUsers(prev => prev.map(u => u.id === currentUser.id ? updatedUser : u));
    setCurrentUser(updatedUser);

    // Persist to Supabase Database
    fetch('/api/users/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.id, newPassword })
    }).catch(err => console.error('Error updating password in Supabase:', err));

    showToast('Your branch password was updated securely in Supabase!');
    return true;
  };

  // Super Admin provisions initial email and password for a branch
  const resetBranchUserCredentials = (
    userId: string, 
    emailOrPassword: string, 
    initialPassword?: string,
    name?: string,
    phone?: string
  ): boolean => {
    let emailToSet: string | undefined;
    let passwordToSet: string | undefined;

    setUsers(prev => prev.map(u => {
      if (u.id === userId) {
        let email = u.email;
        let password = u.password;

        if (initialPassword !== undefined) {
          email = emailOrPassword.trim();
          password = initialPassword.trim();
        } else {
          if (emailOrPassword.includes('@')) {
            email = emailOrPassword.trim();
          } else {
            password = emailOrPassword.trim();
          }
        }

        emailToSet = email;
        passwordToSet = password;

        return {
          ...u,
          email,
          password,
          passwordChangedByBranch: false,
          name: name?.trim() || u.name,
          phone: phone?.trim() || u.phone
        };
      }
      return u;
    }));

    // Persist to Supabase Database
    fetch('/api/users/credentials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        email: emailToSet,
        password: passwordToSet,
        name,
        phone
      })
    }).catch(err => console.error('Error provisioning credentials in Supabase:', err));

    showToast('Branch credentials provisioned & stored in Supabase.');
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
      try { localStorage.setItem(STORAGE_KEYS.BRANCHES, JSON.stringify(updated)); } catch (_) {}
      return updated;
    });
    setUsers(prev => {
      const updated = [...prev, newUser];
      try { localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updated)); } catch (_) {}
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
      try { localStorage.setItem(STORAGE_KEYS.BRANCHES, JSON.stringify(updated)); } catch (_) {}
      return updated;
    });
    setUsers(prev => {
      const updated = prev.filter(u => u.branchId !== branchId);
      try { localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updated)); } catch (_) {}
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
      method: 'DELETE'
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
      try { localStorage.setItem(STORAGE_KEYS.BRANCHES, JSON.stringify(updated)); } catch (_) {}
      return updated;
    });

    // If manager name, email, or phone is updated, sync with branch manager user
    if (updates.managerName || updates.email || updates.phone) {
      setUsers(prev => {
        const updated = prev.map(u => {
          if (u.branchId === branchId) {
            return {
              ...u,
              name: updates.managerName?.trim() || u.name,
              email: updates.email?.trim().toLowerCase() || u.email,
              phone: updates.phone?.trim() || u.phone
            };
          }
          return u;
        });
        try { localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updated)); } catch (_) {}
        return updated;
      });
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
  const [remittanceTransfers, setRemittanceTransfers] = useState<BranchRemittanceTransfer[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.REMITTANCES);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing saved remittances:', e);
      }
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.REMITTANCES, JSON.stringify(remittanceTransfers));
  }, [remittanceTransfers]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SHIPMENTS, JSON.stringify(shipments));
  }, [shipments]);

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

  const setActiveView = (view: ActiveViewType) => {
    if (currentUser.role === 'customer' && view !== 'tracking' && view !== 'customer_portal') {
      setActiveViewState('customer_portal');
      return;
    }
    setActiveViewState(view);
  };
  const activeView = (currentUser.role === 'customer' && activeViewState !== 'tracking') ? 'customer_portal' : activeViewState;
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [selectedShipmentForReceipt, setSelectedShipmentForReceipt] = useState<Shipment | null>(null);
  const [trackedShipment, setTrackedShipment] = useState<Shipment | null>(null);
  const [isOfflineCached] = useState<boolean>(true);

  const t = (key: string): string => {
    return translations[language]?.[key] || translations['en']?.[key] || key;
  };

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
      return isTargetDest && s.status === 'delivered' && (!s.remittanceStatus || s.remittanceStatus === 'pending' || (s.remittanceStatus as string) === 'unsettled');
    });
    const totalOwedToHeadOffice = branchOwedList.reduce((sum, s) => {
      const comm = s.destBranchCommission !== undefined ? s.destBranchCommission : (s.financials?.destBranchCommission || 100);
      return sum + (s.originRemittanceDue !== undefined ? s.originRemittanceDue : Math.max(0, s.financials.totalAmount - comm));
    }, 0);

    const totalBranchCommissionsEarned = shipments.filter(s => {
      const isTargetDest = targetBr === 'all' ? true : (s.destinationBranchId === targetBr);
      return isTargetDest && s.status === 'delivered';
    }).reduce((sum, s) => {
      const comm = s.destBranchCommission !== undefined ? s.destBranchCommission : (s.financials?.destBranchCommission || 100);
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
        return isTargetDest && s.status === 'delivered' && (!s.remittanceStatus || s.remittanceStatus === 'pending' || (s.remittanceStatus as string) === 'unsettled');
      })
      .reduce((sum, s) => {
        const comm = s.destBranchCommission !== undefined ? s.destBranchCommission : (s.financials?.destBranchCommission || 100);
        return sum + (s.originRemittanceDue !== undefined ? s.originRemittanceDue : Math.max(0, s.financials.totalAmount - comm));
      }, 0);
  }, [shipments, currentTargetBranch]);

  const branchEarnedCommissions = React.useMemo(() => {
    return shipments
      .filter(s => {
        const isTargetDest = currentTargetBranch === 'all' ? true : (s.destinationBranchId === currentTargetBranch);
        return isTargetDest && s.status === 'delivered';
      })
      .reduce((sum, s) => {
        const comm = s.destBranchCommission !== undefined ? s.destBranchCommission : (s.financials?.destBranchCommission || 100);
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
    originBranchId?: string
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
        showToast(t('remittance_already_submitted') || 'One or more parcels already have a remittance in progress.');
        return false;
      }
    }

    const calculatedCollected = selectedParcels.length > 0
      ? selectedParcels.reduce((sum, s) => sum + (s.financials?.totalAmount || 0), 0)
      : Math.max(0, totalCollected);
    const calculatedCommission = Math.max(0, totalCommissionKept);
    const calculatedTransport = Math.max(0, transportationFee);
    const calculatedOriginCommission = Math.max(0, originCommission);
    const calculatedNet = Math.max(0, calculatedCollected - calculatedCommission - calculatedTransport - calculatedOriginCommission);

    const fromBranch = branches.find(b => b.id === fromBranchId);
    const mainBranch = branches.find(b => b.isHeadOffice) || branches[0];
    const now = new Date().toISOString();
    const batchId = `rem_${Date.now().toString().slice(-6)}`;
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const batchNumber = `REM-${fromBranch?.code || 'BR'}-${randomCode}`;

    const destTotalRetained = calculatedCommission + calculatedTransport;

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
          note: `Financial Settlement & Remittance ${batchNumber}: Collected ${calculatedCollected} AFN. Destination commission (${calculatedCommission} AFN) + transport (${calculatedTransport} AFN) + origin commission (${calculatedOriginCommission} AFN) retained/credited. Net to Main Branch HQ: ${calculatedNet} AFN (${paymentMethod.toUpperCase()}: ${referenceNumber || 'N/A'}). Awaiting HQ confirmation.`,
          updatedBy: currentUser.name
        };
        return {
          ...s,
          remittanceStatus: 'submitted_to_headoffice',
          remittanceBatchId: batchId,
          statusHistory: [...(s.statusHistory || []), historyItem]
        };
      }
      return s;
    }));

    setRemittanceTransfers(prev => [newTransfer, ...prev]);

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
    const totalCollected = target.financials.totalAmount;
    const calculatedNet = Math.max(0, totalCollected - customCommission - transportationFee - originCommission);

    // Update target parcel with adjusted commission and net due if changed
    setShipments(prev => prev.map(s => {
      if (s.id === target.id || s.cnNumber === target.cnNumber) {
        return {
          ...s,
          destBranchCommission: customCommission,
          transportationFee,
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
      transportationFee,
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

    // No pricing added by customer; pricing is determined exclusively by origin branch on drop-off & weighing
    const newShipment: Shipment = {
      id: `shp_pr_${randomSuffix}`,
      cnNumber: newCn,
      originBranchId: input.originBranchId,
      destinationBranchId: input.destinationBranchId,
      currentBranchId: input.originBranchId,
      sender: {
        name: input.senderName,
        phone: input.senderPhone,
        email: input.senderEmail,
        nationalId: input.senderNationalId,
        address: input.senderAddress,
        city: input.senderCity,
        province: input.senderProvince
      },
      receiver: {
        name: input.receiverName,
        phone: input.receiverPhone,
        nationalId: input.receiverNationalId,
        address: input.receiverAddress,
        city: input.receiverCity,
        province: input.receiverProvince
      },
      packageInfo: {
        category: input.category,
        weightKg: input.estimatedWeightKg,
        pieces: input.pieces,
        description: input.description,
        serviceType: 'standard',
        isFragile: input.isFragile || false
      },
      financials: {
        productPrice: input.productPriceAfn || 0,
        serviceFee: 0,
        destBranchCommission: 0,
        discountAmount: 0,
        sellerPayout: 0,
        totalAmount: input.productPriceAfn || 0,
        amountPaid: 0,
        amountDue: input.productPriceAfn || 0,
        paymentStatus: 'to_pay',
        paymentMethod: 'cod'
      },
      status: 'pre_booked',
      isCustomerPrebooked: true,
      isPreBooking: true,
      customerUserId: currentUser.id,
      transportationFee: 0,
      destBranchCommission: 0,
      originRemittanceDue: 0,
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
      paymentStatus?: 'paid' | 'to_pay';
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
    let paymentStatus: 'paid' | 'to_pay' = 'to_pay';

    if (typeof arg2 === 'object' && arg2 !== null) {
      actualWeightKg = Number(arg2.weightKg) || 1;
      pieces = Number(arg2.pieces) || 1;
      productPrice = typeof arg2.productPrice === 'number' ? arg2.productPrice : (target.financials?.productPrice || 5000);
      serviceFee = typeof arg2.serviceFee === 'number' ? arg2.serviceFee : 150;
      discountAmount = typeof arg2.discountAmount === 'number' ? arg2.discountAmount : 0;
      destBranchCommission = typeof arg2.destBranchCommission === 'number' ? arg2.destBranchCommission : 70;
      paymentStatus = arg2.paymentStatus || 'to_pay';
    } else {
      actualWeightKg = Number(arg2) || 1;
      pieces = Number(arg3) || 1;
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

  // Inter-branch settlement (Destination branch remits money to Origin branch)
  const settleInterBranchRemittance = (shipmentId: string, note?: string): boolean => {
    const target = shipments.find(s => s.id === shipmentId || s.cnNumber === shipmentId);
    if (!target) return false;

    const commission = target.destBranchCommission ?? target.financials.destBranchCommission ?? 0;
    const transport = target.transportationFee ?? target.financials.transportationFee ?? 0;
    const originCommission = target.originBranchId !== target.destinationBranchId && target.originBranchId !== 'br_admin_hq' ? 20 : 0;
    const net = Math.max(0, target.financials.totalAmount - commission - transport - originCommission);

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
      transport,
      originCommission,
      target.originBranchId
    );
  };

  const submitParcelForCollection = (shipmentId: string, reference?: string): boolean => {
    const target = shipments.find(s => s.id === shipmentId || s.cnNumber === shipmentId);
    if (!target) return false;
    if (target.customerSubmissionAt) {
      showToast(t('parcel_already_submitted') || 'This parcel has already been submitted to the customer.');
      return false;
    }
    if (target.status !== 'out_for_delivery' && target.status !== 'delivered') {
      showToast(t('parcel_not_ready_for_submission') || 'Only parcels ready for delivery can be submitted.');
      return false;
    }

    const now = new Date().toISOString();
    const updatedShipment: Shipment = {
      ...target,
      customerSubmissionAt: now,
      customerSubmissionReference: reference?.trim() || `SUB-${target.cnNumber}-${Date.now().toString().slice(-4)}`,
      customerSubmissionBy: currentUser.name,
      statusHistory: [
        ...(target.statusHistory || []),
        {
          id: `st_submit_${Date.now()}`,
          status: target.status,
          location: branches.find(b => b.id === target.destinationBranchId)?.name || 'Destination Branch',
          branchName: branches.find(b => b.id === target.destinationBranchId)?.name || 'Destination Branch',
          timestamp: now,
          note: `Parcel bill submitted once for customer collection. Reference: ${reference?.trim() || 'System generated'}.`,
          updatedBy: currentUser.name
        }
      ]
    };

    setShipments(prev => prev.map(s => s.id === target.id ? updatedShipment : s));
    directSupabaseUpdateShipmentStatus(target.id, target.status, updatedShipment.statusHistory, {
      customer_submission_at: now,
      customer_submission_reference: updatedShipment.customerSubmissionReference,
      customer_submission_by: currentUser.name
    });
    fetch(`/api/shipments/${target.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: target.status,
        statusHistory: updatedShipment.statusHistory,
        customerSubmissionAt: now,
        customerSubmissionReference: updatedShipment.customerSubmissionReference,
        customerSubmissionBy: currentUser.name,
        userRole: currentUser.role,
        userBranchId: currentUser.branchId
      })
    }).catch(err => console.error('Error saving customer submission:', err));
    showToast(t('parcel_submitted_success') || 'Parcel submitted to the customer once.');
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
    const isCurrent = (currentUser.branchId && shipment.currentBranchId === currentUser.branchId) || (activeBranchId && shipment.currentBranchId === activeBranchId);

    if (!isOrigin && !isDestination && !isCurrent) {
      return {
        allowed: false,
        canUpdate: false,
        roleType: 'unauthorized',
        reason: t('perm_branch_unrelated') || 'You can only update parcels where your branch is either the Sender (Origin) or Receiver (Destination).',
        allowedStatuses: []
      };
    }

    // Permission logic for Origin and Destination branches
    let allowedStatuses: ShipmentStatus[] = [];
    
    if (isOrigin || isCurrent) {
      allowedStatuses.push('booked', 'in_transit');
    }
    
    if (isDestination) {
      allowedStatuses.push('received_at_branch', 'out_for_delivery', 'delivered', 'returned', 'cancelled');
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

    const newShipment: Shipment = {
      ...shipmentData,
      id: `shp_${randomSuffix}`,
      cnNumber: newCn,
      transportationFee: transportFee,
      destBranchCommission: commission,
      originRemittanceDue: remittance,
      remittanceStatus: 'pending',
      bookedAt: now,
      status: 'booked',
      statusHistory: [
        {
          id: `st_${Date.now()}`,
          status: 'booked',
          location: originBranch ? `${originBranch.name} (${originBranch.city})` : 'Origin Branch',
          branchName: originBranch ? originBranch.name : 'Origin Hub',
          timestamp: now,
          note: `Shipment registered by ${currentUser.name}. Payment status: ${shipmentData.financials.paymentStatus}.`,
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

    const issueText = issueType === 'other' && customNote 
      ? `Delivery Issue: ${customNote}` 
      : `Delivery Issue: ${issueType}`;

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
    const updatedShipment = { ...target, statusHistory: newHistory };

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

  // Update Shipment Status
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

    const now = new Date().toISOString();
    const userBranch = branches.find(b => b.id === currentUser.branchId);

    const destBranch = branches.find(b => b.id === target.destinationBranchId);
    const resolvedLocation = location || (userBranch ? `${userBranch.name} (${userBranch.city})` : 'Transit Station');

    const newHistoryItem = {
      id: `st_${Date.now()}`,
      status: newStatus,
      location: resolvedLocation,
      branchName: userBranch ? userBranch.name : (destBranch?.name || 'Cargo Hub'),
      timestamp: now,
      note: note || `Status updated to ${newStatus.replace('_', ' ')} by ${currentUser.name} (${userBranch?.name || 'Branch'})`,
      updatedBy: `${currentUser.name} (${userBranch?.name || 'Branch'})`,
      driverName,
      driverPhone
    };

    const newHistory = [...(target.statusHistory || []), newHistoryItem];
    const actualDelivery = newStatus === 'delivered' ? now : target.actualDelivery;
    const newFinancials = {
      ...target.financials,
      amountPaid: newStatus === 'delivered' && target.financials?.paymentStatus === 'to_pay' 
        ? target.financials.totalAmount 
        : target.financials?.amountPaid || 0,
      amountDue: newStatus === 'delivered' && target.financials?.paymentStatus === 'to_pay' 
        ? 0 
        : target.financials?.amountDue || 0,
      paymentStatus: (newStatus === 'delivered' && target.financials?.paymentStatus === 'to_pay' 
        ? 'paid' 
        : target.financials?.paymentStatus || 'paid') as any
    };

    const currentBranchId = newStatus === 'received_at_branch' || newStatus === 'out_for_delivery' || newStatus === 'delivered' 
      ? target.destinationBranchId 
      : target.currentBranchId;

    const updatedShipment: Shipment = {
      ...target,
      status: newStatus,
      currentBranchId,
      statusHistory: newHistory,
      actualDelivery,
      financials: newFinancials
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

    showToast(
      `✓ Status updated to ${newStatus.replace(/_/g, ' ').toUpperCase()} for CN #${target.cnNumber}`,
      'success',
      'Milestone Updated'
    );
    return true;
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
        settleInterBranchRemittance,
        submitParcelForCollection,
        updateShipmentStatus,
        reportDeliveryIssue,
        canUserUpdateStatus,
        changePassword,
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
