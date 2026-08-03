/**
 * Turns a teacher-pasted video link into something an `<iframe>` can play.
 *
 * Returns `null` for anything that is not a recognised host — a direct file URL
 * included — so the caller can fall back to a native `<video>` element rather
 * than embedding a page that will refuse to frame.
 */
export function getEmbedVideoUrl(value: string): string | null {
  try {
    const url = new URL(value);
    const hostname = url.hostname.replace(/^www\./, "");

    if (hostname === "youtube.com" || hostname === "m.youtube.com") {
      const videoId = url.searchParams.get("v");

      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }

    if (hostname === "youtu.be") {
      const videoId = url.pathname.split("/").filter(Boolean)[0];

      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }

    if (hostname === "vimeo.com") {
      const videoId = url.pathname.split("/").filter(Boolean)[0];

      return videoId ? `https://player.vimeo.com/video/${videoId}` : null;
    }

    if (hostname === "player.vimeo.com") {
      return value;
    }

    return null;
  } catch {
    return null;
  }
}
