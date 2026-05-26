import { AppShell } from "@/components/AppShell";
import { LocalHuntPanel } from "@/components/LocalHuntPanel";

export default function LocalHuntPage() {
  return (
    <AppShell title="Hunt local market gaps before they become generic deals.">
      <LocalHuntPanel />
    </AppShell>
  );
}
