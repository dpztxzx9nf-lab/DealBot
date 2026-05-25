import { AppShell } from "@/components/AppShell";
import { SwipeDeck } from "@/components/SwipeDeck";

export default function SwipePage() {
  return (
    <AppShell title="Swipe" variant="immersive">
      <SwipeDeck />
    </AppShell>
  );
}
