function onlyDigits(value: string) {
  return value.replaceAll(/\D/g, '');
}

export function normalizeCpfOrNull(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const digits = onlyDigits(trimmed);
  if (digits.length !== 11) {
    return null;
  }
  return digits;
}

export function isValidCpfDigits(cpfDigits: string) {
  if (!/^\d{11}$/.test(cpfDigits)) return false;
  if (/^(\d)\1{10}$/.test(cpfDigits)) return false;

  const nums = cpfDigits.split('').map((d) => Number(d));
  const calc = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i += 1) {
      sum += nums[i] * (len + 1 - i);
    }
    const mod = sum % 11;
    return mod < 2 ? 0 : 11 - mod;
  };
  const d1 = calc(9);
  const d2 = calc(10);
  return nums[9] === d1 && nums[10] === d2;
}

