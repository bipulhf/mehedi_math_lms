import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { env } from "@/lib/env";

const s3Client = new S3Client({
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY
  },
  region: env.AWS_REGION
});

export async function createSignedUploadUrl(key: string, contentType: string): Promise<string> {
  const command = new PutObjectCommand({
    ACL: "public-read",
    Bucket: env.AWS_S3_BUCKET,
    ContentType: contentType,
    Key: key
  });

  return getSignedUrl(s3Client, command, { expiresIn: 300 });
}

export function getPublicFileUrl(key: string): string {
  if (env.S3_PUBLIC_BASE_URL) {
    return `${env.S3_PUBLIC_BASE_URL.replace(/\/$/, "")}/${key}`;
  }

  return `https://${env.AWS_S3_BUCKET}.s3.${env.AWS_REGION}.amazonaws.com/${key}`;
}

export async function getStoredFileSize(key: string): Promise<number | null> {
  const command = new HeadObjectCommand({
    Bucket: env.AWS_S3_BUCKET,
    Key: key
  });
  const response = await s3Client.send(command);

  return response.ContentLength ?? null;
}

/**
 * Reads `[start, endInclusive]` of a stored object. Used by the file-processing
 * worker to walk a video's container header without downloading the video.
 */
export async function getStoredFileRange(
  key: string,
  start: number,
  endInclusive: number
): Promise<Uint8Array> {
  const command = new GetObjectCommand({
    Bucket: env.AWS_S3_BUCKET,
    Key: key,
    Range: `bytes=${start}-${endInclusive}`
  });
  const response = await s3Client.send(command);

  if (!response.Body) {
    return new Uint8Array(0);
  }

  return response.Body.transformToByteArray();
}

/** The whole object. Used to resize an image the client has already uploaded. */
export async function readStoredFile(key: string): Promise<Uint8Array> {
  const command = new GetObjectCommand({
    Bucket: env.AWS_S3_BUCKET,
    Key: key
  });
  const response = await s3Client.send(command);

  if (!response.Body) {
    return new Uint8Array(0);
  }

  return response.Body.transformToByteArray();
}

/**
 * Writes an object the server produced, rather than handing out a signed URL for
 * the client to write. `public-read` matches what `createSignedUploadUrl` grants,
 * so a variant is reachable on the same terms as the original it came from.
 */
export async function writeStoredFile(
  key: string,
  body: Uint8Array,
  contentType: string
): Promise<void> {
  const command = new PutObjectCommand({
    ACL: "public-read",
    Body: body,
    Bucket: env.AWS_S3_BUCKET,
    ContentType: contentType,
    Key: key
  });

  await s3Client.send(command);
}

export async function deleteStoredFile(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: env.AWS_S3_BUCKET,
    Key: key
  });

  await s3Client.send(command);
}
