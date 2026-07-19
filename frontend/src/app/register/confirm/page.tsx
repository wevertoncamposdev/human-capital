import { RegisterConfirmClientPage } from "@/modules/core/features/registration/ui/register-confirm-client-page";
import { Suspense } from "react";

export default function RegisterConfirmPage() {
  return (
    <Suspense fallback={<div className="p-6">Carregando...</div>}>
      <RegisterConfirmClientPage />
    </Suspense>
  );
}
