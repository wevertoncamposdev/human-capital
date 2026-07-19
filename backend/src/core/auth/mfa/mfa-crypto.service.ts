import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

function parseKey(value: string) {
  const trimmed = value.trim();
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return Buffer.from(trimmed, 'hex');
  }
  const asB64 = Buffer.from(trimmed, 'base64');
  if (asB64.length === 32) return asB64;
  throw new Error('Invalid encryption key format');
}

@Injectable()
export class MfaCryptoService {
  constructor(private readonly config: ConfigService) {}

  private getKey() {
    const fromEnv = this.config.get<string>('TOTP_ENCRYPTION_KEY');
    if (fromEnv) return parseKey(fromEnv);

    const fallback = this.config.get<string>('JWT_SECRET');
    if (!fallback) {
      throw new Error('TOTP_ENCRYPTION_KEY is not set');
    }
    // Dev-friendly fallback (still deterministic) to avoid breaking local setups.
    console.warn(
      '[mfa] TOTP_ENCRYPTION_KEY is not set. Falling back to sha256(JWT_SECRET). Set TOTP_ENCRYPTION_KEY for better security.',
    );
    return createHash('sha256').update(fallback).digest();
  }

  encryptToString(plainText: string) {
    const key = this.getKey();
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const ciphertext = Buffer.concat([
      cipher.update(plainText, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();

    return `v1.${iv.toString('base64')}.${ciphertext.toString('base64')}.${tag.toString('base64')}`;
  }

  decryptFromString(payload: string) {
    const [version, ivB64, dataB64, tagB64] = payload.split('.');
    if (version !== 'v1' || !ivB64 || !dataB64 || !tagB64) {
      throw new Error('Invalid encrypted payload format');
    }
    const key = this.getKey();
    const iv = Buffer.from(ivB64, 'base64');
    const data = Buffer.from(dataB64, 'base64');
    const tag = Buffer.from(tagB64, 'base64');

    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    const plain = Buffer.concat([decipher.update(data), decipher.final()]);
    return plain.toString('utf8');
  }
}

