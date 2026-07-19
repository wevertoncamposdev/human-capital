import type { SelectOption } from "@/web-client/forms/types";
import type {
  EnrollmentStatus,
  ProjectParticipationRole,
  ProjectStatus,
} from "@/modules/projects/api";

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  PLANNED: "Planejado",
  ACTIVE: "Ativo",
  CLOSED: "Encerrado",
};

export const PROJECT_STATUS_OPTIONS: SelectOption[] = (
  Object.entries(PROJECT_STATUS_LABELS) as Array<[ProjectStatus, string]>
).map(([value, label]) => ({ value, label }));

export const ENROLLMENT_STATUS_LABELS: Record<EnrollmentStatus, string> = {
  ACTIVE: "Ativa",
  ENDED: "Encerrada",
};

export const ENROLLMENT_STATUS_OPTIONS: SelectOption[] = (
  Object.entries(ENROLLMENT_STATUS_LABELS) as Array<[EnrollmentStatus, string]>
).map(([value, label]) => ({ value, label }));

export const PROJECT_PARTICIPATION_ROLE_LABELS: Record<ProjectParticipationRole, string> = {
  PUBLICO_ATENDIDO: "Publico atendido",
  FAMILIAR: "Familiar",
  VOLUNTARIO: "Voluntario",
  EQUIPE_TECNICA: "Equipe tecnica",
  FUNCIONARIO: "Funcionario",
  OFICINEIRO: "Oficineiro",
  PARCEIRO: "Parceiro",
  DOADOR: "Doador",
  PATROCINADOR: "Patrocinador",
};

export const PROJECT_PARTICIPATION_ROLE_OPTIONS: SelectOption[] = (
  Object.entries(PROJECT_PARTICIPATION_ROLE_LABELS) as Array<
    [ProjectParticipationRole, string]
  >
).map(([value, label]) => ({ value, label }));
