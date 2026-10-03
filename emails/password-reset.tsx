import { Actions, Button, colors, EmailShell, Eyebrow, firstName, fonts, P, Title } from "./components";

/** Recupero de contraseña de la cuenta de cliente (link de un solo uso). */
export interface PasswordResetData {
  brandName: string;
  customerName: string;
  resetUrl: string;
  /** Minutos de validez del link. */
  validMinutes: number;
  footer: string;
  whatsapp?: string;
}

export function PasswordResetEmail(data: PasswordResetData) {
  const first = firstName(data.customerName);
  const valid =
    data.validMinutes >= 60 ? `${Math.round(data.validMinutes / 60)} h` : `${data.validMinutes} minutos`;
  return (
    <EmailShell
      preview={`Elegí una contraseña nueva. El link vale ${valid}.`}
      footer={data.footer}
      whatsapp={data.whatsapp}
    >
      <Eyebrow>Tu cuenta</Eyebrow>
      <Title accent="contraseña nueva.">{first}, elegí una</Title>
      <P>
        Pediste recuperar el acceso a tu cuenta de {data.brandName}. Tocá el botón para crear una
        contraseña nueva. El link vale {valid} y se usa una sola vez.
      </P>
      <Actions>
        <Button href={data.resetUrl}>Crear contraseña nueva →</Button>
      </Actions>
      <P muted>Si el botón no anda, copiá y pegá este link en el navegador:</P>
      <p
        style={{
          margin: "6px 0 0",
          fontFamily: fonts.mono,
          fontSize: "12px",
          lineHeight: 1.5,
          color: colors.text2,
          wordBreak: "break-all",
        }}
      >
        {data.resetUrl}
      </p>
      <P muted>Si no lo pediste vos, ignorá este mail: tu contraseña no cambia.</P>
    </EmailShell>
  );
}
