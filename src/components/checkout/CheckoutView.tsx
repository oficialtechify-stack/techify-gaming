import React from 'react';
import { CustomCheckoutPage } from './CustomCheckoutPage';
import { CompanyPlan, SaleTransaction } from '../../types/platform';

interface CheckoutViewProps {
  plan: CompanyPlan;
  checkoutSlug?: string;
  affiliateRef?: string;
  apiKey?: string;
  onBack?: () => void;
  onPaymentSuccess?: (transaction: SaleTransaction) => void;
}

export const CheckoutView: React.FC<CheckoutViewProps> = (props) => {
  return <CustomCheckoutPage {...props} />;
};

export default CheckoutView;
export { CustomCheckoutPage };
