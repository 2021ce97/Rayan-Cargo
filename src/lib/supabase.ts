import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { Branch, User, Shipment, BranchExpense } from '../types';

export const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://wgdmwuhkuanxykwqvpyp.supabase.co';
export const STORAGE_KEY_SUPABASE_ANON = 'rayan_cargo_supabase_anon_key';

let supabaseInstance: SupabaseClient | null = null;
let activeRealtimeChannel: RealtimeChannel | null = null;

export function getStoredAnonKey(): string {
  try {
    const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;
    if (envKey && typeof envKey === 'string' && envKey.trim()) {
      return envKey.trim();
    }
    const local = localStorage.getItem(STORAGE_KEY_SUPABASE_ANON);
    return (local || '').trim();
  } catch {
    return '';
  }
}

export function saveSupabaseAnonKey(key: string): void {
  try {
    const trimmed = key.trim();
    if (trimmed) {
      localStorage.setItem(STORAGE_KEY_SUPABASE_ANON, trimmed);
    } else {
      localStorage.removeItem(STORAGE_KEY_SUPABASE_ANON);
    }
    // Reset instance to re-initialize with new key
    supabaseInstance = null;
  } catch (e) {
    console.warn('Could not store Supabase key:', e);
  }
}

export function getSupabase(): SupabaseClient | null {
  const anonKey = getStoredAnonKey();
  if (!anonKey) return null;

  if (!supabaseInstance) {
    try {
      supabaseInstance = createClient(SUPABASE_URL, anonKey, {
        realtime: {
          params: {
            eventsPerSecond: 10
          }
        },
        auth: {
          persistSession: false
        }
      });
      console.log('⚡ Supabase Client initialized with Project:', SUPABASE_URL);
    } catch (err) {
      console.warn('Supabase Client initialization failed:', err);
      return null;
    }
  }
  return supabaseInstance;
}

export function isSupabaseReady(): boolean {
  return !!getStoredAnonKey();
}

/**
 * Direct Supabase Mutation Helpers
 * These write directly to the user's Supabase tables
 */

