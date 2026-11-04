import { Shipment } from '../types';

export type ParcelPaymentCategory =
  | 'not_due'
  | 'awaiting_lock'
  | 'branch_locked'
  | 'remittance_sent'
  | 'hq_received'
  | 'sender_paid'
  | 'disputed';

export const PAYMENT_CATEGORY_ORDER: ParcelPaymentCategory[] = [
  'not_due',
  'awaiting_lock',
  'branch_locked',
  'remittance_sent',
  'hq_received',
  'sender_paid',
  'disputed'
];

export const getParcelPaymentCategory = (shipment: Shipment): ParcelPaymentCategory => {
  if (shipment.sellerPayoutStatus === 'disputed') return 'disputed';

  if (
    shipment.sellerPayoutStatus === 'disbursed_by_branch' ||
    shipment.sellerPayoutStatus === 'confirmed_by_customer'
  ) {
    return 'sender_paid';
  }

  if (shipment.status !== 'delivered') return 'not_due';
  if (shipment.remittanceStatus === 'settled') return 'hq_received';
  if (shipment.remittanceStatus === 'submitted_to_headoffice') return 'remittance_sent';

  const settlement = shipment.paymentSettlement || shipment.financials?.paymentSettlement;
  if (settlement?.locked) return 'branch_locked';

  return 'awaiting_lock';
};
