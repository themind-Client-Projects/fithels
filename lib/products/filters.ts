/**
 * Shared filter option definitions.
 *
 * These live outside the components because the reducer toggles a facet OFF by
 * comparing the incoming value to the stored one with `==` — object identity.
 * The availability options used to be rebuilt inside FilterModal on every
 * render, so the object handed back was never the object held in state and
 * re-picking the selected option silently re-selected it instead of clearing
 * it. A module-level constant is the same object for the life of the page.
 *
 * The label is a translation KEY rather than translated text, so the identity
 * does not depend on the locale and the panel and the applied-filter tags
 * cannot word the same option differently.
 */
export interface AvailabilityOption {
  readonly value: boolean;
  readonly key: string;
}

export const AVAILABILITY_OPTIONS: readonly AvailabilityOption[] = [
  { value: true, key: "inStock" },
  { value: false, key: "outOfStock" },
];

/** The reducer's "nothing selected" sentinel. */
export const NO_FILTER = "All";
