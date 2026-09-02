import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  fetchSession,
  sendPhoneOtp,
  signInWithEmail,
  signInWithGoogle,
  signOut,
  signUpWithEmail,
  verifyPhoneOtp,
  type MobileSession
} from "@/src/lib/auth";
import { queryKeys } from "@/src/lib/query";

export function useSession(): {
  isPending: boolean;
  session: MobileSession | null;
} {
  const { data, isPending } = useQuery<MobileSession | null>({
    queryFn: fetchSession,
    queryKey: queryKeys.session(),
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
      await queryClient.invalidateQueries({ queryKey: queryKeys.session() });
    }
  });
}

export function useSendPhoneOtp() {
  return useMutation({
    mutationFn: sendPhoneOtp
  });
}

export function useVerifyPhoneOtp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: verifyPhoneOtp,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.session() });
    }
  });
}

export function useGoogleSignIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: signInWithGoogle,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.session() });
    }
  });
}

export function useSignUp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: signUpWithEmail,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.session() });
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
