import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppProviders } from "@/components/layout/AppProviders";
import { AppShell } from "@/components/layout/AppShell";

const FAVICON_VERSION = "1";

export const metadata: Metadata = {
  title: {
    default: "Terceiro Gestor",
    template: "%s | Terceiro Gestor",
  },
  description: "Plataforma de gestão institucional",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: `/icon.png?v=${FAVICON_VERSION}`,
  },
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>
        <AppProviders>
          <AppShell>{children}</AppShell>
        </AppProviders>
      </body>
    </html>
  );
}
