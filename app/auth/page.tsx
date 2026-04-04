import { Suspense } from "react";
import { betaFlag } from "@/flags";
import { AuthForm } from "@/components/auth/auth-form";
import { LoadingScreen } from "@/components/loading-screen";

export const dynamic = "force-dynamic";

export default async function AuthPage() {
  const betaMode = await betaFlag();
  return (
    <Suspense fallback={<LoadingScreen />}>
      <AuthForm betaMode={betaMode} />
    </Suspense>
  );
}
