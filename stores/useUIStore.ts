import { create } from 'zustand'

export const useUIStore = create<any>((set: any) => ({
  mobileMenuOpen: false,
  cartDrawerOpen: false,
  searchOpen: false,
  quickViewId: null as string | null,
  authModalOpen: false,
  authModalMode: 'signIn',
  toggleMobileMenu: () => set((s: any) => ({ mobileMenuOpen: !s.mobileMenuOpen })),
  setCartDrawer: (open: boolean) => set({ cartDrawerOpen: open }),
  setSearch: (open: boolean) => set({ searchOpen: open }),
  setQuickView: (id: string | null) => set({ quickViewId: id }),
  openAuth: (mode: string) => set({ authModalOpen: true, authModalMode: mode || 'signIn' }),
  closeAuth: () => set({ authModalOpen: false }),
}))
