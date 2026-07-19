"use client";

import * as React from "react";
import { Pie, PieChart } from "recharts";
import { Badge } from "@/components/ui/badge";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { formatDateOnlyPtBR } from "@/lib/date";
import { resolveMediaUrl } from "@/lib/api";
import type {
  ApiProjectAction,
  ApiProjectActionPeopleParticipation,
  ProjectActionAttendancesListItem,
} from "@/modules/actions/api";
import { ACTION_PEOPLE_PARTICIPATION_ROLE_LABELS } from "@/modules/actions/shared/domain/actions.constants";
import { ACTION_REPORT_TEXT } from "../config/action-report.constants";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type ActionReportPreviewProps = {
  action: ApiProjectAction;
  rows: ProjectActionAttendancesListItem[];
  peopleParticipations: ApiProjectActionPeopleParticipation[];
  photoPaths: string[];
  canShowPeople: boolean;
  printMode?: boolean;
};

function formatPeriod(start: string | null, end: string | null) {
  const startLabel = start ? formatDateOnlyPtBR(start) : "";
  const endLabel = end ? formatDateOnlyPtBR(end) : "";
  if (!startLabel && !endLabel) return "—";
  if (startLabel && endLabel) return `${startLabel} — ${endLabel}`;
  return startLabel ? `${startLabel} —` : `— ${endLabel}`;
}

