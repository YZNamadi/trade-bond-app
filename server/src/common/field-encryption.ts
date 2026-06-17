import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

let cachedKey: Buffer | null = null;

function encryptionKey(): Buffer {
  if (cachedKey) return cachedKey;
  const raw = process.env.DATA_ENCRYPTION_KEY;
  if (raw) {
    const buf = Buffer.from(raw, 'base64');
    if (buf.length !== 32) {
      throw new Error('DATA_ENCRYPTION_KEY must be 32 bytes base64');
    }
    cachedKey = buf;
    return buf;
  }
  const isProd = process.env.NODE_ENV === 'production';
  if (isProd) {
    throw new Error('DATA_ENCRYPTION_KEY is required in production');
  }
  const salt = 'trustytrade-dev';
  cachedKey = createHash('sha256').update(salt).digest().subarray(0, 32);
  return cachedKey;
}

export function encryptText(plaintext: string): string {
  const key = encryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ['v1', iv.toString('base64url'), tag.toString('base64url'), enc.toString('base64url')].join('.');
}

export function decryptText(value: string): string | null {
  if (!value) return value;
  if (!value.startsWith('v1.')) return value;
  const [, ivB64, tagB64, dataB64] = value.split('.');
  const iv = Buffer.from(ivB64, 'base64url');
  const tag = Buffer.from(tagB64, 'base64url');
  const data = Buffer.from(dataB64, 'base64url');
  const key = encryptionKey();
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  try {
    const dec = Buffer.concat([decipher.update(data), decipher.final()]);
    return dec.toString('utf8');
  } catch (e: any) {
    if (process.env.NODE_ENV === 'production') {
      throw e;
    }
    return null;
  }
}

export const EncryptedTextTransformer = {
  to(value: unknown) {
    if (value === null || value === undefined) return value as any;
    const str = String(value);
    return encryptText(str);
  },
  from(value: unknown) {
    if (value === null || value === undefined) return value as any;
    return decryptText(String(value));
  },
};
