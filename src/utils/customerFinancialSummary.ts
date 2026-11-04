import { SellerPayoutStatus, Shipment } from '../types';

export interface CustomerFinancialSummary {
  totalParcelValueAfn: number;
  totalPayableAfn: number;
  totalReceivedAfn: number;
  remainingWithArmaghanAfn: number;
  totalParcelsCount: number;
  deliveredCount: number;
  activeCount: number;
}

const toMoney = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
};

export const getCustomerParcelValue = (shipment: Shipment): number => {
  const productPrice = shipment.financials?.productPrice;
  if (typeof productPrice === 'number' && Number.isFinite(productPrice)) {
    return toMoney(productPrice);
  }

  return toMoney(shipment.packageInfo?.declaredValueAfn);
};

export const getCustomerNetPayout = (shipment: Shipment): number => {
  const recordedPayout = shipment.financials?.sellerPayout;
  if (typeof recordedPayout === 'number' && Number.isFinite(recordedPayout)) {
    return toMoney(recordedPayout);
  }

  const productPrice = getCustomerParcelValue(shipment);
  const destinationCommission = toMoney(
    shipment.destBranchCommission ?? shipment.financials?.destBranchCommission
  );
  const serviceFee = toMoney(
    shipment.financials?.serviceFee ?? shipment.transportationFee
  );
  const discount = toMoney(shipment.financials?.discountAmount);

  return Math.max(0, productPrice - destinationCommission - serviceFee + discount);
};

export const getCustomerPayoutStatus = (shipment: Shipment): SellerPayoutStatus => {
  if (shipment.sellerPayoutStatus) return shipment.sellerPayoutStatus;
  return shipment.status === 'delivered' ? 'ready_for_payout' : 'pending_delivery';
};

export const calculateCustomerFinancialSummary = (
  shipments: Shipment[]
): CustomerFinancialSummary => {
  const financialShipments = shipments.filter(shipment => shipment.status !== 'cancelled');

  const totalParcelValueAfn = financialShipments.reduce(
    (sum, shipment) => sum + getCustomerParcelValue(shipment),
    0
  );

  const totalPayableAfn = financialShipments.reduce(
    (sum, shipment) => sum + getCustomerNetPayout(shipment),
    0
  );

  // Customer confirmation is the authoritative proof that cash/hawala was received.
  // A branch-only disbursement remains outstanding until the customer confirms it.
  const totalReceivedAfn = financialShipments.reduce((sum, shipment) => {
    const isConfirmed =
      getCustomerPayoutStatus(shipment) === 'confirmed_by_customer' ||
      Boolean(shipment.sellerPayoutConfirmedAt);

    return isConfirmed ? sum + getCustomerNetPayout(shipment) : sum;
  }, 0);

  return {
    totalParcelValueAfn,
    totalPayableAfn,
    totalReceivedAfn,
    remainingWithArmaghanAfn: Math.max(0, totalPayableAfn - totalReceivedAfn),
    totalParcelsCount: shipments.length,
    deliveredCount: shipments.filter(shipment => shipment.status === 'delivered').length,
    activeCount: shipments.filter(
      shipment => shipment.status !== 'delivered' && shipment.status !== 'cancelled'
    ).length
  };
};
