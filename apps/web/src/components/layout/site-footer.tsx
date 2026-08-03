import { Link } from "@tanstack/react-router";
import type { JSX, ReactNode } from "react";

import { siteNavItems } from "@/components/layout/site-nav";
import { HatchedRule } from "@/components/ui/doodles";
import { useFormat, useT } from "@/lib/i18n/locale-context";
import { siteConfig } from "@/lib/site";

/**
 * The closing band: a hatched rule on top, then four columns on
 * `panel-warm`. DESIGN.md §7 doodle 5.
 *
 * The year goes through `digits` and not `number`: a year is not a quantity,
 * and grouping it would print ২,০২৬.
 */
export function SiteFooter(): JSX.Element {
  const t = useT();
  const format = useFormat();
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto">
      <HatchedRule />
      <div className="bg-panel-warm">
        <div className="mx-auto grid w-full max-w-[90rem] gap-10 px-4 py-14 sm:px-8 lg:grid-cols-[1.4fr_1fr_1fr_1fr] lg:px-14">
          <div className="space-y-4">
            <Link aria-label={siteConfig.name} className="flex items-center gap-2.5" to="/">
              <img alt="" className="block h-7 w-auto" src="/brand/genex-mark.png" />
              <img
                alt={siteConfig.name}
                className="block h-4 w-auto"
                src="/brand/genex-wordmark.png"
              />
            </Link>
            <dl className="space-y-1.5 text-base font-light text-muted">
              <div className="flex gap-2">
                <dt className="text-muted-light">{t("footer.address")}:</dt>
                <dd>{siteConfig.contact.address}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-muted-light">{t("footer.helpline")}:</dt>
                <dd>
                  <a href={`tel:${siteConfig.contact.helpline}`}>
                    {format.digits(siteConfig.contact.helpline)}
                  </a>
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-muted-light">{t("footer.email")}:</dt>
                <dd>
                  <a href={`mailto:${siteConfig.contact.email}`}>{siteConfig.contact.email}</a>
                </dd>
              </div>
            </dl>
          </div>

          <FooterColumn title={t("footer.courses")}>
            {siteNavItems.map((item) => (
              <Link className="hover:text-ink" key={item.labelKey} to={item.to}>
                {t(item.labelKey)}
              </Link>
            ))}
          </FooterColumn>

          <FooterColumn title={t("footer.about")}>
            <Link className="hover:text-ink" to="/about">
              {t("footer.about")}
            </Link>
            <Link className="hover:text-ink" to="/contact">
              {t("footer.support")}
            </Link>
          </FooterColumn>

          <FooterColumn title={t("footer.legal")}>
            {/* No privacy or terms page exists yet, so these point at the one
                surface that can actually answer a question. */}
            <Link className="hover:text-ink" to="/contact">
              {t("footer.privacy")}
            </Link>
            <Link className="hover:text-ink" to="/contact">
              {t("footer.terms")}
            </Link>
          </FooterColumn>
        </div>

        <div className="mx-auto w-full max-w-[90rem] border-t border-hairline px-4 py-6 sm:px-8 lg:px-14">
          <p className="text-sm text-muted-faint">
            {t("footer.copyright", { year: format.digits(String(year)) })} · {t("footer.rights")}
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  children,
  title
}: {
  children: ReactNode;
  title: string;
}): JSX.Element {
  return (
    <div className="space-y-3">
      <p className="label-mono text-xs uppercase text-muted-faint">{title}</p>
      <div className="flex flex-col gap-2 text-base font-light text-muted">{children}</div>
    </div>
  );
}
