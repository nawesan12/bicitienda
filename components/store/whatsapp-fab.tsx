import { WaLink } from "@/components/store/wa-link";
import { wa } from "@/lib/whatsapp";

/** Botón flotante de WhatsApp, presente en toda la web pública. */
export function WhatsappFab({
  whatsapp,
  label,
}: {
  whatsapp: string;
  label: string;
}) {
  return (
    <div className="fixed bottom-[22px] right-[22px] z-[90]">
      <WaLink
        whatsapp={whatsapp}
        {...wa.general()}
        className="flex items-center gap-[10px] rounded-full bg-brand px-5 py-[14px] font-sans text-[14px] font-bold text-night shadow-[0_8px_30px_rgba(94,184,56,.45)] hover:-translate-y-[2px]"
      >
        <span className="inline-block h-[10px] w-[10px] rounded-full bg-night" />
        {label}
      </WaLink>
    </div>
  );
}
