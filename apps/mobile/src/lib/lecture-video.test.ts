import { resolveLectureVideo } from "@/src/lib/lecture-video";

/**
 * Which lectures play in the app's own `expo-video` player and which play
 * through a `WebView` pointed at the provider's `/embed/` page instead.
 * Getting the split wrong is silent in both directions: a YouTube link handed
 * to `expo-video` shows a black rectangle, and a media file sent to a
 * `WebView` loses the progress tracking that playback drives.
 */

describe("resolveLectureVideo", () => {
  test("a media file plays in the app", () => {
    expect(resolveLectureVideo("https://cdn.mma.test/lectures/calculus-01.mp4")).toEqual({
      kind: "stream",
      uri: "https://cdn.mma.test/lectures/calculus-01.mp4"
    });
  });

  test("a signed URL keeps its query, which is the part that authorises it", () => {
    const signed = "https://s3.test/lectures/01.m3u8?X-Amz-Signature=abc&X-Amz-Expires=900";

    expect(resolveLectureVideo(signed)).toEqual({ kind: "stream", uri: signed });
  });

  test.each([
    ["https://www.youtube.com/watch?v=abc123", "https://www.youtube.com/embed/abc123?playsinline=1&modestbranding=1&rel=0"],
    ["https://m.youtube.com/watch?v=abc123", "https://www.youtube.com/embed/abc123?playsinline=1&modestbranding=1&rel=0"],
    ["https://youtu.be/abc123", "https://www.youtube.com/embed/abc123?playsinline=1&modestbranding=1&rel=0"],
    ["https://vimeo.com/123456", "https://player.vimeo.com/video/123456?title=0&byline=0&portrait=0"],
    [
      "https://player.vimeo.com/video/123456",
      "https://player.vimeo.com/video/123456?title=0&byline=0&portrait=0"
    ]
  ])("%s embeds inline as %s", (url, embedUrl) => {
    expect(resolveLectureVideo(url)).toEqual({ embedUrl, kind: "embed" });
  });

  test("an unparseable id on a known host falls back to the browser", () => {
    const url = "https://youtube.com/";

    expect(resolveLectureVideo(url)).toEqual({ kind: "external", url });
  });

  test("nothing usable is nothing, rather than a player that never loads", () => {
    expect(resolveLectureVideo(null)).toBeNull();
    expect(resolveLectureVideo("")).toBeNull();
    expect(resolveLectureVideo("   ")).toBeNull();
    expect(resolveLectureVideo("coming soon")).toBeNull();
  });
});
