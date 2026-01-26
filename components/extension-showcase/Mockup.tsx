import Image from "next/image";

import { cn } from "@/app/lib/utils";

type MockupProps = {
  src?: string;
  alt: string;
  className?: string;
  priority?: boolean;
};

function MockupPlaceholder() {
  return (
    <div className="h-full w-full p-4 sm:p-5">
      <div className="grid gap-4">
        <div className="grid grid-cols-[1fr_auto] items-center gap-4">
          <div className="h-8 rounded-md bg-foreground/5" />
          <div className="h-8 w-24 rounded-md bg-primary/10" />
        </div>
        <div className="h-10 rounded-md bg-foreground/5" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-20 rounded-lg bg-foreground/5" />
          <div className="h-20 rounded-lg bg-foreground/5" />
        </div>
        <div className="grid gap-3">
          <div className="h-16 rounded-lg bg-foreground/5" />
          <div className="h-16 rounded-lg bg-foreground/5" />
          <div className="h-16 rounded-lg bg-foreground/5" />
        </div>
      </div>
    </div>
  );
}

export function Mockup({ src, alt, className, priority }: MockupProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border bg-card shadow-sm",
        className
      )}
    >
      <div className="flex h-10 items-center justify-between border-b bg-gradient-to-r from-primary/5 via-background to-secondary/5 px-3">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded bg-primary/80" aria-hidden="true" />
          <div
            className="h-2.5 w-20 rounded bg-foreground/10"
            aria-hidden="true"
          />
        </div>
        <div className="flex items-center gap-1.5" aria-hidden="true">
          <div className="h-2.5 w-2.5 rounded-full bg-foreground/10" />
          <div className="h-2.5 w-2.5 rounded-full bg-foreground/10" />
          <div className="h-2.5 w-2.5 rounded-full bg-foreground/10" />
        </div>
      </div>

      <div className="relative aspect-[4/3] w-full bg-muted/20">
        {src ? (
          <Image
            src={src}
            alt={alt}
            fill
            priority={priority}
            className="object-cover"
            sizes="(min-width: 1024px) 520px, 100vw"
          />
        ) : (
          <MockupPlaceholder />
        )}
      </div>
    </div>
  );
}

