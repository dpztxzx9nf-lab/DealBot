"use client";

import { DealsProvider } from "@/hooks/useDeals";
import { DevTunnelHmrGuard } from "./DevTunnelHmrGuard";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <DealsProvider>
      <DevTunnelHmrGuard />
      {children}
    </DealsProvider>
  );
}
