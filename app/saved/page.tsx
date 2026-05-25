import { AppShell } from "@/components/AppShell";
import { SavedDealList } from "@/components/SavedDealList";

export default function SavedPage() {
  return (
    <AppShell title="Saved & watchlist">
      <SavedDealList />
    </AppShell>
  );
}
