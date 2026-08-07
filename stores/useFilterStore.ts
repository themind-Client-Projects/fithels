import { create } from 'zustand'

const defaults = {
  category: null,
  priceRange: [0, 500],
  sizes: [],
  colors: [],
  sortBy: 'newest',
  search: '',
  page: 1,
}

export const useFilterStore = create<any>((set: any) => ({
  ...defaults,
  setFilter: (updates: Record<string, any>) =>
    set((s: any) => ({ ...s, ...updates, page: updates.page ?? 1 })),
  resetFilters: () => set(defaults),
}))
