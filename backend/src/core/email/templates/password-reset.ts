export function buildPasswordResetEmail(input: {
  tenantName: string;
  resetUrl: string;
  expiresMinutes: number;
}) {
  const subject = `Redefinição de senha - ${input.tenantName}`;

  const text =
    `Olá!\n\n` +
    `Recebemos uma solicitação para redefinir sua senha em ${input.tenantName}.\n\n` +
    `Abra o link abaixo para definir uma nova senha:\n` +
    `${input.resetUrl}\n\n` +
    `Esse link expira em ${input.expiresMinutes} minutos.\n\n` +
    `Se você não solicitou a redefinição, ignore este email.`;

  const html = `
  <div style="background:#f3f4f6;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e5e7eb;">
      <div style="padding:20px 24px;background:#0b5cff;color:#ffffff;">
        <div style="font-size:14px;letter-spacing:.08em;text-transform:uppercase;opacity:.95;">Terceiro Gestor</div>
        <div style="font-size:18px;font-weight:700;margin-top:6px;">Redefinição de senha</div>
      </div>
      <div style="padding:24px;">
        <p style="margin:0 0 12px;font-size:14px;color:#111827;">
          Você solicitou a redefinição de senha para <strong>${escapeHtml(input.tenantName)}</strong>.
        </p>
        <p style="margin:0 0 16px;font-size:14px;color:#111827;">
          Clique no botão abaixo para definir uma nova senha:
        </p>

        <div style="text-align:center;margin:20px 0;">
          <a href="${escapeHtml(input.resetUrl)}"
             style="display:inline-block;background:#0b5cff;color:#ffffff;text-decoration:none;padding:12px 16px;border-radius:10px;font-weight:700;font-size:14px;">
            Redefinir senha
          </a>
        </div>

        <p style="margin:0 0 14px;font-size:12px;color:#6b7280;">
          Este link expira em <strong>${input.expiresMinutes} minutos</strong>.
        </p>

        <p style="margin:0 0 14px;font-size:12px;color:#6b7280;">
          Se o botão não funcionar, copie e cole este link no navegador:
        </p>
        <div style="word-break:break-all;font-size:12px;color:#111827;background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:10px;">
          ${escapeHtml(input.resetUrl)}
        </div>

        <div style="border-top:1px solid #e5e7eb;margin-top:18px;padding-top:14px;">
          <p style="margin:0;font-size:12px;color:#6b7280;">
            Se você não solicitou a redefinição, ignore este email.
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
