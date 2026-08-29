import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  Language, 
  User, 
  Branch, 
  Shipment, 
  ShipmentStatus, 
  UserRole,
  AnalyticsSummary 
} from '../types';
import { translations } from '../i18n/translations';
import { INITIAL_BRANCHES, INITIAL_USERS, INITIAL_SHIPMENTS } from '../data/initialData';

interface StatusPermissionResult {
  allowed: boolean;
  reason?: string;
  allowedStatuses: ShipmentStatus[];
}

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
  initialPassword?: string;
}

interface AppContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  isRTL: boolean;
  t: (key: string) => string;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  isAuthenticated: boolean;
  login: (identifier: string, password?: string) => boolean;
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
  activeView: 'dashboard' | 'parcels' | 'booking' | 'tracking' | 'branches' | 'users' | 'reports';
  setActiveView: (view: 'dashboard' | 'parcels' | 'booking' | 'tracking' | 'branches' | 'users' | 'reports') => void;
  selectedShipmentForReceipt: Shipment | null;
  setSelectedShipmentForReceipt: (shipment: Shipment | null) => void;
  trackedShipment: Shipment | null;
  trackByCnNumber: (cn: string) => Shipment | null;
  addShipment: (shipmentData: Omit<Shipment, 'id' | 'cnNumber' | 'statusHistory' | 'bookedAt'>) => Shipment;
  updateShipmentStatus: (shipmentId: string, newStatus: ShipmentStatus, note?: string, location?: string, driverName?: string, driverPhone?: string) => boolean;
  canUserUpdateStatus: (shipment: Shipment) => StatusPermissionResult;
  changePassword: (newPassword: string) => boolean;
  resetBranchUserCredentials: (userId: string, emailOrPassword: string, initialPassword?: string, name?: string, phone?: string) => boolean;
  addBranch: (input: AddBranchInput) => { branch: Branch; user: User };
  analytics: AnalyticsSummary;
  filteredShipments: Shipment[];
  partnerShipments: Shipment[];
  toastMessage: string | null;
  showToast: (message: string) => void;
  isOfflineCached: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEYS = {
  LANGUAGE: 'rayan_cargo_lang_v2',
  BRANCHES: 'rayan_cargo_branches_v2',
  USERS: 'rayan_cargo_users_v2',
  SHIPMENTS: 'rayan_cargo_shipments_v2',
  CURRENT_USER_ID: 'rayan_cargo_cur_user_v2',
  ACTIVE_BRANCH_ID: 'rayan_cargo_active_branch_v2',
  IS_AUTH: 'rayan_cargo_is_auth_v2',
  PARTNER_BRANCH_ID: 'rayan_cargo_partner_branch_v2'
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

  // Enforce Light Theme for main body with dark sidebar
  const [isDarkMode] = useState<boolean>(false);

  const toggleDarkMode = () => {
    // Kept for backward compatibility
  };

  // Branches (HQ + Regional Hubs)
  const [branches, setBranches] = useState<Branch[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.BRANCHES);
    if (saved) {
      try { 
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 6) {
          return parsed;
        }
      } catch (e) { console.error(e); }
    }
    return INITIAL_BRANCHES;
  });

  // Users (Admin + 6 Branch exclusive users)
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.USERS);
    if (saved) {
      try { 
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 7) {
          return parsed;
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

  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.IS_AUTH);
    return saved !== null ? saved === 'true' : true;
  });

  // Current logged in user
  const [currentUser, setCurrentUser] = useState<User>(() => {
    const savedId = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
    if (savedId) {
      const found = users.find(u => u.id === savedId);
      if (found) return found;
    }
    // Default to Kabul branch manager for immediate preview
    return users.find(u => u.role === 'branch_manager') || INITIAL_USERS[1];
  });

  // Active branch context
  const [activeBranchId, setActiveBranchIdState] = useState<string>(() => {
    if (currentUser.role !== 'super_admin') {
      return currentUser.branchId;
    }
    const saved = localStorage.getItem(STORAGE_KEYS.ACTIVE_BRANCH_ID);
    return saved || 'all';
  });

  // Selected Branch Partner for cross-branch trade & history filter
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

  // Login methods
  const login = (identifier: string, password?: string): boolean => {
    const clean = identifier.trim().toLowerCase();
    const cleanPhone = identifier.replace(/[^0-9]/g, '');
    
    const matched = users.find(u => {
      const idMatch = u.email.toLowerCase() === clean || 
        u.phone.replace(/[^0-9]/g, '').includes(cleanPhone) ||
        u.name.toLowerCase().includes(clean);
      
      if (!idMatch) return false;
      if (password && u.password && u.password !== password.trim()) {
        return false;
      }
      return true;
    });

    if (matched) {
      setCurrentUser(matched);
      setIsAuthenticated(true);
      localStorage.setItem(STORAGE_KEYS.IS_AUTH, 'true');
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, matched.id);
      
      if (matched.role === 'super_admin') {
        setActiveBranchId('all');
      } else {
        setActiveBranchId(matched.branchId);
      }
      setActiveBranchPartnerId('all');
      showToast(`Welcome, ${matched.name}!`);
      return true;
    }
    return false;
  };

  const loginWithUser = (user: User) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    localStorage.setItem(STORAGE_KEYS.IS_AUTH, 'true');
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
    localStorage.setItem(STORAGE_KEYS.IS_AUTH, 'false');
    showToast(t('logged_out_notice') || 'Signed out successfully.');
  };

  // Branch User password self-change (Admin does not see the new password)
  const changePassword = (newPassword: string): boolean => {
    if (!newPassword || newPassword.trim().length < 4) {
      showToast('Password must be at least 4 characters');
      return false;
    }

    setUsers(prev => prev.map(u => {
      if (u.id === currentUser.id) {
        return {
          ...u,
          password: newPassword.trim(),
          passwordChangedByBranch: true,
          lastPasswordChange: new Date().toISOString()
        };
      }
      return u;
    }));

    setCurrentUser(prev => ({
      ...prev,
      password: newPassword.trim(),
      passwordChangedByBranch: true,
      lastPasswordChange: new Date().toISOString()
    }));

    showToast('Your branch password was updated securely!');
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

    showToast('Branch credentials provisioned successfully.');
    return true;
  };

  // Super Admin adds a brand new branch terminal and automatically provisions its dedicated role
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

    setBranches(prev => [...prev, newBranch]);
    setUsers(prev => [...prev, newUser]);
    showToast(t('branch_added_successfully') || 'New branch registered successfully!');

    return { branch: newBranch, user: newUser };
  };

  // Save changes to localStorage
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
  const [activeView, setActiveView] = useState<'dashboard' | 'parcels' | 'booking' | 'tracking' | 'branches' | 'users' | 'reports'>('dashboard');
  const [selectedShipmentForReceipt, setSelectedShipmentForReceipt] = useState<Shipment | null>(null);
  const [trackedShipment, setTrackedShipment] = useState<Shipment | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isOfflineCached] = useState<boolean>(true);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

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

  // Analytics Computation (Admin privacy enforced: admin does NOT see branch revenue)
  const analytics: AnalyticsSummary = React.useMemo(() => {
    const relevant = filteredShipments;
    let totalRevenue = 0;
    let totalPaid = 0;
    let totalPending = 0;
    let receivedParcels = 0;
    let inProgressParcels = 0;
    let deliveredParcels = 0;
    let returnedParcels = 0;
    let discountsGiven = 0;

    relevant.forEach(s => {
      // If branch manager is logged in, calculate their branch financials
      if (currentUser.role !== 'super_admin') {
        totalRevenue += s.financials.totalAmount;
        totalPaid += s.financials.amountPaid;
        totalPending += s.financials.amountDue;
        discountsGiven += s.financials.discountAmount || 0;
      }

      if (s.status === 'delivered') deliveredParcels++;
      else if (s.status === 'in_transit' || s.status === 'out_for_delivery') inProgressParcels++;
      else if (s.status === 'received_at_branch') receivedParcels++;
      else if (s.status === 'returned') returnedParcels++;
    });

    return {
      totalRevenue, // 0 for super admin for branch privacy
      totalPaid,
      totalPending,
      totalParcels: relevant.length,
      receivedParcels,
      inProgressParcels,
      deliveredParcels,
      returnedParcels,
      discountsGiven
    };
  }, [filteredShipments, currentUser.role]);

  // Permission Validator for Status Updates:
  // Sender branch can change: 'booked' -> 'in_transit' (dispatch)
  // Receiver branch can change: 'received_at_branch', 'out_for_delivery', 'delivered', 'returned'
  const canUserUpdateStatus = (shipment: Shipment): StatusPermissionResult => {
    if (currentUser.role === 'super_admin') {
      return {
        allowed: false,
        reason: 'Super Admin manages branch accounts. Consignment milestone updates are strictly handled by the Origin and Destination branches.',
        allowedStatuses: []
      };
    }

    const currentBranch = currentUser.branchId;
    const isOrigin = shipment.originBranchId === currentBranch;
    const isDestination = shipment.destinationBranchId === currentBranch;

    if (!isOrigin && !isDestination) {
      return {
        allowed: false,
        reason: 'You can only update parcels where your branch is either the Sender (Origin) or Receiver (Destination).',
        allowedStatuses: []
      };
    }

    // Sender Branch Stage
    if (isOrigin) {
      // If the parcel has already been received at destination or delivered, sender cannot change further
      if (shipment.status === 'received_at_branch' || shipment.status === 'out_for_delivery' || shipment.status === 'delivered') {
        return {
          allowed: false,
          reason: 'This parcel has arrived at destination. Only the Destination (Receiver) branch can update subsequent delivery stages.',
          allowedStatuses: []
        };
      }
      return {
        allowed: true,
        allowedStatuses: ['booked', 'in_transit']
      };
    }

    // Receiver Branch Stage
    if (isDestination) {
      if (shipment.status === 'booked') {
        return {
          allowed: false,
          reason: 'This parcel is still in Booked status at the Origin branch. The Origin branch must dispatch it first.',
          allowedStatuses: []
        };
      }
      return {
        allowed: true,
        allowedStatuses: ['received_at_branch', 'out_for_delivery', 'delivered', 'returned']
      };
    }

    return {
      allowed: false,
      reason: 'Unauthorized branch operation.',
      allowedStatuses: []
    };
  };

  // Add a new shipment (booking)
  const addShipment = (shipmentData: Omit<Shipment, 'id' | 'cnNumber' | 'statusHistory' | 'bookedAt'>): Shipment => {
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const newCn = `RYN-${randomSuffix}`;
    const now = new Date().toISOString();
    const originBranch = branches.find(b => b.id === shipmentData.originBranchId);

    const newShipment: Shipment = {
      ...shipmentData,
      id: `shp_${randomSuffix}`,
      cnNumber: newCn,
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

    // Update branch counters
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

    showToast(t('parcel_booked_successfully') || 'Parcel booked successfully!');
    return newShipment;
  };

  // Update Shipment Status with strict Sender / Receiver rules
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

    setShipments(prev => prev.map(s => {
      if (s.id === shipmentId) {
        const destBranch = branches.find(b => b.id === s.destinationBranchId);
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

        const updated: Shipment = {
          ...s,
          status: newStatus,
          currentBranchId: newStatus === 'received_at_branch' || newStatus === 'out_for_delivery' || newStatus === 'delivered' 
            ? s.destinationBranchId 
            : s.currentBranchId,
          statusHistory: [...s.statusHistory, newHistoryItem],
          actualDelivery: newStatus === 'delivered' ? now : s.actualDelivery,
          financials: {
            ...s.financials,
            amountPaid: newStatus === 'delivered' && s.financials.paymentStatus === 'to_pay' 
              ? s.financials.totalAmount 
              : s.financials.amountPaid,
            amountDue: newStatus === 'delivered' && s.financials.paymentStatus === 'to_pay'
              ? 0
              : s.financials.amountDue,
            paymentStatus: newStatus === 'delivered' && s.financials.paymentStatus === 'to_pay'
              ? 'paid'
              : s.financials.paymentStatus
          }
        };

        if (trackedShipment?.id === shipmentId) {
          setTrackedShipment(updated);
        }

        return updated;
      }
      return s;
    }));

    showToast(t('status_updated_successfully') || 'Consignment milestone updated!');
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
        activeView,
        setActiveView,
        selectedShipmentForReceipt,
        setSelectedShipmentForReceipt,
        trackedShipment,
        trackByCnNumber,
        addShipment,
        updateShipmentStatus,
        canUserUpdateStatus,
        changePassword,
        resetBranchUserCredentials,
        addBranch,
        analytics,
        filteredShipments,
        partnerShipments,
        toastMessage,
        showToast,
        isOfflineCached
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
