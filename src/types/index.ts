export type UserRole = 'super_admin' | 'branch_manager' | 'customer';

export type Language = 'en' | 'fa' | 'ps';

export type ParcelCategory = 
  | 'document' 
  | 'electronics' 
  | 'garments' 
  | 'fragile' 
  | 'machinery' 
  | 'foodstuff' 
  | 'general';

export type ServiceType = 
  | 'standard' 
  | 'express' 
  | 'same_day_air' 
  | 'heavy_cargo';

export type PaymentStatus = 'paid' | 'unpaid' | 'partial' | 'to_pay';

export type PaymentMethod = 'cash' | 'card' | 'bank_transfer' | 'cod' | 'hawala';

export type ShipmentStatus = 
  | 'pre_booked'
  | 'verified'
  | 'booked' 
  | 'in_transit' 
  | 'received_at_branch' 
  | 'out_for_delivery' 
  | 'delivered' 
  | 'returned' 
  | 'cancelled';

export type ExpenseCategory = 
  | 'rent' 
  | 'salary' 
  | 'food' 
  | 'fuel_transport' 
  | 'utilities' 
  | 'maintenance' 
  | 'other';

export interface BranchExpense {
  id: string;
  branchId: string;
  category: ExpenseCategory;
  amount: number;
  description: string;
  expenseDate: string;
  paidTo?: string;
  receiptNumber?: string;
  createdByName: string;
  createdAt: string;
}

export interface AddExpenseInput {
  branchId: string;
  category: ExpenseCategory;
  amount: number;
  description: string;
  expenseDate?: string;
  paidTo?: string;
  receiptNumber?: string;
}

export interface Branch {
  id: string;
  name: string;
  nameFa: string;
  namePs: string;
  code: string;
  province: string;
  city: string;
  address: string;
  phone: string;
  managerPhone?: string;
  email: string;
  managerName: string;
  tazkiraNumber: string; // Required CNIC or Tazkira national identity number
  isHeadOffice: boolean;
  activeShipmentsCount?: number;
  totalParcelsDispatched?: number;
  totalParcelsReceived?: number;
  totalRevenueAfn?: number;
  createdAt: string;
}

export interface LoginResult {
  success: boolean;
  message?: string;
  errorReason?: 'wrong_portal_staff' | 'wrong_portal_customer' | 'invalid_credentials' | 'not_found';
  user?: User;
}

export interface UserPreferences {
  receiptPrintMode?: 'a4' | 'thermal' | 'auto';
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  branchId: string; // 'all' for super_admin, 'customer' for customers, or specific branch id
  nationalId?: string; // Customer Tazkira / National ID
  tazkiraNumber?: string;
  city?: string;
  address?: string;
  password?: string;
  passwordChangedByBranch?: boolean;
  lastPasswordChange?: string;
  status: 'active' | 'inactive';
  avatar?: string;
  createdAt: string;
  lastLogin?: string;
  preferences?: UserPreferences;
}

export interface StatusHistoryItem {
  id: string;
  status: ShipmentStatus;
  location: string;
  branchName: string;
  timestamp: string;
  note: string;
  updatedBy: string;
  driverName?: string;
  driverPhone?: string;
}

export interface SenderInfo {
  name: string;
  phone: string;
  email?: string;
  nationalId?: string; // Sender's Tazkira / National ID
  receiverTazkira?: string; // Optional: Receiver's Tazkira recorded by sender at booking
  address: string;
  city: string;
  province: string;
}

export interface ReceiverInfo {
  name: string;
  phone: string;
  altPhone?: string;
  nationalId?: string; // Optional: Receiver's Tazkira / National ID
  address: string;
  city: string;
  province: string;
}

export interface PackageDetails {
  category: ParcelCategory;
  weightKg: number;
  pieces: number;
  dimensions?: string; // e.g. 30x20x15 cm
  description: string;
  serviceType: ServiceType;
  isFragile: boolean;
  declaredValueAfn?: number;
}

