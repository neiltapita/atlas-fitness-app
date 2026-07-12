import { manipulateAsync, SaveFormat } from "expo-image-manipulator";

const MAX_DIMENSION = 1024;

/**
 * Caps the long edge of a photo at MAX_DIMENSION before it's sent to a
 * vision API. Claude's image cost scales with pixel count, so an
 * unresized phone photo (often 3000px+) can cost 10x+ more per call than
 * a resized one, with no real accuracy benefit for food recognition.
 */
export async function resizeForVisionApi(
  uri: string,
  width: number,
  height: number,
  fallbackBase64?: string | null
): Promise<string> {
  const longEdge = Math.max(width, height);
  if (longEdge <= MAX_DIMENSION && fallbackBase64) {
    return fallbackBase64;
  }

  const resize = width >= height ? { width: MAX_DIMENSION } : { height: MAX_DIMENSION };
  const result = await manipulateAsync(uri, [{ resize }], {
    compress: 0.7,
    format: SaveFormat.JPEG,
    base64: true,
  });
  if (!result.base64) {
    throw new Error("Failed to encode resized image");
  }
  return result.base64;
}
