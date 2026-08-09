import {
  scaleForScriptPage,
  scriptPageContentType,
  scriptPageFileExtension,
  scriptPageJpegQuality
} from "@mma/shared";

/**
 * Turning a photograph of a page into what actually gets stored.
 *
 * The shrink happens here, before the upload, because the student is usually on
 * mobile data: a 4MB camera file becomes a few hundred kilobytes, which is the
 * difference between handing in ten pages and giving up. The API caps it again
 * on confirm, so this is a courtesy to the connection rather than the rule.
 * ADR-0009.
 *
 * Rotation is baked in for the same reason nothing else can fix it later: no
 * original is kept, so the page is stored the way the student turned it.
 */
export type PageRotation = 0 | 90 | 180 | 270;

async function loadImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);

  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();

      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("That file could not be read as a photo"));
      image.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export interface PreparedScriptPage {
  file: File;
  height: number;
  width: number;
}

export async function prepareScriptPage(
  file: File,
  rotation: PageRotation = 0
): Promise<PreparedScriptPage> {
  const image = await loadImage(file);
  const scale = scaleForScriptPage(image.naturalWidth, image.naturalHeight);
  const scaledWidth = Math.round(image.naturalWidth * scale);
  const scaledHeight = Math.round(image.naturalHeight * scale);
  const isQuarterTurn = rotation === 90 || rotation === 270;
  const canvasWidth = isQuarterTurn ? scaledHeight : scaledWidth;
  const canvasHeight = isQuarterTurn ? scaledWidth : scaledHeight;

  const canvas = document.createElement("canvas");
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("This browser cannot prepare the photo");
  }

  // White rather than transparent: a JPEG has no alpha, and an unpainted canvas
  // encodes to black, which is the worst possible background for handwriting.
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvasWidth, canvasHeight);
  context.translate(canvasWidth / 2, canvasHeight / 2);
  context.rotate((rotation * Math.PI) / 180);
  context.drawImage(image, -scaledWidth / 2, -scaledHeight / 2, scaledWidth, scaledHeight);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, scriptPageContentType, scriptPageJpegQuality);
  });

  if (!blob) {
    throw new Error("This browser could not encode the photo");
  }

  const baseName = file.name.replace(/\.[^./\\]+$/, "") || "page";

  return {
    file: new File([blob], `${baseName}.${scriptPageFileExtension}`, {
      type: scriptPageContentType
    }),
    height: canvasHeight,
    width: canvasWidth
  };
}
