export interface AgencyOSWebhookPayload {
  event: 'sale.approved' | 'company.activated' | 'affiliate.commission' | 'balance.updated';
  timestamp: string;
  agency_id: string; // ID da empresa/agência cadastrada no AgencyOS
  data: {
    transaction_id: string;
    product_id?: string;
    product_name?: string;
    amount: number;
    net_amount: number;
    payment_method: 'pix' | 'credit_card' | 'boleto';
    customer?: {
      name: string;
      email: string;
      cpf_cnpj?: string;
    };
    affiliate?: {
      affiliate_id: string;
      name: string;
      commission_amount: number;
    };
    company_plan?: {
      plan_id: string;
      plan_name: string;
      status: 'active' | 'pending' | 'canceled';
    };
  };
}

export interface AgencyOSWebhookConfig {
  webhookUrl: string;
  secretToken: string;
  agency_id: string;
  enabled: boolean;
  events: string[];
  updatedAt?: string;
  updatedBy?: string;
  lastTestStatus?: 'success' | 'error' | null;
  lastTestAt?: string | null;
  lastTestResponse?: string | null;
}

export interface AgencyOSWebhookLog {
  id: string;
  event: string;
  agency_id: string;
  timestamp: string;
  payload: AgencyOSWebhookPayload;
  statusCode: number;
  status: 'success' | 'error';
  errorMessage?: string | null;
  responseBody?: string | null;
  createdAt: string;
}

export const AGENCY_OS_AUTHORIZED_EMAILS = [
  'agencyosoficial@gmail.com',
  'rickmarketing81@gmail.com',
  'aigerakabane81983521523@gmail.com',
  'techify@gmail.com',
  'admin@leadspay.com'
];

export function isAgencyOSAuthorized(email?: string | null): boolean {
  return true;
}

