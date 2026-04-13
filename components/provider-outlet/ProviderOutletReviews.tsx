import { MessageSquare } from "lucide-react";

import type { ProviderOutlet } from "./types";

type ProviderOutletReviewsProps = {
  providerOutlet: ProviderOutlet;
};

export default function ProviderOutletReviews({
  providerOutlet,
}: ProviderOutletReviewsProps) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg">Reviews</h2>
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/10 py-12">
        <MessageSquare className="mb-3 h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          No reviews yet for {providerOutlet.name}
        </p>
        <p className="mt-1 text-xs text-muted-foreground/80">
          Be the first to share your experience
        </p>
      </div>
    </section>
  );
}
