import type { Metadata } from "next";
import { getAdminContent } from "@/lib/server/admin-queries";
import { AboutEditor } from "./about-editor";

export const metadata: Metadata = { title: "Nosotros" };

export default async function AdminNosotrosPage() {
  const { content } = await getAdminContent();
  return <AboutEditor about={content.nosotros} />;
}
