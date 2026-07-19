"use client";

import * as React from "react";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/Sidebar/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { UsageDocumentationProvider } from "@/components/UsageDocumentation/UsageDocumentationProvider";
import { ControlPanelShell } from "@/web-client/control-panel/ControlPanelShell";

const AUTH_ROUTES = ["/auth/login", "/auth/register"];
const PUBLIC_ROUTES = ["/register"];
const TENANT_AUTH_SEGMENTS = new Set([
  "login",
  "register",
  "forgot-password",
  "reset-password",
]);
const RESERVED_SEGMENTS = new Set([
  "",
  "_next",
  "api",
  "auth",
  "dashboard",
  "people",
  "person",
  "settings",
  "admin",
  "t",
  // PWA/static app resources (must not be treated as tenant slugs)
  "manifest.webmanifest",
  "sw.js",
  "icon.png",
  "pwa",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
]);

function isTenantAuthRoute(pathname: string) {
  if (/^\/t\/[^/]+\/(login|register|forgot-password|reset-password)/.test(pathname)) {
    return true;
  }
  const match = pathname.match(
    /^\/([^/]+)\/(login|register|forgot-password|reset-password)/,
  );
  if (!match) return false;
  const slug = match[1];
  const segment = match[2];
  return !RESERVED_SEGMENTS.has(slug) && TENANT_AUTH_SEGMENTS.has(segment);
}

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const stickyHeaderRef = React.useRef<HTMLDivElement | null>(null);
  const isAuthRoute =
    AUTH_ROUTES.some((route) => pathname?.startsWith(route)) ||
    PUBLIC_ROUTES.some((route) => pathname?.startsWith(route)) ||
    (pathname ? isTenantAuthRoute(pathname) : false);
  const shouldRenderBareLayout = !pathname || isAuthRoute || pathname === "/";

  React.useEffect(() => {
    if (shouldRenderBareLayout) return;

    const element = stickyHeaderRef.current;
    if (!element) return;

    const root = document.documentElement;
    const syncOffset = () => {
      root.style.setProperty("--app-shell-sticky-offset", `${element.offsetHeight}px`);
    };

    syncOffset();

    const observer = new ResizeObserver(syncOffset);
    observer.observe(element);
    window.addEventListener("resize", syncOffset);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", syncOffset);
      root.style.removeProperty("--app-shell-sticky-offset");
    };
  }, [shouldRenderBareLayout]);

  if (shouldRenderBareLayout) {
    return <>{children}</>;
  }

  return (
    <>
      <AppSidebar />
      <SidebarInset>
        <div ref={stickyHeaderRef} className="sticky top-0 z-30">
          <AppHeader />
          <ControlPanelShell />
        </div>
        <UsageDocumentationProvider>
          <div className="min-h-0 min-w-0 flex-1 overflow-hidden">{children}</div>
        </UsageDocumentationProvider>
      </SidebarInset>
    </>
  );
}
