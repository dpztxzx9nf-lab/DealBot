import { AppShell } from "@/components/AppShell";
import { PipelineDealList } from "@/components/PipelineDealList";

export default function PipelinePage() {
  return (
    <AppShell title="Pipeline">
      <PipelineDealList />
    </AppShell>
  );
}
