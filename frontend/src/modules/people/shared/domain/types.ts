export type PersonFormData = {
  avatarUrl?: string | File | null;
  fullName: string;
  socialName?: string | null;
  email?: string | null;
  phone?: string | null;
  birthDate?: string | null;
  sex?: string | null;
  gender?: string | null;
  raceColor?: string | null;
  maritalStatus?: string | null;
  nationality?: string | null;
  status?: "Ativo" | "Inativo" | "Em espera" | "Em analise" | "Desligado" | null;
  personType?: string | null;
  departureReason?: string | null;
  notes?: string | null;
  tags?: string[] | null;
  profileSummary?: string | null;
};

export type Person = {
  id: string;
  fullName: string;
  socialName?: string | null;
  birthDate?: string | null;
  sex?: string | null;
  gender?: string | null;
  raceColor?: string | null;
  maritalStatus?: string | null;
  nationality?: string | null;
  email?: string | null;
  phone?: string | null;
  status?: "Ativo" | "Inativo" | "Em espera" | "Em analise" | "Desligado" | null;
  personType?: string | null;
  departureReason?: string | null;
  notes?: string | null;
  tags?: string[] | null;
  profileSummary?: string | null;
  avatarUrl?: string | null;
  comments?: PersonComment[];
  attachments?: PersonAttachment[];
  hasHealthCondition?: boolean | null;
  hasMedication?: boolean | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type PersonComment = {
  id: string;
  body: string;
  mentionUserIds: string[];
  author: {
    id: string | null;
    name: string;
    email: string | null;
    avatarUrl: string | null;
  };
  createdAt: string;
  updatedAt: string;
};

export type PersonMentionableUser = {
  id: string;
  name: string;
  email?: string | null;
  avatarUrl?: string | null;
};

export type PersonAttachment = {
  id: string;
  label: string;
  filePath: string;
  mimeType?: string | null;
  fileSizeBytes?: number | null;
  uploadedBy?: {
    id: string;
    name: string;
    email: string | null;
    avatarUrl: string | null;
  } | null;
  createdAt: string;
  updatedAt: string;
};

export type PeopleRecordType =
  | "education"
  | "health-condition"
  | "medication"
  | "detention"
  | "financial-entry"
  | "family-relation";

export type PeopleRecordMetadata = {
  comments: PersonComment[];
  attachments: PersonAttachment[];
  tags: string[];
};

export type PersonContactType = "EMAIL" | "PHONE";
export type PersonContactRole = "SELF" | "RESPONSIBLE" | "EMERGENCY";

export type PersonContact = {
  id: string;
  personId: string;
  role: PersonContactRole;
  type: PersonContactType;
  label?: string | null;
  name?: string | null;
  relationship?: string | null;
  value: string;
  isPrimary: boolean;
  isWhatsapp: boolean;
  notes?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type PeopleTableItem = {
  id: string;
  fullName: string;
  socialName?: string | null;
  sex?: string | null;
  gender?: string | null;
  raceColor?: string | null;
  maritalStatus?: string | null;
  nationality?: string | null;
  email?: string | null;
  phone?: string | null;
  status?: "Ativo" | "Inativo" | "Em espera" | "Em analise" | "Desligado" | null;
  personType?: string | null;
  departureReason?: string | null;
  notes?: string | null;
  tags?: string[] | null;
  hasHealthCondition?: boolean | null;
  hasMedication?: boolean | null;
  profileSummary?: string | null;
  birthDate?: string | null;
  age?: number | null;
  isBirthdayMonth?: boolean | null;
  isBirthdayToday?: boolean | null;
  avatarUrl?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type PersonSummary = {
  id: string;
  fullName: string;
  socialName?: string | null;
  avatarUrl?: string | null;
  birthDate?: string | null;
  sex?: string | null;
  gender?: string | null;
  raceColor?: string | null;
  status?: string | null;
  personType?: string | null;
  hasHealthCondition?: boolean | null;
  hasMedication?: boolean | null;
};

export type PersonTreeNode = PersonSummary & {
  depth: number;
};

export type PersonTreeEdge = {
  id: string;
  fromId: string;
  toId: string;
  type: string;
};

export type PersonRelationsTree = {
  rootId: string;
  depth: number;
  truncated: boolean;
  nodes: PersonTreeNode[];
  edges: PersonTreeEdge[];
};

export type HouseholdInfo = {
  id: string;
  name?: string | null;
};

export type HouseholdMember = {
  id: string;
  personId: string;
  role?: string | null;
  isLegalGuardian: boolean;
  isHouseholdHead?: boolean;
  isIncomeContributor: boolean;
  isProvider: boolean;
  isDependent: boolean;
  notes?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  person: PersonSummary;
};

export type PersonRelation = {
  id: string;
  personId: string;
  relatedPersonId: string;
  type: string;
  livesTogether: boolean;
  isLegalGuardian: boolean;
  notes?: string | null;
  relatedPerson: PersonSummary;
};

export type RelatedHousehold = {
  householdId: string;
  householdName?: string | null;
  personId: string;
  personName: string;
  relationType?: string | null;
  livesTogether: boolean;
};

export type PersonRelationsResponse = {
  household?: HouseholdInfo | null;
  householdMembers: HouseholdMember[];
  relations: PersonRelation[];
  relatedHouseholds?: RelatedHousehold[];
};

export type PersonRelationInput = {
  relatedPersonId: string;
  type: string;
  livesTogether?: boolean;
  isLegalGuardian?: boolean;
  isHouseholdHead?: boolean;
  notes?: string | null;
  householdRole?: string | null;
  isIncomeContributor?: boolean;
  isProvider?: boolean;
  isDependent?: boolean;
};

export type HouseholdProfile = {
  id: string;
  householdId: string;
  type?: string | null;
  condition?: string | null;
  ownership?: string | null;
  areaM2?: number | null;
  rooms?: number | null;
  bathrooms?: number | null;
  cep?: string | null;
  street?: string | null;
  number?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  ibge?: string | null;
  gia?: string | null;
  ddd?: string | null;
  siafi?: string | null;
  reference?: string | null;
  notes?: string | null;
};

export type PersonFinancialEntryType =
  | "INCOME"
  | "EXPENSE"
  | "TRANSFER"
  | "BENEFIT";

export type PersonFinancialEntry = {
  id: string;
  personId: string;
  householdId?: string | null;
  fromHouseholdId?: string | null;
  toHouseholdId?: string | null;
  entryType: PersonFinancialEntryType;
  category: string;
  subcategory?: string | null;
  status?: string | null;
  amount?: number | null;
  frequency: string;
  contractType?: string | null;
  includeInHouseholdBudget: boolean;
  startDate?: string | null;
  endDate?: string | null;
  notes?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type HouseholdAsset = {
  id: string;
  householdId: string;
  category: string;
  item: string;
  quantity?: number | null;
  condition?: string | null;
  notes?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type PersonAsset = {
  id: string;
  personId: string;
  category: string;
  item: string;
  quantity?: number | null;
  condition?: string | null;
  notes?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type PersonAssetsGroup = {
  person: PersonSummary;
  assets: PersonAsset[];
};

export type HealthCondition = {
  id: string;
  personId: string;
  type: string;
  description?: string | null;
  severity?: string | null;
  diagnosisDate?: string | null;
  documentUrl?: string | null;
  notes?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type Medication = {
  id: string;
  personId: string;
  reason?: string | null;
  medication: string;
  dosage?: string | null;
  schedule?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  prescribingDoctor?: string | null;
  permissionDocumentUrl?: string | null;
  documentUrl?: string | null;
  notes?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type EducationRecord = {
  id: string;
  personId: string;
  level: string;
  status?: string | null;
  institution?: string | null;
  grade?: string | null;
  schoolYear?: string | null;
  isCurrent: boolean;
  startDate?: string | null;
  endDate?: string | null;
  notes?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type PersonDetention = {
  id: string;
  personId: string;
  status: string;
  type?: string | null;
  unit?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  notes?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type FamilyIncomeSummary = {
  totalIncome: number;
  perCapitaIncome: number;
  totalExpenses: number;
  perCapitaExpenses: number;
  benefitsTotal: number;
  pensionTotal: number;
  householdSize: number;
  contributors: string[];
  contributions?: {
    personId: string;
    amount: number;
  }[];
};

export type FamilyRelationsSummary = {
  livingCount: number;
  externalCount: number;
  guardiansCount: number;
  providersCount: number;
  dependentsCount: number;
  totalRelations: number;
};

export type FamilyAssetsSummary = {
  sharedCount: number;
  individualCount: number;
};

export type FamilySummary = {
  relations: FamilyRelationsSummary;
  assets: FamilyAssetsSummary;
  incomeSummary: FamilyIncomeSummary;
  householdProfile: HouseholdProfile | null;
};