export interface BillingFinancials {
  productPrice: number; // The product selling price to collect from buyer
  serviceFee: number; // Origin branch service and handling fee
  destBranchCommission: number; // Destination branch commission
  discountAmount: number; // Discount applied to the service fee
  sellerPayout: number; // Net amount payable to the origin seller
  totalAmount: number; // Same as productPrice, kept for compatibility
  amountPaid: number;
  amountDue: number;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  discountReason?: string;
}

export interface BranchRemittanceTransfer {
  id: string;
  batchNumber: string; // e.g. REM-HRT-8921 or STL-8921
  fromBranchId: string; // Destination branch recording the handover
  fromBranchName: string;
  originBranchId?: string; // Origin / Sender branch (e.g. Kabul HQ or Faryab)
  originBranchName?: string;
  destinationBranchId?: string; // Destination branch delivering to receiver (e.g. Herat)
  destinationBranchName?: string;
  toBranchId: string; // Main Branch (Head Office / Central Treasury)
  toBranchName: string;
  parcelIds: string[]; // List of shipment IDs or CNs
  parcelCount: number;
  totalCollectedAfn: number; // Total money collected from receiver (e.g. 100 or 600 AFN)
  destCommissionAfn: number; // Commission kept by receiving branch (e.g. 70 AFN)
  transportationFeeAfn: number; // Logistics transport fee (remitted to HQ/Logistics, NOT kept by destination branch)
  destTotalRetainedAfn: number; // Total kept by receiving branch = destCommission ONLY (no transport fee kept)
  originCommissionAfn?: number; // Commission credited to origin branch if provincial sender (e.g. 20 AFN for Faryab)
  totalCommissionKeptAfn: number; // Total commissions retained across branches (dest + origin)
  netRemittanceAmountAfn: number; // Remaining balance remitted to Main Branch
  paymentMethod: 'hawala' | 'bank_transfer' | 'cash_handover' | 'treasury';
  referenceNumber?: string; // Hawala code, Sarafi voucher, or Bank transaction ID
  transferAgentName?: string; // Sarafi agent name or bank branch
  notes?: string;
  status: 'submitted_to_headoffice' | 'confirmed_by_headoffice' | 'rejected';
  submittedByUserId: string;
  submittedByUserName: string;
  submittedAt: string;
  confirmedByUserId?: string;
  confirmedByUserName?: string;
  confirmedAt?: string;
  confirmationNotes?: string;
}

export interface BranchSettlementRecord {
  id: string;
  shipmentId?: string;
  cnNumber: string;
  originBranchId: string;
  originBranchName?: string;
  destinationBranchId: string;
  destinationBranchName?: string;
  grossCollectedAmount: number; // e.g. 100 AFN
  destBranchCommission: number; // e.g. 30 AFN
  transportationFee: number; // e.g. 20 AFN
  destTotalRetained: number; // e.g. 50 AFN
  originBranchCommission?: number; // e.g. 20 AFN (if provincial sender)
  netRemittedAmount: number; // e.g. 50 AFN or 30 AFN
  settlementChannel: string;
  sarafiReferenceNo?: string;
  sarafiName?: string;
  settlementStatus: 'pending_confirmation' | 'verified_by_headoffice' | 'settled';
  settledByUserName: string;
  settledAt: string;
  notes?: string;
  createdAt: string;
}

export interface Shipment {
  id: string;
  cnNumber: string; // Consignment Note number (e.g. RYN-894201 or RYN-PR-894201)
  originBranchId: string;
  destinationBranchId: string;
  currentBranchId: string;
  sender: SenderInfo;
  receiver: ReceiverInfo;
  packageInfo: PackageDetails;
  financials: BillingFinancials;
  status: ShipmentStatus;
  statusHistory: StatusHistoryItem[];
  isCustomerPrebooked?: boolean;
  isPreBooking?: boolean;
  customerUserId?: string;
  transportationFee?: number;
  destBranchCommission?: number;
  originRemittanceDue?: number;
  remittanceStatus?: 'pending' | 'submitted_to_headoffice' | 'settled' | 'not_applicable';
  remittanceBatchId?: string;
  remittanceSettledAt?: string;
  customerSubmissionAt?: string;
  customerSubmissionReference?: string;
  customerSubmissionBy?: string;
  bookedAt: string;
  estimatedDelivery: string;
  actualDelivery?: string;
  podSignature?: string;
  receiverIdProof?: string;
  deliveryNotes?: string;
  bookedByUserId: string;
  bookedByUserName: string;
  printCount?: number;
  senderPrintCount?: number;
  receiverPrintCount?: number;
  lastPrintedAt?: string;
  lastPrintedBy?: string;
  lastPrintedRole?: 'buyer' | 'seller';
}

