import { QueryClient } from "@tanstack/react-query";
import { HTTPError } from "ky";

/**
 * One QueryClient per request on the server, one for the lifetime of the tab in
 * the browser. Creating it at module scope would leak one user's cache into the
 * next request's render during SSR.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      mutations: {
        // The ky afterResponse hook already raises a toast for every failed
        // response. A retry here would raise it again, and again.
        retry: false
      },
      queries: {
        gcTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          // 401/403/404 will not become true by asking a second time, and a 401
          // retry loop delays the redirect to sign-in.
          if (error instanceof HTTPError && error.response.status < 500) {
            return false;
          }

          return failureCount < 2;
        },
        staleTime: 30 * 1000
      }
    }
  });
}
