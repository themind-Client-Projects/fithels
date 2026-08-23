import React from "react";
import { getTranslations } from "next-intl/server";
import { siteContact, telHref } from "@/data/siteContact";

/**
 * The contact page's channels.
 *
 * REPLACES A CONTACT FORM. That form posted to EmailJS with the template's own
 * service id, template id and public key still hardcoded in the component, so
 * anything a shopper typed went to whoever owns that EmailJS account rather
 * than to the shop — and the page reported "sent" regardless. Nothing here
 * collects a message: every channel below is one the shop actually reads, and
 * WhatsApp is how this shop already takes orders.
 *
 * A server component. These are links with fixed hrefs, so there is nothing to
 * hydrate and the page ships no JavaScript for it — the form pulled the whole
 * EmailJS client into the bundle.
 *
 * A channel with no value configured is not rendered. siteContact ships blank
 * fields rather than placeholders, and a contact page that lists a number the
 * shop does not answer is worse than one that lists fewer ways to reach it.
 */

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.01-1.04 2.47s1.06 2.86 1.21 3.06c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.42-.07-.13-.27-.2-.57-.35z" />
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.87 9.87 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm0 18.13h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.19 8.19 0 0 1-1.26-4.36c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.83 2.42a8.18 8.18 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24z" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** One channel. Renders as a link when it has somewhere to go. */
function Channel({ href, icon, title, description, value, action, primary }) {
  const Tag = href ? "a" : "div";
  const linkProps = href
    ? {
        href,
        // Every channel here leaves the shop, so none of them should navigate
        // the storefront away from itself.
        target: "_blank",
        rel: "noopener noreferrer",
      }
    : {};

  return (
    <Tag
      className={`contact-channel${primary ? " contact-channel--primary" : ""}`}
      {...linkProps}
    >
      <span className="contact-channel__icon">{icon}</span>
      <span className="contact-channel__title">{title}</span>
      <span className="contact-channel__desc">{description}</span>
      {/* dir=ltr: an Arabic paragraph would otherwise reorder a phone number,
          moving the country code to the wrong end. */}
      <span className="contact-channel__value" dir="ltr">
        {value}
      </span>
      {action ? (
        <span className="contact-channel__action">{action}</span>
      ) : null}
    </Tag>
  );
}

export default async function ContactChannels({ locale }) {
  const t = await getTranslations({ locale, namespace: "contact" });

  const details = [
    siteContact.address && {
      key: "address",
      label: t("addressLabel"),
      value: siteContact.address,
    },
    siteContact.openingHours && {
      key: "hours",
      label: t("hoursLabel"),
      value: siteContact.openingHours,
    },
  ].filter(Boolean);

  return (
    <section className="contact-section">
      <div className="container">
        <div className="contact-hero">
          <h1 className="contact-hero__title">{t("getInTouch")}</h1>
          <p className="contact-hero__lead">{t("lead")}</p>
        </div>

        <div className="contact-channels">
          {siteContact.whatsapp && (
            <Channel
              primary
              href={`https://wa.me/${siteContact.whatsapp}`}
              icon={<WhatsAppIcon />}
              title={t("whatsappTitle")}
              description={t("whatsappDesc")}
              value={siteContact.phone}
              action={t("whatsappAction")}
            />
          )}

          {siteContact.phone && (
            <Channel
              href={telHref(siteContact.phone)}
              icon={<PhoneIcon />}
              title={t("phoneLabel")}
              description={t("phoneDesc")}
              value={siteContact.phone}
              action={t("phoneAction")}
            />
          )}

          {siteContact.handle && (
            <Channel
              // Only a link once a real profile URL is configured; the handle
              // alone is not enough to build one that is certainly the shop's.
              href={siteContact.instagramUrl || undefined}
              icon={<InstagramIcon />}
              title={t("instagramTitle")}
              description={t("instagramDesc")}
              value={siteContact.handle}
              action={siteContact.instagramUrl ? t("instagramAction") : null}
            />
          )}
        </div>

        {details.length > 0 && (
          <dl className="contact-details">
            {details.map((row) => (
              <div className="contact-details__row" key={row.key}>
                <dt className="contact-details__label">{row.label}</dt>
                <dd className="contact-details__value">{row.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </section>
  );
}
