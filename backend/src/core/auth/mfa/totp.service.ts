import { Injectable } from '@nestjs/common';
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { base32Decode, base32Encode } from './base32';

type TotpVerifyOptions = {
  stepSeconds?: number;
  digits?: number;
  window?: number;
  now?: Date;
};

@Injectable()
export class TotpService {
  generateSecret(bytes = 20) {
    return base32Encode(randomBytes(bytes));
  }

  buildOtpauthUrl(params: {
    issuer: string;
    accountName: string;
    secret: string;
  }) {
    const issuer = encodeURIComponent(params.issuer);
    const accountName = encodeURIComponent(params.accountName);
    const secret = encodeURIComponent(params.secret);
    return `otpauth://totp/${issuer}:${accountName}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;
  }

  verifyCode(secretBase32: string, code: string, options?: TotpVerifyOptions) {
    const stepSeconds = options?.stepSeconds ?? 30;
    const digits = options?.digits ?? 6;
    const window = options?.window ?? 1;
    const now = options?.now ?? new Date();

    const normalized = String(code).replace(/\s+/g, '');
    if (!/^\d{6}$/.test(normalized)) return false;

    const secret = base32Decode(secretBase32);
    const counter = Math.floor(now.getTime() / 1000 / stepSeconds);

    const expectedList: string[] = [];
    for (let offset = -window; offset <= window; offset += 1) {
      expectedList.push(this.hotp(secret, counter + offset, digits));
    }

    const input = Buffer.from(normalized, 'utf8');
    for (const expected of expectedList) {
      const expectedBuf = Buffer.from(expected, 'utf8');
      if (
        input.length === expectedBuf.length &&
        timingSafeEqual(input, expectedBuf)
      ) {
        return true;
      }
    }
    return false;
  }

  private hotp(secret: Buffer, counter: number, digits: number) {
    const buffer = Buffer.alloc(8);
    buffer.writeBigUInt64BE(BigInt(counter));

    const hmac = createHmac('sha1', secret).update(buffer).digest();
    const offset = hmac[hmac.length - 1] & 0x0f;
    const code = (hmac.readUInt32BE(offset) & 0x7fffffff) % 10 ** digits;
    return String(code).padStart(digits, '0');
  }
}

