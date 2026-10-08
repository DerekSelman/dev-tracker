import { supabase } from "./supabase";

// Small copies of photos live at "thumbs/<original path>" in the lot-files bucket.
export const thumbPath = (path) => `thumbs/${path}`;

// Resize an image File to a ~1200px JPEG Blob (keeps phone orientation).
export async function makeThumbnail(file, maxDim = 1200, quality = 0.78) {
  let source;
  try {
    source = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    source = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }
  const w = source.width, h = source.height;
  const scale = Math.min(1, maxDim / Math.max(w, h));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  canvas.getContext("2d").drawImage(source, 0, 0, canvas.width, canvas.height);
  return await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

// Upload a thumbnail next to an uploaded photo. Never throws: a missing thumbnail
// just means print falls back to the full-size photo.
export async function uploadThumbnail(file, path) {
  try {
    const blob = await makeThumbnail(file);
    if (blob) await supabase.storage.from("lot-files").upload(thumbPath(path), blob, { contentType: "image/jpeg", upsert: true });
  } catch (e) {
    console.warn("Thumbnail failed", e);
  }
}
