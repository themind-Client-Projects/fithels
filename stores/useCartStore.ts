import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface CartItem {
  id: string
  price: number
  quantity: number
  [key: string]: any
}

export const useCartStore = create<any>()(
  persist(
    (set, get) => ({
      items: [] as CartItem[],
      addItem: (item: CartItem, qty = 1) => {
        const existing = get().items.find((i: CartItem) => i.id === item.id)
        if (existing) {
          set({
            items: get().items.map((i: CartItem) =>
              i.id === item.id ? { ...i, quantity: i.quantity + qty } : i
            ),
          })
        } else {
          set({ items: [...get().items, { ...item, quantity: qty }] })
        }
      },
      removeItem: (id: string) =>
        set({ items: get().items.filter((i: CartItem) => i.id !== id) }),
      updateQuantity: (id: string, qty: number) =>
        set({
          items: get().items.map((i: CartItem) =>
            i.id === id ? { ...i, quantity: Math.max(1, qty) } : i
          ),
        }),
      clearCart: () => set({ items: [] }),
    }),
    { name: 'cart-storage' }
  )
)

export const useCartTotal = () =>
  useCartStore((s: any) => s.items.reduce((sum: number, i: CartItem) => sum + i.price * i.quantity, 0))
export const useCartCount = () =>
  useCartStore((s: any) => s.items.reduce((sum: number, i: CartItem) => sum + i.quantity, 0))
