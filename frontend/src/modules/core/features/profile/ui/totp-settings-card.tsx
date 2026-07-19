"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { confirmTotp, disableTotp, setupTotp, type TotpSetupResponse } from "@/modules/core/api/mfa";
import { useQrCodeDataUrl } from "../hooks/use-qr-code-data-url";

type TotpSettingsCardProps = {
  token: string;
  enabled: boolean;
  onChanged?: () => void;
};

export function TotpSettingsCard({
  token,
  enabled,
  onChanged,
}: TotpSettingsCardProps) {
  const { toast } = useToast();
  const [setup, setSetup] = useState<TotpSetupResponse | null>(null);
  const [code, setCode] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);
  const qr = useQrCodeDataUrl(setup?.otpauthUrl ?? null);

  const expiresLabel = useMemo(() => {
    if (!setup?.expiresAt) return null;
    const date = new Date(setup.expiresAt);
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(date);
  }, [setup?.expiresAt]);

  const handleSetup = async () => {
    setLoading(true);
    try {
      const response = await setupTotp(token);
      setSetup(response);
      setCode("");
      setRecoveryCodes(null);
      toast({
        title: "2FA iniciado",
        description: "Abra seu app autenticador e adicione o código.",
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Erro",
        description:
          err && typeof err === "object" && "message" in err
            ? String((err as { message?: string }).message)
            : "Falha ao iniciar 2FA.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!setup) return;
    setLoading(true);
    try {
      const response = await confirmTotp(token, { setupId: setup.setupId, code });
      setRecoveryCodes(response.recoveryCodes);
      toast({ title: "2FA ativado" });
      onChanged?.();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Erro",
        description:
          err && typeof err === "object" && "message" in err
            ? String((err as { message?: string }).message)
            : "Código inválido.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    setLoading(true);
    try {
      await disableTotp(token, { code: disableCode });
      setDisableCode("");
      setSetup(null);
      setRecoveryCodes(null);
      toast({ title: "2FA desativado" });
      onChanged?.();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Erro",
        description:
          err && typeof err === "object" && "message" in err
            ? String((err as { message?: string }).message)
            : "Falha ao desativar 2FA.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3">
        <p className="text-sm font-semibold">Segurança (2FA)</p>
        <p className="text-xs text-muted-foreground">
          Use um app autenticador para proteger sua conta.
        </p>
      </div>

      {enabled ? (
        <div className="space-y-3">
          <p className="text-sm text-foreground">
            Status: <span className="font-semibold">Ativado</span>
          </p>
          <div>
            <label className="text-xs text-muted-foreground">Código para desativar</label>
            <Input
              value={disableCode}
              onChange={(e) => setDisableCode(e.target.value)}
              placeholder="000000"
              inputMode="numeric"
            />
          </div>
          <Button
            variant="destructive"
            onClick={handleDisable}
            disabled={loading || !disableCode.trim()}
          >
            Desativar 2FA
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-foreground">
            Status: <span className="font-semibold">Desativado</span>
          </p>
          <Button onClick={handleSetup} disabled={loading}>
            Ativar 2FA
          </Button>

          {setup ? (
            <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-3">
              <div className="space-y-2">
                <p className="text-xs font-semibold">QR Code</p>
                <p className="text-[11px] text-muted-foreground">
                  Escaneie no Google Authenticator / Microsoft Authenticator.
                </p>
                {qr.isLoading ? (
                  <div className="h-[240px] w-[240px] rounded bg-background/60 border border-border flex items-center justify-center text-xs text-muted-foreground">
                    Gerando QR...
                  </div>
                ) : qr.dataUrl ? (
                  <Image
                    src={qr.dataUrl}
                    alt="QR Code 2FA"
                    width={240}
                    height={240}
                    unoptimized
                    className="h-[240px] w-[240px] rounded border border-border bg-background p-2"
                  />
                ) : (
                  <div className="rounded border border-border bg-background px-3 py-2 text-xs text-muted-foreground">
                    {qr.error ?? "QR indisponível. Use a chave (secret) abaixo."}
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <p className="text-xs font-semibold">Chave (secret)</p>
                <code className="block break-all rounded bg-background px-2 py-1 text-xs">
                  {setup.secret}
                </code>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    await navigator.clipboard.writeText(setup.secret);
                    toast({ title: "Copiado" });
                  }}
                >
                  Copiar chave
                </Button>
                <p className="text-[11px] text-muted-foreground">
                  Expira em: {expiresLabel ?? "-"}
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-semibold">otpauth URL</p>
                <code className="block break-all rounded bg-background px-2 py-1 text-[11px]">
                  {setup.otpauthUrl}
                </code>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    await navigator.clipboard.writeText(setup.otpauthUrl);
                    toast({ title: "Copiado" });
                  }}
                >
                  Copiar URL
                </Button>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Código do app</label>
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="000000"
                  inputMode="numeric"
                />
                <Button onClick={handleConfirm} disabled={loading || !code.trim()}>
                  Confirmar
                </Button>
              </div>

              {recoveryCodes?.length ? (
                <div className="space-y-2">
                  <p className="text-xs font-semibold">Recovery codes</p>
                  <p className="text-[11px] text-muted-foreground">
                    Salve esses códigos. Eles só aparecem uma vez.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {recoveryCodes.map((item) => (
                      <code
                        key={item}
                        className="rounded bg-background px-2 py-1 text-xs"
                      >
                        {item}
                      </code>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
