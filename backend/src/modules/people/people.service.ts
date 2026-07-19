import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { isEmail } from 'class-validator';
import type {
  Prisma,
  HouseholdTransferType,
  IncomeFrequency,
  PersonFinancialEntryType,
} from '../../generated/prisma';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CepService } from '../../core/cep/cep.service';
import { RequestContextService } from '../../core/request-context/request-context.service';
import { PiiCryptoService } from '../../core/pii/pii-crypto.service';
import { parseDateInput } from '../../core/utils/dates';
import { isValidCpfDigits, normalizeCpfOrNull } from '../../core/utils/cpf';
import {
  buildPaginationMeta,
  resolvePagination,
} from '../../core/utils/pagination';
import { normalizeString } from '../../core/utils/strings';
import { CreateHouseholdAssetDto } from './dto/create-household-asset.dto';
import { CreatePersonAssetDto } from './dto/create-person-asset.dto';
import { CreatePersonAttachmentDto } from './dto/create-person-attachment.dto';
import { CreatePersonCommentDto } from './dto/create-person-comment.dto';
import { CreatePersonRecordAttachmentDto } from './dto/create-person-record-attachment.dto';
import { CreatePersonRecordCommentDto } from './dto/create-person-record-comment.dto';
import { CreatePersonDto } from './dto/create-person.dto';
import { CreatePersonExpenseDto } from './dto/create-person-expense.dto';
import { CreatePersonFinancialEntryDto } from './dto/create-person-financial-entry.dto';
import { CreatePersonHealthConditionDto } from './dto/create-person-health-condition.dto';
import { CreatePersonIncomeDto } from './dto/create-person-income.dto';
import { CreatePersonMedicationDto } from './dto/create-person-medication.dto';
import { CreatePersonRelationDto } from './dto/create-person-relation.dto';
import { CreateHouseholdTransferDto } from './dto/create-household-transfer.dto';
import { CreatePersonContactDto } from './dto/create-person-contact.dto';
import { CreatePersonEducationDto } from './dto/create-person-education.dto';
import { CreatePersonBenefitDto } from './dto/create-person-benefit.dto';
import { CreatePersonDetentionDto } from './dto/create-person-detention.dto';
import { ListPeopleQueryDto } from './dto/list-people-query.dto';
import { UpdateHouseholdAssetDto } from './dto/update-household-asset.dto';
import { UpsertHouseholdProfileDto } from './dto/upsert-household-profile.dto';
import { UpdatePersonAssetDto } from './dto/update-person-asset.dto';
import { UpdatePersonContactDto } from './dto/update-person-contact.dto';
import { UpdatePersonExpenseDto } from './dto/update-person-expense.dto';
import { UpdatePersonFinancialEntryDto } from './dto/update-person-financial-entry.dto';
import { UpdatePersonHealthConditionDto } from './dto/update-person-health-condition.dto';
import { UpdatePersonIncomeDto } from './dto/update-person-income.dto';
import { UpdatePersonMedicationDto } from './dto/update-person-medication.dto';
import { UpdatePersonDto } from './dto/update-person.dto';
import { UpsertPersonSensitiveDocumentsDto } from './dto/upsert-person-sensitive-documents.dto';
import { UpdateHouseholdTransferDto } from './dto/update-household-transfer.dto';
import { UpdatePersonEducationDto } from './dto/update-person-education.dto';
import { UpdatePersonBenefitDto } from './dto/update-person-benefit.dto';
import { UpdatePersonDetentionDto } from './dto/update-person-detention.dto';
import { UpdatePersonRelationDto } from './dto/update-person-relation.dto';
import {
  buildPeopleOrderBy,
  buildPeopleWhere,
  parseAdvancedFilters,
  parseGrouping,
} from './people.filters';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 1000;

const IncomeFrequencyEnum = {
  MONTHLY: 'MONTHLY',
  WEEKLY: 'WEEKLY',
  BIWEEKLY: 'BIWEEKLY',
  ANNUAL: 'ANNUAL',
  ONCE: 'ONCE',
} as const;

const HouseholdTransferTypeEnum = {
  PENSION: 'PENSION',
  TRANSFER: 'TRANSFER',
} as const;

type PersonRecord = Prisma.PersonGetPayload<{}>;
type PersonWithHealthCounts = Prisma.PersonGetPayload<{
  include: {
    _count: {
      select: {
        healthConditions: true;
        medications: true;
      };
    };
  };
}>;
type PersonWithDetailRelations = Prisma.PersonGetPayload<{
  include: {
    _count: {
      select: {
        healthConditions: true;
        medications: true;
      };
    };
    comments: {
      orderBy: {
        createdAt: 'desc';
      };
      include: {
        authorUser: {
          select: {
            id: true;
            name: true;
            email: true;
            avatarUrl: true;
          };
        };
      };
    };
    attachments: {
      orderBy: {
        createdAt: 'desc';
      };
      include: {
        uploadedByUser: {
          select: {
            id: true;
            name: true;
            email: true;
            avatarUrl: true;
          };
        };
      };
    };
  };
}>;
type PersonSummary = Prisma.PersonGetPayload<{
  select: {
    id: true;
    fullName: true;
    avatarUrl: true;
    birthDate: true;
    sex: true;
    gender: true;
    raceColor: true;
    status: true;
    personType: true;
  };
}>;
type HouseholdMemberRecord = Prisma.HouseholdMemberGetPayload<{
  include: { person: true };
}>;
type PersonRelationRecord = Prisma.PersonRelationGetPayload<{
  include: { relatedPerson: true };
}>;
type PersonIncomeRecord = Prisma.PersonIncomeGetPayload<{}>;
type PersonExpenseRecord = Prisma.PersonExpenseGetPayload<{}>;
type PersonFinancialEntryRecord = Prisma.PersonFinancialEntryGetPayload<{}>;
type PersonBenefitRecord = Prisma.PersonBenefitGetPayload<{}>;
type HouseholdProfileRecord = Prisma.HouseholdProfileGetPayload<{}>;
type HouseholdAssetRecord = Prisma.HouseholdAssetGetPayload<{}>;
type PersonAssetRecord = Prisma.PersonAssetGetPayload<{}>;
type HouseholdTransferRecord = Prisma.HouseholdTransferGetPayload<{}>;
type PersonHealthConditionRecord = Prisma.PersonHealthConditionGetPayload<{}>;
type PersonMedicationRecord = Prisma.PersonMedicationGetPayload<{}>;
type PersonEducationRecord = Prisma.PersonEducationGetPayload<{}>;
type PersonDetentionRecord = Prisma.PersonDetentionGetPayload<{}>;
type PersonContactRecord = Prisma.PersonContactGetPayload<{}>;
type PersonSensitiveDocumentRecord =
  Prisma.PersonSensitiveDocumentGetPayload<{}>;
type PersonRecordCommentRecord = Prisma.PersonRecordCommentGetPayload<{
  include: {
    authorUser: {
      select: {
        id: true;
        name: true;
        email: true;
        avatarUrl: true;
      };
    };
  };
}>;
type PersonRecordAttachmentRecord = Prisma.PersonRecordAttachmentGetPayload<{
  include: {
    uploadedByUser: {
      select: {
        id: true;
        name: true;
        email: true;
        avatarUrl: true;
      };
    };
  };
}>;

const PEOPLE_RECORD_TYPES = [
  'education',
  'health-condition',
  'medication',
  'detention',
  'financial-entry',
  'family-relation',
] as const;

type PeopleRecordType = (typeof PEOPLE_RECORD_TYPES)[number];

const normalizeCepDigitsOrNull = (value?: string | null) => {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const digits = trimmed.replaceAll(/\D/g, '');
  if (digits.length !== 8) {
    throw new BadRequestException('CEP inválido.');
  }
  return digits;
};

const normalizeTags = (tags?: string[] | null) => {
  if (!tags) return null;
  const cleaned = tags.map((tag) => tag.trim()).filter(Boolean);
  return cleaned.length ? JSON.stringify(cleaned) : null;
};

const normalizeStatus = (status?: string | null) => {
  const normalized = normalizeString(status);
  return normalized === 'Em analise' ? 'Em espera' : normalized;
};

const parseTags = (raw?: string | null) => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item)).filter(Boolean);
    }
  } catch {
    // fallback to csv
  }
  return raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
};

const parseMentionUserIds = (value: Prisma.JsonValue | null | undefined) => {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value.map((entry) => String(entry ?? '').trim()).filter(Boolean),
    ),
  );
};

const mapCommentAuthor = (
  user:
    | {
        id: string;
        name: string | null;
        email: string | null;
        avatarUrl: string | null;
      }
    | null
    | undefined,
) => ({
  id: user?.id ?? null,
  name: user?.name?.trim() || user?.email || 'Equipe interna',
  email: user?.email ?? null,
  avatarUrl: user?.avatarUrl ?? null,
});

const mapPersonCommentItem = (
  comment:
    | {
        id: string;
        body: string;
        mentionUserIds: Prisma.JsonValue | null;
        createdAt: Date;
        updatedAt: Date;
        authorUser?: {
          id: string;
          name: string | null;
          email: string | null;
          avatarUrl: string | null;
        } | null;
      }
    | PersonRecordCommentRecord,
) => ({
  id: comment.id,
  body: comment.body,
  mentionUserIds: parseMentionUserIds(comment.mentionUserIds),
  author: mapCommentAuthor(comment.authorUser),
  createdAt: comment.createdAt,
  updatedAt: comment.updatedAt,
});

const mapPersonAttachmentItem = (
  attachment:
    | {
        id: string;
        label: string;
        filePath: string;
        mimeType: string | null;
        fileSizeBytes: number | null;
        createdAt: Date;
        updatedAt: Date;
        uploadedByUser?: {
          id: string;
          name: string | null;
          email: string | null;
          avatarUrl: string | null;
        } | null;
      }
    | PersonRecordAttachmentRecord,
) => ({
  id: attachment.id,
  label: attachment.label,
  filePath: attachment.filePath,
  mimeType: attachment.mimeType ?? null,
  fileSizeBytes: attachment.fileSizeBytes ?? null,
  uploadedBy: attachment.uploadedByUser
    ? {
        id: attachment.uploadedByUser.id,
        name:
          attachment.uploadedByUser.name?.trim() ||
          attachment.uploadedByUser.email ||
          'Equipe interna',
        email: attachment.uploadedByUser.email ?? null,
        avatarUrl: attachment.uploadedByUser.avatarUrl ?? null,
      }
    : null,
  createdAt: attachment.createdAt,
  updatedAt: attachment.updatedAt,
});

const mapPerson = (person: PersonWithHealthCounts | PersonWithDetailRelations) => {
  const {
    _count,
    tags,
    comments,
    attachments,
    ...rest
  } = person as PersonWithDetailRelations & PersonWithHealthCounts;
  return {
    ...rest,
    document: null,
    rg: null,
    nis: null,
    tags: parseTags(tags),
    comments:
      comments?.map(mapPersonCommentItem) ?? [],
    attachments:
      attachments?.map(mapPersonAttachmentItem) ?? [],
    hasHealthCondition: _count.healthConditions > 0,
    hasMedication: _count.medications > 0,
    hasHealthIssue: _count.healthConditions + _count.medications > 0,
  };
};

const mapPersonSummary = (person: PersonSummary) => ({
  id: person.id,
  fullName: person.fullName,
  avatarUrl: person.avatarUrl,
  birthDate: person.birthDate,
  sex: person.sex,
  gender: person.gender,
  raceColor: person.raceColor,
  status: person.status,
  personType: person.personType,
});

const mapPersonSummaryFromRecord = (person: PersonRecord) => ({
  id: person.id,
  fullName: person.fullName,
  avatarUrl: person.avatarUrl,
  birthDate: person.birthDate,
  sex: person.sex,
  gender: person.gender,
  raceColor: person.raceColor,
  status: person.status,
  personType: person.personType,
});

const mapIncome = (income: PersonIncomeRecord) => ({
  id: income.id,
  personId: income.personId,
  householdId: income.householdId ?? null,
  type: income.type,
  amount: Number(income.amount),
  frequency: income.frequency,
  contractType: income.contractType,
  isHouseholdContribution: income.isHouseholdContribution,
  notes: income.notes,
  createdAt: income.createdAt,
  updatedAt: income.updatedAt,
});

const mapExpense = (expense: PersonExpenseRecord) => ({
  id: expense.id,
  personId: expense.personId,
  householdId: expense.householdId ?? null,
  type: expense.type,
  amount: Number(expense.amount),
  frequency: expense.frequency,
  isHouseholdExpense: expense.isHouseholdExpense,
  notes: expense.notes,
  createdAt: expense.createdAt,
  updatedAt: expense.updatedAt,
});

const mapFinancialEntry = (entry: PersonFinancialEntryRecord) => ({
  id: entry.id,
  personId: entry.personId,
  householdId: entry.householdId ?? null,
  fromHouseholdId: entry.fromHouseholdId ?? null,
  toHouseholdId: entry.toHouseholdId ?? null,
  entryType: entry.entryType,
  category: entry.category,
  subcategory: entry.subcategory,
  status: entry.status,
  amount: entry.amount !== null ? Number(entry.amount) : null,
  frequency: entry.frequency,
  contractType: entry.contractType,
  includeInHouseholdBudget: entry.includeInHouseholdBudget,
  startDate: entry.startDate,
  endDate: entry.endDate,
  notes: entry.notes,
  createdAt: entry.createdAt,
  updatedAt: entry.updatedAt,
});

const mapBenefit = (benefit: PersonBenefitRecord) => ({
  id: benefit.id,
  personId: benefit.personId,
  householdId: benefit.householdId ?? null,
  type: benefit.type,
  status: benefit.status,
  amount: benefit.amount !== null ? Number(benefit.amount) : null,
  frequency: benefit.frequency,
  startDate: benefit.startDate,
  endDate: benefit.endDate,
  notes: benefit.notes,
  createdAt: benefit.createdAt,
  updatedAt: benefit.updatedAt,
});

const mapTransfer = (transfer: HouseholdTransferRecord) => ({
  id: transfer.id,
  personId: transfer.personId,
  fromHouseholdId: transfer.fromHouseholdId,
  toHouseholdId: transfer.toHouseholdId,
  type: transfer.type,
  amount: Number(transfer.amount),
  frequency: transfer.frequency,
  notes: transfer.notes,
  createdAt: transfer.createdAt,
  updatedAt: transfer.updatedAt,
});

