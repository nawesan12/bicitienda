import { Section } from "@react-email/components";
import { Button, colors, EmailShell, Kicker, P, Title } from "./components";

/** Recupero de contraseña de la cuenta de cliente (link de un solo uso). */
export interface PasswordResetData {
  brandName: string;
  customerName: string;
  resetUrl: string;
  /** Minutos de validez del link. */
  validMinutes: number;
  footer: string;
}

export function PasswordResetEmail(data: PasswordResetData) {
  const first = data.customerName.split(" ")[0] || "Hola";
  return (
    <EmailShell preview="Elegí una contraseña nueva" footer={data.footer}>
      <Kicker>TU CUENTA</Kicker>
      <Title>{first}, elegí una contraseña nueva</Title>
      <P>
        Pediste recuperar el acceso a tu cuenta de {data.brandName}. Tocá el
        botón para crear una contraseña nueva. El link vale{" "}
        {data.validMinutes >= 60
          ? `${Math.round(data.validMinutes / 60)} h`
          : `${data.validMinutes} minutos`}{" "}
        y se puede usar una sola vez.
      </P>
      <Section style={{ marginTop: "24px" }}>
        <Button href={data.resetUrl} variant="brand">
          Crear contraseña nueva
        </Button>
      </Section>
      <P>
        <span style={{ color: colors.muted }}>
          Si no lo pediste vos, ignorá este mail: tu contraseña no cambia.
        </span>
      </P>
    </EmailShell>
  );
}