export async function directSupabaseInsertBranch(branch: Branch): Promise<{ success: boolean; error?: any }> {
  const client = getSupabase();
  if (!client) return { success: false, error: 'Supabase client not initialized' };

  try {
    const row = {
      id: branch.id,
      name: branch.name,
      name_fa: branch.nameFa || branch.name,
      name_ps: branch.namePs || branch.name,
      code: branch.code,
      province: branch.province,
      city: branch.city,
      address: branch.address,
      phone: branch.phone,
      email: branch.email,
      manager_name: branch.managerName,
      is_head_office: branch.isHeadOffice || false,
      active_shipments_count: branch.activeShipmentsCount || 0,
      total_parcels_dispatched: branch.totalParcelsDispatched || 0,
      total_parcels_received: branch.totalParcelsReceived || 0,
      total_revenue_afn: branch.totalRevenueAfn || 0,
      created_at: branch.createdAt || new Date().toISOString()
    };

    const { error } = await client
      .from('branches')
      .upsert(row, { onConflict: 'id' });

    if (error) {
      console.warn('directSupabaseInsertBranch warning:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

export async function directSupabaseInsertUser(user: User): Promise<{ success: boolean; error?: any }> {
  const client = getSupabase();
  if (!client) return { success: false, error: 'Supabase client not initialized' };

  try {
    const row = {
      id: user.id,
      name: user.name,
      email: user.email || null,
      phone: user.phone,
      role: user.role,
      branch_id: user.branchId,
      password: user.password || '',
      password_changed_by_branch: user.passwordChangedByBranch || false,
      last_password_change: user.lastPasswordChange || null,
      status: user.status || 'active',
      avatar: user.avatar || null,
      created_at: user.createdAt || new Date().toISOString(),
      last_login: user.lastLogin || 'Just now'
    };

    const { error } = await client
      .from('users')
      .upsert(row, { onConflict: 'id' });

    if (error) {
      console.warn('directSupabaseInsertUser warning:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

export async function directSupabaseInsertShipment(shipment: Shipment): Promise<{ success: boolean; error?: any }> {
  const client = getSupabase();
  if (!client) return { success: false, error: 'Supabase client not initialized' };

  try {
    const row = {
      id: shipment.id,
      cn_number: shipment.cnNumber,
      origin_branch_id: shipment.originBranchId,
      destination_branch_id: shipment.destinationBranchId,
      current_branch_id: shipment.currentBranchId,
      sender: shipment.sender,
      receiver: shipment.receiver,
      package_info: shipment.packageInfo || (shipment as any).packageDetails,
      financials: shipment.financials,
      status: shipment.status,
      status_history: shipment.statusHistory || [],
      booked_at: shipment.bookedAt,
      estimated_delivery: shipment.estimatedDelivery,
      actual_delivery: shipment.actualDelivery || null,
      pod_signature: shipment.podSignature || null,
      receiver_id_proof: shipment.receiverIdProof || null,
      delivery_notes: shipment.deliveryNotes || '',
      booked_by_user_id: shipment.bookedByUserId,
      booked_by_user_name: shipment.bookedByUserName,
      dest_branch_commission: shipment.destBranchCommission || 100,
      remittance_status: shipment.remittanceStatus || 'unsettled',
      origin_remittance_due: shipment.originRemittanceDue || 0,
      created_at: (shipment as any).createdAt || shipment.bookedAt || new Date().toISOString()
    };

    const { error } = await client
      .from('shipments')
      .upsert(row, { onConflict: 'id' });

    if (error) {
      console.warn('directSupabaseInsertShipment warning:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

export async function directSupabaseUpdateShipmentStatus(
  shipmentId: string, 
  status: string, 
  history: any[]
): Promise<{ success: boolean; error?: any }> {
  const client = getSupabase();
  if (!client) return { success: false, error: 'Supabase client not initialized' };

  try {
    const { error } = await client
      .from('shipments')
      .update({
        status,
        status_history: history,
        updated_at: new Date().toISOString()
      })
      .eq('id', shipmentId);

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

export async function directSupabaseInsertExpense(expense: BranchExpense): Promise<{ success: boolean; error?: any }> {
  const client = getSupabase();
  if (!client) return { success: false, error: 'Supabase client not initialized' };

  try {
    const row = {
      id: expense.id,
      branch_id: expense.branchId,
      category: expense.category,
      amount: expense.amount,
      description: expense.description,
      expense_date: expense.expenseDate || new Date().toISOString().split('T')[0],
      paid_to: expense.paidTo || '',
      receipt_number: expense.receiptNumber || '',
      created_by_name: expense.createdByName || '',
      created_at: expense.createdAt || new Date().toISOString()
    };

    const { error } = await client
      .from('branch_expenses')
      .upsert(row, { onConflict: 'id' });

    if (error) {
      console.warn('directSupabaseInsertExpense warning:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

export async function directSupabaseInsertSettlement(settlement: any): Promise<{ success: boolean; error?: any }> {
  const client = getSupabase();
  if (!client) return { success: false, error: 'Supabase client not initialized' };

  try {
    const row = {
      id: settlement.id,
      paying_branch_id: settlement.payingBranchId,
      receiving_branch_id: settlement.receivingBranchId,
      settlement_type: settlement.settlementType || 'origin_split',
      amount_afn: settlement.amountAfn,
      shipments_count: settlement.shipmentsCount || 0,
      shipment_ids: settlement.shipmentIds || [],
      settlement_date: settlement.settlementDate || new Date().toISOString(),
      settled_by_user_id: settlement.settledByUserId,
      settled_by_user_name: settlement.settledByUserName,
      reference_number: settlement.referenceNumber || '',
      payment_method: settlement.paymentMethod || 'cash',
      status: settlement.status || 'completed',
      created_at: settlement.createdAt || new Date().toISOString()
    };

    const { error } = await client
      .from('branch_settlements')
      .upsert(row, { onConflict: 'id' });

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

/**
 * Fetch all records directly from Supabase tables
 */
export async function directSupabaseFetchAll(): Promise<{
  success: boolean;
  branches?: Branch[];
  users?: User[];
  shipments?: Shipment[];
  expenses?: BranchExpense[];
  settlements?: any[];
  error?: string;
}> {
  const client = getSupabase();
  if (!client) return { success: false, error: 'Supabase client not configured' };

  try {
    const [bRes, uRes, sRes, eRes, setRes] = await Promise.all([
      client.from('branches').select('*').order('created_at', { ascending: true }),
      client.from('users').select('*').order('created_at', { ascending: true }),
      client.from('shipments').select('*').order('booked_at', { ascending: false }),
      client.from('branch_expenses').select('*').order('created_at', { ascending: false }),
      client.from('branch_settlements').select('*').order('created_at', { ascending: false })
    ]);

    const branches: Branch[] = (bRes.data || []).map((b: any) => ({
      id: b.id,
      name: b.name,
      nameFa: b.name_fa || b.name,
      namePs: b.name_ps || b.name,
      code: b.code,
      province: b.province,
      city: b.city,
      address: b.address,
      phone: b.phone,
      email: b.email,
      managerName: b.manager_name,
      tazkiraNumber: b.tazkira_number || '',
      isHeadOffice: b.is_head_office || false,
      activeShipmentsCount: b.active_shipments_count || 0,
      totalParcelsDispatched: b.total_parcels_dispatched || 0,
      totalParcelsReceived: b.total_parcels_received || 0,
      totalRevenueAfn: Number(b.total_revenue_afn || 0),
      createdAt: b.created_at
    }));

    const users: User[] = (uRes.data || []).map((u: any) => ({
      id: u.id,
      name: u.name,
      email: u.email || '',
      phone: u.phone,
      role: u.role,
      branchId: u.branch_id,
      password: u.password,
      passwordChangedByBranch: u.password_changed_by_branch || false,
      lastPasswordChange: u.last_password_change || undefined,
      status: u.status || 'active',
      avatar: u.avatar || undefined,
      createdAt: u.created_at,
      lastLogin: u.last_login || 'Never'
    }));

    const shipments: Shipment[] = (sRes.data || []).map((s: any) => ({
      id: s.id,
      cnNumber: s.cn_number,
      originBranchId: s.origin_branch_id,
      destinationBranchId: s.destination_branch_id,
      currentBranchId: s.current_branch_id,
      sender: typeof s.sender === 'string' ? JSON.parse(s.sender) : s.sender,
      receiver: typeof s.receiver === 'string' ? JSON.parse(s.receiver) : s.receiver,
      packageInfo: typeof s.package_info === 'string' ? JSON.parse(s.package_info) : s.package_info,
      financials: typeof s.financials === 'string' ? JSON.parse(s.financials) : s.financials,
      status: s.status,
      statusHistory: typeof s.status_history === 'string' ? JSON.parse(s.status_history) : (s.status_history || []),
      bookedAt: s.booked_at,
      estimatedDelivery: s.estimated_delivery,
      actualDelivery: s.actual_delivery,
      podSignature: s.pod_signature,
      receiverIdProof: s.receiver_id_proof,
      deliveryNotes: s.delivery_notes,
      bookedByUserId: s.booked_by_user_id,
      bookedByUserName: s.booked_by_user_name,
      destBranchCommission: s.dest_branch_commission,
      remittanceStatus: s.remittance_status,
      originRemittanceDue: s.origin_remittance_due
    }));

    const expenses: BranchExpense[] = (eRes.data || []).map((e: any) => ({
      id: e.id,
      branchId: e.branch_id,
      category: e.category,
      amount: Number(e.amount),
      description: e.description,
      expenseDate: e.expense_date,
      paidTo: e.paid_to,
      receiptNumber: e.receipt_number,
      createdByName: e.created_by_name,
      createdAt: e.created_at
    }));

    const settlements = setRes.data || [];

    return {
      success: true,
      branches,
      users,
      shipments,
      expenses,
      settlements
    };
  } catch (err: any) {
    console.warn('directSupabaseFetchAll failed:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Setup Supabase Realtime Subscriptions
 * Subscribes across tables so when another client or Supabase dashboard updates data,
 * the UI refreshes instantly in real time.
 */
export interface RealtimeSyncHandlers {
  onDataChanged: (table: string, eventType: string, newRow: any, oldRow: any) => void;
  onStatusChange?: (status: 'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED' | 'CHANNEL_ERROR') => void;
}

export function subscribeToSupabaseRealtime(handlers: RealtimeSyncHandlers): () => void {
  const client = getSupabase();
  if (!client) {
    return () => {};
  }

  // Cleanup any previous subscription
  if (activeRealtimeChannel) {
    try {
      client.removeChannel(activeRealtimeChannel);
    } catch {}
    activeRealtimeChannel = null;
  }

  try {
    const channel = client.channel('rayan-cargo-realtime-sub')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'branches' },
        (payload) => handlers.onDataChanged('branches', payload.eventType, payload.new, payload.old)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'users' },
        (payload) => handlers.onDataChanged('users', payload.eventType, payload.new, payload.old)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shipments' },
        (payload) => handlers.onDataChanged('shipments', payload.eventType, payload.new, payload.old)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'branch_expenses' },
        (payload) => handlers.onDataChanged('branch_expenses', payload.eventType, payload.new, payload.old)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'branch_settlements' },
        (payload) => handlers.onDataChanged('branch_settlements', payload.eventType, payload.new, payload.old)
      )
      .subscribe((status) => {
        console.log(`📡 Supabase Realtime Status: ${status}`);
        if (handlers.onStatusChange) {
          handlers.onStatusChange(status as any);
        }
      });

    activeRealtimeChannel = channel;

    return () => {
      try {
        if (activeRealtimeChannel) {
          client.removeChannel(activeRealtimeChannel);
          activeRealtimeChannel = null;
        }
      } catch {}
    };
  } catch (err) {
    console.warn('Could not setup Supabase real-time channel:', err);
    return () => {};
  }
}
