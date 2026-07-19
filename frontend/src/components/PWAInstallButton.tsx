"use client";

import { usePWAInstall } from "@/hooks/usePWAInstall";
import { Button, type ButtonProps } from "./ui/button";
import { MonitorDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type PWAInstallButtonProps = Omit<
  ButtonProps,
  "onClick" | "children" | "type"
> & {
  label?: string;
  forceDisplay?: boolean;
};

export function PWAInstallButton({
  variant = "outline",
  size = "icon-sm",
  className,
  label = "Instalar app",
  forceDisplay = false,
  ...props
}: PWAInstallButtonProps) {
  const { isInstallable, install } = usePWAInstall();

  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const isIOS = /iphone|ipad|ipod/i.test(ua);
  const shouldRender = isInstallable || forceDisplay || isIOS;
  if (!shouldRender) return null;

  return (
    <Button
      onClick={() => {
        if (isInstallable) {
          void install();
          return;
        }

        const secure =
          typeof window !== "undefined" ? window.isSecureContext : false;
        const isStandalone =
          typeof window !== "undefined" &&
          (window.matchMedia?.("(display-mode: standalone)")?.matches ?? false);

        if (isStandalone) return;

        if (!secure) {
          window.alert(
            "Para instalar como app (PWA), o navegador exige contexto seguro.\n\nUse HTTPS (recomendado) ou acesse via localhost.\n\nNo Android/Chrome para DEV, você também pode usar o flag:\nchrome://flags/#unsafely-treat-insecure-origin-as-secure",
          );
          return;
        }

        if (isIOS) {
          window.alert(
            "No iPhone/iPad: abra o menu Compartilhar e toque em “Adicionar à Tela de Início”.\n\nObs.: o Safari iOS não dispara o prompt automático (beforeinstallprompt).",
          );
          return;
        }

        window.alert(
          "Instalação PWA não disponível agora.\n\nPara o prompt aparecer: use HTTPS (ou localhost), tenha manifest + service worker ativo e teste no Chrome/Edge Android. Em ambiente dev isso pode não ficar “instalável”.",
        );
      }}
      type="button"
      variant={variant}
      size={size}
      className={cn(className)}
      aria-label={label}
      title={label}
      {...props}
    >
      <MonitorDown className="size-4" />
    </Button>
  );
}
