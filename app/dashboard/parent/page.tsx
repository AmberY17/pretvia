"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoadingScreen } from "@/components/ui/loading-screen";

/** Redirect to main dashboard – guardian view is now shown there */
export default function ParentDashboardPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);
  return <LoadingScreen message="Redirecting..." />;
}
