import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { fetchSession, signInWithEmail, signOut, signUpWithEmail, type MobileSession } from "@/src/lib/auth";

const SESSION_QUERY_KEY = ["session"] as const;

export function useSession(): {
  isPending: boolean;
  session: MobileSession | null;
} {
  const { data, isPending } = useQuery<MobileSession | null>({
    queryFn: fetchSession,
    queryKey: SESSION_QUERY_KEY,
    // The session is the one thing that must never be served stale from the
    // persisted cache: a signed-out user seeing a signed-in shell is worse
    // than a spinner.
    staleTime: 0
  });

  return { isPending, session: data ?? null };
}

export function useSignIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: signInWithEmail,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY });
    }
  });
}

export function useSignUp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: signUpWithEmail,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY });
    }
  });
}

export function useSignOut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: signOut,
    onSuccess: () => {
      // Everything in the cache belonged to the person who just left.
      queryClient.clear();
    }
  });
}
