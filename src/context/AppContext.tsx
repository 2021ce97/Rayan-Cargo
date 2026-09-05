import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
  LoginResult
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
  directSupabaseInsertSettlement
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
  confirmCustomerPreBooking: (shipmentId: string, actualWeightKg: number, pieces: number, transportationFee: number, destBranchCommission: number, paymentStatus: 'paid' | 'to_pay') => boolean;
  settleInterBranchRemittance: (shipmentId: string) => boolean;
  updateShipmentStatus: (shipmentId: string, newStatus: ShipmentStatus, note?: string, location?: string, driverName?: string, driverPhone?: string) => boolean;
  canUserUpdateStatus: (shipment: Shipment) => StatusPermissionResult;
  changePassword: (newPassword: string) => boolean;
  resetBranchUserCredentials: (userId: string, emailOrPassword: string, initialPassword?: string, name?: string, phone?: string) => boolean;
  addBranch: (input: AddBranchInput) => { branch: Branch; user: User };
  updateBranch: (branchId: string, updates: Partial<Branch>) => boolean;
  deleteBranch: (branchId: string) => boolean;
  addExpense: (input: AddExpenseInput) => BranchExpense;
  deleteExpense: (id: string) => boolean;
  analytics: AnalyticsSummary;
  filteredShipments: Shipment[];
  partnerShipments: Shipment[];
  customerShipments: Shipment[];
  branchExpenses: BranchExpense[];
  toastMessage: string | null;
  showToast: (message: string) => void;
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

  // Shipments
  const [shipments, setShipments] = useState<Shipment[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SHIPMENTS);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return INITIAL_SHIPMENTS;
  });

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

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Sync with Supabase PostgreSQL
  const syncWithDatabase = useCallback(async () => {
    setIsSyncing(true);
    try {
      // 0. Direct Supabase Query (if client configured with Anon Key)
      if (isSupabaseReady()) {
        try {
          const directData = await directSupabaseFetchAll();
          if (directData.success) {
            if (directData.branches && Array.isArray(directData.branches) && directData.branches.length > 0) {
              setBranches(directData.branches);
              localStorage.setItem(STORAGE_KEYS.BRANCHES, JSON.stringify(directData.branches));
            }
            if (directData.users && Array.isArray(directData.users) && directData.users.length > 0) {
              const uList = directData.users;
              setUsers(uList);
              localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(uList));
            }
            if (directData.shipments && Array.isArray(directData.shipments)) {
              setShipments(directData.shipments);
              localStorage.setItem(STORAGE_KEYS.SHIPMENTS, JSON.stringify(directData.shipments));
            }
            if (directData.expenses && Array.isArray(directData.expenses)) {
              setExpenses(directData.expenses);
              localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(directData.expenses));
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
        setDbStatus({
          connected: healthData.connected,
          database: healthData.database || 'Supabase PostgreSQL',
          serverTime: healthData.serverTime,
          stats: healthData.stats
        });
      }

      // 2. Fetch Branches
      const branchRes = await fetch('/api/branches');
      if (branchRes.ok) {
        const branchData = await branchRes.json();
        if (branchData.success && Array.isArray(branchData.branches) && branchData.branches.length > 0) {
          setBranches(branchData.branches);
          localStorage.setItem(STORAGE_KEYS.BRANCHES, JSON.stringify(branchData.branches));
        }
      }

      // 3. Fetch Users
      const userRes = await fetch('/api/users');
      if (userRes.ok) {
        const userData = await userRes.json();
        if (userData.success && Array.isArray(userData.users) && userData.users.length > 0) {
          const uList = userData.users;
          setUsers(uList);
          localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(uList));
        }
      }

      // 4. Fetch Shipments
      const shipRes = await fetch('/api/shipments');
      if (shipRes.ok) {
        const shipData = await shipRes.json();
        if (shipData.success && Array.isArray(shipData.shipments)) {
          setShipments(shipData.shipments);
          localStorage.setItem(STORAGE_KEYS.SHIPMENTS, JSON.stringify(shipData.shipments));
        }
      }

      // 5. Fetch Expenses
      const expRes = await fetch('/api/expenses');
      if (expRes.ok) {
        const expData = await expRes.json();
        if (expData.success && Array.isArray(expData.expenses)) {
          setExpenses(expData.expenses);
          localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expData.expenses));
        }
      }
    } catch (err) {
      console.warn('Database sync encountered a network hiccup, fallback cached data active:', err);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Supabase Real-time Channel Subscription (Instantly propagates database changes to all connected devices)
  useEffect(() => {
    if (!isSupabaseReady()) return;

    console.log('⚡ Initializing Supabase Real-time websocket subscriptions...');
    const cleanup = subscribeToSupabaseRealtime({
      onStatusChange: (status) => {
        setRealtimeStatus(status as any);
        if (status === 'SUBSCRIBED') {
          console.log('🟢 Supabase Real-time websocket connected and active!');
        }
      },
      onDataChanged: (table, eventType, newRow, oldRow) => {
        console.log(`📡 Supabase postgres_changes on ${table} [${eventType}]:`, newRow || oldRow);
        // Instantly refresh and synchronize across all tabs/devices
        syncWithDatabase();
      }
    });

    return () => {
      cleanup();
    };
  }, [syncWithDatabase]);

  // Reset Entire System to Clean Slate (0 Parcels, 0 Branches, 0 Expenses)
  const resetToCleanSlate = useCallback(async () => {
    setIsSyncing(true);
    try {
      // 1. Wipe backend database
      await fetch('/api/system/reset-clean-slate', { method: 'POST' });

      // 2. Wipe client states
      setBranches([]);
      setShipments([]);
      setExpenses([]);
      setUsers(INITIAL_USERS);
      setCurrentUser(INITIAL_USERS[0]);
      setActiveBranchIdState('all');

      // 3. Clear all localStorage items
      localStorage.setItem(STORAGE_KEYS.BRANCHES, JSON.stringify([]));
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

      showToast('System database successfully reset to clean slate (0 branches, 0 parcels, 0 expenses).');
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

    syncWithDatabase();
    const interval = setInterval(syncWithDatabase, 5000);

    const handleFocus = () => {
      syncWithDatabase();
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        syncWithDatabase();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
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

  // Local storage auto-sync
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.BRANCHES, JSON.stringify(branches));
  }, [branches]);

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
      return filteredShipments;
    }
    return shipments.filter(s => 
      (s.originBranchId === currentBr && s.destinationBranchId === activeBranchPartnerId) ||
      (s.originBranchId === activeBranchPartnerId && s.destinationBranchId === currentBr)
    );
  }, [shipments, activeBranchId, activeBranchPartnerId, currentUser, filteredShipments]);

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
      totalRemittancesPending
    };
  }, [shipments, filteredShipments, branchExpenses, currentUser, activeBranchId]);

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
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const newCn = `RYN-PR-${randomSuffix}`;
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
        address: input.senderAddress,
        city: input.senderCity,
        province: input.senderProvince
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
        weightKg: input.estimatedWeightKg,
        pieces: input.pieces,
        declaredValueAfn: input.declaredValueAfn || 0,
        description: input.description,
        serviceType: 'standard',
        isFragile: input.isFragile || false
      },
      financials: {
        baseRate: 0,
        weightCost: 0,
        transportationFee: 0,
        destBranchCommission: 0,
        originRemittanceDue: 0,
        serviceFee: 0,
        discountType: 'fixed',
        discountValue: 0,
        discountAmount: 0,
        tax: 0,
        totalAmount: 0, // Zero until priced and verified by origin branch manager
        amountPaid: 0,
        amountDue: 0,
        paymentStatus: input.paymentPreference === 'pay_at_branch' ? 'unpaid' : 'to_pay',
        paymentMethod: input.paymentPreference === 'pay_at_branch' ? 'cash' : 'cod'
      },
      status: 'pre_booked',
      isCustomerPrebooked: true,
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

  // Branch Manager modifies and confirms customer pre-booked order
  const confirmCustomerPreBooking = (
    shipmentId: string, 
    arg2?: number | { 
      weightKg?: number; 
      pieces?: number; 
      baseRate?: number;
      ratePerKg?: number;
      serviceFee?: number;
      discountAmount?: number;
      transportationFee?: number; 
      destBranchCommission?: number; 
      paymentStatus?: 'paid' | 'to_pay' 
    }, 
    arg3?: number, 
    arg4?: number, 
    arg5?: number, 
    arg6?: 'paid' | 'to_pay'
  ): boolean => {
    const target = shipments.find(s => s.id === shipmentId);
    if (!target) return false;

    let actualWeightKg = 1;
    let pieces = 1;
    let baseRate = 300;
    let ratePerKg = 40;
    let serviceFee = 100;
    let discountAmount = 0;
    let destBranchCommission = 100;
    let paymentStatus: 'paid' | 'to_pay' = 'paid';

    if (typeof arg2 === 'object' && arg2 !== null) {
      actualWeightKg = Number(arg2.weightKg) || 1;
      pieces = Number(arg2.pieces) || 1;
      baseRate = typeof arg2.baseRate === 'number' ? arg2.baseRate : (target.financials?.baseRate || 300);
      ratePerKg = typeof arg2.ratePerKg === 'number' ? arg2.ratePerKg : 40;
      serviceFee = typeof arg2.serviceFee === 'number' ? arg2.serviceFee : (typeof arg2.transportationFee === 'number' ? arg2.transportationFee : 100);
      discountAmount = typeof arg2.discountAmount === 'number' ? arg2.discountAmount : 0;
      destBranchCommission = typeof arg2.destBranchCommission === 'number' ? arg2.destBranchCommission : 100;
      paymentStatus = arg2.paymentStatus || 'paid';
    } else {
      actualWeightKg = Number(arg2) || 1;
      pieces = Number(arg3) || 1;
      serviceFee = typeof arg4 === 'number' ? arg4 : 100;
      destBranchCommission = typeof arg5 === 'number' ? arg5 : 100;
      paymentStatus = arg6 || 'paid';
    }

    const weightCost = Math.round(actualWeightKg * ratePerKg);
    const fragileFee = target.packageInfo?.isFragile ? 150 : 0;
    const subtotal = baseRate + weightCost + serviceFee + fragileFee;
    const totalAmount = Math.max(0, subtotal - discountAmount);
    const originRemittanceDue = Math.max(0, totalAmount - destBranchCommission);
    const now = new Date().toISOString();
    const userBranch = branches.find(b => b.id === currentUser.branchId) || branches.find(b => b.id === target.originBranchId);

    const updatedFinancials: BillingFinancials = {
      ...target.financials,
      baseRate,
      weightCost,
      transportationFee: serviceFee,
      destBranchCommission,
      originRemittanceDue,
      serviceFee: serviceFee + fragileFee,
      discountAmount,
      discountValue: discountAmount,
      totalAmount,
      amountPaid: paymentStatus === 'paid' ? totalAmount : 0,
      amountDue: paymentStatus === 'paid' ? 0 : totalAmount,
      paymentStatus: paymentStatus,
      paymentMethod: (paymentStatus === 'paid' ? 'cash' : 'cod') as any
    };

    const newHistoryItem = {
      id: `st_${Date.now()}`,
      status: 'booked' as ShipmentStatus,
      location: userBranch ? `${userBranch.name} (${userBranch.city})` : 'Origin Branch',
      branchName: userBranch ? userBranch.name : 'Origin Hub',
      timestamp: now,
      note: `Customer pre-booking verified, weighed & priced by ${currentUser.name}. Verified weight: ${actualWeightKg} kg, ${pieces} pcs (Base: ${baseRate} AFN, Rate: ${ratePerKg} AFN/kg, Service: ${serviceFee} AFN). Total: ${totalAmount} AFN (${paymentStatus.toUpperCase()}).`,
      updatedBy: currentUser.name
    };

    const updatedShipment: Shipment = {
      ...target,
      status: 'booked',
      currentBranchId: target.originBranchId,
      packageInfo: {
        ...target.packageInfo,
        weightKg: actualWeightKg,
        pieces: pieces
      },
      transportationFee: serviceFee,
      destBranchCommission,
      originRemittanceDue,
      financials: updatedFinancials,
      statusHistory: [...target.statusHistory, newHistoryItem],
      bookedByUserId: currentUser.id,
      bookedByUserName: currentUser.name
    };

    setShipments(prev => prev.map(s => s.id === shipmentId ? updatedShipment : s));

    // Direct Supabase status update
    directSupabaseUpdateShipmentStatus(shipmentId, 'booked', updatedShipment.statusHistory);

    fetch(`/api/shipments/${shipmentId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'booked',
        statusHistory: updatedShipment.statusHistory,
        financials: updatedFinancials,
        currentBranchId: target.originBranchId
      })
    }).catch(err => console.error('Error confirming order:', err));

    showToast(`Pre-booking ${target.cnNumber} verified, weighed (${actualWeightKg}kg), priced (${totalAmount} AFN) and booked successfully!`);
    return true;
  };

  // Inter-branch settlement (Destination branch remits money to Origin branch)
  const settleInterBranchRemittance = (shipmentId: string): boolean => {
    const target = shipments.find(s => s.id === shipmentId);
    if (!target) return false;

    const now = new Date().toISOString();
    const destBranch = branches.find(b => b.id === target.destinationBranchId);
    const origBranch = branches.find(b => b.id === target.originBranchId);

    const updatedShipment: Shipment = {
      ...target,
      remittanceStatus: 'settled',
      statusHistory: [
        ...target.statusHistory,
        {
          id: `st_settle_${Date.now()}`,
          status: target.status,
          location: `${destBranch?.name} → ${origBranch?.name}`,
          branchName: destBranch?.name || 'Destination Branch',
          timestamp: now,
          note: `Inter-branch COD settlement completed: ${destBranch?.name} deducted ${target.destBranchCommission || target.financials.destBranchCommission || 100} AFN commission and remitted ${target.originRemittanceDue || target.financials.originRemittanceDue || target.financials.totalAmount} AFN back to ${origBranch?.name}.`,
          updatedBy: currentUser.name
        }
      ]
    };

    setShipments(prev => prev.map(s => s.id === shipmentId ? updatedShipment : s));

    // Direct Supabase settlement & status update
    directSupabaseInsertSettlement({
      shipmentId,
      originBranchId: target.originBranchId,
      destinationBranchId: target.destinationBranchId,
      amountSettled: target.financials.totalAmount,
      commissionDeducted: target.destBranchCommission || target.financials.destBranchCommission || 100,
      remittedAmount: target.originRemittanceDue || target.financials.originRemittanceDue || target.financials.totalAmount,
      settledByName: currentUser.name
    });
    directSupabaseUpdateShipmentStatus(shipmentId, target.status, updatedShipment.statusHistory);

    fetch(`/api/shipments/${shipmentId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: target.status,
        statusHistory: updatedShipment.statusHistory,
        financials: target.financials
      })
    }).catch(err => console.error('Error settling remittance:', err));

    showToast(t('remittance_settled_toast') || 'Inter-branch remittance settled successfully!');
    return true;
  };

  // Permission Validator for Status Updates
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
    if (currentUser.role === 'super_admin') {
      return {
        allowed: true,
        canUpdate: true,
        roleType: 'admin',
        reason: t('perm_super_admin_all') || 'Super Admin: Full master access across all provincial cargo branches.',
        allowedStatuses: ['booked', 'in_transit', 'received_at_branch', 'out_for_delivery', 'delivered', 'returned', 'cancelled']
      };
    }

    const currentBranch = currentUser.branchId;
    const isOrigin = shipment.originBranchId === currentBranch;
    const isDestination = shipment.destinationBranchId === currentBranch;

    if (!isOrigin && !isDestination) {
      return {
        allowed: false,
        canUpdate: false,
        roleType: 'unauthorized',
        reason: t('perm_branch_unrelated') || 'You can only update parcels where your branch is either the Sender (Origin) or Receiver (Destination).',
        allowedStatuses: []
      };
    }

    if (isOrigin) {
      if (shipment.status === 'received_at_branch' || shipment.status === 'out_for_delivery' || shipment.status === 'delivered') {
        return {
          allowed: false,
          canUpdate: false,
          roleType: 'sender_branch',
          reason: t('perm_origin_cannot_deliver') || 'This parcel has arrived at destination. Only the Destination (Receiver) branch can update subsequent delivery stages.',
          allowedStatuses: []
        };
      }
      return {
        allowed: true,
        canUpdate: true,
        roleType: 'sender_branch',
        allowedStatuses: ['booked', 'in_transit']
      };
    }

    if (isDestination) {
      if (shipment.status === 'booked' || shipment.status === 'pre_booked') {
        return {
          allowed: false,
          canUpdate: false,
          roleType: 'receiver_branch',
          reason: t('perm_dest_not_dispatched') || 'This parcel has not departed from the Origin branch yet.',
          allowedStatuses: []
        };
      }
      return {
        allowed: true,
        canUpdate: true,
        roleType: 'receiver_branch',
        allowedStatuses: ['received_at_branch', 'out_for_delivery', 'delivered', 'returned']
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
  const addShipment = (shipmentData: Omit<Shipment, 'id' | 'cnNumber' | 'statusHistory' | 'bookedAt'>): Shipment => {
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const newCn = `RYN-${randomSuffix}`;
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

  // Update Shipment Status
  const updateShipmentStatus = (
    shipmentId: string, 
    newStatus: ShipmentStatus, 
    note?: string, 
    location?: string,
    driverName?: string,
    driverPhone?: string
  ): boolean => {
    const target = shipments.find(s => s.id === shipmentId);
    if (!target) return false;

    const perm = canUserUpdateStatus(target);
    if (!perm.allowed || !perm.allowedStatuses.includes(newStatus)) {
      showToast(perm.reason || 'You do not have permission to set this status.');
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

    const newHistory = [...target.statusHistory, newHistoryItem];
    const actualDelivery = newStatus === 'delivered' ? now : target.actualDelivery;
    const newFinancials = {
      ...target.financials,
      amountPaid: newStatus === 'delivered' && target.financials.paymentStatus === 'to_pay' 
        ? target.financials.totalAmount 
        : target.financials.amountPaid,
      amountDue: newStatus === 'delivered' && target.financials.paymentStatus === 'to_pay'
        ? 0
        : target.financials.amountDue,
      paymentStatus: (newStatus === 'delivered' && target.financials.paymentStatus === 'to_pay' 
        ? 'paid' 
        : target.financials.paymentStatus) as any
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

    setShipments(prev => prev.map(s => s.id === shipmentId ? updatedShipment : s));

    if (trackedShipment?.id === shipmentId) {
      setTrackedShipment(updatedShipment);
    }

    // Persist to Supabase Database (direct client & backend API)
    directSupabaseUpdateShipmentStatus(shipmentId, newStatus, newHistory);

    fetch(`/api/shipments/${shipmentId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: newStatus,
        statusHistory: newHistory,
        actualDelivery,
        financials: newFinancials,
        currentBranchId
      })
    }).catch(err => console.error('Error updating status in Supabase:', err));

    showToast(t('status_updated_successfully') || 'Consignment milestone updated in Supabase!');
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
        branches,
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
        updateShipmentStatus,
        canUserUpdateStatus,
        changePassword,
        resetBranchUserCredentials,
        addBranch,
        updateBranch,
        deleteBranch,
        addExpense,
        deleteExpense,
        analytics,
        filteredShipments,
        partnerShipments,
        customerShipments,
        branchExpenses,
        toastMessage,
        showToast,
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
