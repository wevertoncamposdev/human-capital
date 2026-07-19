import type { AdminAuditLogAction } from "@/features/admin/api";

export const auditActionLabels: Record<AdminAuditLogAction, string> = {
  CREATE: "Criação",
  UPDATE: "Atualização",
  DELETE: "Exclusão",
};

export const auditEntityLabels: Record<string, string> = {
  Person: "Pessoas",
  PersonContact: "Contatos (pessoas)",
  PersonAddress: "Endereços (pessoas)",
  PersonEducation: "Escolaridade (pessoas)",
  PersonBenefit: "Benefícios (pessoas)",
  PersonDetention: "Restrições (pessoas)",
  PersonMedication: "Medicações (pessoas)",
  PersonHealthCondition: "Condições de saúde (pessoas)",

  PantryItem: "Alimentos da despensa",
  PantryEntry: "Entradas da despensa",
  PantryExit: "Saídas da despensa",
  PantryDonor: "Doadores (despensa)",

  Project: "Projetos",
  ProjectGroup: "Grupos (projetos)",
  ProjectEnrollment: "Inscrições (projetos)",

  Program: "Programas",

  User: "Usuários",
  Role: "Perfis",
  Permission: "Permissões",
  Tenant: "Instituição",
};

export function formatAuditEntity(entity: string) {
  const key = String(entity ?? "").trim();
  if (!key) return "—";
  return auditEntityLabels[key] ?? key;
}
