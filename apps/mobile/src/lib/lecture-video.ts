/**
 * Which lectures the app can play, and which it has to hand to the browser.
 *
 * A YouTube or Vimeo link is a page with a player on it, not a media file, and
 * `expo-video` has no decoder for one — handing it over produces a black
 * rectangle rather than an error. The web client makes the same split in
 * `course-player.tsx`, and the host list is deliberately identical.
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
  /** A page that has to be opened, not played. */
  | { kind: "external"; url: string };

export function resolveLectureVideo(videoUrl: string | null): LectureVideoSource | null {
  if (!videoUrl || videoUrl.trim().length === 0) {
    return null;
  }

  try {
    const url = new URL(videoUrl);
    const hostname = url.hostname.replace(/^www\./, "");

    if (EMBED_ONLY_HOSTS.includes(hostname)) {
      return { kind: "external", url: videoUrl };
    }

    return { kind: "stream", uri: videoUrl };
  } catch {
    // Not a URL at all. Nothing can be done with it, and claiming a video is
    // available would be worse than saying there is none.
    return null;
  }
}
