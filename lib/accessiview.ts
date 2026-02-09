/**
 * AccessiView page config: video URL (from env), title, description.
 * Change copy or URL here without touching the page component.
 */

export const ACCESSIVIEW_TITLE = "AccessiView — 3D interactive walk through";
export const ACCESSIVIEW_DESCRIPTION =
  "Preview venue accessibility before you go. AccessiView gives you a 3D view of spaces so you can plan your visit with confidence.";
export const ACCESSIVIEW_VIDEO_CAPTIONS_NOTE =
  "If the video has captions, they can be enabled in the player controls.";

/**
 * Video URL from env. Empty string when not set (page shows placeholder).
 */
export function getAccessiviewVideoUrl(): string {
  if (typeof process.env.NEXT_PUBLIC_ACCESSIVIEW_VIDEO_URL === "string") {
    return process.env.NEXT_PUBLIC_ACCESSIVIEW_VIDEO_URL.trim();
  }
  return "";
}

/**
 * Normalize external URL to iframe embed URL where possible.
 * Returns { type: "iframe", src } or { type: "video", src } or null if empty.
 */
export function parseVideoUrl(
  url: string,
): { type: "iframe"; src: string } | { type: "video"; src: string } | null {
  const u = url.trim();
  if (!u) return null;

  try {
    const parsed = new URL(u);

    // YouTube: watch or embed → embed
    if (
      parsed.hostname === "www.youtube.com" ||
      parsed.hostname === "youtube.com"
    ) {
      const v = parsed.searchParams.get("v");
      if (v) return { type: "iframe", src: `https://www.youtube.com/embed/${v}` };
      if (parsed.pathname.startsWith("/embed/")) {
        return { type: "iframe", src: u };
      }
    }
    if (parsed.hostname === "youtu.be") {
      const id = parsed.pathname.slice(1).split("/")[0];
      if (id) return { type: "iframe", src: `https://www.youtube.com/embed/${id}` };
    }

    // Vimeo: standard or player URL
    if (
      parsed.hostname === "vimeo.com" ||
      parsed.hostname === "www.vimeo.com"
    ) {
      const id = parsed.pathname.replace(/^\/+/, "").split("/")[0];
      if (id && /^\d+$/.test(id)) {
        return { type: "iframe", src: `https://player.vimeo.com/video/${id}` };
      }
    }
    if (parsed.hostname === "player.vimeo.com") {
      return { type: "iframe", src: u };
    }

    // Direct video file
    const ext = parsed.pathname.split(".").pop()?.toLowerCase();
    if (["mp4", "webm", "ogg"].includes(ext ?? "")) {
      return { type: "video", src: u };
    }

    // Other URLs: treat as iframe (e.g. other embeddable players)
    return { type: "iframe", src: u };
  } catch {
    return null;
  }
}
