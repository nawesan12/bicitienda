import { features } from "@/lib/features";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getAdminArticles } from "@/lib/server/admin-queries";
import { ArticlesManager } from "./articles-manager";

export const metadata: Metadata = { title: "Novedades" };

export default async function AdminNovedadesPage({
  searchParams,
}: {
  searchParams: Promise<{ nota?: string }>;
}) {
  if (!features.blog) notFound();
  const [{ nota }, articles] = await Promise.all([searchParams, getAdminArticles()]);
  return <ArticlesManager articles={articles} initialOpen={nota ?? null} />;
}
