import { decryptJson, deriveTenantKey, encryptJson, parseMasterKey } from './pii-crypto';

describe('pii-crypto', () => {
  it('encrypts and decrypts JSON payloads', () => {
    const master = parseMasterKey(Buffer.alloc(32, 7).toString('base64'));
    const key = deriveTenantKey(master, 'tenant-123');

    const payload = { cpf: '12345678901', rg: 'MG-12.345.678', nis: null };
    const encrypted = encryptJson(key, payload);
    const decrypted = decryptJson<typeof payload>(key, encrypted);

    expect(decrypted).toEqual(payload);
  });

  it('rejects tampered ciphertext', () => {
    const master = parseMasterKey(Buffer.alloc(32, 8).toString('base64'));
    const key = deriveTenantKey(master, 'tenant-456');

    const payload = { ok: true };
    const encrypted = encryptJson(key, payload);
    encrypted.tag = Buffer.from(encrypted.tag);
    encrypted.tag[0] ^= 0xff;

    expect(() => decryptJson(key, encrypted)).toThrow();
  });
});

