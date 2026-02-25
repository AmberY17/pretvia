"use client";

import { Suspense } from "react";
import { AuthForm } from "@/components/auth/auth-form";
import { LoadingScreen } from "@/components/ui/loading-screen";

export default function AuthPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <AuthForm />
    </Suspense>
  );
}
