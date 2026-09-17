import React from 'react';
import { CombinedBranchReceiptModal, CombinedBranchReceiptModalProps } from './CombinedBranchReceiptModal';

export interface CombinedCustomerReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedCustomerPhone?: string;
  preselectedBranchId?: string;
  initialSelectedShipmentIds?: string[];
}

export const CombinedCustomerReceiptModal: React.FC<CombinedCustomerReceiptModalProps> = (props) => {
  return <CombinedBranchReceiptModal {...props} />;
};

export default CombinedCustomerReceiptModal;
