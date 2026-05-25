import { AppShell } from "@/components/AppShell";
import { DiscoverPanel } from "@/components/DiscoverPanel";

export default function DiscoverPage() {
  return (
    <AppShell title="Find underpriced items you can resell locally.">
      <DiscoverPanel />
    </AppShell>
  );
}