const mapHouseholdProfile = (profile: HouseholdProfileRecord) => ({
  id: profile.id,
  householdId: profile.householdId,
  type: profile.type,
  condition: profile.condition,
  ownership: profile.ownership,
  areaM2: profile.areaM2,
  rooms: profile.rooms,
  bathrooms: profile.bathrooms,
  cep: profile.cep,
  street: profile.street,
  number: profile.number,
  complement: profile.complement,
  neighborhood: profile.neighborhood,
  city: profile.city,
  state: profile.state,
  ibge: profile.ibge,
  gia: profile.gia,
  ddd: profile.ddd,
  siafi: profile.siafi,
  reference: profile.reference,
  notes: profile.notes,
  createdAt: profile.createdAt,
  updatedAt: profile.updatedAt,
});

const mapHouseholdAsset = (asset: HouseholdAssetRecord) => ({
  id: asset.id,
  householdId: asset.householdId,
  category: asset.category,
  item: asset.item,
  quantity: asset.quantity,
  condition: asset.condition,
  notes: asset.notes,
  createdAt: asset.createdAt,
  updatedAt: asset.updatedAt,
});

const mapPersonAsset = (asset: PersonAssetRecord) => ({
  id: asset.id,
  personId: asset.personId,
  category: asset.category,
  item: asset.item,
  quantity: asset.quantity,
  condition: asset.condition,
  notes: asset.notes,
  createdAt: asset.createdAt,
  updatedAt: asset.updatedAt,
});

const mapHealthCondition = (condition: PersonHealthConditionRecord) => ({
  id: condition.id,
  personId: condition.personId,
  type: condition.type,
  description: condition.description,
  severity: condition.severity,
  diagnosisDate: condition.diagnosisDate,
  documentUrl: condition.documentUrl,
  notes: condition.notes,
  createdAt: condition.createdAt,
  updatedAt: condition.updatedAt,
});

const mapMedication = (medication: PersonMedicationRecord) => ({
  id: medication.id,
  personId: medication.personId,
  reason: medication.reason,
  medication: medication.medication,
  dosage: medication.dosage,
  schedule: medication.schedule,
  startDate: medication.startDate,
  endDate: medication.endDate,
  prescribingDoctor: medication.prescribingDoctor,
  permissionDocumentUrl: medication.permissionDocumentUrl,
  documentUrl: medication.documentUrl,
  notes: medication.notes,
  createdAt: medication.createdAt,
  updatedAt: medication.updatedAt,
});

const mapEducation = (education: PersonEducationRecord) => ({
  id: education.id,
  personId: education.personId,
  level: education.level,
  status: education.status,
  institution: education.institution,
  grade: education.grade,
  schoolYear: education.schoolYear,
  isCurrent: education.isCurrent,
  startDate: education.startDate,
  endDate: education.endDate,
  notes: education.notes,
  createdAt: education.createdAt,
  updatedAt: education.updatedAt,
});

const mapDetention = (detention: PersonDetentionRecord) => ({
  id: detention.id,
  personId: detention.personId,
  status: detention.status,
  type: detention.type,
  unit: detention.unit,
  startDate: detention.startDate,
  endDate: detention.endDate,
  notes: detention.notes,
  createdAt: detention.createdAt,
  updatedAt: detention.updatedAt,
});

const mapPersonContact = (contact: PersonContactRecord) => ({
  id: contact.id,
  personId: contact.personId,
  role: contact.role,
  type: contact.type,
  label: contact.label,
  name: contact.name,
  relationship: contact.relationship,
  value: contact.value,
  isPrimary: contact.isPrimary,
  isWhatsapp: contact.isWhatsapp,
  notes: contact.notes,
  createdAt: contact.createdAt,
  updatedAt: contact.updatedAt,
});

const PERSON_DETAIL_INCLUDE = {
  _count: {
    select: { healthConditions: true, medications: true },
  },
  comments: {
    orderBy: { createdAt: 'desc' },
    include: {
      authorUser: {
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
        },
      },
    },
  },
  attachments: {
    orderBy: { createdAt: 'desc' },
    include: {
      uploadedByUser: {
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
        },
      },
    },
  },
} satisfies Prisma.PersonInclude;

const PERSON_RECORD_COMMENT_INCLUDE = {
  authorUser: {
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
    },
  },
} satisfies Prisma.PersonRecordCommentInclude;

const PERSON_RECORD_ATTACHMENT_INCLUDE = {
  uploadedByUser: {
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
    },
  },
} satisfies Prisma.PersonRecordAttachmentInclude;

const normalizePhoneDigits = (value: string) => {
  const digits = value.replaceAll(/\D/g, '');
  if (digits.length < 8 || digits.length > 15) {
    throw new BadRequestException('Telefone inválido.');
  }
  return digits;
};

const normalizeEmailValue = (value: string) => {
  const email = value.trim().toLowerCase();
  if (!email || !isEmail(email)) {
    throw new BadRequestException('Email inválido.');
  }
  return email;
};

type SensitiveDocumentsPayloadV1 = {
  cpf: string | null;
  rg: string | null;
  nis: string | null;
  cns: string | null;
};

const normalizeFreeformId = (value: string) =>
  value
    .trim()
    .replaceAll(/\s+/g, ' ')
    .replaceAll(/[^\w.\-()/ ]/g, '');

const normalizeCpfDigitsOrNull = (value?: string | null) => {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const digits = normalizeCpfOrNull(trimmed);
  if (!digits) {
    throw new BadRequestException('CPF inválido.');
  }
  if (!isValidCpfDigits(digits)) {
    throw new BadRequestException('CPF inválido.');
  }
  return digits;
};

const normalizeRgOrNull = (value?: string | null) => {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const normalized = normalizeFreeformId(trimmed);
  if (normalized.length < 4) {
    throw new BadRequestException('RG inválido.');
  }
  return normalized;
};

const normalizeNisDigitsOrNull = (value?: string | null) => {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const digits = trimmed.replaceAll(/\D/g, '');
  if (digits.length !== 11) {
    throw new BadRequestException('NIS inválido.');
  }
  return digits;
};

const normalizeCnsDigitsOrNull = (value?: string | null) => {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const digits = trimmed.replaceAll(/\D/g, '');
  if (digits.length !== 15) {
    throw new BadRequestException('CNS inválido.');
  }
  return digits;
};

const normalizeOptionalUrl = (value?: string | null) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const normalized = normalizeString(value);
  return normalized ?? undefined;
};

