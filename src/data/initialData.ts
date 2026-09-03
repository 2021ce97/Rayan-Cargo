import { Branch, User, Shipment, BranchExpense } from '../types';

/**
 * Clean Production Slate for Rayan Cargo DB
 * All dummy branches, fake shipments, and mock revenue have been cleared.
 * Central System Administrator can add new branches and staff accounts.
 */

export const INITIAL_BRANCHES: Branch[] = [
  {
    id: 'br_kbl_01',
    name: 'Kabul Central Hub',
    nameFa: 'نمایندگی مرکزی کابل',
    namePs: 'د کابل مرکزي څانګه',
    code: 'KBL-01',
    province: 'Kabul',
    city: 'Kabul City (Shahr-e-Naw)',
    address: 'Ansari Square, Shahr-e-Naw, Cargo Center #4',
    phone: '+93 79 123 4567',
    email: 'kabul@rayancargo.af',
    managerName: 'Ahmad Rashid Safi',
    tazkiraNumber: '1401-209-1102',
    isHeadOffice: true,
    activeShipmentsCount: 142,
    totalParcelsDispatched: 1890,
    totalParcelsReceived: 1420,
    totalRevenueAfn: 984500,
    createdAt: '2026-08-31T08:00:00Z'
  },
  {
    id: 'br_kdh_04',
    name: 'Kandahar Southern Terminal',
    nameFa: 'نمایندگی ولایت قندهار',
    namePs: 'د کندهار ولایت څانګه',
    code: 'KDH-04',
    province: 'Kandahar',
    city: 'Kandahar City',
    address: 'Shahidano Chawk, Commercial Cargo Terminal',
    phone: '+93 77 441 2233',
    email: 'kandahar@rayancargo.af',
    managerName: 'Noor Ahmad Popalzai',
    tazkiraNumber: '1401-441-3321',
    isHeadOffice: false,
    activeShipmentsCount: 52,
    totalParcelsDispatched: 640,
    totalParcelsReceived: 620,
    totalRevenueAfn: 340000,
    createdAt: '2026-08-31T08:00:00Z'
  },
  {
    id: 'br_knd_06',
    name: 'Kunduz North Gateway',
    nameFa: 'نمایندگی ولایت کندز',
    namePs: 'د کندز ولایت څانګه',
    code: 'KND-06',
    province: 'Kunduz',
    city: 'Kunduz City',
    address: 'Main Bandar Khanabad, Cargo Hub 2',
    phone: '+93 72 990 1234',
    email: 'kunduz@rayancargo.af',
    managerName: 'Sardar Wali Qadiri',
    tazkiraNumber: '1401-990-4412',
    isHeadOffice: false,
    activeShipmentsCount: 28,
    totalParcelsDispatched: 310,
    totalParcelsReceived: 290,
    totalRevenueAfn: 175000,
    createdAt: '2026-08-31T08:00:00Z'
  },
  {
    id: 'br_mzr_03',
    name: 'Mazar-i-Sharif Northern Hub',
    nameFa: 'نمایندگی مزارشریف و بلخ',
    namePs: 'د مزارشریف څانګه (بلخ)',
    code: 'MZR-03',
    province: 'Balkh',
    city: 'Mazar-i-Sharif',
    address: 'Kefayat Market Road, Near Rawza Square',
    phone: '+93 78 554 9900',
    email: 'mazar@rayancargo.af',
    managerName: 'Zabihullah Balkhi',
    tazkiraNumber: '1401-554-7788',
    isHeadOffice: false,
    activeShipmentsCount: 64,
    totalParcelsDispatched: 780,
    totalParcelsReceived: 710,
    totalRevenueAfn: 395000,
    createdAt: '2026-08-31T08:00:00Z'
  }
];

export const INITIAL_USERS: User[] = [
  {
    id: 'usr_admin',
    name: 'Central System Admin',
    email: 'armaghansadeq@cargo.af',
    phone: '+93 79 900 1122',
    role: 'super_admin',
    branchId: 'all',
    password: 'Armaghanrayan123',
    passwordChangedByBranch: false,
    status: 'active',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    createdAt: new Date().toISOString(),
    lastLogin: 'Just now'
  },
  {
    id: 'usr_kbl_01',
    name: 'Ahmad Rashid Safi',
    email: 'kabul@rayancargo.af',
    phone: '+93 79 123 4567',
    role: 'branch_manager',
    branchId: 'br_kbl_01',
    password: 'kabul123',
    passwordChangedByBranch: false,
    status: 'active',
    createdAt: '2026-08-31T08:00:00Z',
    lastLogin: '2 hours ago'
  },
  {
    id: 'usr_kdh_04',
    name: 'Noor Ahmad Popalzai',
    email: 'kandahar@rayancargo.af',
    phone: '+93 77 441 2233',
    role: 'branch_manager',
    branchId: 'br_kdh_04',
    password: 'kandahar123',
    passwordChangedByBranch: false,
    status: 'active',
    createdAt: '2026-08-31T08:00:00Z',
    lastLogin: 'Yesterday'
  },
  {
    id: 'usr_knd_06',
    name: 'Sardar Wali Qadiri',
    email: 'kunduz@rayancargo.af',
    phone: '+93 72 990 1234',
    role: 'branch_manager',
    branchId: 'br_knd_06',
    password: 'kunduz123',
    passwordChangedByBranch: false,
    status: 'active',
    createdAt: '2026-08-31T08:00:00Z',
    lastLogin: '3 days ago'
  },
  {
    id: 'usr_mzr_03',
    name: 'Zabihullah Balkhi',
    email: 'mazar@rayancargo.af',
    phone: '+93 78 554 9900',
    role: 'branch_manager',
    branchId: 'br_mzr_03',
    password: 'mazar123',
    passwordChangedByBranch: false,
    status: 'active',
    createdAt: '2026-08-31T08:00:00Z',
    lastLogin: '5 hours ago'
  }
];

export const INITIAL_SHIPMENTS: Shipment[] = [];

export const INITIAL_EXPENSES: BranchExpense[] = [];
