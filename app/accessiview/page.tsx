import Link from "next/link";

import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/brand";
import {
  ACCESSIVIEW_DESCRIPTION,
  ACCESSIVIEW_TITLE,
  ACCESSIVIEW_VIDEO_CAPTIONS_NOTE,
  getAccessiviewVideoUrl,
  parseVideoUrl,
} from "@/lib/accessiview";
import { buildPath } from "@/lib/router";

function VideoBlock() {
  const url = getAccessiviewVideoUrl();
  const parsed = url ? parseVideoUrl(url) : null;

  if (!parsed) {
    return (
      <div
        className="flex aspect-video max-w-3xl items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/30 text-muted-foreground"
        aria-hidden
      >
        <p className="text-sm">Video coming soon</p>
      </div>
    );
  }

  if (parsed.type === "iframe") {
    return (
      <div className="aspect-video w-full max-w-3xl overflow-hidden rounded-lg border border-border bg-muted">
        <iframe
          src={parsed.src}
          title="AccessiView 3D walk through video"
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <div className="aspect-video w-full max-w-3xl overflow-hidden rounded-lg border border-border bg-muted">
      <video
        src={parsed.src}
        controls
        className="h-full w-full"
        preload="metadata"
        aria-label="AccessiView 3D walk through video"
      >
        Your browser does not support the video tag.
      </video>
    </div>
  );
}

export const metadata = {
  title: `AccessiView — ${APP_NAME}`,
  description: ACCESSIVIEW_DESCRIPTION,
};

export default function AccessiViewPage() {
  return (
    <div className="min-h-screen bg-background">
      <main
        className="container mx-auto max-w-5xl px-4 py-8"
        id="main-content"
        role="main"
      >
        <nav
          className="mb-6 text-sm text-muted-foreground"
          aria-label="Breadcrumb"
        >
          <ol className="flex flex-wrap items-center gap-1">
            <li>
              <Link href="/" className="hover:text-foreground underline">
                Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="font-medium text-foreground" aria-current="page">
              AccessiView
            </li>
          </ol>
        </nav>

        <h1 className="text-2xl font-heading font-bold text-foreground sm:text-3xl">
          {ACCESSIVIEW_TITLE}
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          {ACCESSIVIEW_DESCRIPTION}
        </p>

        <section
          className="mt-8"
          aria-labelledby="accessiview-video-heading"
        >
          <h2 id="accessiview-video-heading" className="sr-only">
            Video
          </h2>
          <VideoBlock />
          <p className="mt-3 text-sm text-muted-foreground">
            {ACCESSIVIEW_VIDEO_CAPTIONS_NOTE}
          </p>
        </section>

        <div className="mt-10 flex flex-wrap gap-3">
          <Button asChild variant="default" size="default">
            <Link href={buildPath("providerFinder", {})}>
              Find a provider
            </Link>
          </Button>
          <Button asChild variant="outline" size="default">
            <Link href="/">Back to home</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
