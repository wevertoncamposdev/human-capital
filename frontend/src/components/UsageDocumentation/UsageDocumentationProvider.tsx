"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import {
  UsageDocumentation,
  type UsageDocumentationItem,
} from "@/components/UsageDocumentation/UsageDocumentation";

export type UsageDocumentationConfig = {
  title: string;
  items?: UsageDocumentationItem[];
  children?: React.ReactNode;
  widthPx?: number;
};

type UsageDocumentationContextValue = {
  setConfig: (config: UsageDocumentationConfig | null) => void;
};

const UsageDocumentationContext =
  React.createContext<UsageDocumentationContextValue | null>(null);

export function UsageDocumentationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [config, setConfig] = React.useState<UsageDocumentationConfig | null>(null);

  const defaultTitle = React.useMemo(() => {
    const value = String(pathname ?? "").trim();
    if (!value) return "Ajuda";
    return value;
  }, [pathname]);

  return (
    <UsageDocumentationContext.Provider value={{ setConfig }}>
      {children}
      <UsageDocumentation
        title={config?.title ?? defaultTitle}
        items={config?.items}
        widthPx={config?.widthPx}
      >
        {config?.children ?? (
          <div className="text-sm text-muted-foreground">
            Documentação desta página ainda não foi cadastrada.
          </div>
        )}
      </UsageDocumentation>
    </UsageDocumentationContext.Provider>
  );
}

export function useRegisterUsageDocumentation(
  config: UsageDocumentationConfig | null,
) {
  const ctx = React.useContext(UsageDocumentationContext);

  React.useEffect(() => {
    ctx?.setConfig(config);
    return () => ctx?.setConfig(null);
  }, [ctx, config]);
}
