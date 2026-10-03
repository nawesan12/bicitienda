import type { ReactElement } from "react";

/**
 * HTML + texto plano de un mail. `deliver()` (lib/server/mail.ts) manda
 * los dos a Resend (`html` y `text` del POST /emails).
 *
 * El texto sale del mismo HTML (html-to-text vía @react-email/render):
 * sin el preheader oculto y con los links de los botones a la vista.
 */
export async function renderEmail(element: ReactElement): Promise<{ html: string; text: string }> {
  const { render, toPlainText } = await import("@react-email/render");
  const html = await render(element);
  const text = toPlainText(html, {
    selectors: [
      { selector: "img", format: "skip" },
      { selector: "[data-skip-in-text=true]", format: "skip" },
      { selector: "h1", options: { uppercase: false } },
      { selector: "table", format: "block" },
      { selector: "a", options: { hideLinkHrefIfSameAsText: true } },
    ],
  })
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { html, text };
}
