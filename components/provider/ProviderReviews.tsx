import { MessageSquare } from "lucide-react";

import type { ProviderWithRelations } from "./types";

type ProviderReviewsProps = {
  provider: ProviderWithRelations;
};

// todo: implement reviews

export default function ProviderReviews({ provider }: ProviderReviewsProps) {
  // Schema has no reviews; placeholder matching Clickability Reviews section
  return (
    <section className="space-y-4">
      <h2 className="text-lg">Reviews</h2>
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/10 py-12">
        <MessageSquare className="mb-3 h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          No reviews yet for {provider.name}
        </p>
        <p className="mt-1 text-xs text-muted-foreground/80">
          Be the first to share your experience
        </p>
      </div>
    </section>
  );
}
