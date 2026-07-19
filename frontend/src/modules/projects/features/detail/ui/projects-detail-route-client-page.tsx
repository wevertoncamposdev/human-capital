"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { PageBreadcrumb } from "@/components/layout/PageBreadcrumb";
import { SectionCard } from "@/components/section-card";
import { SectionList, SectionListItem } from "@/components/section-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/features/auth/auth-context";
import { useCurrentUser } from "@/features/auth/current-user-context";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { getProject, type ApiProject } from "@/modules/projects/api";
import {
  PROGRAM_STATUS_LABELS,
  PROGRAM_TYPE_LABELS,
} from "@/modules/programs/shared/domain/programs.constants";
import { PROJECT_STATUS_LABELS } from "@/modules/projects/shared/domain/projects.constants";
import { formatDateOnlyPtBR } from "@/lib/date";
import { ProjectEnrollmentsCard } from "./project-enrollments-card";
import { getTenantSlugFromPath, withTenantPath } from "@/lib/tenant-path";

function formatDate(value: string | null) {
  return formatDateOnlyPtBR(value);
}

function resolveStatusBadge(status: ApiProject["status"]) {
  const label = PROJECT_STATUS_LABELS[status] ?? status;
  switch (status) {
    case "ACTIVE":
      return <Badge variant="secondary">{label}</Badge>;
    case "CLOSED":
      return <Badge variant="outline">{label}</Badge>;
    case "PLANNED":
    default:
      return (
        <Badge className="border-transparent bg-blue-600 text-white">
          {label}
        </Badge>
      );
  }
}

export function ProjectsDetailRouteClientPage({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const params = useParams();
  const pathname = usePathname();
  const tenantSlug = getTenantSlugFromPath(pathname);
  const { token } = useAuth();
  const { permissions } = useCurrentUser();
  const { isAuthenticated, isLoading: authLoading } = useRequireAuth();

  const canReadProject = permissions.includes("projects.read");
  const canReadStructure = permissions.includes("project-structure.read");
  const canReadActions = permissions.includes("actions.read");

  const canReadEnrollments = permissions.includes("enrollments.read");
  const canCreateEnrollments = permissions.includes("enrollments.create");
  const canUpdateEnrollments = permissions.includes("enrollments.update");
  const canDeleteEnrollments = permissions.includes("enrollments.delete");
  const canReadPeople = permissions.includes("people.read");

  const [project, setProject] = React.useState<ApiProject | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const id = Array.isArray(params?.id) ? params.id[0] : params?.id;
    if (!id || !token || !isAuthenticated || !canReadProject) return;
    setLoading(true);
    setError(null);
    getProject(token, id)
      .then((data) => setProject(data))
      .catch((err) => {
        const message =
          err && typeof err === "object" && "message" in err
            ? String((err as { message?: string }).message)
            : "Falha ao carregar projeto.";
        setError(message);
      })
      .finally(() => setLoading(false));
  }, [params, token, isAuthenticated, canReadProject]);

  if (authLoading) {
    return (
      <div className="px-4 py-6 text-sm text-muted-foreground">
        Carregando...
      </div>
    );
  }

  if (!token || !isAuthenticated) {
    return (
      <div className="px-4 py-6 text-sm text-muted-foreground">
        Redirecionando...
      </div>
    );
  }

  if (!canReadProject) {
    return (
      <div className="px-4 py-6 text-sm text-muted-foreground">
        Você não tem permissão para acessar Projetos.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="px-4 py-6 text-sm text-muted-foreground">
        Carregando projeto...
      </div>
    );
  }

  if (error) {
    return <div className="px-4 py-6 text-sm text-destructive">{error}</div>;
  }

  if (!project) {
    return (
      <div className="px-4 py-6 text-sm text-muted-foreground">
        Projeto não encontrado.
      </div>
    );
  }

  const manageMenu = canReadStructure ? (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="secondary">
          Gerenciar <ChevronDown className="ml-2 size-4 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={withTenantPath(`/projects/${project.id}/groups`, tenantSlug)}>
            Grupos
          </Link>
        </DropdownMenuItem>
        {canReadActions ? (
          <DropdownMenuItem asChild>
            <Link href={withTenantPath(`/projects/${project.id}/actions`, tenantSlug)}>
              Ações
            </Link>
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  ) : null;

  return (
    <div className={`flex flex-col gap-6 ${embedded ? "" : "px-4 py-4"}`}>
      {!embedded ? (
        <PageBreadcrumb
          title={`Projeto • ${project.name}`}
          items={[
            { label: "Projetos", href: withTenantPath("/projects", tenantSlug) },
            {
              label: project.name,
              href: withTenantPath(`/projects/${project.id}`, tenantSlug),
            },
          ]}
          actionSlot={manageMenu}
        />
      ) : null}

      <SectionCard
        title="Projeto"
        subtitle="Informações principais do projeto."
        actions={embedded ? manageMenu : undefined}
      >
        <SectionList>
          <SectionListItem
            title={
              <div className="flex flex-wrap items-center gap-2">
                <span>{project.name}</span>
                {resolveStatusBadge(project.status)}
              </div>
            }
            subtitle={project.description ?? "Sem descrição"}
            meta={
              <>
                <span>
                  Programa: <strong>{project.program?.name ?? "-"}</strong>
                </span>
                <span>
                  Tipo:{" "}
                  <strong>
                    {project.program?.type
                      ? PROGRAM_TYPE_LABELS[project.program.type] ??
                        project.program.type
                      : "-"}
                  </strong>
                </span>
                <span>
                  Status do programa:{" "}
                  <strong>
                    {project.program?.status
                      ? PROGRAM_STATUS_LABELS[project.program.status] ??
                        project.program.status
                      : "-"}
                  </strong>
                </span>
                <span>
                  Vigência:{" "}
                  <strong>
                    {project.startsAt || project.endsAt
                      ? `${formatDate(project.startsAt)} — ${formatDate(
                          project.endsAt,
                        )}`
                      : "Não informada"}
                  </strong>
                </span>
              </>
            }
          />
        </SectionList>
      </SectionCard>

      <ProjectEnrollmentsCard
        token={token}
        projectId={project.id}
        canRead={canReadEnrollments}
        canCreate={canCreateEnrollments}
        canUpdate={canUpdateEnrollments}
        canDelete={canDeleteEnrollments}
        canReadPeople={canReadPeople}
      />
    </div>
  );
}
