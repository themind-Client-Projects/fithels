"use client";

import React from "react";

/**
 * Reassurance strip under the buy button: how payment works, and where the
 * delivery terms are.
 *
 * The copy comes from the TrustBadge rows, edited in the dashboard, so the two
 * places it appears cannot drift apart and a wording change is not a deploy.
 * The defaults it falls back to are still constrained to what the code does.
 * That constraint is
 * deliberate — the cart used to carry a "Congratulations! You've got free
 * shipping!" bar wired to nothing, and the home page a features strip promising
 * free delivery the checkout never applied. Both were removed for saying things
 * that were not true, so nothing was invented to fill this one:
 *
 *  - Secure payment  — orders go through Wayle's hosted page; no card details
 *                      ever reach this application.
 *  - Cash on delivery — PaymentMethod.COD is a real option at checkout.
 *  - Delivery         — 48 hours from order confirmation, the shop's stated
 *                      policy. It replaced a line that pointed at the accordion
 *                      because no one had set a term yet.
 *
 * Anything product-specific — a returns window, a longer lead time on one item —
 * belongs in that product's delivery field, which feeds the accordion below.
 * This row is the shop-wide promise and applies to everything.
 *
 * Icons are inline svg rather than an icon package: this renders on every
 * product page and three glyphs are not worth a client-side dependency.
 */

const ShieldIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

const CashIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="2" y="6" width="20" height="12" rx="2" />
    <circle cx="12" cy="12" r="2.5" />
    <path d="M6 12h.01M18 12h.01" />
  </svg>
);

const TruckIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 16V6a1 1 0 0 1 1-1h10v11H3z" />
    <path d="M14 9h4l3 3v4h-7V9z" />
    <circle cx="7.5" cy="18" r="1.8" />
    <circle cx="17.5" cy="18" r="1.8" />
  </svg>
);

/**
 * `variant` picks the layout, not the content — the three claims and their
 * wording live here once, so the product page and the home page cannot drift
 * apart on what the shop promises.
 *
 *   "rows"    — compact list, used beside the buy button
 *   "stacked" — icon above centred text, used as a full-width band
 */
/** Icon per slot, chosen here rather than stored, so an admin editing the copy
 *  cannot pair the truck with the payment line. */
const ICONS = {
  PAYMENT: ShieldIcon,
  COD: CashIcon,
  DELIVERY: TruckIcon,
};

export default function ProductTrustBadges({
  badges = [],
  locale = "ar",
  variant = "rows",
}) {
  const ar = locale === "ar";

  const items = badges
    .map((badge) => ({
      key: badge.slot,
      Icon: ICONS[badge.slot],
      title: ar ? badge.titleAr : badge.titleEn,
      text: ar ? badge.textAr : badge.textEn,
    }))
    // A slot the code does not know how to draw is skipped rather than rendered
    // without an icon.
    .filter((item) => item.Icon && item.title);

  if (items.length === 0) return null;

  return (
    <ul className={`pdp-trust pdp-trust--${variant}`}>
      {items.map(({ key, Icon, title, text }) => (
        <li className="pdp-trust__item" key={key}>
          <span className="pdp-trust__icon">
            <Icon />
          </span>
          <span className="pdp-trust__copy">
            <span className="pdp-trust__title">{title}</span>
            {text && <span className="pdp-trust__text">{text}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}