export function ActionReportPreview({
  action,
  rows,
  peopleParticipations,
  photoPaths,
  canShowPeople,
  printMode = false,
}: ActionReportPreviewProps) {
  const totals = React.useMemo(() => {
    let presentes = 0;
    let faltantes = 0;
    let ausentes = 0;
    let justificados = 0;
    let naoRegistrado = 0;

    rows.forEach((row) => {
      const status = row.attendance?.status ?? null;
      if (!status) {
        naoRegistrado += 1;
        faltantes += 1;
        return;
      }
      if (status === "PRESENT") {
        presentes += 1;
        return;
      }
      if (status === "EXCUSED") {
        justificados += 1;
      } else if (status === "ABSENT") {
        ausentes += 1;
      }
      faltantes += 1;
    });

    return { presentes, faltantes, ausentes, justificados, naoRegistrado, total: rows.length };
  }, [rows]);

  const pieConfig = React.useMemo(
    () => ({
      presentes: { label: "Presentes", color: "#16a34a" },
      faltantes: { label: "Faltantes", color: "#dc2626" },
    }),
    [],
  );

  const pieData = React.useMemo(
    () => [
      { bucket: "presentes", value: totals.presentes, fill: "var(--color-presentes)" },
      { bucket: "faltantes", value: totals.faltantes, fill: "var(--color-faltantes)" },
    ],
    [totals.presentes, totals.faltantes],
  );

  const highlights = React.useMemo(() => {
    return rows
      .filter((row) => Boolean(row.attendance?.isHighlight))
      .map((row) => ({
        enrollmentId: row.enrollment.id,
        fullName: row.enrollment.person?.fullName ?? "—",
        avatarUrl: row.enrollment.person?.avatarUrl ?? null,
        qualityScore: row.attendance?.qualityScore ?? null,
        qualityNotes: row.attendance?.qualityNotes ?? null,
      }));
  }, [rows]);

  const renderRichCard = (params: { title: string; html: string | null }) => {
    return (
      <div className="rounded-lg border border-border/60 bg-muted/10 p-4">
        <div className="mb-2 text-sm font-semibold">{params.title}</div>
        {params.html ? (
          <div
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: params.html }}
          />
        ) : (
          <p className="text-xs text-muted-foreground">{ACTION_REPORT_TEXT.hints.notInformed}</p>
        )}
      </div>
    );
  };

  const participationsByRole = React.useMemo(() => {
    return peopleParticipations.reduce<Record<string, ApiProjectActionPeopleParticipation[]>>(
      (accumulator, row) => {
        const key = row.role;
        accumulator[key] = [...(accumulator[key] ?? []), row];
        return accumulator;
      },
      {},
    );
  }, [peopleParticipations]);

  return (
    <div className={printMode ? "space-y-6" : "space-y-5"}>
      <div className="space-y-1">
        <h1 className={printMode ? "text-2xl font-semibold" : "text-xl font-semibold"}>
          {action.title}
        </h1>
        <div className="text-sm text-muted-foreground">
          {action.actionType?.name ?? "—"}
          {action.projectGroup?.name ? ` • ${action.projectGroup.name}` : ""}
          {action.peopleGroup?.name
            ? ` • ${action.peopleGroup.name}`
            : action.targetEnrollment?.person?.fullName
              ? ` • ${action.targetEnrollment.person.fullName}`
              : ""}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-border/60 bg-muted/10 p-4 text-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {ACTION_REPORT_TEXT.titles.planned}
          </div>
          <div className="mt-1 font-medium">
            {formatPeriod(action.plannedStartAt, action.plannedEndAt)}
          </div>
          {typeof action.completionPercent === "number" ? (
            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {ACTION_REPORT_TEXT.labels.completionPercent}
              </div>
              <Badge variant="secondary">{action.completionPercent}%</Badge>
            </div>
          ) : null}
        </div>

        <div className="rounded-lg border border-border/60 bg-muted/10 p-4 text-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {ACTION_REPORT_TEXT.titles.executed}
          </div>
          <div className="mt-1 font-medium">
            {formatPeriod(action.executedStartAt, action.executedEndAt)}
          </div>
          <div className="mt-3 text-xs text-muted-foreground">
            {ACTION_REPORT_TEXT.labels.participantsTotal}:{" "}
            <span className="font-medium text-foreground">{totals.total}</span>
          </div>
        </div>

        <div className="rounded-lg border border-border/60 bg-muted/10 p-4 text-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {ACTION_REPORT_TEXT.titles.presence}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-md border border-border/60 bg-background px-3 py-2">
              <div className="text-muted-foreground">{ACTION_REPORT_TEXT.labels.present}</div>
              <div className="text-base font-semibold">{totals.presentes}</div>
            </div>
            <div className="rounded-md border border-border/60 bg-background px-3 py-2">
              <div className="text-muted-foreground">{ACTION_REPORT_TEXT.labels.missing}</div>
              <div className="text-base font-semibold">{totals.faltantes}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.15fr]">
        <div className="rounded-lg border border-border/60 bg-muted/10 p-4">
          <div className="mb-2 text-sm font-semibold">{ACTION_REPORT_TEXT.titles.chart}</div>
          <ChartContainer config={pieConfig} className="h-[240px]">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent nameKey="bucket" labelKey="bucket" />} />
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="bucket"
                innerRadius={70}
                outerRadius={100}
                paddingAngle={4}
                stroke="var(--background)"
              />
              <ChartLegend content={<ChartLegendContent nameKey="bucket" />} verticalAlign="bottom" />
            </PieChart>
          </ChartContainer>
          <div className="mt-2 text-xs text-muted-foreground">
            {totals.ausentes ? `${ACTION_REPORT_TEXT.breakdown.absent}: ${totals.ausentes}. ` : ""}
            {totals.justificados ? `${ACTION_REPORT_TEXT.breakdown.excused}: ${totals.justificados}. ` : ""}
            {totals.naoRegistrado ? `${ACTION_REPORT_TEXT.breakdown.notRecorded}: ${totals.naoRegistrado}.` : ""}
          </div>
        </div>

        <div className="rounded-lg border border-border/60 bg-muted/10 p-4">
          <div className="mb-2 text-sm font-semibold">{ACTION_REPORT_TEXT.titles.highlights}</div>
          {!canShowPeople ? (
            <p className="text-xs text-muted-foreground">
              {ACTION_REPORT_TEXT.hints.noPeoplePermission}
            </p>
          ) : highlights.length === 0 ? (
            <p className="text-xs text-muted-foreground">{ACTION_REPORT_TEXT.hints.noHighlights}</p>
          ) : (
            <div className="space-y-2">
              {highlights.map((item) => (
                <div key={item.enrollmentId} className="rounded-md border border-border/60 bg-background px-3 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={resolveMediaUrl(item.avatarUrl)} alt={item.fullName} />
                        <AvatarFallback>
                          {(item.fullName ?? "—")
                            .split(" ")
                            .filter(Boolean)
                            .slice(0, 2)
                            .map((part) => part[0])
                            .join("")
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{item.fullName}</div>
                      </div>
                    </div>
                    {typeof item.qualityScore === "number" ? (
                      <Badge variant="outline">{item.qualityScore}/5</Badge>
                    ) : null}
                  </div>
                  {item.qualityNotes ? (
                    <div className="mt-1 text-xs text-muted-foreground">
                      {item.qualityNotes}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {renderRichCard({ title: ACTION_REPORT_TEXT.titles.planHtml, html: action.planHtml })}
        {renderRichCard({ title: ACTION_REPORT_TEXT.titles.executedHtml, html: action.executedHtml })}
        {renderRichCard({ title: ACTION_REPORT_TEXT.titles.conclusionHtml, html: action.conclusionHtml })}
      </div>

      {peopleParticipations.length ? (
        <div className="rounded-lg border border-border/60 bg-muted/10 p-4">
          <div className="mb-3 text-sm font-semibold">Equipe e apoio</div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Object.entries(participationsByRole).map(([role, items]) => (
              <div key={role} className="rounded-md border border-border/60 bg-background px-3 py-3">
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {ACTION_PEOPLE_PARTICIPATION_ROLE_LABELS[
                    role as keyof typeof ACTION_PEOPLE_PARTICIPATION_ROLE_LABELS
                  ] ?? role}
                </div>
                <div className="space-y-2">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center gap-2 text-sm">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={resolveMediaUrl(item.person.avatarUrl)} alt={item.person.fullName} />
                        <AvatarFallback>
                          {(item.person.fullName ?? "—")
                            .split(" ")
                            .filter(Boolean)
                            .slice(0, 2)
                            .map((part) => part[0])
                            .join("")
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate">{item.person.fullName}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {photoPaths.length ? (
        <div>
          <div className="mb-2 text-sm font-semibold">{ACTION_REPORT_TEXT.titles.photos}</div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {photoPaths.map((path) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={path}
                src={resolveMediaUrl(path)}
                alt="Foto da ação"
                className="h-40 w-full rounded-lg object-cover"
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
