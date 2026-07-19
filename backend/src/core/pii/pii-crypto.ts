import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'crypto';

export type EncryptedPayload = {
  dataEnc: Uint8Array<ArrayBuffer>;
  iv: Uint8Array<ArrayBuffer>;
  tag: Uint8Array<ArrayBuffer>;
};

export function parseMasterKey(masterKey: string): Buffer {
  const trimmed = masterKey.trim();
  if (!trimmed) {
    throw new Error('PII_MASTER_KEY is not set');
  }
  let bytes: Buffer;
  try {
    bytes = Buffer.from(trimmed, 'base64');
  } catch {
    throw new Error('PII_MASTER_KEY must be base64');
  }
  if (bytes.length < 32) {
    throw new Error('PII_MASTER_KEY must be at least 32 bytes (base64)');
  }
  return bytes;
}

export function deriveTenantKey(masterKey: Buffer, tenantId: string): Buffer {
  const salt = Buffer.from(tenantId, 'utf8');
  const info = Buffer.from('terceirogestor:pii:v1', 'utf8');
  return Buffer.from(hkdfSync('sha256', masterKey, salt, info, 32));
}

export function encryptJson(key: Buffer, payload: unknown): EncryptedPayload {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const input = Buffer.from(JSON.stringify(payload), 'utf8');
  const dataEnc = Buffer.concat([cipher.update(input), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    dataEnc: Uint8Array.from(dataEnc),
    iv: Uint8Array.from(iv),
    tag: Uint8Array.from(tag),
  };
}

export function decryptJson<T>(
  key: Buffer,
  encrypted: EncryptedPayload,
): T {
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(encrypted.iv));
  decipher.setAuthTag(Buffer.from(encrypted.tag));
  const plain = Buffer.concat([
    decipher.update(Buffer.from(encrypted.dataEnc)),
    decipher.final(),
  ]);
  return JSON.parse(plain.toString('utf8')) as T;
}
