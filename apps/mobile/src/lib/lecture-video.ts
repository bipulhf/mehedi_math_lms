/**
 * Which lectures `expo-video` can decode, and which have to be embedded via a
 * `WebView` instead.
 *
 * A YouTube or Vimeo link is a page with a player on it, not a media file, and
 * `expo-video` has no decoder for one — handing it over produces a black
 * rectangle rather than an error. The web client makes the same host split in
 * `course-player.tsx` (there, vidstack's iframe provider plays it inline; here,
 * a `WebView` pointed at the provider's own `/embed/` URL does the same job).
 * The host list is deliberately identical between the two.
 *
 * `external` is the fallback for a link on one of these hosts whose video id
 * this module could not parse — rather than embed nothing, the lecture opens
 * in the browser exactly as it always did.
 */

const EMBED_ONLY_HOSTS = [
  "youtube.com",
  "m.youtube.com",
  "youtu.be",
  "vimeo.com",
  "player.vimeo.com"
];

function firstPathSegment(pathname: string): string | null {
  const segment = pathname.replace(/^\//, "").split("/")[0];

  return segment && segment.length > 0 ? segment : null;
}

function extractYouTubeId(url: URL, hostname: string): string | null {
  if (hostname === "youtu.be") {
    return firstPathSegment(url.pathname);
  }

  const fromQuery = url.searchParams.get("v");

  if (fromQuery) {
    return fromQuery;
  }

  const embedMatch = /\/(?:embed|shorts)\/([^/?]+)/.exec(url.pathname);

  return embedMatch?.[1] ?? null;
}

function extractVimeoId(url: URL, hostname: string): string | null {
  const segments = url.pathname.split("/").filter((segment) => segment.length > 0);

  if (hostname === "player.vimeo.com") {
    const videoIndex = segments.indexOf("video");

    return segments[videoIndex + 1] ?? segments.at(-1) ?? null;
  }

  return segments.at(-1) ?? null;
}

function buildEmbedUrl(url: URL, hostname: string): string | null {
  if (hostname === "youtu.be" || hostname === "youtube.com" || hostname === "m.youtube.com") {
    const id = extractYouTubeId(url, hostname);

    return id ? `https://www.youtube.com/embed/${id}?playsinline=1&modestbranding=1&rel=0` : null;
  }

  if (hostname === "vimeo.com" || hostname === "player.vimeo.com") {
    const id = extractVimeoId(url, hostname);

    return id ? `https://player.vimeo.com/video/${id}?title=0&byline=0&portrait=0` : null;
  }

  return null;
}

export type LectureVideoSource =
  /** A media file `expo-video` can decode. */
  | { kind: "stream"; uri: string }
  /** A YouTube/Vimeo page, played inline through its own `/embed/` iframe. */
  | { kind: "embed"; embedUrl: string }
  /** A page that has to be opened, not played — the id could not be parsed. */
  | { kind: "external"; url: string };

export function resolveLectureVideo(videoUrl: string | null): LectureVideoSource | null {
  if (!videoUrl || videoUrl.trim().length === 0) {
    return null;
  }

  try {
    const url = new URL(videoUrl);
    const hostname = url.hostname.replace(/^www\./, "");

    if (EMBED_ONLY_HOSTS.includes(hostname)) {
      const embedUrl = buildEmbedUrl(url, hostname);

      return embedUrl ? { embedUrl, kind: "embed" } : { kind: "external", url: videoUrl };
    }

    return { kind: "stream", uri: videoUrl };
  } catch {
    // Not a URL at all. Nothing can be done with it, and claiming a video is
    // available would be worse than saying there is none.
    return null;
  }
}
