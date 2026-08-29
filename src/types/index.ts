export type UserRole = 'super_admin' | 'branch_manager';

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
  | 'booked' 
  | 'in_transit' 
  | 'received_at_branch' 
  | 'out_for_delivery' 
  | 'delivered' 
  | 'returned' 
  | 'cancelled';

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
  branchId: string; // 'all' for super_admin, or specific branch id
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
  cnNumber: string; // Consignment Note number (e.g. DHS-894021)
  originBranchId: string;
  destinationBranchId: string;
  currentBranchId: string;
  sender: SenderInfo;
  receiver: ReceiverInfo;
  packageInfo: PackageDetails;
  financials: BillingFinancials;
  status: ShipmentStatus;
  statusHistory: StatusHistoryItem[];
  bookedAt: string;
  estimatedDelivery: string;
  actualDelivery?: string;
  podSignature?: string;
  receiverIdProof?: string;
  deliveryNotes?: string;
  bookedByUserId: string;
  bookedByUserName: string;
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
}
