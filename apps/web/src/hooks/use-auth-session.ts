import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import { queryKeys } from "@/lib/query/keys";
import { authClient } from "@/lib/auth";

type AuthSessionData = typeof authClient.$Infer.Session | null;

interface UseAuthSessionResult {
  isPending: boolean;
  refetch: () => Promise<AuthSessionData>;
  session: AuthSessionData;
}

async function fetchAuthSession(): Promise<AuthSessionData> {
  const response = await authClient.getSession();

  return response.data ?? null;
}

/**
 * The signed-in user, read once per page rather than once per component.
 *
 * This used to hold the session in local state and fetch it in an effect, so
 * every component that asked -- the site header, the dashboard shell, the page
 * inside it -- opened its own request on every mount. That is several round
 * trips per navigation for one answer, and enough of them in a quarter of an
 * hour to trip Better Auth's rate limiter, at which point `/sign-out` starts
 * answering 429 and the person clicking it stays signed in. Sharing one query
 * key collapses them into a single in-flight request.
 */
export function useAuthSession(): UseAuthSessionResult {
  const queryClient = useQueryClient();

  const { data, isPending } = useQuery({
    queryFn: fetchAuthSession,
    queryKey: queryKeys.auth.session(),
    // A session does not change under the person holding it. The parts that
    // can -- a role, a completed profile -- are written through this app, and
    // `refetch` is how the code that writes them says so.
    staleTime: 5 * 60 * 1000
  });

  const refetch = useCallback(async (): Promise<AuthSessionData> => {
    const next = await fetchAuthSession();

    queryClient.setQueryData(queryKeys.auth.session(), next);

    return next;
  }, [queryClient]);

  return {
    isPending,
    refetch,
    session: data ?? null
  };
}
