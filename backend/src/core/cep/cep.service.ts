import { BadRequestException, Injectable } from '@nestjs/common';

export type CepLookupResult = {
  cep: string; // digits only
  formattedCep: string;
  street: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  ibge: string | null;
  gia: string | null;
  ddd: string | null;
  siafi: string | null;
};

type ViaCepResponse = {
  cep?: string;
  logradouro?: string;
  complemento?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  ibge?: string;
  gia?: string;
  ddd?: string;
  siafi?: string;
  erro?: boolean;
};

function normalizeCepDigits(input: string) {
  const digits = input.replaceAll(/\D/g, '');
  if (digits.length !== 8) {
    throw new BadRequestException('CEP inválido.');
  }
  return digits;
}

function formatCep(digits: string) {
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

function toTrimmedOrNull(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

@Injectable()
export class CepService {
  async lookup(cepInput: string): Promise<CepLookupResult> {
    const cep = normalizeCepDigits(cepInput);
    const url = `https://viacep.com.br/ws/${encodeURIComponent(cep)}/json/`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) {
        throw new BadRequestException('Falha ao validar CEP.');
      }
      const data = (await response.json()) as ViaCepResponse;
      if (!data || data.erro) {
        throw new BadRequestException('CEP não encontrado.');
      }

      const state = toTrimmedOrNull(data.uf);
      if (state && state.length !== 2) {
        throw new BadRequestException('CEP inválido.');
      }

      return {
        cep,
        formattedCep: formatCep(cep),
        street: toTrimmedOrNull(data.logradouro),
        neighborhood: toTrimmedOrNull(data.bairro),
        city: toTrimmedOrNull(data.localidade),
        state,
        ibge: toTrimmedOrNull(data.ibge),
        gia: toTrimmedOrNull(data.gia),
        ddd: toTrimmedOrNull(data.ddd),
        siafi: toTrimmedOrNull(data.siafi),
      };
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        throw new BadRequestException('Timeout ao validar CEP.');
      }
      throw error instanceof BadRequestException
        ? error
        : new BadRequestException('Falha ao validar CEP.');
    } finally {
      clearTimeout(timeout);
    }
  }
}
