import type { ReactNode } from "react";
import { Highlight, PhotoPanel, SegmentedControl } from "@/components/bt";
import { COPY } from "@/lib/data/demo/copy";
import { DEMO_PHOTOS, demoPhoto } from "@/lib/data/demo/photos";
import { img } from "@/lib/images";
import { paths } from "@/lib/paths";
import { StarIcon } from "@/components/store/member-client";
import { MemberPerks } from "@/components/store/members";
import { MEMBERS_COPY } from "@/components/store/members-copy";

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
        {tab === "register" ? (
          <div className="flex max-w-[480px] flex-col gap-3 max-md:hidden">
            <span className="text-[13px] font-bold tracking-[.08em] text-yellow uppercase">
              {MEMBERS_COPY.register.eyebrow}
            </span>
            <MemberPerks layout="list" />
          </div>
        ) : (
          <p className="m-0 max-w-[480px] text-[18px] leading-normal text-text-2 max-md:hidden">{A.asideText}</p>
        )}
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
          {tab === "register" && (
            <ul className="m-0 flex list-none flex-wrap gap-2 p-0 md:hidden">
              {MEMBERS_COPY.perks.map((p) => (
                <li
                  key={p.n}
                  className="flex items-center gap-[6px] rounded-full border border-line px-3 py-[6px] text-[12px] font-bold tracking-[.04em] uppercase"
                >
                  <StarIcon className="size-3 text-yellow" />
                  {p.title}
                </li>
              ))}
            </ul>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}
