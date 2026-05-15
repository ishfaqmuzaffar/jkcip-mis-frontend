"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "@/lib/auth";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 2, // 2 minutes
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: "#1a3a2a",
              color: "#fff",
              fontSize: "14px",
              fontFamily: "DM Sans, sans-serif",
              borderRadius: "10px",
            },
            success: { iconTheme: { primary: "#4ade80", secondary: "#fff" } },
            error: { iconTheme: { primary: "#f87171", secondary: "#fff" } },
          }}
        />
      </AuthProvider>
    </QueryClientProvider>
  );
}
