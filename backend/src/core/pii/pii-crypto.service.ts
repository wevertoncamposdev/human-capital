import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  decryptJson,
  deriveTenantKey,
  encryptJson,
  parseMasterKey,
  type EncryptedPayload,
} from './pii-crypto';

@Injectable()
export class PiiCryptoService {
  private masterKey: Buffer | null = null;

  constructor(private readonly config: ConfigService) {}

  private getMasterKey() {
    if (!this.masterKey) {
      const raw = this.config.get<string>('PII_MASTER_KEY') ?? '';
      this.masterKey = parseMasterKey(raw);
    }
    return this.masterKey;
  }

  encryptForTenant(tenantId: string, payload: unknown): EncryptedPayload {
    const key = deriveTenantKey(this.getMasterKey(), tenantId);
    return encryptJson(key, payload);
  }

  decryptForTenant<T>(tenantId: string, encrypted: EncryptedPayload): T {
    const key = deriveTenantKey(this.getMasterKey(), tenantId);
    return decryptJson<T>(key, encrypted);
  }
}

