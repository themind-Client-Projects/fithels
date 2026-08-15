import { create } from "zustand";

/**
 * The currency the storefront displays in.
 *
 * Defaults to IQD because this is an Iraqi shop whose catalogue is priced in
 * dinars — the USD figures are only the storage representation. Defaulting to
 * USD meant a 3,750 IQD shoe greeted every first-time visitor as "$2.50", which
 * reads as a mistake rather than a price. The switcher still offers USD.
 *
 * Deliberately NOT persisted to localStorage: this value is read during the
 * first client render of components that were server-rendered, so restoring a
 * different currency after mount would produce a hydration mismatch. Persisting
 * it needs a mounted-guard in CurrencyFormatter, which is a separate change.
 */
export const useCurrencyStore = create((set) => ({
  currency: "IQD",
  setCurrency: (currency) => set({ currency }),
}));
