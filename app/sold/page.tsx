import { AppShell } from "@/components/AppShell";
import { SoldDealList } from "@/components/SoldDealList";

export default function SoldPage() {
  return (
    <AppShell title="Sold history" showStats>
      <SoldDealList />
    </AppShell>
  );
}
