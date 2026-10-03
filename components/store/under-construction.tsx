import type { ReactNode } from "react";
import { Button, EmptyState } from "@/components/bt";

/**
 * Placeholder "En construcción" (ola 0): las rutas existen para que
 * header, footer, sitemap y mails no lleven a un 404 mientras se diseñan
 * sus pantallas. Se reemplaza en la ola 1.
 */
export function UnderConstruction({
  title,
  description,
  action,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: { href: string; label: string };
}) {
  return (
    <section className="mx-auto w-full max-w-[1440px] px-4 py-16 md:px-14 md:py-24">
      <EmptyState
        eyebrow="En construcción"
        title={title}
        description={description}
        action={
          action && (
            <Button href={action.href} variant="primary" size="lg">
              {action.label}
            </Button>
          )
        }
      />
    </section>
  );
}
