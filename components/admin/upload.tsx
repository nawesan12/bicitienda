"use client";

import { useState } from "react";
import type { UploadKind } from "@/lib/images";
import { resizeForUpload } from "@/lib/resize-image";
import { uploadSiteImage } from "@/lib/server/actions/uploads";

/**
 * Subida de fotos del panel: el navegador la achica según su tipo
 * (producto 1400, galería 1000, local 1600, hero 2000 px — UPLOAD_LIMITS)
 * y la manda a la action, que la guarda en Cloudinary o, sin env, en
 * `.data/uploads` (fallback local).
 */

type Fail = { ok: false; error: string };

export async function sendPhoto<R extends { ok: boolean }>(
  file: File,
  kind: UploadKind,
  send: (fd: FormData) => Promise<R>,
): Promise<R | Fail> {
  const resized = await resizeForUpload(file, kind);
  if (!resized) return { ok: false, error: "No se pudo leer la imagen. Probá con un JPG o PNG." };
  const fd = new FormData();
  fd.set("photo", resized);
  return send(fd);
}

/** Sube una foto del sitio (galería, local, hero) y devuelve su URL. */
export function uploadSitePhoto(file: File, kind: Exclude<UploadKind, "product">) {
  return sendPhoto(file, kind, (fd) => uploadSiteImage(kind, fd));
}

/**
 * Botón-label con input file oculto, como el prototipo. Mientras sube
 * muestra "Subiendo…".
 */
export function FileButton({
  label,
  onFile,
  className,
}: {
  label: string;
  onFile: (file: File) => Promise<void>;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <label className={className} style={{ cursor: busy ? "progress" : "pointer" }}>
      {busy ? "Subiendo…" : label}
      <input
        type="file"
        accept="image/*"
        className="hidden"
        disabled={busy}
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          setBusy(true);
          try {
            await onFile(f);
          } finally {
            setBusy(false);
          }
        }}
      />
    </label>
  );
}
