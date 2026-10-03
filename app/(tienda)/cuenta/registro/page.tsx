import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { features } from "@/lib/features";
import { NOINDEX } from "@/lib/seo";
import { RegisterForm } from "../auth-forms";
import { AuthShell } from "../auth-shell";

export const metadata: Metadata = { title: "Crear cuenta", robots: NOINDEX };

/** 2h / 4g · Crear cuenta (sin Google: solo email + contraseña). */
export default function RegisterPage() {
  if (!features.accounts) notFound();
  return (
    <AuthShell tab="register">
      <RegisterForm />
    </AuthShell>
  );
}
