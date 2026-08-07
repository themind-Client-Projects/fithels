import { create } from "zustand";

export const useCurrencyStore = create((set) => ({
  currency: "USD", // Default currency
  setCurrency: (currency) => set({ currency }),
}));
