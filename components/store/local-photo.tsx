import { lexicon } from "@/lib/data/content";
import { img } from "@/lib/images";

/** Foto del local (o su placeholder rayado) con la pill de la dirección. */
export function LocalPhoto({
  photo,
  address,
  className,
  titleSize,
}: {
  photo: string | null;
  address?: string;
  className: string;
  titleSize: string;
}) {
  return (
    <div
      className={`stripes-photo relative box-content overflow-hidden rounded-[24px] border border-ink/[.12] ${className}`}
    >
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element -- Cloudinary transforma (img())
        <img
          src={img(photo, { w: 1600 })}
          alt={lexicon.localPhoto.alt}
          loading="lazy"
          className="absolute inset-0 block h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-5 text-center">
          <div className={`font-display font-extrabold tracking-normal ${titleSize}`}>
            {lexicon.localPhoto.title}
          </div>
          <div className="mt-1 font-sans text-[12.5px] text-ink/55">
            {lexicon.localPhoto.hint}
          </div>
        </div>
      )}
      {address && (
        <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-full bg-[rgba(12,14,11,.88)] px-[14px] py-[9px] font-sans text-[12px] font-bold text-cream">
          <span className="inline-block h-2 w-2 rounded-full bg-brand" />
          {address}
        </div>
      )}
    </div>
  );
}
