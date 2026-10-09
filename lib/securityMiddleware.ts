import type { NextFunction, Request, Response } from 'express';

const BLOCKED_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

function hasUnsafeKeys(value: unknown, depth = 0): boolean {
  if (depth > 12) return true;
  if (!value || typeof value !== 'object') return false;
  if (Array.isArray(value)) return value.some((item) => hasUnsafeKeys(item, depth + 1));

  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (
      BLOCKED_KEYS.has(key) ||
      key.startsWith('$') ||
      key.includes('\0')
    ) {
      return true;
    }
    if (hasUnsafeKeys(child, depth + 1)) return true;
  }
  return false;
}

export function applySecurityHeaders(_req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(self), microphone=(self), geolocation=(), payment=(self)');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'self'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data: https:",
      "style-src 'self' 'unsafe-inline' https:",
      "script-src 'self' 'unsafe-inline' https://js.stripe.com https://www.gstatic.com",
      "connect-src 'self' https://api.stripe.com https://*.googleapis.com https://*.firebaseio.com https://*.firebaseapp.com https://*.google.com wss://*.firebaseio.com",
      "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://*.firebaseapp.com https://*.google.com https://play.workadventu.re https://*.workadventu.re",
      "form-action 'self' https://checkout.stripe.com",
      "upgrade-insecure-requests",
    ].join('; '),
  );
  next();
}

export function rejectUnsafeJsonPayload(req: Request, res: Response, next: NextFunction) {
  if (!req.body || typeof req.body !== 'object') return next();
  if (!hasUnsafeKeys(req.body)) return next();

  return res.status(400).json({
    error: true,
    code: 'UNSAFE_PAYLOAD',
    message: 'A requisição contém campos não permitidos.',
  });
}
