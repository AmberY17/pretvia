"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";

interface UseRequireAuthOptions {
  requireCoach?: boolean;
}

export function useRequireAuth(options: UseRequireAuthOptions = {}) {
  const router = useRouter();
  const { user, isLoading, mutate } = useAuth();
  const loggingOutRef = useRef(false);

  useEffect(() => {
    if (loggingOutRef.current) return;
    if (!isLoading && !user) {
      router.push("/auth");
    } else if (!isLoading && options.requireCoach && user?.role !== "coach") {
      router.push("/dashboard");
    }
  }, [isLoading, user, router, options.requireCoach]);

  return { user, isLoading, mutate, loggingOutRef };
}
