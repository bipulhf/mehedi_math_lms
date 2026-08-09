import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";

import { apiGet, apiPost } from "@/src/lib/api-client";

type ImageUploadPurpose = "BUG_SCREENSHOT" | "PROFILE_PHOTO";

interface PreparedUpload {
  id: string;
  uploadUrl: string;
}

interface PickAndUploadImageOptions {
  aspect?: readonly [number, number];
  maxWidth: number;
  purpose: ImageUploadPurpose;
}

/** Picks, normalizes and uploads one image through API's signed S3 flow. */
export async function pickAndUploadImage(
  options: PickAndUploadImageOptions
): Promise<string | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permission.granted) {
    throw new Error("This needs permission to use your photos");
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    allowsEditing: options.aspect !== undefined,
    ...(options.aspect === undefined ? {} : { aspect: [...options.aspect] as [number, number] }),
    mediaTypes: ["images"],
    quality: 0.9
  });
  const asset = result.canceled ? null : result.assets[0];

  if (!asset) {
    return null;
  }

  const context = ImageManipulator.manipulate(asset.uri);
  const scale = Math.min(1, options.maxWidth / asset.width);

  if (scale < 1) {
    context.resize({ height: Math.round(asset.height * scale), width: options.maxWidth });
  }

  const rendered = await context.renderAsync();
  const saved = await rendered.saveAsync({ compress: 0.86, format: SaveFormat.JPEG });
  const body = await (await fetch(saved.uri)).blob();
  const provider = await apiGet<{ provider: string }>("upload/provider");

  if (provider.provider !== "s3") {
    throw new Error("Image upload needs S3 storage");
  }

  const prepared = await apiPost<
    { contentType: string; fileName: string; fileSize: number; purpose: ImageUploadPurpose },
    PreparedUpload
  >("upload/presigned", {
    contentType: "image/jpeg",
    fileName: `${options.purpose.toLowerCase()}.jpg`,
    fileSize: body.size,
    purpose: options.purpose
  });
  const response = await fetch(prepared.uploadUrl, {
    body,
    headers: { "Content-Type": "image/jpeg" },
    method: "PUT"
  });

  if (!response.ok) {
    throw new Error("That image could not be uploaded");
  }

  const confirmed = await apiPost<
    { height: number; uploadId: string; width: number },
    { fileUrl: string }
  >("upload/confirm", {
    height: saved.height,
    uploadId: prepared.id,
    width: saved.width
  });

  return confirmed.fileUrl;
}
