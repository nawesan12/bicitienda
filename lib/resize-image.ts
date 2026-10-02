import { UPLOAD_LIMITS, type UploadKind } from "@/lib/images";

/**
 * Redimensionado EN EL NAVEGADOR antes de subir (solo cliente): canvas →
 * JPEG sobre fondo blanco, lado máximo y calidad según el tipo de foto
 * (UPLOAD_LIMITS). Es el `readImg` del prototipo del admin; el fondo
 * blanco además evita que un PNG con transparencia quede negro en JPEG y
 * acompaña el blend `multiply` de las tarjetas.
 */
export async function resizeForUpload(
  file: File,
  kind: UploadKind,
): Promise<File | null> {
  const { maxSide, quality } = UPLOAD_LIMITS[kind];
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return null;

  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/jpeg", quality),
  );
  return blob ? new File([blob], `${kind}.jpg`, { type: "image/jpeg" }) : null;
}