export function formatReceiptPhone(phone?: string): string {
  if (!phone) return '';
  let clean = phone.replace(/\D/g, '');
  if (clean.startsWith('93') && clean.length >= 11) {
    clean = '0' + clean.substring(2);
  } else if (!clean.startsWith('0') && clean.startsWith('7') && clean.length === 9) {
    clean = '0' + clean;
  }
  if (clean.length === 10) {
    return `${clean.substring(0, 4)} ${clean.substring(4, 7)} ${clean.substring(7)}`;
  }
  return clean || phone;
}

export interface CustomerPreBookingInput {
  senderName: string;
  senderPhone: string;
  senderEmail?: string;
  senderNationalId?: string;
  senderAddress: string;
  senderCity: string;
  senderProvince: string;
  receiverName: string;
  receiverPhone: string;
  receiverNationalId?: string; // Optional: Tazkira / National ID of receiver
  receiverAddress: string;
  receiverCity: string;
  receiverProvince: string;
  originBranchId: string;
  destinationBranchId: string;
  category: ParcelCategory;
  estimatedWeightKg: number;
  pieces: number;
  description: string;
  productPriceAfn?: number; // Replaced declaredValueAfn
  declaredValueAfn?: number; // Kept for backward compatibility
  isFragile?: boolean;
  paymentPreference: 'pay_at_branch' | 'to_pay';
}

export interface AdminEditShipmentInput {
  productPrice: number;
  serviceFee: number;
  destBranchCommission: number;
  discountAmount: number;
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod;
  weightKg: number;
  pieces: number;
  description: string;
  category: ParcelCategory;
  isFragile: boolean;
  senderName: string;
  senderPhone: string;
  senderAddress?: string;
  senderCity?: string;
  senderProvince?: string;
  senderNationalId?: string;
  receiverName: string;
  receiverPhone: string;
  receiverAddress?: string;
  receiverCity?: string;
  receiverProvince?: string;
  receiverNationalId?: string;
  originBranchId?: string;
  destinationBranchId?: string;
  status?: ShipmentStatus;
  auditNote?: string;
}

export interface AnalyticsSummary {
  totalRevenue: number;
  totalPaid: number;
  totalPending: number;
  totalParcels: number;
  receivedParcels: number;
  inProgressParcels: number;
  deliveredParcels: number;
  returnedParcels: number;
  discountsGiven: number;
  totalExpensesAfn?: number;
  netProfitAfn?: number;
  totalRemittancesPending?: number;
  totalOwedToHeadOffice?: number;
  totalBranchCommissionsEarned?: number;
  totalHeadOfficeSettledRevenue?: number;
  totalPendingHeadOfficeConfirmation?: number;
}

export type ActiveView = 
  | 'dashboard' 
  | 'parcels' 
  | 'booking' 
  | 'expenses' 
  | 'tracking' 
  | 'branches' 
  | 'users' 
  | 'reports' 
  | 'remittances' 
  | 'customer_portal'
  | 'customer_history';

export interface StatusPermissionResult {
  allowed: boolean;
  canUpdate?: boolean;
  roleType?: 'sender_branch' | 'receiver_branch' | 'admin' | 'unauthorized';
  reason?: string;
  allowedStatuses: ShipmentStatus[];
}

export interface AppNotification {
  id: string;
  title: string;
  titleFa: string;
  titlePs: string;
  message: string;
  messageFa: string;
  messagePs: string;
  timestamp: string;
  read: boolean;
  type: 'status_change' | 'new_assignment' | 'dispatch' | 'delivery' | 'payment';
  parcelId?: string;
  cnNumber?: string;
  originBranchId?: string;
  targetBranchId?: string; // specific branch id or 'all'
  targetRoles?: UserRole[];
}

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  title?: string;
  duration?: number;
  timestamp: number;
}


