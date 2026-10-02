"use server";

import { redirect } from "next/navigation";
import { logoutAdmin } from "@/lib/server/admin-auth";

/** Cierra la sesión del admin y vuelve al login. */
export async function logout() {
  await logoutAdmin();
  redirect("/admin/ingresar");
}
