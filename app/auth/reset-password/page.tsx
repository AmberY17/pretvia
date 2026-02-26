"use client";

import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { LoadingScreen } from "@/components/ui/loading-screen";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
