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
  email: string;
  managerName: string;
  isHeadOffice: boolean;
  activeShipmentsCount?: number;
  totalParcelsDispatched?: number;
  totalParcelsReceived?: number;
  totalRevenueAfn?: number;
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  branchId: string; // 'all' for super_admin, 'customer' for customers, or specific branch id
  password?: string;
  passwordChangedByBranch?: boolean;
  lastPasswordChange?: string;
  status: 'active' | 'inactive';
  avatar?: string;
  createdAt: string;
  lastLogin?: string;
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
  nationalId?: string;
  address: string;
  city: string;
  province: string;
}

export interface ReceiverInfo {
  name: string;
  phone: string;
  altPhone?: string;
  address: string;
  city: string;
  province: string;
}

export interface PackageDetails {
  category: ParcelCategory;
  weightKg: number;
  pieces: number;
  dimensions?: string; // e.g. 30x20x15 cm
  declaredValueAfn: number;
  description: string;
  serviceType: ServiceType;
  isFragile: boolean;
}

export interface BillingFinancials {
  baseRate: number;
  weightCost: number;
  transportationFee?: number; // Transportation/cargo freight fee added by branch
  destBranchCommission?: number; // Commission kept by receiving destination branch
  originRemittanceDue?: number; // Amount remitted back to origin branch after commission
  serviceFee: number;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  discountAmount: number;
  tax: number;
  totalAmount: number;
  amountPaid: number;
  amountDue: number;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  discountReason?: string;
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
  customerUserId?: string;
  transportationFee?: number;
  destBranchCommission?: number;
  originRemittanceDue?: number;
  remittanceStatus?: 'pending' | 'settled' | 'not_applicable';
  bookedAt: string;
  estimatedDelivery: string;
  actualDelivery?: string;
  podSignature?: string;
  receiverIdProof?: string;
  deliveryNotes?: string;
  bookedByUserId: string;
  bookedByUserName: string;
}

export interface CustomerPreBookingInput {
  senderName: string;
  senderPhone: string;
  senderEmail?: string;
  senderAddress: string;
  senderCity: string;
  senderProvince: string;
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
  receiverCity: string;
  receiverProvince: string;
  originBranchId: string;
  destinationBranchId: string;
  category: ParcelCategory;
  estimatedWeightKg: number;
  pieces: number;
  description: string;
  declaredValueAfn?: number;
  isFragile?: boolean;
  paymentPreference: 'pay_at_branch' | 'to_pay';
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
}
