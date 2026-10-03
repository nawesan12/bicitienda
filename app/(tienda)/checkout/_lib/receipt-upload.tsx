"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/bt/button";
import { UploadDropzone } from "@/components/bt/upload-dropzone";
import { uploadTransferReceipt } from "@/lib/server/actions/transfer-receipt";
import { BUY } from "./copy";

/** Debe coincidir con MAX_PRIVATE_UPLOAD_BYTES (lib/server/uploads.ts). */
const MAX_BYTES = 3.8 * 1024 * 1024;

/**
 * Las fotos del celular suelen pasar el tope del body de la action: se
 * achican a JPEG en el navegador (legible para un comprobante). Los PDF
 * van como vienen.
 */
async function prepare(file: File): Promise<File | null> {
  if (!file.type.startsWith("image/")) return file;
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  const scale = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.85));
  return blob ? new File([blob], "comprobante.jpg", { type: "image/jpeg" }) : file;
}

const T = BUY.confirm.transfer;

/**
 * Comprobante de transferencia desde la confirmación: UploadDropzone →
 * uploadTransferReceipt (número + contacto del pedido), o por WhatsApp.
 */
export function ReceiptUpload({
  number,
  contact,
  waHref,
  alreadySent,
}: {
  number: string;
  contact: string;
  waHref: string;
  alreadySent: boolean;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [sent, setSent] = useState(alreadySent);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setError(null);
    startTransition(async () => {
      const ready = await prepare(file);
      if (!ready || ready.size > MAX_BYTES) {
        setError("El archivo supera los 4 MB. Probá con una foto o mandalo por WhatsApp.");
        return;
      }
      const fd = new FormData();
      fd.set("number", number);
      fd.set("contact", contact);
      fd.set("file", ready);
      const r = await uploadTransferReceipt(fd);
      if (r.ok) {
        setSent(true);
        setFile(null);
      } else setError(r.error);
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      {sent && (
        <p role="status" className="m-0 text-[15px] font-bold text-yellow">
          {T.uploaded} <span className="font-normal text-text-2">{T.uploadAgain}</span>
        </p>
      )}
      <UploadDropzone
        name="file"
        accept="image/*,application/pdf"
        label={T.uploadLabel}
        hint={T.uploadHint}
        selected={file?.name}
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />
      {error && (
        <p role="alert" className="m-0 text-[14px] font-semibold text-red-light">
          {error}
        </p>
      )}
      {file && (
        <Button type="submit" size="full" disabled={pending}>
          {pending ? T.uploading : T.uploadCta}
        </Button>
      )}
      <div className="flex items-center gap-3 text-[14px] text-text-3">
        <span aria-hidden className="h-px flex-1 bg-line" />
        {T.or}
        <span aria-hidden className="h-px flex-1 bg-line" />
      </div>
      <Button href={waHref} external variant="secondary" size="full">
        {T.waCta}
      </Button>
    </form>
  );
}
