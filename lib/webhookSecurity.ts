import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

function isPrivateIpv4(address: string): boolean {
  const parts = address.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return true;
  const [a, b] = parts;

  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

function isPrivateIpv6(address: string): boolean {
  const value = address.toLowerCase().split('%')[0];
  if (value === '::' || value === '::1') return true;
  if (value.startsWith('fc') || value.startsWith('fd')) return true;
  if (/^fe[89ab]/.test(value)) return true;
  if (value.startsWith('ff')) return true;

  const mapped = value.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  return mapped ? isPrivateIpv4(mapped[1]) : false;
}

export function isPrivateNetworkAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) return isPrivateIpv4(address);
  if (family === 6) return isPrivateIpv6(address);
  return true;
}

export async function assertSafeWebhookUrl(rawValue: unknown): Promise<string> {
  const raw = String(rawValue || '').trim();
  if (!raw) throw new Error('WEBHOOK_URL_REQUIRED');

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('WEBHOOK_URL_INVALID');
  }

  if (url.protocol !== 'https:' || url.username || url.password) {
    throw new Error('WEBHOOK_URL_INVALID');
  }

  const hostname = url.hostname.toLowerCase().replace(/\.$/, '');
  if (
    !hostname ||
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal')
  ) {
    throw new Error('WEBHOOK_URL_PRIVATE');
  }

  if (isIP(hostname)) {
    if (isPrivateNetworkAddress(hostname)) throw new Error('WEBHOOK_URL_PRIVATE');
  } else {
    let addresses: Array<{ address: string; family: number }> = [];
    try {
      addresses = await lookup(hostname, { all: true, verbatim: true }) as Array<{ address: string; family: number }>;
    } catch {
      throw new Error('WEBHOOK_URL_UNRESOLVED');
    }

    if (!addresses.length || addresses.some((entry) => isPrivateNetworkAddress(entry.address))) {
      throw new Error('WEBHOOK_URL_PRIVATE');
    }
  }

  url.hash = '';
  return url.toString().slice(0, 3000);
}

export function webhookUrlErrorMessage(error: unknown): string {
  const code = error instanceof Error ? error.message : '';
  if (code === 'WEBHOOK_URL_REQUIRED') return 'Informe a URL HTTPS do webhook.';
  if (code === 'WEBHOOK_URL_PRIVATE') return 'O webhook não pode apontar para localhost, rede privada ou endereço interno.';
  if (code === 'WEBHOOK_URL_UNRESOLVED') return 'O domínio do webhook não pôde ser resolvido publicamente.';
  return 'O webhook precisa usar uma URL HTTPS pública válida.';
}
