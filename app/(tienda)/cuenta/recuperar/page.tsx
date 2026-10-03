import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { features } from "@/lib/features";
import { NOINDEX } from "@/lib/seo";
import { RecoverFlow } from "../auth-forms";
import { AuthShell } from "../auth-shell";

export const metadata: Metadata = { title: "Recuperar contraseña", robots: NOINDEX };

/**
 * Recuperar contraseña (sin diseño, derivada de 2h). Sin `?token=` pide el
 * mail; con `?token=` (el link que arma `sendPasswordResetEmail` con
 * `paths.recover()`) valida el token y fija la contraseña nueva.
 */
export default function RecoverPage() {
  if (!features.accounts) notFound();
  return (
    <AuthShell>
      <RecoverFlow />
    </AuthShell>
  );
}
