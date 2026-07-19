"use client";

import * as React from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { BreadcrumbProvider } from "@/components/layout/BreadcrumbContext";
import { AuthProvider } from "@/features/auth/auth-context";
import { CurrentUserProvider } from "@/features/auth/current-user-context";
import { ToastProvider } from "@/components/ui/use-toast";
import { ConfirmProvider } from "@/components/confirm/use-confirm";
import { PwaServiceWorker } from "@/components/pwa/PwaServiceWorker";
import { ControlPanelProvider } from "@/web-client/control-panel/ControlPanelContext";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <CurrentUserProvider>
        <ConfirmProvider>
          <ToastProvider>
            <BreadcrumbProvider>
              <ControlPanelProvider>
                <SidebarProvider>
                  <PwaServiceWorker />
                  {children}
                </SidebarProvider>
              </ControlPanelProvider>
            </BreadcrumbProvider>
          </ToastProvider>
        </ConfirmProvider>
      </CurrentUserProvider>
    </AuthProvider>
  );
}
