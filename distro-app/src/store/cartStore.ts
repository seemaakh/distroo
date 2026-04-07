import { create } from "zustand";

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  unit: string;
  qty: number;
  image?: string;
}

interface CartState {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "qty">) => void;
  removeItem: (productId: string) => void;
  updateQty: (productId: string, qty: number) => void;
  clearCart: () => void;
  totalItems: () => number;
  totalAmount: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],

  addItem: (item) => {
    const existing = get().items.find((i) => i.productId === item.productId);
    if (existing) {
      set({
        items: get().items.map((i) =>
          i.productId === item.productId ? { ...i, qty: i.qty + 1 } : i
        ),
      });
    } else {
      set({ items: [...get().items, { ...item, qty: 1 }] });
    }
  },

  removeItem: (productId) =>
    set({ items: get().items.filter((i) => i.productId !== productId) }),

  updateQty: (productId, qty) => {
    if (qty <= 0) {
      set({ items: get().items.filter((i) => i.productId !== productId) });
    } else {
      set({
        items: get().items.map((i) =>
          i.productId === productId ? { ...i, qty } : i
        ),
      });
    }
  },

  clearCart: () => set({ items: [] }),

  totalItems: () => get().items.reduce((sum, i) => sum + i.qty, 0),

  totalAmount: () =>
    get().items.reduce((sum, i) => sum + i.price * i.qty, 0),
}));
