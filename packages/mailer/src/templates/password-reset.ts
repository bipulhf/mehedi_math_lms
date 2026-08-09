import { createTranslator, defaultLocale, type Locale } from "@mma/i18n";

/**
 * The password reset mail, in the Mehedi's Math Academy palette.
 *
 * Tables and inline styles, because an email client is not a browser: Outlook
 * has no flexbox and Gmail strips `<style>` blocks it dislikes. The colours are
 * the hexes from `apps/web/src/styles/app.css` written out — a mail cannot
 * reach a CSS custom property, so this is the one place the palette is
 * duplicated, and it is duplicated with the token names beside it.
 */

const ink = "#23211e";
const muted = "#6b6763";
const mutedLight = "#8a857d";
const paper = "#fcfbf9";
const card = "#ffffff";
const hairline = "#e8e4de";
const accent = "#ee5622";

const fontStack = "'Hind Siliguri', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

export interface PasswordResetEmailInput {
  expiryMinutes: number;
  locale?: Locale | undefined;
  name: string;
  resetUrl: string;
}

export interface RenderedEmail {
  html: string;
  subject: string;
  text: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderPasswordResetEmail(input: PasswordResetEmailInput): RenderedEmail {
  const t = createTranslator(input.locale ?? defaultLocale);
  const name = input.name.trim().length > 0 ? input.name.trim() : t("email.resetFallbackName");
  const expiry = t("email.resetExpiry", { minutes: input.expiryMinutes });
  const logoUrl = new URL("/brand/mma-logo.png", input.resetUrl).toString();
  const safeUrl = escapeHtml(input.resetUrl);
  const safeLogoUrl = escapeHtml(logoUrl);

  const html = `<!doctype html>
<html lang="${input.locale ?? defaultLocale}">
  <head>
    <meta charset="utf-8" />
    <meta content="width=device-width, initial-scale=1" name="viewport" />
    <title>${escapeHtml(t("email.resetSubject"))}</title>
  </head>
  <body style="margin:0;padding:0;background:${paper};font-family:${fontStack};color:${ink};">
    <table cellpadding="0" cellspacing="0" role="presentation" style="width:100%;background:${paper};padding:32px 12px;">
      <tr>
        <td align="center">
          <table cellpadding="0" cellspacing="0" role="presentation" style="width:100%;max-width:520px;background:${card};border:1px solid ${hairline};">
            <tr>
              <td style="padding:28px 32px 0 32px;">
                <img alt="${escapeHtml(t("brand.name"))}" height="72" src="${safeLogoUrl}" style="display:block;height:72px;width:72px;object-fit:contain;" width="72" />
                <h1 style="margin:12px 0 0 0;font-size:24px;font-weight:500;line-height:1.3;color:${ink};">${escapeHtml(t("email.resetHeading"))}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 0 32px;">
                <p style="margin:0 0 14px 0;font-size:16px;font-weight:300;line-height:1.7;color:${muted};">${escapeHtml(t("email.resetGreeting", { name }))}</p>
                <p style="margin:0;font-size:16px;font-weight:300;line-height:1.7;color:${muted};">${escapeHtml(t("email.resetBody"))}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 0 32px;">
                <a href="${safeUrl}" style="display:inline-block;background:${accent};color:#ffffff;font-size:16px;font-weight:500;padding:14px 28px;text-decoration:none;">${escapeHtml(t("email.resetButton"))}</a>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 0 32px;">
                <p style="margin:0;font-size:14px;font-weight:300;line-height:1.7;color:${mutedLight};">${escapeHtml(expiry)} ${escapeHtml(t("email.resetIgnore"))}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 28px 32px;">
                <p style="margin:0 0 6px 0;font-size:13px;font-weight:300;color:${mutedLight};">${escapeHtml(t("email.resetManualLink"))}</p>
                <p style="margin:0;font-size:13px;word-break:break-all;"><a href="${safeUrl}" style="color:${accent};text-decoration:none;">${safeUrl}</a></p>
              </td>
            </tr>
            <tr>
              <td style="border-top:1px solid ${hairline};padding:16px 32px;">
                <p style="margin:0;font-size:12px;font-weight:300;color:${mutedLight};">${escapeHtml(t("email.autoNotice"))}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    t("email.resetHeading"),
    "",
    t("email.resetGreeting", { name }),
    t("email.resetBody"),
    "",
    input.resetUrl,
    "",
    `${expiry} ${t("email.resetIgnore")}`,
    "",
    t("email.autoNotice")
  ].join("\n");

  return { html, subject: t("email.resetSubject"), text };
}
