import {
  scaleForScriptPage,
  scriptPageContentType,
  scriptPageFileExtension,
  scriptPageJpegQuality
} from "@genex/shared";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";

import { apiGet, apiPost } from "@/src/lib/api-client";

/**
 * Photographing a page and turning it into what actually gets stored.
 *
 * The shrink happens on the phone, before the upload: a camera file is several
 * megabytes and a student on mobile data has to send one of these per page. The
 * API caps it again on confirm, so this is a courtesy to the connection rather
 * than the rule. No original is kept, so the rotation chosen here is final.
 * ADR-0009.
 */
export interface CapturedPage {
  height: number;
  name: string;
  uri: string;
  width: number;
}

export interface PickPageOptions {
  rotation?: number | undefined;
  source: "CAMERA" | "LIBRARY";
}

interface PreparedUploadResponse {
  fileUrl: string;
  id: string;
  key: string;
  uploadUrl: string;
}

interface UploadRecord {
  fileUrl: string;
  height: number | null;
  id: string;
  width: number | null;
}

export async function pickScriptPage(options: PickPageOptions): Promise<CapturedPage | null> {
  const permission =
    options.source === "CAMERA"
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permission.granted) {
    throw new Error("This needs permission to use your camera or photos");
  }

  const result =
    options.source === "CAMERA"
      ? await ImagePicker.launchCameraAsync({ quality: 1 })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          quality: 1
        });

  const asset = result.canceled ? null : result.assets[0];

  if (!asset) {
    return null;
  }

  const scale = scaleForScriptPage(asset.width, asset.height);
  const context = ImageManipulator.manipulate(asset.uri);

  if (options.rotation) {
    context.rotate(options.rotation);
  }

  if (scale < 1) {
    context.resize({
      height: Math.round(asset.height * scale),
      width: Math.round(asset.width * scale)
    });
  }

  const rendered = await context.renderAsync();
  const saved = await rendered.saveAsync({
    compress: scriptPageJpegQuality,
    format: SaveFormat.JPEG
  });

  return {
    height: saved.height,
    name: `page.${scriptPageFileExtension}`,
    uri: saved.uri,
    width: saved.width
  };
}

/**
 * The S3 path only.
 *
 * UploadThing's client SDK is a browser package, so the app uploads through the
 * presigned PUT the API already issues. A deployment running UploadThing is
 * told so rather than failing on the PUT.
 */
export async function uploadScriptPage(page: CapturedPage): Promise<UploadRecord> {
  const provider = await apiGet<{ provider: string }>("upload/provider");

  if (provider.provider !== "s3") {
    throw new Error("Uploading pages from the app needs S3 storage");
  }

  const body = await fetch(page.uri).then(async (response) => response.blob());
  const prepared = await apiPost<
    { contentType: string; fileName: string; fileSize: number; purpose: string },
    PreparedUploadResponse
  >("upload/presigned", {
    contentType: scriptPageContentType,
    fileName: page.name,
    fileSize: body.size,
    purpose: "ANSWER_SCRIPT_PAGE"
  });

  const putResponse = await fetch(prepared.uploadUrl, {
    body,
    headers: { "Content-Type": scriptPageContentType },
    method: "PUT"
  });

  if (!putResponse.ok) {
    throw new Error("That page could not be uploaded");
  }

  return apiPost<{ height: number; uploadId: string; width: number }, UploadRecord>(
    "upload/confirm",
    {
      height: page.height,
      uploadId: prepared.id,
      width: page.width
    }
  );
}
