import { useCallback, useEffect, useState } from "react";

import { authClient } from "@/lib/auth";

type AuthSessionData = typeof authClient.$Infer.Session | null;

interface UseAuthSessionResult {
  isPending: boolean;
  refetch: () => Promise<AuthSessionData>;
  session: AuthSessionData;
}

export function useAuthSession(): UseAuthSessionResult {
  const [session, setSession] = useState<AuthSessionData>(null);
  const [isPending, setIsPending] = useState(true);

  const refetch = useCallback(async (): Promise<AuthSessionData> => {
    const response = await authClient.getSession();
    const nextSession = response.data ?? null;

    setSession(nextSession);
    setIsPending(false);

    return nextSession;
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return {
    isPending,
    refetch,
    session
  };
}
