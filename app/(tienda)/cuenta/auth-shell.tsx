import type { ReactNode } from "react";
import { Highlight, SegmentedControl } from "@/components/bt";
import { PhotoPanel } from "@/components/bt/cliente-c/photo-panel";
import { COPY } from "@/lib/data/demo/copy";
import { DEMO_PHOTOS, demoPhoto } from "@/lib/data/demo/photos";
import { img } from "@/lib/images";
import { paths } from "@/lib/paths";

const A = COPY.auth;

/**
 * Layout de 2h / 4g (ingresar, crear cuenta, recuperar): foto con
 * gradiente a la izquierda (arriba en mobile) y la caja de 440 px.
 */
export function AuthShell({ tab, children }: { tab?: "login" | "register"; children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 md:min-h-[760px] md:grid-cols-2">
      <PhotoPanel src={img(demoPhoto(DEMO_PHOTOS.local), { w: 1400 })} alt={A.photoAlt}>
        <p className="m-0 font-sans text-[44px] leading-[.9] font-black uppercase stretch-66 md:text-[88px] md:leading-[.86]">
          {A.asideTitleLead} <Highlight>{A.asideTitleHighlight}</Highlight>
        </p>
        <p className="m-0 max-w-[480px] text-[18px] leading-normal text-text-2 max-md:hidden">{A.asideText}</p>
      </PhotoPanel>
      <div className="flex items-center justify-center px-4 pt-5 pb-8 md:p-14">
        <div className="flex w-full max-w-[440px] flex-col gap-4 md:gap-[22px]">
          {tab && (
            <SegmentedControl
              ariaLabel="Cuenta"
              items={[
                { label: A.tabs.login, href: paths.login(), active: tab === "login" },
                { label: A.tabs.register, href: paths.register(), active: tab === "register" },
              ]}
              className="max-md:[&>a]:text-[14px] max-md:[&>a]:tracking-[.06em]"
            />
          )}
          {children}
        </div>
      </div>
    </div>
  );
}
