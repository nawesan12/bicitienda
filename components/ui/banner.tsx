import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/icon";

export type BannerTone = "success" | "warning" | "info" | "danger";

const TONES: Record<BannerTone, string> = {
  success: "bg-success-soft border-success-line text-success",
  warning: "bg-warning-bg border-warning-chip text-warning",
  info: "bg-info-bg border-info-bg text-info",
  danger: "bg-danger-bg border-danger-line text-danger",
};

/** Aviso inline con icono. Radio 7px, borde de 1px del mismo tono. */
export function Banner({
  tone = "success",
  icon,
  className,
  children,
}: {
  tone?: BannerTone;
  icon: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-[10px] rounded-[7px] border px-[14px] py-[11px]",
        "text-[12px] leading-snug font-semibold",
        TONES[tone],
        className,
      )}
    >
      <Icon name={icon} size={16} className="shrink-0" />
      <span>{children}</span>
    </div>
  );
}
