export async function fetchObjectBytes(fileUrl: string): Promise<Uint8Array> {
  const response = await fetch(fileUrl);

  if (!response.ok) {
    throw new Error(`Failed to fetch ${fileUrl}: ${response.status}`);
  }

  return new Uint8Array(await response.arrayBuffer());
}

export async function fetchObjectRange(
  fileUrl: string,
  start: number,
  endInclusive: number
): Promise<Uint8Array> {
  const response = await fetch(fileUrl, {
    headers: { Range: `bytes=${start}-${endInclusive}` }
  });

  if (!response.ok && response.status !== 206) {
    throw new Error(`Range fetch failed for ${fileUrl}: ${response.status}`);
  }

  return new Uint8Array(await response.arrayBuffer());
}

export async function fetchObjectSize(fileUrl: string): Promise<number | null> {
  const response = await fetch(fileUrl, { method: "HEAD" });

  if (!response.ok) {
    throw new Error(`HEAD fetch failed for ${fileUrl}: ${response.status}`);
  }

  const contentLength = response.headers.get("content-length");

  if (!contentLength) {
    return null;
  }

  const size = Number.parseInt(contentLength, 10);

  return Number.isFinite(size) ? size : null;
}
