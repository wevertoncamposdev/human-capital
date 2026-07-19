const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

const CHAR_TO_VALUE: Record<string, number> = ALPHABET.split('').reduce(
  (acc, char, index) => {
    acc[char] = index;
    return acc;
  },
  {} as Record<string, number>,
);

export function base32Encode(data: Buffer) {
  let bits = 0;
  let value = 0;
  let output = '';

  for (const byte of data) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

export function base32Decode(value: string) {
  const input = value.toUpperCase().replace(/=+$/g, '');
  let bits = 0;
  let buffer = 0;
  const output: number[] = [];

  for (const char of input) {
    if (char === ' ' || char === '-') continue;
    const v = CHAR_TO_VALUE[char];
    if (v === undefined) {
      throw new Error('Invalid base32 character');
    }
    buffer = (buffer << 5) | v;
    bits += 5;
    if (bits >= 8) {
      output.push((buffer >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(output);
}

