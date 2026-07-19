type CorePermissionDefinition = {
  key: string;
  description: string;
};

type CoreRoleDefinition = {
  name: string;
  description: string;
  permissionKeys: string[];
};

type CoreRolePermissionTemplate = {
  roleNames: string[];
  permissionKeys: string[];
};

export const CORE_PERMISSIONS: CorePermissionDefinition[] = [
  { key: 'programs.read', description: 'Ler programas' },
  { key: 'programs.create', description: 'Criar programas' },
  { key: 'programs.update', description: 'Atualizar programas' },
  { key: 'programs.delete', description: 'Excluir programas' },
  { key: 'projects.read', description: 'Ler projetos' },
  { key: 'projects.create', description: 'Criar projetos' },
  { key: 'projects.update', description: 'Atualizar projetos' },
  { key: 'projects.delete', description: 'Excluir projetos' },
  { key: 'project-structure.read', description: 'Ler estrutura de projetos' },
  {
    key: 'project-structure.create',
    description: 'Criar estrutura de projetos',
  },
  {
    key: 'project-structure.update',
    description: 'Atualizar estrutura de projetos',
  },
  {
    key: 'project-structure.delete',
    description: 'Excluir estrutura de projetos',
  },
  { key: 'enrollments.read', description: 'Ler matriculas de projetos' },
  { key: 'enrollments.create', description: 'Criar matriculas de projetos' },
  {
    key: 'enrollments.update',
    description: 'Atualizar matriculas de projetos',
  },
  { key: 'enrollments.delete', description: 'Excluir matriculas de projetos' },
  { key: 'actions.read', description: 'Ler acoes' },
  { key: 'actions.create', description: 'Criar acoes' },
  { key: 'actions.update', description: 'Atualizar acoes' },
  { key: 'actions.delete', description: 'Excluir acoes' },
  { key: 'actions.manage', description: 'Gerenciar acoes (todas)' },
  { key: 'people.read', description: 'Ler pessoas' },
  {
    key: 'people.identity.read',
    description: 'Ler sinais de identificacao de pessoas',
  },
  { key: 'people.create', description: 'Criar pessoas' },
  { key: 'people.update', description: 'Atualizar pessoas' },
  { key: 'people.delete', description: 'Excluir pessoas' },
  {
    key: 'people.sensitive.read',
    description: 'Ler documentos sensiveis (LGPD)',
  },
  {
    key: 'people.sensitive.update',
    description: 'Atualizar documentos sensiveis (LGPD)',
  },
  { key: 'pantry.read', description: 'Ler despensa' },
  { key: 'pantry.create', description: 'Criar despensa' },
  { key: 'pantry.update', description: 'Atualizar despensa' },
  { key: 'pantry.delete', description: 'Excluir despensa' },
  { key: 'deposit.read', description: 'Ler deposito' },
  { key: 'deposit.create', description: 'Criar deposito' },
  { key: 'deposit.update', description: 'Atualizar deposito' },
  { key: 'deposit.delete', description: 'Excluir deposito' },
  { key: 'tasks.read', description: 'Ler tarefas' },
  { key: 'tasks.create', description: 'Criar tarefas' },
  { key: 'tasks.update', description: 'Atualizar tarefas' },
  { key: 'tasks.delete', description: 'Excluir tarefas' },
  { key: 'users.read', description: 'Ler usuarios' },
  { key: 'users.create', description: 'Criar usuarios' },
  { key: 'users.update', description: 'Atualizar usuarios' },
  { key: 'users.delete', description: 'Excluir usuarios' },
  { key: 'roles.manage', description: 'Gerenciar perfis e permissoes' },
  { key: 'audit.read', description: 'Ler auditoria de dados' },
  { key: 'tenants.read', description: 'Ler dados da instituicao' },
  { key: 'tenants.update', description: 'Atualizar dados da instituicao' },
];

export const CORE_PERMISSION_KEYS = CORE_PERMISSIONS.map(
  (permission) => permission.key,
);

export const DEFAULT_ROLE_DEFINITIONS: CoreRoleDefinition[] = [
  {
    name: 'Admin',
    description: 'Administrador da instituicao',
    permissionKeys: [...CORE_PERMISSION_KEYS],
  },
  {
    name: 'Gestor',
    description: 'Gestao operacional',
    permissionKeys: [
      'programs.read',
      'programs.create',
      'programs.update',
      'programs.delete',
      'projects.read',
      'projects.create',
      'projects.update',
      'projects.delete',
      'project-structure.read',
      'project-structure.create',
      'project-structure.update',
      'project-structure.delete',
      'enrollments.read',
      'enrollments.create',
      'enrollments.update',
      'enrollments.delete',
      'actions.read',
      'actions.create',
      'actions.update',
      'actions.delete',
      'actions.manage',
      'tasks.read',
      'tasks.create',
      'tasks.update',
      'tasks.delete',
      'people.read',
      'people.create',
      'people.update',
      'people.delete',
      'deposit.read',
      'tenants.read',
    ],
  },
  {
    name: 'Atendimento',
    description: 'Equipe de atendimento',
    permissionKeys: [
      'people.read',
      'people.create',
      'people.update',
      'actions.read',
      'actions.create',
      'actions.update',
      'tasks.read',
      'tasks.create',
      'tasks.update',
    ],
  },
  {
    name: 'Leitor',
    description: 'Acesso somente leitura',
    permissionKeys: [
      'people.read',
      'actions.read',
      'pantry.read',
      'deposit.read',
      'tasks.read',
      'tenants.read',
      'audit.read',
    ],
  },
];

const gestorPermissionKeys =
  DEFAULT_ROLE_DEFINITIONS.find((role) => role.name === 'Gestor')
    ?.permissionKeys ?? [];
const atendimentoPermissionKeys =
  DEFAULT_ROLE_DEFINITIONS.find((role) => role.name === 'Atendimento')
    ?.permissionKeys ?? [];
const leitorPermissionKeys =
  DEFAULT_ROLE_DEFINITIONS.find((role) => role.name === 'Leitor')
    ?.permissionKeys ?? [];

export const CORE_ROLE_PERMISSION_TEMPLATES: CoreRolePermissionTemplate[] = [
  {
    roleNames: ['Admin', 'Administrador'],
    permissionKeys: [...CORE_PERMISSION_KEYS],
  },
  {
    roleNames: ['Gestor'],
    permissionKeys: [...gestorPermissionKeys],
  },
  {
    roleNames: ['Atendimento'],
    permissionKeys: [...atendimentoPermissionKeys],
  },
  {
    roleNames: ['Leitor'],
    permissionKeys: [...leitorPermissionKeys],
  },
];
