/**
 * The shop's real contact details — one source of truth.
 *
 * These were hardcoded per-component, and every value was the template's US
 * demo data: a Crystal Lake, Illinois address and a 315 area code in the footer
 * of every page, a North Carolina address on the Arabic contact page, and
 * `themesflat@gmail.com` throughout. A shopper in Baghdad was being shown an
 * American shop's details.
 *
 * ANYTHING LEFT EMPTY IS HIDDEN rather than filled with a placeholder. Showing
 * a wrong address is worse than showing none, and inventing a plausible-looking
 * Iraqi one would be worse still — it would look correct and be undeliverable.
 * Fill these in and the rows appear automatically.
 */
export const siteContact = {
  /**
   * The shop's public handle, shown wherever a contact line appears.
   *
   * Deliberately NOT an email address: it is rendered as plain text rather
   * than a `mailto:` link, because a handle that is not an address would
   * produce a dead compose window.
   */
  handle: "Heels_byfit",

  /** A real address, if there is one. Rendered as a mailto link when set. */
  email: "",

  /** TODO: the shop's real number, in international form, e.g. "+964 770 000 0000". */
  phone: "",

  /** TODO: the shop's real street address. */
  address: "",

  /**
   * TODO: a Google Maps embed URL for the real address.
   * The previous value pointed at New York.
   */
  mapEmbedUrl: "",

  /** TODO: opening hours, e.g. "السبت - الخميس: ٩ص - ٩م". */
  openingHours: "",
};

/** `tel:` needs the number without spaces or punctuation. */
export const telHref = (phone) =>
  phone ? `tel:${String(phone).replace(/[^\d+]/g, "")}` : undefined;
