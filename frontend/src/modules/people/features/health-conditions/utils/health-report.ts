import { buildExportMeta } from "@/lib/auth-utils";
import { formatDate } from "@/modules/people/shared/domain/utils";
import type { HealthCondition, Person } from "@/modules/people/shared/domain/types";

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

const formatText = (value?: string | null) =>
  value ? escapeHtml(value) : "-";

export function printHealthReport({
  token,
  person,
  conditions,
}: {
  token: string;
  person: Person;
  conditions: HealthCondition[];
}) {
  const meta = buildExportMeta({
    token,
    title: "Relatorio de saude",
    subtitle: person.fullName,
  });

  const rows = conditions
    .map(
      (condition) => `
      <tr>
        <td>${formatText(condition.type)}</td>
        <td>${formatText(condition.description)}</td>
        <td>${formatText(condition.severity)}</td>
        <td>${formatText(condition.diagnosisDate ? formatDate(condition.diagnosisDate) : "-")}</td>
        <td>${formatText(condition.documentUrl)}</td>
        <td>${formatText(condition.notes)}</td>
      </tr>`,
    )
    .join("");

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
          h1, h2 { margin: 0; }
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
          .section {
            margin-top: 16px;
            padding: 14px 16px;
            background: #fff;
            border-radius: 12px;
            border: 1px solid #e2e8f0;
          }
          .section-title { font-size: 14px; margin-bottom: 8px; color: #0f172a; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { border-bottom: 1px solid #e2e8f0; padding: 8px 10px; text-align: left; }
          th { background-color: #f1f5f9; color: #0f172a; font-weight: 600; }
          .muted { color: #64748b; font-size: 12px; }
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
        </div>

        <div class="section">
          <h2 class="section-title">Condicoes de saude</h2>
          ${rows ? `
            <table>
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Descricao</th>
                  <th>Severidade</th>
                  <th>Diagnostico</th>
                  <th>Documento</th>
                  <th>Observacoes</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          ` : `<p class="muted">Nenhuma condicao registrada.</p>`}
        </div>
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


