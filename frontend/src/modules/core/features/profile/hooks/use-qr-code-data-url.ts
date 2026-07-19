"use client";

import * as React from "react";

type UseQrCodeResult = {
  dataUrl: string | null;
  isLoading: boolean;
  error: string | null;
};

export function useQrCodeDataUrl(text: string | null): UseQrCodeResult {
  const [dataUrl, setDataUrl] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!text) {
      setDataUrl(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    let active = true;
    setIsLoading(true);
    setError(null);

    (async () => {
      try {
        const QRCode = await import("qrcode");
        const url = await QRCode.toDataURL(text, {
          errorCorrectionLevel: "M",
          margin: 1,
          width: 240,
        });
        if (active) setDataUrl(url);
      } catch (err) {
        if (active) {
          setDataUrl(null);
          setError(
            err && typeof err === "object" && "message" in err
              ? String((err as { message?: string }).message)
              : "Falha ao gerar QR Code.",
          );
        }
      } finally {
        if (active) setIsLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [text]);

  return { dataUrl, isLoading, error };
}