const normalizeRelationKey = (value?: string | null) =>
  (value ?? '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '');

const GENEALOGY_RELATION_KEYS = [
  'pai',
  'mae',
  'filho',
  'filha',
  'irma',
  'conjuge',
];

const isGenealogyRelation = (value?: string | null) => {
  if (!value) return false;
  const key = normalizeRelationKey(value);
  return GENEALOGY_RELATION_KEYS.some((prefix) => key.startsWith(prefix));
};

const resolveParentTypeFromPerson = (
  person?: { sex?: string | null; gender?: string | null } | null,
) => {
  const sexKey = normalizeRelationKey(person?.sex);
  const genderKey = normalizeRelationKey(person?.gender);
  if (sexKey.startsWith('f') || genderKey.includes('mulher')) {
    return 'Mãe';
  }
  if (sexKey.startsWith('m') || genderKey.includes('homem')) {
    return 'Pai';
  }
  return 'Responsável';
};

const resolveStepParentTypeFromPerson = (
  person?: { sex?: string | null; gender?: string | null } | null,
) => {
  const parentType = resolveParentTypeFromPerson(person);
  if (parentType === 'Mãe') return 'Madrasta';
  if (parentType === 'Pai') return 'Padrasto';
  return 'Responsável';
};

const resolveInverseType = async (
  tx: Prisma.TransactionClient,
  relation: Prisma.PersonRelationUncheckedCreateInput & {
    relatedPersonId: string;
    personId: string;
    type: string;
  },
) => {
  const key = normalizeRelationKey(relation.type);
  if (key.startsWith('pai') || key.startsWith('mae') || key === 'paimae') {
    return 'Filho(a)';
  }
  if (key.startsWith('filho') || key.startsWith('filha')) {
    const person = await tx.person.findUnique({
      where: { id: relation.personId },
      select: { sex: true, gender: true },
    });
    return resolveParentTypeFromPerson(person);
  }
  if (key.startsWith('padrasto') || key.startsWith('madrasta')) {
    return 'Enteado(a)';
  }
  if (key.startsWith('enteado') || key.startsWith('enteada')) {
    const person = await tx.person.findUnique({
      where: { id: relation.personId },
      select: { sex: true, gender: true },
    });
    return resolveStepParentTypeFromPerson(person);
  }
  if (key.startsWith('irmaosporafinidade')) {
    return 'Irmãos por afinidade';
  }
  if (key.startsWith('bisavo')) {
    return 'Bisneto(a)';
  }
  if (key.startsWith('bisneto') || key.startsWith('bisneta')) {
    return 'Bisavô(ó)';
  }
  if (key.startsWith('tioavo')) {
    return 'Sobrinho-neto(a)';
  }
  if (key.startsWith('sobrinhoneto') || key.startsWith('sobrinhoneta')) {
    return 'Tio-avô(ó)';
  }
  if (key.startsWith('irma')) {
    return 'Irmão(a)';
  }
  if (key.startsWith('conjuge')) {
    return 'Cônjuge';
  }
  if (key.startsWith('responsavel')) {
    return 'Dependente';
  }
  if (key.startsWith('dependente')) {
    return 'Responsável';
  }
  if (key.startsWith('tio')) {
    return 'Sobrinho(a)';
  }
  if (key.startsWith('sobrinho') || key.startsWith('sobrinha')) {
    return 'Tio(a)';
  }
  if (key.startsWith('primo') || key.startsWith('prima')) {
    return 'Primo(a)';
  }
  if (key.startsWith('avo')) {
    return 'Neto(a)';
  }
  if (key.startsWith('neto') || key.startsWith('neta')) {
    return 'Avô(a)';
  }
  return relation.type;
};

const normalizeCategory = (value?: string | null) =>
  (value ?? '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const resolveIncomeFrequency = (value?: string | null): IncomeFrequency => {
  const fallback = 'MONTHLY' as IncomeFrequency;
  if (!value) return fallback;
  const normalized = value.toString().toUpperCase();
  const enumValues = IncomeFrequencyEnum as Record<string, string>;
  const values = Object.values(enumValues) as IncomeFrequency[];
  const match = values.find((item) => item === normalized);
  return match ?? fallback;
};

const resolveTransferType = (value?: string | null): HouseholdTransferType => {
  const fallback = 'PENSION' as HouseholdTransferType;
  if (!value) return fallback;
  const normalized = value.toString().toUpperCase();
  const enumValues = HouseholdTransferTypeEnum as Record<string, string>;
  const values = Object.values(enumValues) as HouseholdTransferType[];
  const match = values.find((item) => item === normalized);
  return match ?? fallback;
};

const resolveFinancialEntryType = (
  value?: string | null,
): PersonFinancialEntryType => {
  const normalized = (value ?? '').toString().trim().toUpperCase();
  const allowed = ['INCOME', 'EXPENSE', 'TRANSFER', 'BENEFIT'] as const;
  return (allowed.find((item) => item === normalized) ??
    'INCOME') as PersonFinancialEntryType;
};

const buildCreateData = (
  tenantId: string,
  dto: CreatePersonDto,
): Prisma.PersonUncheckedCreateInput => {
  const normalizedStatus = normalizeStatus(dto.status);
  return {
    tenantId,
    fullName: dto.fullName.trim(),
    socialName: normalizeString(dto.socialName),
    birthDate: dto.birthDate ? (parseDateInput(dto.birthDate) ?? null) : null,
    sex: normalizeString(dto.sex),
    gender: normalizeString(dto.gender),
    raceColor: normalizeString(dto.raceColor),
    maritalStatus: normalizeString(dto.maritalStatus),
    nationality: normalizeString(dto.nationality),
    email: normalizeString(dto.email),
    phone: normalizeString(dto.phone),
    document: null,
    rg: null,
    nis: null,
    personType: normalizeString(dto.personType) ?? 'Atendido',
    status: normalizedStatus,
    departureReason:
      normalizedStatus === 'Desligado'
        ? normalizeString(dto.departureReason)
        : null,
    notes: normalizeString(dto.notes),
    tags: normalizeTags(dto.tags),
    profileSummary: normalizeString(dto.profileSummary),
    avatarUrl: normalizeString(dto.avatarUrl),
  };
};

const buildUpdateData = (dto: UpdatePersonDto): Prisma.PersonUpdateInput => {
  const data: Prisma.PersonUpdateInput = {};

  if (dto.fullName !== undefined) {
    data.fullName = dto.fullName.trim();
  }
  if (dto.socialName !== undefined) {
    data.socialName = normalizeString(dto.socialName);
  }
  if (dto.sex !== undefined) {
    data.sex = normalizeString(dto.sex);
  }
  if (dto.gender !== undefined) {
    data.gender = normalizeString(dto.gender);
  }
  if (dto.raceColor !== undefined) {
    data.raceColor = normalizeString(dto.raceColor);
  }
  if (dto.maritalStatus !== undefined) {
    data.maritalStatus = normalizeString(dto.maritalStatus);
  }
  if (dto.nationality !== undefined) {
    data.nationality = normalizeString(dto.nationality);
  }
  if (dto.email !== undefined) {
    data.email = normalizeString(dto.email);
  }
  if (dto.phone !== undefined) {
    data.phone = normalizeString(dto.phone);
  }
  if (dto.birthDate !== undefined) {
    data.birthDate = dto.birthDate
      ? (parseDateInput(dto.birthDate) ?? null)
      : null;
  }

  if (dto.personType !== undefined) {
    data.personType = normalizeString(dto.personType) ?? 'Atendido';
  }
  if (dto.status !== undefined) {
    data.status = normalizeStatus(dto.status);
  }
  if (dto.departureReason !== undefined) {
    data.departureReason = normalizeString(dto.departureReason);
  }
  if (dto.notes !== undefined) {
    data.notes = normalizeString(dto.notes);
  }
  if (dto.tags !== undefined) {
    data.tags = normalizeTags(dto.tags);
  }
  if (dto.profileSummary !== undefined) {
    data.profileSummary = normalizeString(dto.profileSummary);
  }
  if (dto.avatarUrl !== undefined) {
    data.avatarUrl = normalizeString(dto.avatarUrl);
  }

  return data;
};

@Injectable()
export class PeopleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cep: CepService,
    private readonly pii: PiiCryptoService,
    private readonly requestContext: RequestContextService,
  ) {}

  async create(tenantId: string, dto: CreatePersonDto) {
    if (
      normalizeStatus(dto.status) === 'Desligado' &&
      !normalizeString(dto.departureReason)
    ) {
      throw new BadRequestException('Informe o motivo do desligamento.');
    }
    const person = await this.prisma.person.create({
      data: buildCreateData(tenantId, dto),
      include: PERSON_DETAIL_INCLUDE,
    });
    return mapPerson(person);
  }

  async findAll(tenantId: string, query: ListPeopleQueryDto) {
    const { page, limit, skip, take, isAll } = resolvePagination({
      page: query.page,
      limit: query.limit,
      all: query.all,
      defaultLimit: DEFAULT_LIMIT,
      maxLimit: MAX_LIMIT,
    });

    const filters = parseAdvancedFilters(query.filters);
    const grouping = parseGrouping(query.groupBy);
    const where = buildPeopleWhere({
      tenantId,
      query: query.q,
      filters,
    });
    const orderBy = buildPeopleOrderBy(grouping);

    const data = await this.prisma.person.findMany({
      where,
      orderBy,
      skip: isAll ? undefined : skip,
      take: isAll ? undefined : take,
      include: {
        _count: {
          select: { healthConditions: true, medications: true },
        },
      },
    });

    const total = await this.prisma.person.count({ where });

    return {
      data: data.map(mapPerson),
      pagination: buildPaginationMeta({
        page,
        limit,
        total,
        isAll,
      }),
    };
  }

  async findById(tenantId: string, id: string) {
    const person = await this.prisma.person.findFirst({
      where: { id, tenantId },
      include: PERSON_DETAIL_INCLUDE,
    });

    if (!person) {
      throw new NotFoundException('Person not found');
    }

    return mapPerson(person);
  }

  async update(tenantId: string, id: string, dto: UpdatePersonDto) {
    await this.findById(tenantId, id);

    const nextStatus = normalizeStatus(dto.status);
    if (nextStatus === 'Desligado' && !normalizeString(dto.departureReason)) {
      throw new BadRequestException('Informe o motivo do desligamento.');
    }

    const data = buildUpdateData(dto);
    if (dto.status !== undefined && nextStatus !== 'Desligado') {
      data.departureReason = null;
    }

    const person = await this.prisma.person.update({
      where: { id },
      data,
    });
    const refreshed = await this.prisma.person.findFirst({
      where: { id, tenantId },
      include: PERSON_DETAIL_INCLUDE,
    });
    return mapPerson(
      refreshed ?? {
        ...person,
        _count: { healthConditions: 0, medications: 0 },
        comments: [],
        attachments: [],
      },
    );
  }

  async addComment(
    tenantId: string,
    actorUserId: string,
    personId: string,
    dto: CreatePersonCommentDto,
  ) {
    await this.findPersonEntity(tenantId, personId);
    const body = dto.body.trim();
    if (!body) {
      throw new BadRequestException('Informe um comentario.');
    }

    const mentionUserIds = await this.resolveMentionUserIds(
      tenantId,
      dto.mentionUserIds,
    );

    await this.prisma.personComment.create({
      data: {
        tenantId,
        personId,
        authorUserId: actorUserId,
        body,
        mentionUserIds,
      },
    });

    return this.findById(tenantId, personId);
  }

  async deleteComment(tenantId: string, personId: string, commentId: string) {
    await this.findPersonEntity(tenantId, personId);
    const comment = await this.findComment(tenantId, personId, commentId);

    await this.prisma.personComment.delete({
      where: { id: comment.id },
    });

    return this.findById(tenantId, personId);
  }

  async addAttachment(
    tenantId: string,
    actorUserId: string,
    personId: string,
    dto: CreatePersonAttachmentDto,
  ) {
    await this.findPersonEntity(tenantId, personId);
    const label = dto.label.trim();
    const filePath = dto.filePath.trim();

    if (!label) {
      throw new BadRequestException('Informe um nome para o anexo.');
    }

    if (!filePath.startsWith('/uploads/people/')) {
      throw new BadRequestException('Caminho de anexo invalido.');
    }

    await this.prisma.personAttachment.create({
      data: {
        tenantId,
        personId,
        uploadedByUserId: actorUserId,
        label,
        filePath,
        mimeType: normalizeString(dto.mimeType),
        fileSizeBytes: dto.fileSizeBytes ?? null,
      },
    });

    return this.findById(tenantId, personId);
  }

  async deleteAttachment(
    tenantId: string,
    personId: string,
    attachmentId: string,
  ) {
    await this.findPersonEntity(tenantId, personId);
    const attachment = await this.findAttachment(
      tenantId,
      personId,
      attachmentId,
    );

    await this.prisma.personAttachment.delete({
      where: { id: attachment.id },
    });

    return this.findById(tenantId, personId);
  }

  async getRecordMetadata(
    tenantId: string,
    personId: string,
    recordTypeRaw: string,
    recordId: string,
  ) {
    const recordType = await this.assertRecordBelongsToPerson(
      tenantId,
      personId,
      recordTypeRaw,
      recordId,
    );

    const [comments, attachments, tags] = await Promise.all([
      this.prisma.personRecordComment.findMany({
        where: { tenantId, personId, recordType, recordId },
        orderBy: { createdAt: 'desc' },
        include: PERSON_RECORD_COMMENT_INCLUDE,
      }),
      this.prisma.personRecordAttachment.findMany({
        where: { tenantId, personId, recordType, recordId },
        orderBy: { createdAt: 'desc' },
        include: PERSON_RECORD_ATTACHMENT_INCLUDE,
      }),
      this.prisma.personRecordTag.findMany({
        where: { tenantId, personId, recordType, recordId },
        orderBy: [{ value: 'asc' }],
        select: { value: true },
      }),
    ]);

    return {
      comments: comments.map(mapPersonCommentItem),
      attachments: attachments.map(mapPersonAttachmentItem),
      tags: tags.map((tag) => tag.value),
    };
  }

  async addRecordComment(
    tenantId: string,
    actorUserId: string,
    personId: string,
    recordTypeRaw: string,
    recordId: string,
    dto: CreatePersonRecordCommentDto,
  ) {
    const recordType = await this.assertRecordBelongsToPerson(
      tenantId,
      personId,
      recordTypeRaw,
      recordId,
    );
    const body = dto.body.trim();
    if (!body) {
      throw new BadRequestException('Informe um comentario.');
    }

    const mentionUserIds = await this.resolveMentionUserIds(
      tenantId,
      dto.mentionUserIds,
    );

    await this.prisma.personRecordComment.create({
      data: {
        tenantId,
        personId,
        recordType,
        recordId,
        authorUserId: actorUserId,
        body,
        mentionUserIds,
      },
    });

    return this.getRecordMetadata(tenantId, personId, recordType, recordId);
  }

  async deleteRecordComment(
    tenantId: string,
    personId: string,
    recordTypeRaw: string,
    recordId: string,
    commentId: string,
  ) {
    const recordType = await this.assertRecordBelongsToPerson(
      tenantId,
      personId,
      recordTypeRaw,
      recordId,
    );
    const comment = await this.findRecordComment(
      tenantId,
      personId,
      recordType,
      recordId,
      commentId,
    );

    await this.prisma.personRecordComment.delete({
      where: { id: comment.id },
    });

    return this.getRecordMetadata(tenantId, personId, recordType, recordId);
  }

  async addRecordAttachment(
    tenantId: string,
    actorUserId: string,
    personId: string,
    recordTypeRaw: string,
    recordId: string,
    dto: CreatePersonRecordAttachmentDto,
  ) {
    const recordType = await this.assertRecordBelongsToPerson(
      tenantId,
      personId,
      recordTypeRaw,
      recordId,
    );
    const label = dto.label.trim();
    const filePath = dto.filePath.trim();

    if (!label) {
      throw new BadRequestException('Informe um nome para o anexo.');
    }

    if (!filePath.startsWith('/uploads/people/')) {
      throw new BadRequestException('Caminho de anexo invalido.');
    }

    await this.prisma.personRecordAttachment.create({
      data: {
        tenantId,
        personId,
        recordType,
        recordId,
        uploadedByUserId: actorUserId,
        label,
        filePath,
        mimeType: normalizeString(dto.mimeType),
        fileSizeBytes: dto.fileSizeBytes ?? null,
      },
    });

    return this.getRecordMetadata(tenantId, personId, recordType, recordId);
  }

  async deleteRecordAttachment(
    tenantId: string,
    personId: string,
    recordTypeRaw: string,
    recordId: string,
    attachmentId: string,
  ) {
    const recordType = await this.assertRecordBelongsToPerson(
      tenantId,
      personId,
      recordTypeRaw,
      recordId,
    );
    const attachment = await this.findRecordAttachment(
      tenantId,
      personId,
      recordType,
      recordId,
      attachmentId,
    );

    await this.prisma.personRecordAttachment.delete({
      where: { id: attachment.id },
    });

    return this.getRecordMetadata(tenantId, personId, recordType, recordId);
  }

  async setRecordTags(
    tenantId: string,
    personId: string,
    recordTypeRaw: string,
    recordId: string,
    tags: string[],
  ) {
    const recordType = await this.assertRecordBelongsToPerson(
      tenantId,
      personId,
      recordTypeRaw,
      recordId,
    );
    const normalizedTags = Array.from(
      new Set(
        (tags ?? [])
          .map((tag) => tag.trim())
          .filter(Boolean)
          .slice(0, 30),
      ),
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.personRecordTag.deleteMany({
        where: { tenantId, personId, recordType, recordId },
      });

      if (!normalizedTags.length) return;

      await tx.personRecordTag.createMany({
        data: normalizedTags.map((value) => ({
          tenantId,
          personId,
          recordType,
          recordId,
          value,
        })),
      });
    });

    return this.getRecordMetadata(tenantId, personId, recordType, recordId);
  }

  private async findPersonEntity(tenantId: string, personId: string) {
    const person = await this.prisma.person.findFirst({
      where: { id: personId, tenantId },
      select: { id: true },
    });

    if (!person) {
      throw new NotFoundException('Person not found');
    }

    return person;
  }

  private async findComment(
    tenantId: string,
    personId: string,
    commentId: string,
  ) {
    const comment = await this.prisma.personComment.findFirst({
      where: { id: commentId, tenantId, personId },
      select: { id: true },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    return comment;
  }

  private async findAttachment(
    tenantId: string,
    personId: string,
    attachmentId: string,
  ) {
    const attachment = await this.prisma.personAttachment.findFirst({
      where: { id: attachmentId, tenantId, personId },
      select: { id: true },
    });

    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }

    return attachment;
  }

  private normalizeRecordType(recordType: string): PeopleRecordType {
    const normalized = recordType.trim().toLowerCase() as PeopleRecordType;
    if (!PEOPLE_RECORD_TYPES.includes(normalized)) {
      throw new BadRequestException('Tipo de registro invalido.');
    }
    return normalized;
  }

  private async assertRecordBelongsToPerson(
    tenantId: string,
    personId: string,
    recordTypeRaw: string,
    recordId: string,
  ) {
    await this.findPersonEntity(tenantId, personId);
    const recordType = this.normalizeRecordType(recordTypeRaw);

    let record: { id: string } | null = null;
    switch (recordType) {
      case 'education':
        record = await this.prisma.personEducation.findFirst({
          where: { tenantId, personId, id: recordId },
          select: { id: true },
        });
        break;
      case 'health-condition':
        record = await this.prisma.personHealthCondition.findFirst({
          where: { tenantId, personId, id: recordId },
          select: { id: true },
        });
        break;
      case 'medication':
        record = await this.prisma.personMedication.findFirst({
          where: { tenantId, personId, id: recordId },
          select: { id: true },
        });
        break;
      case 'detention':
        record = await this.prisma.personDetention.findFirst({
          where: { tenantId, personId, id: recordId },
          select: { id: true },
        });
        break;
      case 'financial-entry':
        record = await this.prisma.personFinancialEntry.findFirst({
          where: { tenantId, personId, id: recordId },
          select: { id: true },
        });
        break;
      case 'family-relation':
        record = await this.prisma.personRelation.findFirst({
          where: { tenantId, personId, id: recordId },
          select: { id: true },
        });
        break;
    }

    if (!record) {
      throw new NotFoundException('Registro nao encontrado.');
    }

    return recordType;
  }

  private async findRecordComment(
    tenantId: string,
    personId: string,
    recordType: PeopleRecordType,
    recordId: string,
    commentId: string,
  ) {
    const comment = await this.prisma.personRecordComment.findFirst({
      where: { id: commentId, tenantId, personId, recordType, recordId },
      select: { id: true },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    return comment;
  }

  private async findRecordAttachment(
    tenantId: string,
    personId: string,
    recordType: PeopleRecordType,
    recordId: string,
    attachmentId: string,
  ) {
    const attachment = await this.prisma.personRecordAttachment.findFirst({
      where: { id: attachmentId, tenantId, personId, recordType, recordId },
      select: { id: true },
    });

    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }

    return attachment;
  }

  private async resolveMentionUserIds(
    tenantId: string,
    mentionUserIds?: string[] | null,
  ) {
    const normalized = Array.from(
      new Set((mentionUserIds ?? []).map((entry) => entry.trim()).filter(Boolean)),
    );

    if (!normalized.length) {
      return [];
    }

    const users = await this.prisma.user.findMany({
      where: {
        tenantId,
        id: { in: normalized },
      },
      select: { id: true },
    });

    return users.map((user) => user.id);
  }

  private getSensitiveAccessMeta() {
    const ctx = this.requestContext.get();
    const userId = ctx?.userId ?? null;
    if (!userId) {
      throw new BadRequestException('Contexto de usuário não encontrado.');
    }
    return {
      userId,
      ipAddress: ctx?.ipAddress ?? null,
      userAgent: ctx?.userAgent ?? null,
    };
  }

  private async logSensitiveAccess(
    tenantId: string,
    personId: string,
    action: 'READ' | 'UPDATE',
  ) {
    const meta = this.getSensitiveAccessMeta();
    await this.prisma.personSensitiveAccessLog.create({
      data: {
        tenantId,
        personId,
        userId: meta.userId,
        action,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      },
    });
  }

  async getSensitiveDocuments(tenantId: string, personId: string) {
    await this.findById(tenantId, personId);
    await this.logSensitiveAccess(tenantId, personId, 'READ');

    const record = await this.prisma.personSensitiveDocument.findFirst({
      where: { tenantId, personId },
    });
    if (!record) return null;

    const payload = this.pii.decryptForTenant<SensitiveDocumentsPayloadV1>(
      tenantId,
      {
        dataEnc: record.dataEnc,
        iv: record.iv,
        tag: record.tag,
      },
    );

    return {
      ...payload,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  async upsertSensitiveDocuments(
    tenantId: string,
    personId: string,
    dto: UpsertPersonSensitiveDocumentsDto,
  ) {
    await this.findById(tenantId, personId);

    const existing = await this.prisma.personSensitiveDocument.findFirst({
      where: { tenantId, personId },
    });

    const current = existing
      ? this.pii.decryptForTenant<SensitiveDocumentsPayloadV1>(tenantId, {
          dataEnc: existing.dataEnc,
          iv: existing.iv,
          tag: existing.tag,
        })
      : ({ cpf: null, rg: null, nis: null, cns: null } satisfies SensitiveDocumentsPayloadV1);

    const next: SensitiveDocumentsPayloadV1 = {
      cpf:
        dto.cpf !== undefined ? normalizeCpfDigitsOrNull(dto.cpf) : current.cpf,
      rg: dto.rg !== undefined ? normalizeRgOrNull(dto.rg) : current.rg,
      nis:
        dto.nis !== undefined
          ? normalizeNisDigitsOrNull(dto.nis)
          : current.nis,
      cns:
        dto.cns !== undefined
          ? normalizeCnsDigitsOrNull(dto.cns)
          : current.cns,
    };

    const encrypted = this.pii.encryptForTenant(tenantId, next);

    const saved = await this.prisma.$transaction(async (tx) => {
      const doc = await tx.personSensitiveDocument.upsert({
        where: { personId },
        create: {
          tenantId,
          personId,
          schemaVersion: 1,
          dataEnc: encrypted.dataEnc,
          iv: encrypted.iv,
          tag: encrypted.tag,
        },
        update: {
          schemaVersion: 1,
          dataEnc: encrypted.dataEnc,
          iv: encrypted.iv,
          tag: encrypted.tag,
        },
      });

      await tx.person.update({
        where: { id: personId },
        data: { document: null, rg: null, nis: null },
      });

      return doc;
    });

    await this.logSensitiveAccess(tenantId, personId, 'UPDATE');

    const payload = this.pii.decryptForTenant<SensitiveDocumentsPayloadV1>(
      tenantId,
      {
        dataEnc: saved.dataEnc,
        iv: saved.iv,
        tag: saved.tag,
      },
    );

    return {
      ...payload,
      createdAt: saved.createdAt,
      updatedAt: saved.updatedAt,
    };
  }

  async listContacts(tenantId: string, personId: string) {
    await this.findById(tenantId, personId);
    const contacts = await this.prisma.personContact.findMany({
      where: { tenantId, personId },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
    });
    return contacts.map(mapPersonContact);
  }

  async createContact(
    tenantId: string,
    personId: string,
    dto: CreatePersonContactDto,
  ) {
    await this.findById(tenantId, personId);

    const type = dto.type;
    const role = dto.role ?? 'SELF';
    const value =
      type === 'EMAIL'
        ? normalizeEmailValue(dto.value)
        : normalizePhoneDigits(dto.value);

    const name = normalizeString(dto.name);
    if (role !== 'SELF' && !name) {
      throw new BadRequestException('Informe o nome do contato.');
    }

    const data = {
      tenantId,
      personId,
      type,
      role,
      value,
      label: normalizeString(dto.label),
      name,
      relationship: normalizeString(dto.relationship),
      isPrimary: dto.isPrimary ?? false,
      isWhatsapp: type === 'PHONE' ? (dto.isWhatsapp ?? false) : false,
      notes: normalizeString(dto.notes),
    } as const;

    const created = await this.prisma.$transaction(async (tx) => {
      if (data.isPrimary) {
        await tx.personContact.updateMany({
          where: { tenantId, personId, type, isPrimary: true },
          data: { isPrimary: false },
        });
      }

      return tx.personContact.create({ data });
    });

    return mapPersonContact(created);
  }

  async updateContact(
    tenantId: string,
    personId: string,
    contactId: string,
    dto: UpdatePersonContactDto,
  ) {
    await this.findById(tenantId, personId);

    const existing = await this.prisma.personContact.findFirst({
      where: { id: contactId, tenantId, personId },
    });
    if (!existing) {
      throw new NotFoundException('Contato não encontrado.');
    }

    const nextType = dto.type ?? existing.type;
    const nextRole = dto.role ?? existing.role;
    const nextValue =
      dto.value !== undefined
        ? nextType === 'EMAIL'
          ? normalizeEmailValue(dto.value)
          : normalizePhoneDigits(dto.value)
        : existing.value;

    const nextName =
      dto.name !== undefined ? normalizeString(dto.name) : existing.name;
    if (nextRole !== 'SELF' && !nextName) {
      throw new BadRequestException('Informe o nome do contato.');
    }

    const updateData: Prisma.PersonContactUpdateInput = {
      type: dto.type !== undefined ? nextType : undefined,
      role: dto.role !== undefined ? nextRole : undefined,
      value: dto.value !== undefined ? nextValue : undefined,
      label: dto.label !== undefined ? normalizeString(dto.label) : undefined,
      name: dto.name !== undefined ? nextName : undefined,
      relationship:
        dto.relationship !== undefined
          ? normalizeString(dto.relationship)
          : undefined,
      isPrimary: dto.isPrimary !== undefined ? dto.isPrimary : undefined,
      isWhatsapp:
        dto.isWhatsapp !== undefined
          ? nextType === 'PHONE'
            ? dto.isWhatsapp
            : false
          : undefined,
      notes: dto.notes !== undefined ? normalizeString(dto.notes) : undefined,
    };

    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.isPrimary === true) {
        await tx.personContact.updateMany({
          where: { tenantId, personId, type: nextType, isPrimary: true },
          data: { isPrimary: false },
        });
      }
      return tx.personContact.update({ where: { id: contactId }, data: updateData });
    });

    return mapPersonContact(updated);
  }

  async removeContact(tenantId: string, personId: string, contactId: string) {
    await this.findById(tenantId, personId);
    const contact = await this.prisma.personContact.findFirst({
      where: { id: contactId, tenantId, personId },
    });
    if (!contact) {
      throw new NotFoundException('Contato não encontrado.');
    }
    await this.prisma.personContact.delete({ where: { id: contactId } });
    return { deleted: true };
  }

  async listIncomes(tenantId: string, personId: string) {
    await this.findById(tenantId, personId);
    const incomes = await this.prisma.personIncome.findMany({
      where: { tenantId, personId },
      orderBy: { createdAt: 'desc' },
    });
    return incomes.map(mapIncome);
  }

  async listFinancialEntries(tenantId: string, personId: string) {
    await this.findById(tenantId, personId);
    const entries = await this.prisma.personFinancialEntry.findMany({
      where: { tenantId, personId },
      orderBy: { createdAt: 'desc' },
    });
    return entries.map(mapFinancialEntry);
  }

  async createFinancialEntry(
    tenantId: string,
    personId: string,
    dto: CreatePersonFinancialEntryDto,
  ) {
    await this.findById(tenantId, personId);

    const householdId = await this.resolveHouseholdId(
      tenantId,
      personId,
      dto.householdId,
    );
    const entry = await this.prisma.personFinancialEntry.create({
      data: {
        tenantId,
        personId,
        entryType: resolveFinancialEntryType(dto.entryType),
        category: normalizeString(dto.category) ?? 'Registro financeiro',
        subcategory: normalizeString(dto.subcategory),
        status: normalizeString(dto.status),
        amount:
          dto.amount !== undefined && dto.amount !== null ? dto.amount : null,
        frequency: resolveIncomeFrequency(dto.frequency),
        contractType: normalizeString(dto.contractType),
        householdId,
        fromHouseholdId: normalizeString(dto.fromHouseholdId),
        toHouseholdId: normalizeString(dto.toHouseholdId),
        includeInHouseholdBudget: dto.includeInHouseholdBudget ?? true,
        startDate: dto.startDate ? (parseDateInput(dto.startDate) ?? null) : null,
        endDate: dto.endDate ? (parseDateInput(dto.endDate) ?? null) : null,
        notes: normalizeString(dto.notes),
      },
    });

    return mapFinancialEntry(entry);
  }

  async updateFinancialEntry(
    tenantId: string,
    personId: string,
    entryId: string,
    dto: UpdatePersonFinancialEntryDto,
  ) {
    const existing = await this.prisma.personFinancialEntry.findFirst({
      where: { id: entryId, tenantId, personId },
    });
    if (!existing) {
      throw new NotFoundException('Registro financeiro nao encontrado.');
    }

    const householdId =
      dto.householdId !== undefined
        ? await this.resolveHouseholdId(tenantId, personId, dto.householdId)
        : undefined;

    const entry = await this.prisma.personFinancialEntry.update({
      where: { id: entryId },
      data: {
        entryType:
          dto.entryType !== undefined
            ? resolveFinancialEntryType(dto.entryType)
            : undefined,
        category:
          dto.category !== undefined
            ? normalizeString(dto.category) ?? 'Registro financeiro'
            : undefined,
        subcategory:
          dto.subcategory !== undefined
            ? normalizeString(dto.subcategory)
            : undefined,
        status:
          dto.status !== undefined ? normalizeString(dto.status) : undefined,
        amount:
          dto.amount !== undefined && dto.amount !== null
            ? dto.amount
            : dto.amount === null
              ? null
              : undefined,
        frequency:
          dto.frequency !== undefined
            ? resolveIncomeFrequency(dto.frequency)
            : undefined,
        contractType:
          dto.contractType !== undefined
            ? normalizeString(dto.contractType)
            : undefined,
        householdId,
        fromHouseholdId:
          dto.fromHouseholdId !== undefined
            ? normalizeString(dto.fromHouseholdId)
            : undefined,
        toHouseholdId:
          dto.toHouseholdId !== undefined
            ? normalizeString(dto.toHouseholdId)
            : undefined,
        includeInHouseholdBudget:
          dto.includeInHouseholdBudget !== undefined
            ? dto.includeInHouseholdBudget
            : undefined,
        startDate:
          dto.startDate !== undefined
            ? dto.startDate
              ? (parseDateInput(dto.startDate) ?? null)
              : null
            : undefined,
        endDate:
          dto.endDate !== undefined
            ? dto.endDate
              ? (parseDateInput(dto.endDate) ?? null)
              : null
            : undefined,
        notes:
          dto.notes !== undefined ? normalizeString(dto.notes) : undefined,
      },
    });

    return mapFinancialEntry(entry);
  }

  async removeFinancialEntry(tenantId: string, personId: string, entryId: string) {
    const existing = await this.prisma.personFinancialEntry.findFirst({
      where: { id: entryId, tenantId, personId },
    });
    if (!existing) {
      throw new NotFoundException('Registro financeiro nao encontrado.');
    }
    await this.prisma.personFinancialEntry.delete({ where: { id: entryId } });
    return { deleted: true };
  }

  private async resolveHouseholdId(
    tenantId: string,
    personId: string,
    householdId?: string | null,
  ) {
    if (householdId === null) return null;
    if (householdId) {
      const household = await this.prisma.household.findFirst({
        where: { id: householdId, tenantId },
      });
      if (!household) {
        throw new BadRequestException('Residencia nao encontrada.');
      }
      return householdId;
    }

    const currentMember = await this.prisma.householdMember.findFirst({
      where: { tenantId, personId, endDate: null },
      orderBy: { startDate: 'desc' },
    });
    if (currentMember) {
      return currentMember.householdId;
    }

    const anyMember = await this.prisma.householdMember.findFirst({
      where: { tenantId, personId },
      orderBy: { startDate: 'desc' },
    });
    return anyMember?.householdId ?? null;
  }

  async listExpenses(tenantId: string, personId: string) {
    await this.findById(tenantId, personId);
    const expenses = await this.prisma.personExpense.findMany({
      where: { tenantId, personId },
      orderBy: { createdAt: 'desc' },
    });
    return expenses.map(mapExpense);
  }

  async createIncome(
    tenantId: string,
    personId: string,
    dto: CreatePersonIncomeDto,
  ) {
    await this.findById(tenantId, personId);
    const householdId = await this.resolveHouseholdId(
      tenantId,
      personId,
      dto.householdId,
    );
    const income = await this.prisma.personIncome.create({
      data: {
        tenantId,
        personId,
        householdId,
        type: normalizeString(dto.type) ?? 'Outro',
        amount: dto.amount,
        frequency: resolveIncomeFrequency(dto.frequency),
        contractType: normalizeString(dto.contractType),
        isHouseholdContribution: dto.isHouseholdContribution ?? true,
        notes: normalizeString(dto.notes),
      },
    });
    return mapIncome(income);
  }

  async updateIncome(
    tenantId: string,
    personId: string,
    incomeId: string,
    dto: UpdatePersonIncomeDto,
  ) {
    const income = await this.prisma.personIncome.findFirst({
      where: { id: incomeId, tenantId, personId },
    });
    if (!income) {
      throw new NotFoundException('Renda nao encontrada.');
    }

    const updated = await this.prisma.personIncome.update({
      where: { id: incomeId },
      data: {
        householdId:
          dto.householdId !== undefined
            ? await this.resolveHouseholdId(tenantId, personId, dto.householdId)
            : undefined,
        type:
          dto.type !== undefined
            ? (normalizeString(dto.type) ?? undefined)
            : undefined,
        amount: dto.amount !== undefined ? dto.amount : undefined,
        frequency:
          dto.frequency !== undefined
            ? resolveIncomeFrequency(dto.frequency)
            : undefined,
        contractType:
          dto.contractType !== undefined
            ? normalizeString(dto.contractType)
            : undefined,
        isHouseholdContribution:
          dto.isHouseholdContribution !== undefined
            ? dto.isHouseholdContribution
            : undefined,
        notes: dto.notes !== undefined ? normalizeString(dto.notes) : undefined,
      },
    });

    return mapIncome(updated);
  }

  async createExpense(
    tenantId: string,
    personId: string,
    dto: CreatePersonExpenseDto,
  ) {
    await this.findById(tenantId, personId);
    const householdId = await this.resolveHouseholdId(
      tenantId,
      personId,
      dto.householdId,
    );
    const expense = await this.prisma.personExpense.create({
      data: {
        tenantId,
        personId,
        householdId,
        type: normalizeString(dto.type) ?? 'Outro',
        amount: dto.amount,
        frequency: resolveIncomeFrequency(dto.frequency),
        isHouseholdExpense: dto.isHouseholdExpense ?? true,
        notes: normalizeString(dto.notes),
      },
    });
    return mapExpense(expense);
  }

  async updateExpense(
    tenantId: string,
    personId: string,
    expenseId: string,
    dto: UpdatePersonExpenseDto,
  ) {
    const expense = await this.prisma.personExpense.findFirst({
      where: { id: expenseId, tenantId, personId },
    });
    if (!expense) {
      throw new NotFoundException('Gasto nao encontrado.');
    }

    const updated = await this.prisma.personExpense.update({
      where: { id: expenseId },
      data: {
        householdId:
          dto.householdId !== undefined
            ? await this.resolveHouseholdId(tenantId, personId, dto.householdId)
            : undefined,
        type:
          dto.type !== undefined
            ? (normalizeString(dto.type) ?? undefined)
            : undefined,
        amount: dto.amount !== undefined ? dto.amount : undefined,
        frequency:
          dto.frequency !== undefined
            ? resolveIncomeFrequency(dto.frequency)
            : undefined,
        isHouseholdExpense:
          dto.isHouseholdExpense !== undefined
            ? dto.isHouseholdExpense
            : undefined,
        notes: dto.notes !== undefined ? normalizeString(dto.notes) : undefined,
      },
    });

    return mapExpense(updated);
  }

  async removeExpense(tenantId: string, personId: string, expenseId: string) {
    const expense = await this.prisma.personExpense.findFirst({
      where: { id: expenseId, tenantId, personId },
    });
    if (!expense) {
      throw new NotFoundException('Gasto nao encontrado.');
    }
    await this.prisma.personExpense.delete({ where: { id: expenseId } });
    return { deleted: true };
  }

  async removeIncome(tenantId: string, personId: string, incomeId: string) {
    const income = await this.prisma.personIncome.findFirst({
      where: { id: incomeId, tenantId, personId },
    });
    if (!income) {
      throw new NotFoundException('Renda nao encontrada.');
    }
    await this.prisma.personIncome.delete({ where: { id: incomeId } });
    return { deleted: true };
  }

  async listHealthConditions(tenantId: string, personId: string) {
    await this.findById(tenantId, personId);
    const conditions = await this.prisma.personHealthCondition.findMany({
      where: { tenantId, personId },
      orderBy: { createdAt: 'desc' },
    });
    return conditions.map(mapHealthCondition);
  }

  async createHealthCondition(
    tenantId: string,
    personId: string,
    dto: CreatePersonHealthConditionDto,
  ) {
    await this.findById(tenantId, personId);
    return this.prisma.$transaction(async (tx) => {
      const condition = await tx.personHealthCondition.create({
        data: {
          tenantId,
          personId,
          type: normalizeString(dto.type) ?? dto.type,
          description:
            dto.description !== undefined
              ? normalizeString(dto.description)
              : null,
          severity:
            dto.severity !== undefined ? normalizeString(dto.severity) : null,
          diagnosisDate: dto.diagnosisDate
            ? parseDateInput(dto.diagnosisDate)
            : null,
          documentUrl:
            dto.documentUrl !== undefined
              ? normalizeString(dto.documentUrl)
              : null,
          notes: dto.notes !== undefined ? normalizeString(dto.notes) : null,
        },
      });
      return mapHealthCondition(condition);
    });
  }

  async updateHealthCondition(
    tenantId: string,
    personId: string,
    conditionId: string,
    dto: UpdatePersonHealthConditionDto,
  ) {
    const condition = await this.prisma.personHealthCondition.findFirst({
      where: { id: conditionId, tenantId, personId },
    });
    if (!condition) {
      throw new NotFoundException('Condicao de saude nao encontrada.');
    }
    const updated = await this.prisma.personHealthCondition.update({
      where: { id: conditionId },
      data: {
        type:
          dto.type !== undefined
            ? (normalizeString(dto.type) ?? undefined)
            : undefined,
        description:
          dto.description !== undefined
            ? normalizeString(dto.description)
            : undefined,
        severity:
          dto.severity !== undefined
            ? normalizeString(dto.severity)
            : undefined,
        diagnosisDate:
          dto.diagnosisDate !== undefined
            ? dto.diagnosisDate
              ? parseDateInput(dto.diagnosisDate)
              : null
            : undefined,
        documentUrl: normalizeOptionalUrl(dto.documentUrl),
        notes: dto.notes !== undefined ? normalizeString(dto.notes) : undefined,
      },
    });
    return mapHealthCondition(updated);
  }

  async removeHealthCondition(
    tenantId: string,
    personId: string,
    conditionId: string,
  ) {
    const condition = await this.prisma.personHealthCondition.findFirst({
      where: { id: conditionId, tenantId, personId },
    });
    if (!condition) {
      throw new NotFoundException('Condicao de saude nao encontrada.');
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.personHealthCondition.delete({ where: { id: conditionId } });
    });
    return { deleted: true };
  }

  async listMedications(tenantId: string, personId: string) {
    await this.findById(tenantId, personId);
    const medications = await this.prisma.personMedication.findMany({
      where: { tenantId, personId },
      orderBy: { createdAt: 'desc' },
    });
    return medications.map(mapMedication);
  }

  async createMedication(
    tenantId: string,
    personId: string,
    dto: CreatePersonMedicationDto,
  ) {
    await this.findById(tenantId, personId);
    return this.prisma.$transaction(async (tx) => {
      const medication = await tx.personMedication.create({
        data: {
          tenantId,
          personId,
          reason: dto.reason !== undefined ? normalizeString(dto.reason) : null,
          medication: normalizeString(dto.medication) ?? dto.medication,
          dosage: dto.dosage !== undefined ? normalizeString(dto.dosage) : null,
          schedule:
            dto.schedule !== undefined ? normalizeString(dto.schedule) : null,
          startDate: dto.startDate ? parseDateInput(dto.startDate) : null,
          endDate: dto.endDate ? parseDateInput(dto.endDate) : null,
          prescribingDoctor:
            dto.prescribingDoctor !== undefined
              ? normalizeString(dto.prescribingDoctor)
              : null,
          permissionDocumentUrl:
            dto.permissionDocumentUrl !== undefined
              ? normalizeString(dto.permissionDocumentUrl)
              : null,
          documentUrl:
            dto.documentUrl !== undefined
              ? normalizeString(dto.documentUrl)
              : null,
          notes: dto.notes !== undefined ? normalizeString(dto.notes) : null,
        },
      });
      return mapMedication(medication);
    });
  }

  async updateMedication(
    tenantId: string,
    personId: string,
    medicationId: string,
    dto: UpdatePersonMedicationDto,
  ) {
    const medication = await this.prisma.personMedication.findFirst({
      where: { id: medicationId, tenantId, personId },
    });
    if (!medication) {
      throw new NotFoundException('Medicacao nao encontrada.');
    }
    const updated = await this.prisma.personMedication.update({
      where: { id: medicationId },
      data: {
        reason:
          dto.reason !== undefined ? normalizeString(dto.reason) : undefined,
        medication:
          dto.medication !== undefined
            ? (normalizeString(dto.medication) ?? undefined)
            : undefined,
        dosage:
          dto.dosage !== undefined ? normalizeString(dto.dosage) : undefined,
        schedule:
          dto.schedule !== undefined
            ? normalizeString(dto.schedule)
            : undefined,
        startDate:
          dto.startDate !== undefined
            ? dto.startDate
              ? parseDateInput(dto.startDate)
              : null
            : undefined,
        endDate:
          dto.endDate !== undefined
            ? dto.endDate
              ? parseDateInput(dto.endDate)
              : null
            : undefined,
        prescribingDoctor:
          dto.prescribingDoctor !== undefined
            ? normalizeString(dto.prescribingDoctor)
            : undefined,
        permissionDocumentUrl: normalizeOptionalUrl(dto.permissionDocumentUrl),
        documentUrl: normalizeOptionalUrl(dto.documentUrl),
        notes: dto.notes !== undefined ? normalizeString(dto.notes) : undefined,
      },
    });
    return mapMedication(updated);
  }

  async removeMedication(
    tenantId: string,
    personId: string,
    medicationId: string,
  ) {
    const medication = await this.prisma.personMedication.findFirst({
      where: { id: medicationId, tenantId, personId },
    });
    if (!medication) {
      throw new NotFoundException('Medicacao nao encontrada.');
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.personMedication.delete({ where: { id: medicationId } });
    });
    return { deleted: true };
  }

  async listEducations(tenantId: string, personId: string) {
    await this.findById(tenantId, personId);
    const educations = await this.prisma.personEducation.findMany({
      where: { tenantId, personId },
      orderBy: [{ isCurrent: 'desc' }, { startDate: 'desc' }, { createdAt: 'desc' }],
    });
    return educations.map(mapEducation);
  }

  async createEducation(
    tenantId: string,
    personId: string,
    dto: CreatePersonEducationDto,
  ) {
    await this.findById(tenantId, personId);

    const level = normalizeString(dto.level) ?? dto.level?.trim();
    if (!level) {
      throw new BadRequestException('Escolaridade invalida.');
    }
    const isCurrent = dto.isCurrent ?? true;

    const created = await this.prisma.$transaction(async (tx) => {
      if (isCurrent) {
        await tx.personEducation.updateMany({
          where: { tenantId, personId, isCurrent: true },
          data: { isCurrent: false },
        });
      }

      return tx.personEducation.create({
        data: {
          tenantId,
          personId,
          level,
          status: dto.status !== undefined ? normalizeString(dto.status) : null,
          institution:
            dto.institution !== undefined ? normalizeString(dto.institution) : null,
          grade: dto.grade !== undefined ? normalizeString(dto.grade) : null,
          schoolYear:
            dto.schoolYear !== undefined ? normalizeString(dto.schoolYear) : null,
          isCurrent,
          startDate: dto.startDate ? parseDateInput(dto.startDate) : null,
          endDate: dto.endDate ? parseDateInput(dto.endDate) : null,
          notes: dto.notes !== undefined ? normalizeString(dto.notes) : null,
        },
      });
    });

    return mapEducation(created);
  }

  async updateEducation(
    tenantId: string,
    personId: string,
    educationId: string,
    dto: UpdatePersonEducationDto,
  ) {
    const existing = await this.prisma.personEducation.findFirst({
      where: { id: educationId, tenantId, personId },
    });
    if (!existing) {
      throw new NotFoundException('Escolaridade nao encontrada.');
    }

    const nextIsCurrent =
      dto.isCurrent !== undefined ? dto.isCurrent : existing.isCurrent;

    const updated = await this.prisma.$transaction(async (tx) => {
      if (nextIsCurrent) {
        await tx.personEducation.updateMany({
          where: {
            tenantId,
            personId,
            isCurrent: true,
            NOT: { id: educationId },
          },
          data: { isCurrent: false },
        });
      }

      const level =
        dto.level !== undefined ? normalizeString(dto.level) ?? undefined : undefined;
      if (dto.level !== undefined && !level) {
        throw new BadRequestException('Escolaridade invalida.');
      }

      return tx.personEducation.update({
        where: { id: educationId },
        data: {
          level,
          status: dto.status !== undefined ? normalizeString(dto.status) : undefined,
          institution:
            dto.institution !== undefined
              ? normalizeString(dto.institution)
              : undefined,
          grade: dto.grade !== undefined ? normalizeString(dto.grade) : undefined,
          schoolYear:
            dto.schoolYear !== undefined ? normalizeString(dto.schoolYear) : undefined,
          isCurrent: dto.isCurrent !== undefined ? dto.isCurrent : undefined,
          startDate:
            dto.startDate !== undefined
              ? dto.startDate
                ? parseDateInput(dto.startDate)
                : null
              : undefined,
          endDate:
            dto.endDate !== undefined
              ? dto.endDate
                ? parseDateInput(dto.endDate)
                : null
              : undefined,
          notes: dto.notes !== undefined ? normalizeString(dto.notes) : undefined,
        },
      });
    });

    return mapEducation(updated);
  }

  async removeEducation(
    tenantId: string,
    personId: string,
    educationId: string,
  ) {
    const existing = await this.prisma.personEducation.findFirst({
      where: { id: educationId, tenantId, personId },
    });
    if (!existing) {
      throw new NotFoundException('Escolaridade nao encontrada.');
    }
    await this.prisma.personEducation.delete({ where: { id: educationId } });
    return { deleted: true };
  }

  async listBenefits(tenantId: string, personId: string) {
    await this.findById(tenantId, personId);
    const benefits = await this.prisma.personBenefit.findMany({
      where: { tenantId, personId },
      orderBy: { createdAt: 'desc' },
    });
    return benefits.map(mapBenefit);
  }

  async createBenefit(
    tenantId: string,
    personId: string,
    dto: CreatePersonBenefitDto,
  ) {
    await this.findById(tenantId, personId);

    const type = normalizeString(dto.type) ?? dto.type?.trim();
    if (!type) {
      throw new BadRequestException('Beneficio invalido.');
    }

    const benefit = await this.prisma.personBenefit.create({
      data: {
        tenantId,
        personId,
        householdId:
          dto.householdId !== undefined
            ? await this.resolveHouseholdId(tenantId, personId, dto.householdId)
            : null,
        type,
        status: dto.status !== undefined ? normalizeString(dto.status) : null,
        amount: dto.amount !== undefined ? dto.amount : null,
        frequency: resolveIncomeFrequency(dto.frequency),
        startDate: dto.startDate ? parseDateInput(dto.startDate) : null,
        endDate: dto.endDate ? parseDateInput(dto.endDate) : null,
        notes: dto.notes !== undefined ? normalizeString(dto.notes) : null,
      },
    });

    return mapBenefit(benefit);
  }

  async updateBenefit(
    tenantId: string,
    personId: string,
    benefitId: string,
    dto: UpdatePersonBenefitDto,
  ) {
    const existing = await this.prisma.personBenefit.findFirst({
      where: { id: benefitId, tenantId, personId },
    });
    if (!existing) {
      throw new NotFoundException('Beneficio nao encontrado.');
    }

    const type =
      dto.type !== undefined ? normalizeString(dto.type) ?? undefined : undefined;
    if (dto.type !== undefined && !type) {
      throw new BadRequestException('Beneficio invalido.');
    }

    const updated = await this.prisma.personBenefit.update({
      where: { id: benefitId },
      data: {
        householdId:
          dto.householdId !== undefined
            ? await this.resolveHouseholdId(tenantId, personId, dto.householdId)
            : undefined,
        type,
        status: dto.status !== undefined ? normalizeString(dto.status) : undefined,
        amount: dto.amount !== undefined ? dto.amount : undefined,
        frequency:
          dto.frequency !== undefined
            ? resolveIncomeFrequency(dto.frequency)
            : undefined,
        startDate:
          dto.startDate !== undefined
            ? dto.startDate
              ? parseDateInput(dto.startDate)
              : null
            : undefined,
        endDate:
          dto.endDate !== undefined
            ? dto.endDate
              ? parseDateInput(dto.endDate)
              : null
            : undefined,
        notes: dto.notes !== undefined ? normalizeString(dto.notes) : undefined,
      },
    });

    return mapBenefit(updated);
  }

  async removeBenefit(tenantId: string, personId: string, benefitId: string) {
    const existing = await this.prisma.personBenefit.findFirst({
      where: { id: benefitId, tenantId, personId },
    });
    if (!existing) {
      throw new NotFoundException('Beneficio nao encontrado.');
    }
    await this.prisma.personBenefit.delete({ where: { id: benefitId } });
    return { deleted: true };
  }

  async listDetentions(tenantId: string, personId: string) {
    await this.findById(tenantId, personId);
    const detentions = await this.prisma.personDetention.findMany({
      where: { tenantId, personId },
      orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
    });
    return detentions.map(mapDetention);
  }

  async createDetention(
    tenantId: string,
    personId: string,
    dto: CreatePersonDetentionDto,
  ) {
    await this.findById(tenantId, personId);
    const status = normalizeString(dto.status) ?? dto.status?.trim();
    if (!status) {
      throw new BadRequestException('Reclusao invalida.');
    }
    const detention = await this.prisma.personDetention.create({
      data: {
        tenantId,
        personId,
        status,
        type: dto.type !== undefined ? normalizeString(dto.type) : null,
        unit: dto.unit !== undefined ? normalizeString(dto.unit) : null,
        startDate: dto.startDate ? parseDateInput(dto.startDate) : null,
        endDate: dto.endDate ? parseDateInput(dto.endDate) : null,
        notes: dto.notes !== undefined ? normalizeString(dto.notes) : null,
      },
    });
    return mapDetention(detention);
  }

  async updateDetention(
    tenantId: string,
    personId: string,
    detentionId: string,
    dto: UpdatePersonDetentionDto,
  ) {
    const existing = await this.prisma.personDetention.findFirst({
      where: { id: detentionId, tenantId, personId },
    });
    if (!existing) {
      throw new NotFoundException('Reclusao nao encontrada.');
    }

    const status =
      dto.status !== undefined ? normalizeString(dto.status) ?? undefined : undefined;
    if (dto.status !== undefined && !status) {
      throw new BadRequestException('Reclusao invalida.');
    }

    const updated = await this.prisma.personDetention.update({
      where: { id: detentionId },
      data: {
        status,
        type: dto.type !== undefined ? normalizeString(dto.type) : undefined,
        unit: dto.unit !== undefined ? normalizeString(dto.unit) : undefined,
        startDate:
          dto.startDate !== undefined
            ? dto.startDate
              ? parseDateInput(dto.startDate)
              : null
            : undefined,
        endDate:
          dto.endDate !== undefined
            ? dto.endDate
              ? parseDateInput(dto.endDate)
              : null
            : undefined,
        notes: dto.notes !== undefined ? normalizeString(dto.notes) : undefined,
      },
    });

    return mapDetention(updated);
  }

  async removeDetention(tenantId: string, personId: string, detentionId: string) {
    const existing = await this.prisma.personDetention.findFirst({
      where: { id: detentionId, tenantId, personId },
    });
    if (!existing) {
      throw new NotFoundException('Reclusao nao encontrada.');
    }
    await this.prisma.personDetention.delete({ where: { id: detentionId } });
    return { deleted: true };
  }

  async listTransfers(tenantId: string, personId: string) {
    await this.findById(tenantId, personId);
    const transfers = await this.prisma.householdTransfer.findMany({
      where: { tenantId, personId },
      orderBy: { createdAt: 'desc' },
    });
    return transfers.map(mapTransfer);
  }

  async createTransfer(
    tenantId: string,
    personId: string,
    dto: CreateHouseholdTransferDto,
  ) {
    await this.findById(tenantId, personId);
    if (dto.fromHouseholdId === dto.toHouseholdId) {
      throw new BadRequestException(
        'Residencias de origem e destino devem ser diferentes.',
      );
    }

    const [fromHousehold, toHousehold] = await Promise.all([
      this.prisma.household.findFirst({
        where: { id: dto.fromHouseholdId, tenantId },
      }),
      this.prisma.household.findFirst({
        where: { id: dto.toHouseholdId, tenantId },
      }),
    ]);

    if (!fromHousehold || !toHousehold) {
      throw new BadRequestException('Residencia nao encontrada.');
    }

    const transfer = await this.prisma.householdTransfer.create({
      data: {
        tenantId,
        personId,
        fromHouseholdId: dto.fromHouseholdId,
        toHouseholdId: dto.toHouseholdId,
        type: resolveTransferType(dto.type),
        amount: dto.amount,
        frequency: resolveIncomeFrequency(dto.frequency),
        notes: normalizeString(dto.notes),
      },
    });

    return mapTransfer(transfer);
  }

  async updateTransfer(
    tenantId: string,
    personId: string,
    transferId: string,
    dto: UpdateHouseholdTransferDto,
  ) {
    const transfer = await this.prisma.householdTransfer.findFirst({
      where: { id: transferId, tenantId, personId },
    });
    if (!transfer) {
      throw new NotFoundException('Transferencia nao encontrada.');
    }

    const fromHouseholdId =
      dto.fromHouseholdId !== undefined
        ? dto.fromHouseholdId
        : transfer.fromHouseholdId;
    const toHouseholdId =
      dto.toHouseholdId !== undefined
        ? dto.toHouseholdId
        : transfer.toHouseholdId;
    if (fromHouseholdId === toHouseholdId) {
      throw new BadRequestException(
        'Residencias de origem e destino devem ser diferentes.',
      );
    }

    const [fromHousehold, toHousehold] = await Promise.all([
      this.prisma.household.findFirst({
        where: { id: fromHouseholdId, tenantId },
      }),
      this.prisma.household.findFirst({
        where: { id: toHouseholdId, tenantId },
      }),
    ]);
    if (!fromHousehold || !toHousehold) {
      throw new BadRequestException('Residencia nao encontrada.');
    }

    const updated = await this.prisma.householdTransfer.update({
      where: { id: transferId },
      data: {
        fromHouseholdId:
          dto.fromHouseholdId !== undefined ? dto.fromHouseholdId : undefined,
        toHouseholdId:
          dto.toHouseholdId !== undefined ? dto.toHouseholdId : undefined,
        type:
          dto.type !== undefined ? resolveTransferType(dto.type) : undefined,
        amount: dto.amount !== undefined ? dto.amount : undefined,
        frequency:
          dto.frequency !== undefined
            ? resolveIncomeFrequency(dto.frequency)
            : undefined,
        notes: dto.notes !== undefined ? normalizeString(dto.notes) : undefined,
      },
    });

    return mapTransfer(updated);
  }

  async removeTransfer(tenantId: string, personId: string, transferId: string) {
    const transfer = await this.prisma.householdTransfer.findFirst({
      where: { id: transferId, tenantId, personId },
    });
    if (!transfer) {
      throw new NotFoundException('Transferencia nao encontrada.');
    }
    await this.prisma.householdTransfer.delete({ where: { id: transferId } });
    return { deleted: true };
  }

  async listHouseholdAssets(tenantId: string, personId: string) {
    await this.findById(tenantId, personId);
    const membership = await this.prisma.householdMember.findFirst({
      where: { tenantId, personId },
    });
    if (!membership) return [];
    const assets = await this.prisma.householdAsset.findMany({
      where: { tenantId, householdId: membership.householdId },
      orderBy: { createdAt: 'desc' },
    });
    return assets.map(mapHouseholdAsset);
  }

  async createHouseholdAsset(
    tenantId: string,
    personId: string,
    dto: CreateHouseholdAssetDto,
  ) {
    await this.findById(tenantId, personId);
    return this.prisma.$transaction(async (tx) => {
      const householdId = await this.ensureHouseholdForPerson(
        tx,
        tenantId,
        personId,
      );
      const asset = await tx.householdAsset.create({
        data: {
          tenantId,
          householdId,
          category: normalizeString(dto.category) ?? dto.category,
          item: normalizeString(dto.item) ?? dto.item,
          quantity: dto.quantity ?? undefined,
          condition:
            dto.condition !== undefined ? normalizeString(dto.condition) : null,
          notes: dto.notes !== undefined ? normalizeString(dto.notes) : null,
        },
      });
      return mapHouseholdAsset(asset);
    });
  }

  async updateHouseholdAsset(
    tenantId: string,
    personId: string,
    assetId: string,
    dto: UpdateHouseholdAssetDto,
  ) {
    const membership = await this.prisma.householdMember.findFirst({
      where: { tenantId, personId },
    });
    if (!membership) {
      throw new NotFoundException('Residencia nao encontrada.');
    }
    const asset = await this.prisma.householdAsset.findFirst({
      where: { id: assetId, tenantId, householdId: membership.householdId },
    });
    if (!asset) {
      throw new NotFoundException('Bem da residencia nao encontrado.');
    }
    const updated = await this.prisma.householdAsset.update({
      where: { id: assetId },
      data: {
        category:
          dto.category !== undefined
            ? (normalizeString(dto.category) ?? undefined)
            : undefined,
        item:
          dto.item !== undefined
            ? (normalizeString(dto.item) ?? undefined)
            : undefined,
        quantity: dto.quantity !== undefined ? dto.quantity : undefined,
        condition:
          dto.condition !== undefined
            ? normalizeString(dto.condition)
            : undefined,
        notes: dto.notes !== undefined ? normalizeString(dto.notes) : undefined,
      },
    });
    return mapHouseholdAsset(updated);
  }

  async removeHouseholdAsset(
    tenantId: string,
    personId: string,
    assetId: string,
  ) {
    const membership = await this.prisma.householdMember.findFirst({
      where: { tenantId, personId },
    });
    if (!membership) {
      throw new NotFoundException('Residencia nao encontrada.');
    }
    const asset = await this.prisma.householdAsset.findFirst({
      where: { id: assetId, tenantId, householdId: membership.householdId },
    });
    if (!asset) {
      throw new NotFoundException('Bem da residencia nao encontrado.');
    }
    await this.prisma.householdAsset.delete({ where: { id: assetId } });
    return { deleted: true };
  }

  async listPersonAssets(tenantId: string, personId: string) {
    await this.findById(tenantId, personId);
    const assets = await this.prisma.personAsset.findMany({
      where: { tenantId, personId },
      orderBy: { createdAt: 'desc' },
    });
    return assets.map(mapPersonAsset);
  }

  async listHouseholdPersonAssets(tenantId: string, personId: string) {
    const person = await this.prisma.person.findFirst({
      where: { id: personId, tenantId },
    });
    if (!person) {
      throw new NotFoundException('Pessoa nao encontrada.');
    }
    const membership = await this.prisma.householdMember.findFirst({
      where: { tenantId, personId },
      include: { person: true },
    });

    if (!membership) {
      const assets = await this.prisma.personAsset.findMany({
        where: { tenantId, personId },
        orderBy: { createdAt: 'desc' },
      });
      return [
        {
          person: mapPersonSummaryFromRecord(person),
          assets: assets.map(mapPersonAsset),
        },
      ];
    }

    const members = await this.prisma.householdMember.findMany({
      where: { tenantId, householdId: membership.householdId },
      include: { person: true },
    });

    const memberIds = members.map((member) => member.personId);
    const assets = await this.prisma.personAsset.findMany({
      where: { tenantId, personId: { in: memberIds } },
      orderBy: { createdAt: 'desc' },
    });

    const grouped = assets.reduce<Record<string, PersonAssetRecord[]>>(
      (acc, asset) => {
        if (!acc[asset.personId]) acc[asset.personId] = [];
        acc[asset.personId].push(asset);
        return acc;
      },
      {},
    );

    return members.map((member) => ({
      person: mapPersonSummaryFromRecord(member.person),
      assets: (grouped[member.personId] ?? []).map(mapPersonAsset),
    }));
  }

  async createPersonAsset(
    tenantId: string,
    personId: string,
    dto: CreatePersonAssetDto,
  ) {
    await this.findById(tenantId, personId);
    const asset = await this.prisma.personAsset.create({
      data: {
        tenantId,
        personId,
        category: normalizeString(dto.category) ?? dto.category,
        item: normalizeString(dto.item) ?? dto.item,
        quantity: dto.quantity ?? undefined,
        condition:
          dto.condition !== undefined ? normalizeString(dto.condition) : null,
        notes: dto.notes !== undefined ? normalizeString(dto.notes) : null,
      },
    });
    return mapPersonAsset(asset);
  }

  async updatePersonAsset(
    tenantId: string,
    personId: string,
    assetId: string,
    dto: UpdatePersonAssetDto,
  ) {
    const asset = await this.prisma.personAsset.findFirst({
      where: { id: assetId, tenantId, personId },
    });
    if (!asset) {
      throw new NotFoundException('Bem pessoal nao encontrado.');
    }
    const updated = await this.prisma.personAsset.update({
      where: { id: assetId },
      data: {
        category:
          dto.category !== undefined
            ? (normalizeString(dto.category) ?? undefined)
            : undefined,
        item:
          dto.item !== undefined
            ? (normalizeString(dto.item) ?? undefined)
            : undefined,
        quantity: dto.quantity !== undefined ? dto.quantity : undefined,
        condition:
          dto.condition !== undefined
            ? normalizeString(dto.condition)
            : undefined,
        notes: dto.notes !== undefined ? normalizeString(dto.notes) : undefined,
      },
    });
    return mapPersonAsset(updated);
  }

  async removePersonAsset(tenantId: string, personId: string, assetId: string) {
    const asset = await this.prisma.personAsset.findFirst({
      where: { id: assetId, tenantId, personId },
    });
    if (!asset) {
      throw new NotFoundException('Bem pessoal nao encontrado.');
    }
    await this.prisma.personAsset.delete({ where: { id: assetId } });
    return { deleted: true };
  }

  async getHouseholdProfile(tenantId: string, personId: string) {
    await this.findById(tenantId, personId);
    const membership = await this.prisma.householdMember.findFirst({
      where: { tenantId, personId },
    });
    if (!membership) {
      return null;
    }
    const profile = await this.prisma.householdProfile.findUnique({
      where: { householdId: membership.householdId },
    });
    return profile ? mapHouseholdProfile(profile) : null;
  }

  async upsertHouseholdProfile(
    tenantId: string,
    personId: string,
    dto: UpsertHouseholdProfileDto,
  ) {
    await this.findById(tenantId, personId);

    const cepDigits =
      dto.cep !== undefined ? normalizeCepDigitsOrNull(dto.cep) : undefined;
    const cepInfo =
      typeof cepDigits === 'string' ? await this.cep.lookup(cepDigits) : null;

    const profile = await this.prisma.$transaction(async (tx) => {
      const householdId = await this.ensureHouseholdForPerson(
        tx,
        tenantId,
        personId,
      );
      const saved = await tx.householdProfile.upsert({
        where: { householdId },
        create: {
          tenantId,
          householdId,
          type: normalizeString(dto.type),
          condition: normalizeString(dto.condition),
          ownership: normalizeString(dto.ownership),
          areaM2: dto.areaM2 ?? null,
          rooms: dto.rooms ?? null,
          bathrooms: dto.bathrooms ?? null,
          cep: typeof cepDigits === 'string' ? cepDigits : null,
          street: cepInfo?.street ?? null,
          number: normalizeString(dto.number),
          complement: normalizeString(dto.complement),
          neighborhood: cepInfo?.neighborhood ?? null,
          city: cepInfo?.city ?? null,
          state: cepInfo?.state ?? null,
          ibge: cepInfo?.ibge ?? null,
          gia: cepInfo?.gia ?? null,
          ddd: cepInfo?.ddd ?? null,
          siafi: cepInfo?.siafi ?? null,
          reference: normalizeString(dto.reference),
          notes: normalizeString(dto.notes),
        },
        update: {
          type: dto.type !== undefined ? normalizeString(dto.type) : undefined,
          condition:
            dto.condition !== undefined
              ? normalizeString(dto.condition)
              : undefined,
          ownership:
            dto.ownership !== undefined
              ? normalizeString(dto.ownership)
              : undefined,
          areaM2: dto.areaM2 !== undefined ? dto.areaM2 : undefined,
          rooms: dto.rooms !== undefined ? dto.rooms : undefined,
          bathrooms: dto.bathrooms !== undefined ? dto.bathrooms : undefined,
          ...(dto.cep !== undefined
            ? {
                cep: cepDigits ?? null,
                street: cepDigits ? cepInfo?.street ?? null : null,
                neighborhood: cepDigits ? cepInfo?.neighborhood ?? null : null,
                city: cepDigits ? cepInfo?.city ?? null : null,
                state: cepDigits ? cepInfo?.state ?? null : null,
                ibge: cepDigits ? cepInfo?.ibge ?? null : null,
                gia: cepDigits ? cepInfo?.gia ?? null : null,
                ddd: cepDigits ? cepInfo?.ddd ?? null : null,
                siafi: cepDigits ? cepInfo?.siafi ?? null : null,
              }
            : {}),
          number: dto.number !== undefined ? normalizeString(dto.number) : undefined,
          complement:
            dto.complement !== undefined ? normalizeString(dto.complement) : undefined,
          reference:
            dto.reference !== undefined ? normalizeString(dto.reference) : undefined,
          notes:
            dto.notes !== undefined ? normalizeString(dto.notes) : undefined,
        },
      });
      return saved;
    });
    return mapHouseholdProfile(profile);
  }

  async getFamilyIncomeSummary(tenantId: string, personId: string) {
    await this.findById(tenantId, personId);

    const householdMember = await this.prisma.householdMember.findFirst({
      where: { tenantId, personId },
    });
    const householdId = householdMember?.householdId ?? null;
    const householdMemberIds = householdId
      ? (
          await this.prisma.householdMember.findMany({
            where: { tenantId, householdId },
            select: { personId: true },
          })
        ).map((member) => member.personId)
      : [personId];

    const relations = await this.prisma.personRelation.findMany({
      where: { tenantId, personId },
      select: { relatedPersonId: true },
    });
    const relatedIds = relations.map((relation) => relation.relatedPersonId);

    const personIds = Array.from(
      new Set([...householdMemberIds, ...relatedIds]),
    );

    const entries = await this.prisma.personFinancialEntry.findMany({
      where: {
        tenantId,
        personId: { in: personIds },
        includeInHouseholdBudget: true,
        ...(householdId
          ? {
              OR: [
                { householdId },
                { householdId: null, personId: { in: householdMemberIds } },
                { fromHouseholdId: householdId },
                { toHouseholdId: householdId },
              ],
            }
          : { householdId: null }),
      },
    });
    const incomes = entries.filter((entry) => entry.entryType === 'INCOME');
    const expenses = entries.filter((entry) => entry.entryType === 'EXPENSE');
    const benefits = entries.filter((entry) => entry.entryType === 'BENEFIT');
    const transfers = entries.filter((entry) => entry.entryType === 'TRANSFER');
    const incomingTransfers = householdId
      ? transfers.filter((transfer) => transfer.toHouseholdId === householdId)
      : [];
    const outgoingTransfers = householdId
      ? transfers.filter((transfer) => transfer.fromHouseholdId === householdId)
      : [];

    const isBenefitIncome = (type: string) => {
      const category = normalizeCategory(type);
      return (
        category.includes('benef') ||
        category.includes('bolsa') ||
        category.includes('auxilio') ||
        category.includes('bpc')
      );
    };

    const regularIncomes = incomes.filter((income) => !isBenefitIncome(income.category));
    const benefitIncomes = incomes.filter((income) => isBenefitIncome(income.category));

    const now = new Date();
    const activeBenefitsWithAmount = benefits.filter((benefit) => {
      if (benefit.amount === null) return false;
      const startsOk = !benefit.startDate || benefit.startDate <= now;
      const endsOk = !benefit.endDate || benefit.endDate >= now;
      return startsOk && endsOk;
    });
    const benefitsTotalFromBenefits = activeBenefitsWithAmount.reduce(
      (sum, benefit) => sum + Number(benefit.amount ?? 0),
      0,
    );
    const benefitsTotalFromIncomes = benefitIncomes.reduce(
      (sum, income) => sum + Number(income.amount ?? 0),
      0,
    );
    const hasBenefitAmounts = activeBenefitsWithAmount.length > 0;
    const benefitsTotal = hasBenefitAmounts ? benefitsTotalFromBenefits : benefitsTotalFromIncomes;

    const contributionMap = new Map<string, number>();
    regularIncomes.forEach((income) => {
      const current = contributionMap.get(income.personId) ?? 0;
      contributionMap.set(income.personId, current + Number(income.amount ?? 0));
    });
    incomingTransfers.forEach((transfer) => {
      const current = contributionMap.get(transfer.personId) ?? 0;
      contributionMap.set(transfer.personId, current + Number(transfer.amount ?? 0));
    });
    if (hasBenefitAmounts) {
      activeBenefitsWithAmount.forEach((benefit) => {
        const current = contributionMap.get(benefit.personId) ?? 0;
        contributionMap.set(benefit.personId, current + Number(benefit.amount ?? 0));
      });
    } else {
      benefitIncomes.forEach((income) => {
        const current = contributionMap.get(income.personId) ?? 0;
        contributionMap.set(income.personId, current + Number(income.amount ?? 0));
      });
    }

    const totalIncome =
      regularIncomes.reduce((sum, income) => sum + Number(income.amount ?? 0), 0) +
      benefitsTotal +
      incomingTransfers.reduce(
        (sum, transfer) => sum + Number(transfer.amount ?? 0),
        0,
      );
    const contributors = Array.from(contributionMap.keys());

    const pensionIncomeTotal = incomes.reduce((sum, income) => {
      const category = normalizeCategory(income.category);
      if (category.includes('pensao')) {
        return sum + Number(income.amount ?? 0);
      }
      return sum;
    }, 0);
    const pensionTransferTotal = incomingTransfers.reduce((sum, transfer) => {
      if (String(transfer.category).toUpperCase() === 'PENSION') {
        return sum + Number(transfer.amount ?? 0);
      }
      return sum;
    }, 0);
    const pensionTotal = pensionIncomeTotal + pensionTransferTotal;
    const totalExpenses =
      expenses.reduce((sum, expense) => sum + Number(expense.amount ?? 0), 0) +
      outgoingTransfers.reduce(
        (sum, transfer) => sum + Number(transfer.amount ?? 0),
        0,
      );

    const householdSize = householdMemberIds.length || 1;
    const perCapitaIncome = householdSize > 0 ? totalIncome / householdSize : 0;
    const perCapitaExpenses =
      householdSize > 0 ? totalExpenses / householdSize : 0;

    return {
      totalIncome,
      perCapitaIncome,
      totalExpenses,
      perCapitaExpenses,
      benefitsTotal,
      pensionTotal,
      householdSize,
      contributors,
      contributions: Array.from(contributionMap.entries()).map(
        ([personId, amount]) => ({
          personId,
          amount,
        }),
      ),
    };
  }

  async getFamilySummary(tenantId: string, personId: string) {
    await this.findById(tenantId, personId);

    const householdMember = await this.prisma.householdMember.findFirst({
      where: { tenantId, personId },
      select: { householdId: true },
    });
    const householdId = householdMember?.householdId ?? null;

    const [
      totalRelations,
      externalCount,
      externalGuardiansCount,
      householdCount,
      householdGuardiansCount,
      householdProvidersCount,
      householdDependentsCount,
    ] = await Promise.all([
      this.prisma.personRelation.count({
        where: { tenantId, personId },
      }),
      this.prisma.personRelation.count({
        where: { tenantId, personId, livesTogether: false },
      }),
      this.prisma.personRelation.count({
        where: {
          tenantId,
          personId,
          livesTogether: false,
          isLegalGuardian: true,
        },
      }),
      householdId
        ? this.prisma.householdMember.count({
            where: { tenantId, householdId },
          })
        : Promise.resolve(0),
      householdId
        ? this.prisma.householdMember.count({
            where: { tenantId, householdId, isLegalGuardian: true },
          })
        : Promise.resolve(0),
      householdId
        ? this.prisma.householdMember.count({
            where: { tenantId, householdId, isProvider: true },
          })
        : Promise.resolve(0),
      householdId
        ? this.prisma.householdMember.count({
            where: { tenantId, householdId, isDependent: true },
          })
        : Promise.resolve(0),
    ]);

    const guardiansCount = householdGuardiansCount + externalGuardiansCount;

    let sharedCount = 0;
    let individualCount = 0;

    if (householdId) {
      const [sharedSum, sharedNulls, memberIds] = await Promise.all([
        this.prisma.householdAsset.aggregate({
          where: { tenantId, householdId },
          _sum: { quantity: true },
        }),
        this.prisma.householdAsset.count({
          where: { tenantId, householdId, quantity: null },
        }),
        this.prisma.householdMember.findMany({
          where: { tenantId, householdId },
          select: { personId: true },
        }),
      ]);

      sharedCount = Number(sharedSum._sum.quantity ?? 0) + sharedNulls;

      const personIds = memberIds.map((member) => member.personId);
      if (personIds.length) {
        const [individualSum, individualNulls] = await Promise.all([
          this.prisma.personAsset.aggregate({
            where: { tenantId, personId: { in: personIds } },
            _sum: { quantity: true },
          }),
          this.prisma.personAsset.count({
            where: { tenantId, personId: { in: personIds }, quantity: null },
          }),
        ]);
        individualCount =
          Number(individualSum._sum.quantity ?? 0) + individualNulls;
      }
    }

    const [incomeSummary, householdProfile] = await Promise.all([
      this.getFamilyIncomeSummary(tenantId, personId),
      this.getHouseholdProfile(tenantId, personId),
    ]);

    return {
      relations: {
        livingCount: householdCount,
        externalCount,
        guardiansCount,
        providersCount: householdProvidersCount,
        dependentsCount: householdDependentsCount,
        totalRelations,
      },
      assets: {
        sharedCount,
        individualCount,
      },
      incomeSummary,
      householdProfile,
    };
  }

  async remove(tenantId: string, id: string) {
    await this.findById(tenantId, id);
    await this.prisma.person.delete({ where: { id } });
    return { deleted: true };
  }

  async listRelations(tenantId: string, personId: string) {
    await this.findById(tenantId, personId);

    const householdMember = await this.prisma.householdMember.findFirst({
      where: { tenantId, personId },
      include: { household: true },
    });

    const householdMembers = householdMember?.householdId
      ? await this.prisma.householdMember.findMany({
          where: {
            tenantId,
            householdId: householdMember.householdId,
          },
          include: { person: true },
        })
      : [];

    const relations = await this.prisma.personRelation.findMany({
      where: { tenantId, personId },
      include: { relatedPerson: true },
    });

    const relationMap = new Map(
      relations.map((relation) => [relation.relatedPersonId, relation]),
    );
    const relatedIds = relations.map((relation) => relation.relatedPersonId);
    const relatedHouseholdMembers = relatedIds.length
      ? await this.prisma.householdMember.findMany({
          where: {
            tenantId,
            personId: { in: relatedIds },
            endDate: null,
          },
          include: { household: true, person: true },
        })
      : [];
    const relatedHouseholds = relatedHouseholdMembers.map((member) => {
      const relation = relationMap.get(member.personId);
      return {
        householdId: member.householdId,
        householdName: member.household?.name ?? null,
        personId: member.personId,
        personName: member.person.fullName,
        relationType: relation?.type ?? null,
        livesTogether: relation?.livesTogether ?? false,
      };
    });

    return {
      household: householdMember?.household
        ? {
            id: householdMember.household.id,
            name: householdMember.household.name,
          }
        : null,
      householdMembers: householdMembers.map((member) => ({
        id: member.id,
        personId: member.personId,
        role: member.role,
        isLegalGuardian: member.isLegalGuardian,
        isHouseholdHead: member.isHouseholdHead,
        isIncomeContributor: member.isIncomeContributor,
        isProvider: member.isProvider,
        isDependent: member.isDependent,
        notes: member.notes,
        startDate: member.startDate,
        endDate: member.endDate,
        person: mapPersonSummary(member.person),
      })),
      relations: relations.map((relation) => ({
        id: relation.id,
        personId: relation.personId,
        relatedPersonId: relation.relatedPersonId,
        type: relation.type,
        livesTogether: relation.livesTogether,
        isLegalGuardian: relation.isLegalGuardian,
        notes: relation.notes,
        createdAt: relation.createdAt,
        updatedAt: relation.updatedAt,
        relatedPerson: mapPersonSummary(relation.relatedPerson),
      })),
      relatedHouseholds,
    };
  }

  async getIdentity(tenantId: string, personId: string) {
    const person = await this.prisma.person.findFirst({
      where: { tenantId, id: personId },
      select: {
        id: true,
        fullName: true,
        socialName: true,
        birthDate: true,
        avatarUrl: true,
        _count: {
          select: {
            healthConditions: true,
            medications: true,
          },
        },
      },
    });
    if (!person) throw new NotFoundException('Pessoa nao encontrada.');

    const hasHealthCondition = person._count.healthConditions > 0;
    const hasMedication = person._count.medications > 0;

    const householdMember = await this.prisma.householdMember.findFirst({
      where: { tenantId, personId, endDate: null },
      select: { householdId: true },
    });

    const householdMembers = householdMember?.householdId
      ? await this.prisma.householdMember.findMany({
          where: {
            tenantId,
            householdId: householdMember.householdId,
            endDate: null,
          },
          select: {
            role: true,
            person: {
              select: {
                id: true,
                fullName: true,
                socialName: true,
                birthDate: true,
                avatarUrl: true,
                _count: { select: { healthConditions: true, medications: true } },
              },
            },
          },
        })
      : [];

    const livingTogether = householdMembers
      .filter((member) => member.person.id !== personId)
      .map((member) => ({
        id: member.person.id,
        fullName: member.person.fullName,
        socialName: member.person.socialName ?? null,
        birthDate: member.person.birthDate ?? null,
        avatarUrl: member.person.avatarUrl ?? null,
        role: member.role ?? 'Morador',
        hasHealthCondition: member.person._count.healthConditions > 0,
        hasMedication: member.person._count.medications > 0,
      }));

    const livingIds = new Set(livingTogether.map((member) => member.id));

    const relations = await this.prisma.personRelation.findMany({
      where: { tenantId, personId, livesTogether: false },
      select: {
        relatedPersonId: true,
        type: true,
        relatedPerson: {
          select: {
            id: true,
            fullName: true,
            socialName: true,
            birthDate: true,
            avatarUrl: true,
            _count: { select: { healthConditions: true, medications: true } },
          },
        },
      },
    });

    const notLivingTogether = relations
      .filter((relation) => !livingIds.has(relation.relatedPersonId))
      .map((relation) => ({
        id: relation.relatedPerson.id,
        fullName: relation.relatedPerson.fullName,
        socialName: relation.relatedPerson.socialName ?? null,
        birthDate: relation.relatedPerson.birthDate ?? null,
        avatarUrl: relation.relatedPerson.avatarUrl ?? null,
        role: relation.type,
        hasHealthCondition: relation.relatedPerson._count.healthConditions > 0,
        hasMedication: relation.relatedPerson._count.medications > 0,
      }));

    return {
      person: {
        id: person.id,
        fullName: person.fullName,
        socialName: person.socialName ?? null,
        birthDate: person.birthDate ?? null,
        avatarUrl: person.avatarUrl ?? null,
        hasHealthCondition,
        hasMedication,
      },
      family: {
        livingTogether,
        notLivingTogether,
      },
    };
  }

  async listRelationsTree(tenantId: string, personId: string, depth = 2) {
    const root = await this.prisma.person.findFirst({
      where: { id: personId, tenantId },
    });
    if (!root) {
      throw new NotFoundException('Pessoa nao encontrada.');
    }

    const maxDepth = Math.max(1, Math.min(Number(depth) || 2, 4));
    const maxNodes = 200;
    const depthMap = new Map<string, number>([[personId, 0]]);
    const visited = new Set<string>([personId]);
    let frontier = new Set<string>([personId]);

    for (let level = 0; level < maxDepth; level += 1) {
      if (!frontier.size) break;
      const ids = Array.from(frontier);
      const relations = await this.prisma.personRelation.findMany({
        where: {
          tenantId,
          OR: [{ personId: { in: ids } }, { relatedPersonId: { in: ids } }],
        },
        select: { personId: true, relatedPersonId: true, type: true },
      });
      const nextFrontier = new Set<string>();
      for (const relation of relations) {
        if (!isGenealogyRelation(relation.type)) continue;
        const fromFrontier = frontier.has(relation.personId);
        const toFrontier = frontier.has(relation.relatedPersonId);
        if (!fromFrontier && !toFrontier) continue;
        const neighborId = fromFrontier
          ? relation.relatedPersonId
          : relation.personId;
        if (visited.has(neighborId)) continue;
        const nextDepth = level + 1;
        if (nextDepth > maxDepth) continue;
        visited.add(neighborId);
        depthMap.set(neighborId, nextDepth);
        nextFrontier.add(neighborId);
        if (visited.size >= maxNodes) break;
      }
      frontier = nextFrontier;
      if (visited.size >= maxNodes) break;
    }

    const nodeIds = Array.from(depthMap.keys());
    const people = await this.prisma.person.findMany({
      where: { tenantId, id: { in: nodeIds } },
      include: {
        _count: {
          select: { healthConditions: true, medications: true },
        },
      },
    });

    const nodes = people.map((person) => ({
      id: person.id,
      fullName: person.fullName,
      socialName: person.socialName,
      birthDate: person.birthDate,
      avatarUrl: person.avatarUrl,
      sex: person.sex,
      gender: person.gender,
      raceColor: person.raceColor,
      status: person.status,
      personType: person.personType,
      hasHealthCondition: person._count.healthConditions > 0,
      hasMedication: person._count.medications > 0,
      depth: depthMap.get(person.id) ?? 0,
    }));

    const edges = await this.prisma.personRelation.findMany({
      where: {
        tenantId,
        personId: { in: nodeIds },
        relatedPersonId: { in: nodeIds },
      },
      select: { id: true, personId: true, relatedPersonId: true, type: true },
    });

    return {
      rootId: personId,
      depth: maxDepth,
      truncated: visited.size >= maxNodes,
      nodes,
      edges: edges
        .filter((relation) => isGenealogyRelation(relation.type))
        .map((relation) => ({
          id: relation.id,
          fromId: relation.personId,
          toId: relation.relatedPersonId,
          type: relation.type,
        })),
    };
  }

  async createRelation(
    tenantId: string,
    personId: string,
    dto: CreatePersonRelationDto,
  ) {
    if (personId === dto.relatedPersonId) {
      throw new BadRequestException(
        'A pessoa nao pode se relacionar com ela mesma.',
      );
    }

    await this.findById(tenantId, personId);
    await this.findById(tenantId, dto.relatedPersonId);

    const type = normalizeString(dto.type) ?? 'Outro';
    const livesTogether = dto.livesTogether ?? false;
    const isLegalGuardian = dto.isLegalGuardian ?? false;

    const relation = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.personRelation.findFirst({
        where: {
          tenantId,
          personId,
          relatedPersonId: dto.relatedPersonId,
        },
      });

      const created = existing
        ? await tx.personRelation.update({
            where: { id: existing.id },
            data: {
              type,
              livesTogether,
              isLegalGuardian,
              notes: normalizeString(dto.notes),
            },
          })
        : await tx.personRelation.create({
            data: {
              tenantId,
              personId,
              relatedPersonId: dto.relatedPersonId,
              type,
              livesTogether,
              isLegalGuardian,
              notes: normalizeString(dto.notes),
            },
          });

      await this.syncInverseRelation(tx, tenantId, created);

      if (livesTogether) {
        const householdId = await this.ensureHouseholdForPerson(
          tx,
          tenantId,
          personId,
        );
        await this.ensureHouseholdMember(
          tx,
          tenantId,
          householdId,
          dto.relatedPersonId,
          dto,
        );
      } else {
        await this.removeHouseholdMember(
          tx,
          tenantId,
          personId,
          dto.relatedPersonId,
        );
      }

      return created;
    });

    return relation;
  }

  async updateRelation(
    tenantId: string,
    personId: string,
    relationId: string,
    dto: UpdatePersonRelationDto,
  ) {
    const relation = await this.prisma.personRelation.findFirst({
      where: { tenantId, id: relationId, personId },
    });

    if (!relation) {
      throw new NotFoundException('Relacionamento nao encontrado.');
    }

    const nextType = dto.type
      ? (normalizeString(dto.type) ?? relation.type)
      : relation.type;
    const nextLivesTogether =
      dto.livesTogether !== undefined
        ? dto.livesTogether
        : relation.livesTogether;
    const nextLegalGuardian =
      dto.isLegalGuardian !== undefined
        ? dto.isLegalGuardian
        : relation.isLegalGuardian;

    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.type) {
        const duplicate = await tx.personRelation.findFirst({
          where: {
            tenantId,
            personId,
            relatedPersonId: relation.relatedPersonId,
            type: nextType,
            NOT: { id: relation.id },
          },
        });
        if (duplicate) {
          await tx.personRelation.delete({ where: { id: duplicate.id } });
        }
      }

      const saved = await tx.personRelation.update({
        where: { id: relation.id },
        data: {
          type: nextType,
          livesTogether: nextLivesTogether,
          isLegalGuardian: nextLegalGuardian,
          notes:
            dto.notes !== undefined
              ? normalizeString(dto.notes)
              : relation.notes,
        },
      });

      await this.syncInverseRelation(tx, tenantId, saved);

      if (nextLivesTogether) {
        const householdId = await this.ensureHouseholdForPerson(
          tx,
          tenantId,
          personId,
        );
        await this.ensureHouseholdMember(
          tx,
          tenantId,
          householdId,
          relation.relatedPersonId,
          dto,
        );
      } else {
        await this.removeHouseholdMember(
          tx,
          tenantId,
          personId,
          relation.relatedPersonId,
        );
      }

      return saved;
    });

    return updated;
  }

  async removeRelation(tenantId: string, personId: string, relationId: string) {
    const relation = await this.prisma.personRelation.findFirst({
      where: { tenantId, id: relationId, personId },
    });

    if (!relation) {
      throw new NotFoundException('Relacionamento nao encontrado.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.personRelation.delete({ where: { id: relation.id } });
      await tx.personRelation.deleteMany({
        where: {
          tenantId,
          personId: relation.relatedPersonId,
          relatedPersonId: relation.personId,
        },
      });

      if (relation.livesTogether) {
        await this.removeHouseholdMember(
          tx,
          tenantId,
          personId,
          relation.relatedPersonId,
        );
      }
    });

    return { deleted: true };
  }

  private async ensureHouseholdForPerson(
    tx: Prisma.TransactionClient,
    tenantId: string,
    personId: string,
  ) {
    const existing = await tx.householdMember.findFirst({
      where: { tenantId, personId },
      include: { household: true },
    });
    const person = await tx.person.findUnique({
      where: { id: personId },
      select: { fullName: true },
    });
    const householdName = person?.fullName
      ? `Residencia de ${person.fullName}`
      : 'Residencia';
    if (existing) {
      if (!existing.household?.name) {
        await tx.household.update({
          where: { id: existing.householdId },
          data: { name: householdName },
        });
      }
      return existing.householdId;
    }

    const household = await tx.household.create({
      data: { tenantId, name: householdName },
    });
    await tx.householdMember.create({
      data: {
        tenantId,
        householdId: household.id,
        personId,
        role: 'Morador',
        isHouseholdHead: true,
      },
    });
    return household.id;
  }

  private async ensureHouseholdMember(
    tx: Prisma.TransactionClient,
    tenantId: string,
    householdId: string,
    personId: string,
    dto: Pick<
      CreatePersonRelationDto & UpdatePersonRelationDto,
      | 'householdRole'
      | 'isIncomeContributor'
      | 'isProvider'
      | 'isDependent'
      | 'isLegalGuardian'
      | 'isHouseholdHead'
    >,
  ) {
    await tx.householdMember.upsert({
      where: { householdId_personId: { householdId, personId } },
      create: {
        tenantId,
        householdId,
        personId,
        role: normalizeString(dto.householdRole),
        isIncomeContributor: dto.isIncomeContributor ?? false,
        isProvider: dto.isProvider ?? false,
        isDependent: dto.isDependent ?? false,
        isLegalGuardian: dto.isLegalGuardian ?? false,
        isHouseholdHead: dto.isHouseholdHead ?? false,
      },
      update: {
        role:
          dto.householdRole !== undefined
            ? normalizeString(dto.householdRole)
            : undefined,
        isIncomeContributor:
          dto.isIncomeContributor !== undefined
            ? dto.isIncomeContributor
            : undefined,
        isProvider: dto.isProvider !== undefined ? dto.isProvider : undefined,
        isDependent:
          dto.isDependent !== undefined ? dto.isDependent : undefined,
        isLegalGuardian:
          dto.isLegalGuardian !== undefined ? dto.isLegalGuardian : undefined,
        isHouseholdHead:
          dto.isHouseholdHead !== undefined ? dto.isHouseholdHead : undefined,
      },
    });
  }

  private async removeHouseholdMember(
    tx: Prisma.TransactionClient,
    tenantId: string,
    personId: string,
    relatedPersonId: string,
  ) {
    const household = await tx.householdMember.findFirst({
      where: { tenantId, personId },
    });
    if (!household) return;
    await tx.householdMember.deleteMany({
      where: {
        tenantId,
        householdId: household.householdId,
        personId: relatedPersonId,
      },
    });
  }

  private async syncInverseRelation(
    tx: Prisma.TransactionClient,
    tenantId: string,
    relation: Prisma.PersonRelationUncheckedCreateInput & {
      id?: string;
      relatedPersonId: string;
      personId: string;
      type: string;
      livesTogether?: boolean;
      isLegalGuardian?: boolean;
      notes?: string | null;
    },
  ) {
    const inverseType = await resolveInverseType(tx, relation);
    const inverse = await tx.personRelation.findFirst({
      where: {
        tenantId,
        personId: relation.relatedPersonId,
        relatedPersonId: relation.personId,
      },
    });

    if (inverse) {
      await tx.personRelation.update({
        where: { id: inverse.id },
        data: {
          type: inverseType,
          livesTogether: relation.livesTogether ?? false,
          isLegalGuardian: relation.isLegalGuardian ?? false,
          notes: relation.notes ?? null,
        },
      });
      return;
    }

    await tx.personRelation.create({
      data: {
        tenantId,
        personId: relation.relatedPersonId,
        relatedPersonId: relation.personId,
        type: inverseType,
        livesTogether: relation.livesTogether ?? false,
        isLegalGuardian: relation.isLegalGuardian ?? false,
        notes: relation.notes ?? null,
      },
    });
  }
}
