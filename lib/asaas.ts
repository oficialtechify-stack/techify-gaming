/**
 * Legacy provider disabled.
 * New marketplace payments and transfers must use Stripe Connect APIs under
 * /api/stripe. This module intentionally performs no network requests; these
 * exports remain only so retired Express handlers still type-check until they
 * are removed in a later cleanup.
 */
const retired = (): Error => new Error('ASAAS_RETIRED: use Stripe Connect.');

export function getAsaasConfig(): { apiUrl: string; apiKey: string; isSandbox: boolean } {
  return { apiUrl: '', apiKey: '', isSandbox: false };
}

export function getHeaders(_apiKey?: string): Record<string, string> {
  return { 'Content-Type': 'application/json' };
}

export async function getOrCreateCustomer(..._args: any[]): Promise<any> { throw retired(); }
export async function createPixPayment(..._args: any[]): Promise<any> { throw retired(); }
export async function createCreditCardPayment(..._args: any[]): Promise<any> { throw retired(); }
export async function createBoletoPayment(..._args: any[]): Promise<any> { throw retired(); }
export async function createAsaasSubaccount(..._args: any[]): Promise<any> { throw retired(); }
export async function createAsaasPayment(..._args: any[]): Promise<any> { throw retired(); }
export function cleanDocument(value?: string | number | null): string { return String(value || '').replace(/\D/g, '').trim(); }
