export function buildTenantRegistrationCodeEmail(input: {
  tenantName: string;
  code: string;
  expiresMinutes: number;
}) {
  const subject = `Confirmação de cadastro - ${input.tenantName}`;

  const text =
    `Olá!\n\n` +
    `Seu código de confirmação é: ${input.code}\n\n` +
    `Esse código expira em ${input.expiresMinutes} minutos.\n\n` +
    `Se você não solicitou este cadastro, ignore este email.`;

  const html = `
  <div style="background:#f3f4f6;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e5e7eb;">
      <div style="padding:20px 24px;background:#0b5cff;color:#ffffff;">
        <div style="font-size:14px;letter-spacing:.08em;text-transform:uppercase;opacity:.95;">Terceiro Gestor</div>
        <div style="font-size:18px;font-weight:700;margin-top:6px;">Confirmação de cadastro</div>
      </div>
      <div style="padding:24px;">
        <p style="margin:0 0 12px;font-size:14px;color:#111827;">
          Você solicitou o cadastro da instituição <strong>${escapeHtml(input.tenantName)}</strong>.
        </p>
        <p style="margin:0 0 16px;font-size:14px;color:#111827;">
          Use o código abaixo para confirmar:
        </p>

        <div style="text-align:center;margin:18px 0;">
          <div style="display:inline-block;padding:14px 18px;border-radius:12px;border:1px solid #e5e7eb;background:#f9fafb;font-size:28px;letter-spacing:.25em;font-weight:800;color:#111827;">
            ${escapeHtml(input.code)}
          </div>
        </div>

        <p style="margin:0 0 18px;font-size:13px;color:#6b7280;">
          Este código expira em <strong>${input.expiresMinutes} minutos</strong>.
        </p>

        <div style="border-top:1px solid #e5e7eb;margin-top:18px;padding-top:14px;">
          <p style="margin:0;font-size:12px;color:#6b7280;">
            Se você não solicitou este cadastro, ignore este email.
          </p>
        </div>
      </div>
    </div>
    <div style="max-width:560px;margin:10px auto 0;color:#9ca3af;font-size:11px;text-align:center;">
      © ${new Date().getFullYear()} Terceiro Gestor
    </div>
  </div>`;

  return { subject, text, html };
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

