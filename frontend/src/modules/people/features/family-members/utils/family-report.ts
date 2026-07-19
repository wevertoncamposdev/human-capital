import { buildExportMeta } from "@/lib/auth-utils";
import { formatCurrency, getAgeFromBirthDate } from "@/modules/people/shared/domain/utils";
import type {
  FamilyIncomeSummary,
  HouseholdAsset,
  HouseholdProfile,
  Person,
  PersonAssetsGroup,
  PersonRelation,
  HouseholdMember,
} from "@/modules/people/shared/domain/types";

export type FamilyReportType = "full" | "composition" | "residential";

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const formatFlags = (flags: string[]) =>
  flags.length
    ? flags.map((flag) => `<span class="badge">${escapeHtml(flag)}</span>`).join(" ")
    : "-";

const formatAssetLabel = (asset: {
  item: string;
  quantity?: number | null;
  condition?: string | null;
}) => {
  const quantity = asset.quantity ? ` (Qtd: ${asset.quantity})` : "";
  const condition = asset.condition ? ` - ${asset.condition}` : "";
  return `${asset.item}${quantity}${condition}`;
};

export function printFamilyReport({
  token,
  person,
  householdMembers,
  relations,
  incomeSummary,
  householdProfile,
  householdAssets,
  personAssetsByMember,
  reportType = "full",
}: {
  token: string;
  person: Person;
  householdMembers: HouseholdMember[];
  relations: PersonRelation[];
  incomeSummary: FamilyIncomeSummary | null;
  householdProfile: HouseholdProfile | null;
  householdAssets: HouseholdAsset[];
  personAssetsByMember: PersonAssetsGroup[];
  reportType?: FamilyReportType;
}) {
  const contributionMap = new Map<string, number>();
  incomeSummary?.contributions?.forEach((item) => {
    contributionMap.set(item.personId, item.amount);
  });

  const showComposition = reportType === "full" || reportType === "composition";
  const showResidential = reportType === "full" || reportType === "residential";
  const showFinancial = reportType === "full";

  const meta = buildExportMeta({
    token,
    title:
      reportType === "composition"
        ? "Relatorio de composicao familiar"
        : reportType === "residential"
        ? "Relatorio residencial"
        : "Relatorio do nucleo familiar",
    subtitle: person.fullName,
  });
  const personAge = getAgeFromBirthDate(person.birthDate);
  const personDetails = [
    person.birthDate ? `Nascimento: ${person.birthDate}` : null,
    personAge !== null ? `Idade: ${personAge} anos` : null,
    person.email ? `Email: ${person.email}` : null,
    person.phone ? `Telefone: ${person.phone}` : null,
  ].filter(Boolean) as string[];

  const livingMembers = householdMembers.map((member) => {
    const relation = relations.find(
      (item) => item.relatedPersonId === member.personId && item.livesTogether,
    );
    const contributionAmount = contributionMap.get(member.personId) ?? 0;
    const flags = [
      member.isLegalGuardian ? "Responsavel legal" : null,
      member.isProvider ? "Provedor" : null,
      contributionAmount > 0
        ? `Contribui ${formatCurrency(contributionAmount)}`
        : member.isIncomeContributor
        ? "Contribui renda"
        : null,
      member.isDependent ? "Dependente" : null,
    ].filter(Boolean) as string[];
    return {
      id: member.personId,
      name: member.person.fullName,
      relation: relation?.type ?? member.role ?? "Morador",
      flags,
    };
  });

  const externalRelations = relations.filter((relation) => !relation.livesTogether);
  const externalRows = externalRelations.map((relation) => {
    const contributionAmount =
      contributionMap.get(relation.relatedPersonId) ?? 0;
    const flags = [
      relation.isLegalGuardian ? "Responsavel legal" : null,
      contributionAmount > 0
        ? `Contribui ${formatCurrency(contributionAmount)}`
        : null,
    ].filter(Boolean) as string[];
    return {
      id: relation.relatedPersonId,
      name: relation.relatedPerson.fullName,
      relation: relation.type,
      flags,
    };
  });

  const groupedHouseholdAssets = householdAssets.reduce<Record<string, HouseholdAsset[]>>(
    (acc, asset) => {
      const key = asset.category || "Sem categoria";
      if (!acc[key]) acc[key] = [];
      acc[key].push(asset);
      return acc;
    },
    {},
  );

  const assetsHtml = Object.entries(groupedHouseholdAssets)
    .map(([category, items]) => {
      const list = items
        .map((item) => `<li>${escapeHtml(formatAssetLabel(item))}</li>`)
        .join("");
      return `<div class="asset-group"><strong>${escapeHtml(
        category,
      )}</strong><ul>${list}</ul></div>`;
    })
    .join("");

  const peopleAssetsHtml = personAssetsByMember
    .map((group) => {
      const items = group.assets
        .map((item) => `<li>${escapeHtml(formatAssetLabel(item))}</li>`)
        .join("");
      return `<div class="asset-group">
        <strong>${escapeHtml(group.person.fullName)}</strong>
        ${items ? `<ul>${items}</ul>` : `<p class="muted">Sem itens cadastrados.</p>`}
      </div>`;
    })
    .join("");

  const summary = incomeSummary ?? {
    totalIncome: 0,
    perCapitaIncome: 0,
    totalExpenses: 0,
    perCapitaExpenses: 0,
    benefitsTotal: 0,
    pensionTotal: 0,
  };

  const html = `
    <html>
      <head>
        <title>${escapeHtml(meta.title)}</title>
        <style>
          body {
            font-family: "Inter", "Segoe UI", Arial, sans-serif;
            padding: 28px;
            color: #0f172a;
            background: #f8fafc;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          h1, h2, h3 { margin: 0; }
          .header {
            background: linear-gradient(135deg, #e0f2fe 0%, #ecfdf3 100%);
            border: 1px solid #cbd5f5;
            border-radius: 12px;
            padding: 16px 18px;
            margin-bottom: 16px;
          }
          .title { font-size: 20px; margin-bottom: 6px; }
          .subtitle { font-size: 12px; color: #475569; margin-bottom: 8px; }
          .meta { font-size: 12px; color: #1e293b; display: grid; gap: 4px; }
          .section { margin-top: 16px; padding: 14px 16px; background: #fff; border-radius: 12px; border: 1px solid #e2e8f0; }
          .section-title { font-size: 14px; margin-bottom: 8px; color: #0f172a; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { border-bottom: 1px solid #e2e8f0; padding: 8px 10px; text-align: left; vertical-align: top; }
          th { background-color: #f1f5f9; color: #0f172a; font-weight: 600; }
          .badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 999px;
            font-size: 11px;
            font-weight: 600;
            background: #e2e8f0;
            color: #0f172a;
            margin-right: 4px;
          }
          .muted { color: #64748b; font-size: 12px; }
          .grid { display: grid; gap: 8px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .metric { padding: 8px; border-radius: 10px; background: #f8fafc; border: 1px solid #e2e8f0; }
          .metric strong { display: block; font-size: 12px; color: #64748b; }
          ul { margin: 6px 0 0 16px; padding: 0; }
          .asset-group { margin-bottom: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="title">${escapeHtml(meta.title)}</h1>
          ${meta.subtitle ? `<p class="subtitle">${escapeHtml(meta.subtitle)}</p>` : ""}
          <div class="meta">
            ${meta.tenant ? `<div><strong>Instituicao:</strong> ${escapeHtml(meta.tenant)}</div>` : ""}
            ${meta.issuedBy ? `<div><strong>Emitido por:</strong> ${escapeHtml(meta.issuedBy)}</div>` : ""}
            ${meta.issuedAt ? `<div><strong>Data:</strong> ${escapeHtml(meta.issuedAt)}</div>` : ""}
          </div>
          ${
            personDetails.length
              ? `<div class="meta">${personDetails
                  .map((item) => `<div>${escapeHtml(item)}</div>`)
                  .join("")}</div>`
              : ""
          }
        </div>

        ${showComposition ? `
          <div class="section">
            <h2 class="section-title">Moram juntos</h2>
            ${livingMembers.length ? `
              <table>
                <thead>
                  <tr><th>Nome</th><th>Parentesco</th><th>Indicadores</th></tr>
                </thead>
                <tbody>
                  ${livingMembers
                    .map(
                      (member) => `
                      <tr>
                        <td>${escapeHtml(member.name)}</td>
                        <td>${escapeHtml(member.relation)}</td>
                        <td>${formatFlags(member.flags)}</td>
                      </tr>`
                    )
                    .join("")}
                </tbody>
              </table>
            ` : `<p class="muted">Nenhum familiar registrado na residencia.</p>`}
          </div>

          <div class="section">
            <h2 class="section-title">Nao moram juntos</h2>
            ${externalRows.length ? `
              <table>
                <thead>
                  <tr><th>Nome</th><th>Parentesco</th><th>Indicadores</th></tr>
                </thead>
                <tbody>
                  ${externalRows
                    .map(
                      (member) => `
                      <tr>
                        <td>${escapeHtml(member.name)}</td>
                        <td>${escapeHtml(member.relation)}</td>
                        <td>${formatFlags(member.flags)}</td>
                      </tr>`
                    )
                    .join("")}
                </tbody>
              </table>
            ` : `<p class="muted">Nenhum familiar registrado fora da residencia.</p>`}
          </div>
        ` : ""}

        ${showFinancial ? `
          <div class="section">
            <h2 class="section-title">Computacao das rendas</h2>
            <div class="grid">
              <div class="metric"><strong>Renda total</strong>${formatCurrency(summary.totalIncome)}</div>
              <div class="metric"><strong>Renda per capita</strong>${formatCurrency(summary.perCapitaIncome)}</div>
              <div class="metric"><strong>Gastos totais</strong>${formatCurrency(summary.totalExpenses)}</div>
              <div class="metric"><strong>Gasto per capita</strong>${formatCurrency(summary.perCapitaExpenses)}</div>
              <div class="metric"><strong>Beneficios</strong>${formatCurrency(summary.benefitsTotal)}</div>
              <div class="metric"><strong>Pensao</strong>${formatCurrency(summary.pensionTotal)}</div>
            </div>
          </div>
        ` : ""}

        ${showResidential ? `
          <div class="section">
            <h2 class="section-title">Relatorio da moradia</h2>
            ${householdProfile ? `
              <div class="grid">
                <div class="metric"><strong>Tipo</strong>${escapeHtml(householdProfile.type ?? "-")}</div>
                <div class="metric"><strong>Condicao</strong>${escapeHtml(householdProfile.condition ?? "-")}</div>
                <div class="metric"><strong>Propriedade</strong>${escapeHtml(householdProfile.ownership ?? "-")}</div>
                <div class="metric"><strong>Area (m2)</strong>${householdProfile.areaM2 ?? "-"}</div>
                <div class="metric"><strong>Comodos</strong>${householdProfile.rooms ?? "-"}</div>
                <div class="metric"><strong>Banheiros</strong>${householdProfile.bathrooms ?? "-"}</div>
              </div>
            ` : `<p class="muted">Nenhuma informacao de moradia cadastrada.</p>`}
          </div>

          <div class="section">
            <h2 class="section-title">Bens e servicos compartilhados</h2>
            ${assetsHtml || `<p class="muted">Nenhum item compartilhado cadastrado.</p>`}
          </div>

          <div class="section">
            <h2 class="section-title">Itens individuais</h2>
            ${peopleAssetsHtml || `<p class="muted">Nenhum item individual cadastrado.</p>`}
          </div>
        ` : ""}
      </body>
    </html>
  `;

  const printWindow = window.open("", "_blank");
  if (!printWindow) return;
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  const triggerPrint = () => {
    printWindow.focus();
    printWindow.print();
  };
  if (printWindow.document.readyState === "complete") {
    setTimeout(triggerPrint, 50);
  } else {
    printWindow.onload = () => setTimeout(triggerPrint, 50);
  }
}


