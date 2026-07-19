"use client";

import * as React from "react";

export function PwaServiceWorker() {
  React.useEffect(() => {
    const enableInDev =
      process.env.NEXT_PUBLIC_PWA_SW === "1" ||
      process.env.NEXT_PUBLIC_PWA_FORCE_INSTALL === "1";
    if (process.env.NODE_ENV !== "production" && !enableInDev) return;
    if (!("serviceWorker" in navigator)) return;

    const onLoad = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch(() => undefined);
    };

    window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);

  return null;
}
