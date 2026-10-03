import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { features } from "@/lib/features";
import { NOINDEX } from "@/lib/seo";
import { LoginForm } from "../auth-forms";
import { AuthShell } from "../auth-shell";

export const metadata: Metadata = { title: "Ingresar", robots: NOINDEX };

/** 2h / 4g · Ingresar. Estática: la sesión se consulta desde el cliente. */
export default function LoginPage() {
  if (!features.accounts) notFound();
  return (
    <AuthShell tab="login">
      <LoginForm />
    </AuthShell>
  );
}
