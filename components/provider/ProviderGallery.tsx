import { ImageIcon } from "lucide-react";

import type { ProviderWithRelations } from "./types";

type ProviderGalleryProps = {
  provider: ProviderWithRelations;
};

// todo: implement gallery

export default function ProviderGallery({ provider }: ProviderGalleryProps) {
  // Schema has no gallery images; show placeholder matching Clickability "Premises" section
  return (
    <section className="space-y-4">
      <h2 className="text-lg">Premises</h2>
      <div className="flex aspect-video w-full items-center justify-center rounded-xl border border-dashed border-border bg-muted/20">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <ImageIcon className="h-12 w-12" />
          <p className="text-sm">No photos available for {provider.name}</p>
        </div>
      </div>
    </section>
  );
}
