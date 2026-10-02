import { Bolt } from "@/components/store/bolt";

/** Cinta verde infinita del home. Duplica los mensajes para el loop. */
export function Marquee({ messages }: { messages: string[] }) {
  const items = [...messages, ...messages];

  return (
    <div className="overflow-hidden border-t border-night bg-brand">
      <div className="animate-marquee flex w-max py-3">
        {items.map((m, i) => (
          <div
            key={`${m}-${i}`}
            className="flex items-center gap-[18px] whitespace-nowrap px-[18px] font-sans text-[14px] font-extrabold tracking-[.08em] text-night"
          >
            {m}
            <Bolt />
          </div>
        ))}
      </div>
    </div>
  );
}
