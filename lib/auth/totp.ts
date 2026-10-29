/**
 * RFC 6238 Time-Based One-Time Password (TOTP)
 * Compatible with Google Authenticator, Microsoft Authenticator, Authy, Apple Passwords & 1Password
 */

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Decode(str: string): Uint8Array {
  const cleaned = str.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0;
  let value = 0;
  let index = 0;
  const output = new Uint8Array(Math.floor((cleaned.length * 5) / 8));

  for (let i = 0; i < cleaned.length; i++) {
    const val = BASE32_ALPHABET.indexOf(cleaned[i]);
    if (val === -1) continue;
    value = (value << 5) | val;
    bits += 5;
    if (bits >= 8) {
      output[index++] = (value >>> (bits - 8)) & 255;
      bits -= 8;
    }
  }
  return output;
}

export function generateRandomSecret(length = 16): string {
  let secret = '';
  const randomBytes = new Uint8Array(length);
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    window.crypto.getRandomValues(randomBytes);
  } else {
    for (let i = 0; i < length; i++) {
      randomBytes[i] = Math.floor(Math.random() * 256);
    }
  }
  for (let i = 0; i < length; i++) {
    secret += BASE32_ALPHABET[randomBytes[i] % BASE32_ALPHABET.length];
  }
  return secret;
}

export function getOtpAuthUri(email: string, secret: string, issuer = 'OmniFinance'): string {
  const cleanEmail = encodeURIComponent(email.trim().toLowerCase());
  const cleanIssuer = encodeURIComponent(issuer);
  return `otpauth://totp/${cleanIssuer}:${cleanEmail}?secret=${secret}&issuer=${cleanIssuer}&algorithm=SHA1&digits=6&period=30`;
}

export function getQrCodeImageUrl(otpauthUri: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(otpauthUri)}&margin=10`;
}

export async function computeTotp(secret: string, timeStepOffset = 0): Promise<string> {
  const epoch = Math.floor(Date.now() / 1000);
  const timeStep = 30;
  const counter = Math.floor(epoch / timeStep) + timeStepOffset;

  const counterBuffer = new ArrayBuffer(8);
  const counterView = new DataView(counterBuffer);
  counterView.setUint32(0, Math.floor(counter / 0x100000000), false);
  counterView.setUint32(4, counter >>> 0, false);

  const keyBytes = base32Decode(secret);

  let signature: ArrayBuffer;
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    const cryptoKey = await window.crypto.subtle.importKey(
      'raw',
      keyBytes as unknown as BufferSource,
      { name: 'HMAC', hash: { name: 'SHA-1' } },
      false,
      ['sign']
    );
    signature = await window.crypto.subtle.sign('HMAC', cryptoKey, counterBuffer);
  } else {
    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha1', Buffer.from(keyBytes));
    hmac.update(Buffer.from(counterBuffer));
    signature = hmac.digest();
  }

  const hmacBytes = new Uint8Array(signature);
  const offset = hmacBytes[hmacBytes.length - 1] & 0x0f;
  const code =
    ((hmacBytes[offset] & 0x7f) << 24) |
    ((hmacBytes[offset + 1] & 0xff) << 16) |
    ((hmacBytes[offset + 2] & 0xff) << 8) |
    (hmacBytes[offset + 3] & 0xff);

  return (code % 1000000).toString().padStart(6, '0');
}

export async function verifyTotp(secret: string, inputCode: string): Promise<boolean> {
  const cleanCode = inputCode.replace(/\s+/g, '').trim();
  if (cleanCode.length !== 6) return false;

  // Window check: ±2 time steps (±60 seconds) for network latency, human entry delay, and phone clock drift
  for (const offset of [0, -1, 1, -2, 2]) {
    const expected = await computeTotp(secret, offset);
    if (expected === cleanCode) {
      return true;
    }
  }
  return false;
}

// Default Master Secret for OmniFinance Organization (Valid RFC 3548 Base32)
export const DEFAULT_MASTER_TOTP_SECRET = 'OMNIFINANCEKEY26';

// Persistent vault storage for company / executive shared secret
const STORAGE_PREFIX = 'omnifinance_totp_secret_';

export function getStoredTotpSecret(email?: string): string {
  // 1. Check environment variable override (e.g. configured in Vercel / Netlify)
  if (process.env.NEXT_PUBLIC_MASTER_2FA_SECRET) {
    return process.env.NEXT_PUBLIC_MASTER_2FA_SECRET.trim().toUpperCase();
  }

  // 2. Check if a customized secret exists in browser storage
  if (typeof window !== 'undefined') {
    if (email) {
      const key = `${STORAGE_PREFIX}${email.trim().toLowerCase()}`;
      const userSecret = localStorage.getItem(key);
      if (userSecret && userSecret.trim().length >= 16) {
        return userSecret.trim().toUpperCase();
      }
    }
    const globalSecret = localStorage.getItem('omnifinance_global_totp_secret');
    if (globalSecret && globalSecret.trim().length >= 16) {
      return globalSecret.trim().toUpperCase();
    }
  }

  // 3. Fallback to permanent master key so all live domains & devices share it seamlessly
  return DEFAULT_MASTER_TOTP_SECRET;
}

export function saveStoredTotpSecret(email: string, secret: string): void {
  if (typeof window === 'undefined') return;
  const key = `${STORAGE_PREFIX}${email.trim().toLowerCase()}`;
  localStorage.setItem(key, secret.trim().toUpperCase());
  // Also keep a shared fallback so both you and your boss can use the company secret
  localStorage.setItem('omnifinance_global_totp_secret', secret.trim().toUpperCase());
}

export function removeStoredTotpSecret(email: string): void {
  if (typeof window === 'undefined') return;
  const key = `${STORAGE_PREFIX}${email.trim().toLowerCase()}`;
  localStorage.removeItem(key);
  localStorage.removeItem('omnifinance_global_totp_secret');
}
