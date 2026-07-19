import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';

type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly config: ConfigService) {}

  async send(input: SendEmailInput) {
    const host = this.config.get<string>('SMTP_HOST')?.trim();
    const port = Number(this.config.get<string>('SMTP_PORT') ?? 587);
    const user = this.config.get<string>('SMTP_USER')?.trim();
    const pass = this.config.get<string>('SMTP_PASS')?.trim();
    const from =
      this.config.get<string>('SMTP_FROM')?.trim() ??
      this.config.get<string>('SMTP_USER')?.trim() ??
      'no-reply@example.com';

    if (!host || !user || !pass) {
      this.logger.warn(
        `SMTP not configured; printing email to console (to=${input.to}, subject=${input.subject}).`,
      );
      this.logger.log(input.text);
      return { ok: true, mode: 'console' as const };
    }

    const baseTransport = {
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    } as const;

    const sendMail = async (transportOptions: nodemailer.TransportOptions) => {
      const transporter = nodemailer.createTransport(transportOptions);
      await transporter.sendMail({
        from,
        to: input.to,
        subject: input.subject,
        text: input.text,
        ...(input.html ? { html: input.html } : {}),
      });
    };

    try {
      await sendMail(baseTransport);
    } catch (error: any) {
      // Alguns provedores falham com AUTH PLAIN mas aceitam AUTH LOGIN.
      if (error?.code === 'EAUTH') {
        try {
          await sendMail({ ...baseTransport, authMethod: 'LOGIN' } as any);
        } catch (nextError: any) {
          this.logger.error(
            `SMTP authentication failed (host=${host}, port=${port}, user=${user}).`,
            nextError?.stack,
          );
          throw new BadRequestException(
            'Falha ao autenticar no SMTP. Verifique SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS (e se a conta exige senha de aplicativo).',
          );
        }
      } else {
        this.logger.error(
          `SMTP send failed (host=${host}, port=${port}, user=${user}).`,
          error?.stack,
        );
        throw new BadRequestException(
          'Falha ao enviar email. Verifique as credenciais SMTP e as configurações do provedor.',
        );
      }
    }

    return { ok: true, mode: 'smtp' as const };
  }
}
