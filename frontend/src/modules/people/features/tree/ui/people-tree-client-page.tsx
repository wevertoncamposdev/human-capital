"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { PageBreadcrumb } from "@/components/layout/PageBreadcrumb";
import { SectionCard } from "@/components/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FamilyTreeMap } from "@/modules/people/shared/ui/family-tree-map";
import { useAuth } from "@/features/auth/auth-context";
import { useCurrentUser } from "@/features/auth/current-user-context";
import { useRequireAuth } from "@/hooks/use-require-auth";
import {
  getPersonRelationsTree,
  type ApiPersonRelationsTreeResponse,
} from "@/modules/people/api";
import { resolvePersonDisplayNames } from "@/modules/people/shared/domain/utils";
import {
  getTenantSlugFromPath,
  withTenantPath,
} from "@/lib/tenant-path";
import type { PersonRelationsTree } from "@/modules/people/shared/domain/types";

const depthOptions = [
  { value: "1", label: "1 nível" },
  { value: "2", label: "2 níveis" },
  { value: "3", label: "3 níveis" },
  { value: "4", label: "4 níveis" },
];

const relationLegend = [
  "Pai/Mãe",
  "Filho(a)",
  "Irmão(a)",
  "Cônjuge",
];

const mapApiTree = (
  data: ApiPersonRelationsTreeResponse,
): PersonRelationsTree => ({
  rootId: data.rootId,
  depth: data.depth,
  truncated: data.truncated,
  nodes: data.nodes.map((node) => ({
    ...node,
  })),
  edges: data.edges.map((edge) => ({
    ...edge,
  })),
});

export function PeopleTreeClientPage() {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const tenantSlug = getTenantSlugFromPath(pathname);
  const { token } = useAuth();
  const { permissions } = useCurrentUser();
  const { isLoading: authLoading } = useRequireAuth();

  const canRead = permissions.includes("people.read");

  const [depthValue, setDepthValue] = React.useState("2");
  const [tree, setTree] = React.useState<PersonRelationsTree | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const personId = React.useMemo(() => {
    const value = params?.id;
    return Array.isArray(value) ? value[0] : value;
  }, [params]);

  React.useEffect(() => {
    if (!token || !personId || !canRead) return;
    setIsLoading(true);
    setError(null);
    getPersonRelationsTree(token, personId, {
      depth: Number(depthValue) || 2,
    })
      .then((data) => setTree(mapApiTree(data)))
      .catch((err) => {
        const message =
          err && typeof err === "object" && "message" in err
            ? String((err as { message?: string }).message)
            : "Falha ao carregar árvore genealógica.";
        setError(message);
      })
      .finally(() => setIsLoading(false));
  }, [token, personId, depthValue, canRead]);

  if (authLoading) {
    return (
      <div className="px-4 py-6 text-sm text-muted-foreground">
        Carregando...
      </div>
    );
  }

  if (!canRead) {
    return (
      <div className="px-4 py-6 text-sm text-muted-foreground">
        Voc\u00ea n\u00e3o tem permiss\u00e3o para acessar esta \u00e1rea.
      </div>
    );
  }

  const nodes = tree?.nodes ?? [];
  const edges = tree?.edges ?? [];
  const rootNode = tree ? nodes.find((node) => node.id === tree.rootId) : null;
  const rootLabel = rootNode
    ? resolvePersonDisplayNames(rootNode.fullName, rootNode.socialName)
        .primary
    : "Pessoa";
  const detailPath = personId ? `/people/${personId}` : "/people";
  const detailHref = withTenantPath(detailPath, tenantSlug);
  const treePath = (id: string) =>
    withTenantPath(`/people/${id}/tree`, tenantSlug);

  return (
    <>
      <PageBreadcrumb
        title="Árvore genealógica"
        items={[
          { label: "Pessoas", href: "/people" },
          { label: rootLabel, href: detailPath },
          { label: "Árvore genealógica" },
        ]}
        actionSlot={
          <Button variant="outline" size="sm" asChild>
            <Link href={detailHref}>Voltar ao detalhe</Link>
          </Button>
        }
      />

      <div className="space-y-6 px-4 py-6">
        <SectionCard
          title="Mapa de relações"
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">
                Profundidade
              </span>
              <Select value={depthValue} onValueChange={setDepthValue}>
                <SelectTrigger className="h-8 w-[120px]">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {depthOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          }
          footer={
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
              <span>Legenda:</span>
              {relationLegend.map((label) => (
                <Badge key={label} variant="outline">
                  {label}
                </Badge>
              ))}
            </div>
          }
        >
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary">
              {nodes.length} pessoas encontradas
            </Badge>
            <Badge variant="outline">
              Níveis: {tree?.depth ?? depthValue}
            </Badge>
            {tree?.truncated ? (
              <Badge variant="destructive">
                Limite de pessoas atingido
              </Badge>
            ) : null}
          </div>

          {error ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          {isLoading ? (
            <div className="rounded-xl border border-border/50 bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
              Carregando árvore...
            </div>
          ) : null}

          {!isLoading && !error && tree ? (
            <div className="rounded-2xl border border-dashed border-border/60 bg-muted/10 px-4 py-4">
              <FamilyTreeMap
                rootId={tree.rootId}
                nodes={nodes}
                edges={edges}
                tenantSlug={tenantSlug}
                onNavigate={(id) => router.push(treePath(id))}
              />
            </div>
          ) : null}
        </SectionCard>
      </div>
    </>
  );
}



