import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type CartItem = {
  id: string; // Unique ID for this item entry in cart
  product_id: string;
  name: string;
  price: number;
  image: string;
  brand?: string;
  size?: string;
  quantity: number;
  period: string;
  dates?: string;
  startDate?: string;
  endDate?: string;
  handle?: string;
};

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'id'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  subtotal: number;
  totalItems: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Load from localStorage
  useEffect(() => {
    const savedCart = localStorage.getItem('bags2rent_cart');
    if (savedCart) {
      try {
        setItems(JSON.parse(savedCart) || []);
      } catch (e) {
        console.error('Failed to parse cart', e);
      }
    }
  }, []);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('bags2rent_cart', JSON.stringify(items));
  }, [items]);

  const addItem = (newItem: Omit<CartItem, 'id'>) => {
    // For rent, we might want to check if the same metadata (date/size) exists
    // But for now, we'll just add it as a new entry with a unique ID
    const itemWithId = {
      ...newItem,
      id: `${newItem.product_id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
    setItems((prev) => [...prev, itemWithId]);
    setIsCartOpen(true); // Auto open when adding
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(id);
      return;
    }
    setItems((prev) => 
      prev.map((item) => item.id === id ? { ...item, quantity } : item)
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider value={{ 
      items, 
      addItem, 
      removeItem, 
      updateQuantity, 
      clearCart, 
      subtotal, 
      totalItems,
      isCartOpen,
      setIsCartOpen
    }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
