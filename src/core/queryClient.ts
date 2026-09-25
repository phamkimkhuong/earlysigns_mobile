import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5, // 5 minutes default fresh time
      gcTime: 1000 * 60 * 30, // Keep unused cache in memory for 30 minutes
      refetchOnWindowFocus: false, // Prevent unwanted refetches on mobile screen focus
      refetchOnReconnect: true,
    },
  },
});
