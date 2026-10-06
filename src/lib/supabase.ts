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
      tazkira_number: branch.tazkiraNumber || '',
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
      last_login: user.lastLogin || 'Just now',
      preferences: user.preferences || null
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
      is_customer_prebooked: shipment.isCustomerPrebooked || shipment.isPreBooking || shipment.status === 'pre_booked' || false,
      is_pre_booking: shipment.isCustomerPrebooked || shipment.isPreBooking || shipment.status === 'pre_booked' || false,
      customer_user_id: shipment.customerUserId || null,
      booked_at: shipment.bookedAt,
      estimated_delivery: shipment.estimatedDelivery,
      actual_delivery: shipment.actualDelivery || null,
      pod_signature: shipment.podSignature || null,
      receiver_id_proof: shipment.receiverIdProof || null,
      delivery_notes: shipment.deliveryNotes || '',
      booked_by_user_id: shipment.bookedByUserId,
      booked_by_user_name: shipment.bookedByUserName,
      dest_branch_commission: shipment.destBranchCommission || 100,
      remittance_status: shipment.remittanceStatus || 'pending',
      origin_remittance_due: shipment.originRemittanceDue || 0,
      created_at: (shipment as any).createdAt || shipment.bookedAt || new Date().toISOString(),
      seller_payout_status: shipment.sellerPayoutStatus || (shipment.status === 'delivered' ? 'ready_for_payout' : 'pending_delivery'),
      seller_payout_disbursed_at: shipment.sellerPayoutDisbursedAt || null,
      seller_payout_method: shipment.sellerPayoutMethod || null,
      seller_payout_voucher_ref: shipment.sellerPayoutVoucherRef || null,
      seller_payout_confirmed_at: shipment.sellerPayoutConfirmedAt || null,
      seller_payout_dispute_reason: shipment.sellerPayoutDisputeReason || null
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
  history: any[],
  extraFields?: Record<string, any>
): Promise<{ success: boolean; error?: any }> {
  const client = getSupabase();
  if (!client) return { success: false, error: 'Supabase client not initialized' };

  try {
    const { error } = await client
      .from('shipments')
      .update({
        status,
        status_history: history,
        ...extraFields
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
      branch_id: settlement.fromBranchId || settlement.destinationBranchId || settlement.payingBranchId || 'br_admin_hq',
      paying_branch_id: settlement.payingBranchId || settlement.fromBranchId,
      receiving_branch_id: settlement.receivingBranchId || settlement.toBranchId || 'br_admin_hq',
      settlement_type: settlement.settlementType || 'origin_split',
      amount_afn: settlement.amountAfn || settlement.netRemittanceAmountAfn || settlement.netRemittedAmount || 0,
      shipments_count: settlement.shipmentsCount || settlement.parcelCount || (settlement.parcelIds ? settlement.parcelIds.length : 0),
      shipment_ids: settlement.shipmentIds || settlement.parcelIds || [],
      parcel_ids: settlement.parcelIds || settlement.shipmentIds || [],
      cn_number: settlement.batchNumber || settlement.cnNumber || `REM-${settlement.id}`,
      origin_branch_id: settlement.originBranchId || 'br_admin_hq',
      destination_branch_id: settlement.fromBranchId || settlement.destinationBranchId || 'br_admin_hq',
      gross_collected_amount: settlement.totalCollectedAfn ?? settlement.grossCollectedAmount ?? 0,
      dest_branch_commission: settlement.destCommissionAfn ?? settlement.destBranchCommission ?? 0,
      transportation_fee: settlement.transportationFeeAfn ?? settlement.transportationFee ?? 0,
      origin_branch_commission: settlement.originCommissionAfn ?? settlement.originBranchCommission ?? 0,
      total_commission_kept: settlement.totalCommissionKeptAfn ?? settlement.totalCommissionKept ?? 0,
      net_remitted_amount: settlement.netRemittanceAmountAfn ?? settlement.netRemittedAmount ?? settlement.amountAfn ?? 0,
      
      // Two Portions Adjustments
      commission_adjustment_type: settlement.commissionAdjustmentType || 'exact',
      commission_adjustment_amount: settlement.commissionAdjustmentAmount || 0,
      commission_adjustment_reason: settlement.commissionAdjustmentReason || '',
      transport_adjustment_type: settlement.transportAdjustmentType || 'exact',
      transport_adjustment_amount: settlement.transportAdjustmentAmount || 0,
      transport_adjustment_reason: settlement.transportAdjustmentReason || '',

      settlement_date: settlement.settlementDate || settlement.submittedAt || new Date().toISOString(),
      settled_by_user_id: settlement.settledByUserId || settlement.submittedByUserId || null,
      settled_by_user_name: settlement.settledByUserName || settlement.submittedByUserName || 'Staff',
      reference_number: settlement.referenceNumber || '',
      sarafi_reference_no: settlement.referenceNumber || '',
      payment_method: settlement.paymentMethod === 'hawala' ? 'sarafi_hawala'
        : settlement.paymentMethod === 'cash_handover' ? 'cash_courier'
        : settlement.paymentMethod === 'treasury' ? 'internal_offset'
        : settlement.paymentMethod || 'sarafi_hawala',
      settlement_channel: settlement.paymentMethod === 'hawala' ? 'sarafi_hawala'
        : settlement.paymentMethod === 'cash_handover' ? 'cash_courier'
        : settlement.paymentMethod === 'treasury' ? 'internal_offset'
        : settlement.paymentMethod || 'sarafi_hawala',
      status: settlement.status || 'submitted_to_headoffice',
      settlement_status: settlement.status === 'confirmed_by_headoffice' ? 'settled' : 'pending',
      notes: settlement.notes || '',
      created_at: settlement.createdAt || settlement.submittedAt || new Date().toISOString()
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
 * Wipe all dummy shipments, expenses, settlements from Supabase while preserving branches and staff
 */
export async function directSupabaseWipeDummyData(): Promise<{ success: boolean; error?: string }> {
  const client = getSupabase();
  if (!client) return { success: false, error: 'Supabase client not configured' };

  try {
    // 1. Delete all shipments, expenses, settlements
    await Promise.allSettled([
      client.from('shipments').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      client.from('branch_expenses').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      client.from('branch_settlements').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      client.from('users').delete().eq('role', 'customer'),
      client.from('users').delete().eq('id', 'usr_kbl_mgr'),
      client.from('users').delete().eq('id', 'usr_nan_mgr'),
      client.from('branches').delete().eq('id', 'br_kbl_01'),
      client.from('branches').delete().eq('id', 'br_nan01_0813')
    ]);

    // 2. Reset branches counters to 0
    await client.from('branches').update({
      active_shipments_count: 0,
      total_parcels_dispatched: 0,
      total_parcels_received: 0,
      total_revenue_afn: 0
    }).neq('id', '00000000-0000-0000-0000-000000000000');

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

/**
 * Delete a single shipment from Supabase
 */
export async function directSupabaseDeleteShipment(shipmentId: string): Promise<{ success: boolean; error?: any }> {
  const client = getSupabase();
  if (!client) return { success: false, error: 'Supabase client not initialized' };

  try {
    const { error } = await client
      .from('shipments')
      .delete()
      .eq('id', shipmentId);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error('Error deleting shipment from Supabase:', err);
    return { success: false, error: err };
  }
}

// ============================================================================
// EXPLICIT SUPABASE COLUMN LISTS (Egress Optimization — Avoid select('*') & Sensitive Fields)
// ============================================================================
export const SUPABASE_BRANCH_COLUMNS = 'id,name,name_fa,name_ps,code,province,city,address,phone,email,manager_name,tazkira_number,is_head_office,active_shipments_count,total_parcels_dispatched,total_parcels_received,total_revenue_afn,created_at';

// Strictly excludes password / password_hash from general user listing to protect credentials & reduce egress
export const SUPABASE_USER_SAFE_COLUMNS = 'id,name,email,phone,role,branch_id,password_changed_by_branch,last_password_change,status,avatar,created_at,last_login,preferences';

export const SUPABASE_SHIPMENT_COLUMNS = 'id,cn_number,origin_branch_id,destination_branch_id,current_branch_id,sender,receiver,package_info,financials,status,status_history,booked_at,estimated_delivery,actual_delivery,pod_signature,receiver_id_proof,delivery_notes,booked_by_user_id,booked_by_user_name,is_customer_prebooked,is_pre_booking,customer_user_id,dest_branch_commission,remittance_status,origin_remittance_due,customer_submission_at,customer_submission_reference,customer_submission_by,seller_payout_status,seller_payout_disbursed_at,seller_payout_method,seller_payout_voucher_ref,seller_payout_disbursed_by_branch_id,seller_payout_disbursed_by_user_name,seller_payout_confirmed_at,seller_payout_dispute_reason,seller_payout_notes';

export const SUPABASE_EXPENSE_COLUMNS = 'id,branch_id,category,amount,description,expense_date,paid_to,receipt_number,created_by_name,created_at';

export const SUPABASE_SETTLEMENT_COLUMNS = 'id,branch_id,paying_branch_id,receiving_branch_id,settlement_type,amount_afn,shipments_count,shipment_ids,parcel_ids,cn_number,origin_branch_id,destination_branch_id,gross_collected_amount,dest_branch_commission,transportation_fee,origin_branch_commission,total_commission_kept,net_remitted_amount,commission_adjustment_type,commission_adjustment_amount,commission_adjustment_reason,transport_adjustment_type,transport_adjustment_amount,transport_adjustment_reason,settlement_date,settled_by_user_id,settled_by_user_name,reference_number,sarafi_reference_no,payment_method,settlement_channel,status,settlement_status,notes,created_at';

export function mapSupabaseRowToBranch(b: any): Branch {
  return {
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
  };
}

export function mapSupabaseRowToUser(u: any): User {
  // Never expose password/password_hash from general user listing or realtime payloads
  return {
    id: u.id,
    name: u.name,
    email: u.email || '',
    phone: u.phone,
    role: u.role,
    branchId: u.branch_id,
    passwordChangedByBranch: u.password_changed_by_branch || false,
    lastPasswordChange: u.last_password_change || undefined,
    status: u.status || 'active',
    avatar: u.avatar || undefined,
    createdAt: u.created_at,
    lastLogin: u.last_login || 'Never',
    preferences: typeof u.preferences === 'string' ? JSON.parse(u.preferences) : u.preferences
  };
}

/**
 * Targeted single-user login verification against Supabase without downloading passwords in general user listings
 */
export async function directSupabaseVerifyUserLogin(identifierOrUserId: string, candidatePassword: string): Promise<User | null> {
  const client = getSupabase();
  if (!client || !identifierOrUserId || !candidatePassword) return null;
  try {
    const clean = identifierOrUserId.trim().toLowerCase();
    const { data, error } = await client
      .from('users')
      .select(`${SUPABASE_USER_SAFE_COLUMNS},password`)
      .or(`id.eq.${clean},email.ilike.${clean},phone.ilike.%${clean.replace(/[^0-9]/g, '') || clean}%`)
      .limit(5);
    if (error || !data || data.length === 0) return null;
    const cleanPass = candidatePassword.trim();
    const matchedRow = data.find((r: any) => {
      const stored = String(r.password || r.password_hash || '').trim();
      return stored && (stored === cleanPass || stored.toLowerCase() === cleanPass.toLowerCase());
    });
    if (!matchedRow) return null;
    return mapSupabaseRowToUser(matchedRow);
  } catch {
    return null;
  }
}

export function mapSupabaseRowToShipment(s: any): Shipment {
  return {
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
    isCustomerPrebooked: s.is_customer_prebooked === true || s.is_pre_booking === true || s.status === 'pre_booked' || s.status === 'verified',
    isPreBooking: s.is_customer_prebooked === true || s.is_pre_booking === true || s.status === 'pre_booked' || s.status === 'verified',
    customerUserId: s.customer_user_id || undefined,
    destBranchCommission: s.dest_branch_commission,
    remittanceStatus: s.remittance_status,
    originRemittanceDue: s.origin_remittance_due,
    customerSubmissionAt: s.customer_submission_at || undefined,
    customerSubmissionReference: s.customer_submission_reference || undefined,
    customerSubmissionBy: s.customer_submission_by || undefined,
    sellerPayoutStatus: s.seller_payout_status || (typeof s.financials === 'object' ? s.financials?.sellerPayoutStatus : undefined) || (s.status === 'delivered' ? 'ready_for_payout' : 'pending_delivery'),
    sellerPayoutDisbursedAt: s.seller_payout_disbursed_at || (typeof s.financials === 'object' ? s.financials?.sellerPayoutDisbursedAt : undefined),
    sellerPayoutMethod: s.seller_payout_method || (typeof s.financials === 'object' ? s.financials?.sellerPayoutMethod : undefined),
    sellerPayoutVoucherRef: s.seller_payout_voucher_ref || (typeof s.financials === 'object' ? s.financials?.sellerPayoutVoucherRef : undefined),
    sellerPayoutDisbursedByBranchId: s.seller_payout_disbursed_by_branch_id || (typeof s.financials === 'object' ? s.financials?.sellerPayoutDisbursedByBranchId : undefined),
    sellerPayoutDisbursedByUserName: s.seller_payout_disbursed_by_user_name || (typeof s.financials === 'object' ? s.financials?.sellerPayoutDisbursedByUserName : undefined),
    sellerPayoutConfirmedAt: s.seller_payout_confirmed_at || (typeof s.financials === 'object' ? s.financials?.sellerPayoutConfirmedAt : undefined),
    sellerPayoutDisputeReason: s.seller_payout_dispute_reason || (typeof s.financials === 'object' ? s.financials?.sellerPayoutDisputeReason : undefined),
    sellerPayoutNotes: s.seller_payout_notes || (typeof s.financials === 'object' ? s.financials?.sellerPayoutNotes : undefined)
  };
}

export function mapSupabaseRowToExpense(e: any): BranchExpense {
  return {
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
  };
}

export function mapSupabaseRowToSettlement(r: any): any {
  const rawMethod = r.payment_method || r.settlement_channel || 'sarafi_hawala';
  const mappedMethod = rawMethod === 'sarafi_hawala' ? 'hawala'
    : rawMethod === 'cash_courier' ? 'cash_handover'
    : rawMethod === 'internal_offset' ? 'treasury'
    : rawMethod;
  const rawStatus = r.status || r.settlement_status || 'submitted_to_headoffice';
  const mappedStatus = rawStatus === 'settled' ? 'confirmed_by_headoffice'
    : rawStatus === 'pending' ? 'submitted_to_headoffice'
    : rawStatus;

  const parcelIds = Array.isArray(r.parcel_ids)
    ? r.parcel_ids
    : Array.isArray(r.shipment_ids)
      ? r.shipment_ids
      : typeof r.parcel_ids === 'string'
        ? JSON.parse(r.parcel_ids || '[]')
        : [];

  return {
    id: r.id,
    batchNumber: r.cn_number || `REM-${r.id}`,
    fromBranchId: r.paying_branch_id || r.destination_branch_id || r.branch_id,
    originBranchId: r.origin_branch_id || 'br_admin_hq',
    toBranchId: r.receiving_branch_id || 'br_admin_hq',
    parcelIds,
    parcelCount: Number(r.shipments_count || parcelIds.length || 0),
    totalCollectedAfn: Number(r.gross_collected_amount ?? r.amount_afn ?? 0),
    destCommissionAfn: Number(r.dest_branch_commission ?? 0),
    transportationFeeAfn: Number(r.transportation_fee ?? 0),
    originCommissionAfn: Number(r.origin_branch_commission ?? 0),
    totalCommissionKeptAfn: Number(r.total_commission_kept ?? r.dest_branch_commission ?? 0),
    netRemittanceAmountAfn: Number(r.net_remitted_amount ?? r.amount_afn ?? 0),
    commissionAdjustmentType: r.commission_adjustment_type || 'exact',
    commissionAdjustmentAmount: Number(r.commission_adjustment_amount || 0),
    commissionAdjustmentReason: r.commission_adjustment_reason || '',
    transportAdjustmentType: r.transport_adjustment_type || 'exact',
    transportAdjustmentAmount: Number(r.transport_adjustment_amount || 0),
    transportAdjustmentReason: r.transport_adjustment_reason || '',
    paymentMethod: mappedMethod,
    referenceNumber: r.reference_number || r.sarafi_reference_no || '',
    transferAgentName: r.settled_by_user_name || '',
    notes: r.notes || '',
    status: mappedStatus,
    submittedByUserId: r.settled_by_user_id || 'usr_branch',
    submittedByUserName: r.settled_by_user_name || 'Branch Staff',
    submittedAt: r.settlement_date || r.created_at || new Date().toISOString()
  };
}

/**
 * Fetch a single shipment by ID or CN number from Supabase (used when a single record is needed or truncated in Realtime)
 */
export async function directSupabaseFetchSingleShipment(idOrCn: string): Promise<Shipment | null> {
  const client = getSupabase();
  if (!client || !idOrCn) return null;
  try {
    const clean = idOrCn.trim();
    const { data, error } = await client
      .from('shipments')
      .select(SUPABASE_SHIPMENT_COLUMNS)
      .or(`id.eq.${clean},cn_number.ilike.${clean}`)
      .limit(1)
      .maybeSingle();
    if (error || !data) return null;
    return mapSupabaseRowToShipment(data);
  } catch {
    return null;
  }
}

/**
 * Fetch all required initial records directly from Supabase tables using explicit columns & safety limits
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
      client.from('branches').select(SUPABASE_BRANCH_COLUMNS).order('created_at', { ascending: true }),
      client.from('users').select(SUPABASE_USER_SAFE_COLUMNS).order('created_at', { ascending: true }),
      client.from('shipments').select(SUPABASE_SHIPMENT_COLUMNS).order('booked_at', { ascending: false }).limit(500),
      client.from('branch_expenses').select(SUPABASE_EXPENSE_COLUMNS).order('created_at', { ascending: false }).limit(500),
      client.from('branch_settlements').select(SUPABASE_SETTLEMENT_COLUMNS).order('created_at', { ascending: false }).limit(500)
    ]);

    const branches: Branch[] = (bRes.data || []).map(mapSupabaseRowToBranch);
    const users: User[] = (uRes.data || []).map(mapSupabaseRowToUser);
    const shipments: Shipment[] = (sRes.data || []).map(mapSupabaseRowToShipment);
    const expenses: BranchExpense[] = (eRes.data || []).map(mapSupabaseRowToExpense);
    const settlements = (setRes.data || []).map(mapSupabaseRowToSettlement);

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
