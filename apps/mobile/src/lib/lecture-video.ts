/**
 * Which lectures `expo-video` can decode, and which have to be handed to
 * vidstack instead.
 *
 * A YouTube or Vimeo link is a page with a player on it, not a media file, and
 * `expo-video` has no decoder for one — handing it over produces a black
 * rectangle rather than an error. The web client makes the same host split in
 * `course-player.tsx`, where vidstack's own provider auto-detects YouTube and
 * Vimeo from the raw URL and plays it inline. Mobile has no vidstack of its
 * own, so `LecturePlayer` points a `WebView` at the web app's `/embed-player`
 * route instead of reimplementing that detection — same `src`, same player.
 */

const EMBED_ONLY_HOSTS = [
  "youtube.com",
  "m.youtube.com",
  "youtu.be",
  "vimeo.com",
  "player.vimeo.com"
];

export type LectureVideoSource =
  /** A media file `expo-video` can decode. */
  | { kind: "stream"; uri: string }
  /** A YouTube/Vimeo page, handed to vidstack via the web app's embed route. */
  | { kind: "embed"; url: string };

export function resolveLectureVideo(videoUrl: string | null): LectureVideoSource | null {
  if (!videoUrl || videoUrl.trim().length === 0) {
    return null;
  }

  try {
    const url = new URL(videoUrl);
    const hostname = url.hostname.replace(/^www\./, "");

    if (EMBED_ONLY_HOSTS.includes(hostname)) {
      return { kind: "embed", url: videoUrl };
    }

    return { kind: "stream", uri: videoUrl };
  } catch {
    // Not a URL at all. Nothing can be done with it, and claiming a video is
    // available would be worse than saying there is none.
    return null;
  }
}
