import { Branch, User, Shipment, BranchExpense } from '../types';

/**
 * Clean Production Slate for Rayan Cargo DB
 * All dummy branches, fake shipments, and mock revenue have been cleared.
 * Central System Administrator can add new branches and staff accounts.
 */

export const INITIAL_BRANCHES: Branch[] = [];

export const INITIAL_USERS: User[] = [
  {
    id: 'usr_admin',
    name: 'Central System Admin',
    email: 'admin@rayancargo.af',
    phone: '+93 79 900 1122',
    role: 'super_admin',
    branchId: 'all',
    password: 'admin123',
    passwordChangedByBranch: false,
    status: 'active',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    createdAt: new Date().toISOString(),
    lastLogin: 'Just now'
  }
];

export const INITIAL_SHIPMENTS: Shipment[] = [];

export const INITIAL_EXPENSES: BranchExpense[] = [];
