import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingBag, Trash2, Plus, Minus, ArrowRight } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { Link, useNavigate } from 'react-router-dom';

export function CartDrawer() {
  const { isCartOpen, setIsCartOpen, items, removeItem, updateQuantity, subtotal } = useCart();
  const navigate = useNavigate();

  const handleCheckout = () => {
    setIsCartOpen(false);
    navigate('/checkout');
  };

  return (
    <AnimatePresence>
      {isCartOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsCartOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[100]"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-surface shadow-2xl z-[101] flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b border-outline-variant/20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShoppingBag className="w-5 h-5" />
                <h2 className="font-headline italic text-2xl">Sua Sacola</h2>
                <span className="text-xs font-light text-on-surface-variant bg-surface-container px-2 py-1 rounded-full">
                  {items.length} itens
                </span>
              </div>
              <button 
                onClick={() => setIsCartOpen(false)}
                className="p-2 hover:bg-surface-container rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Items List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-16 h-16 bg-surface-container rounded-full flex items-center justify-center">
                    <ShoppingBag className="w-8 h-8 text-on-surface-variant opacity-20" />
                  </div>
                  <div>
                    <h3 className="font-medium text-lg">Sua sacola está vazia</h3>
                    <p className="text-sm text-on-surface-variant font-light">
                      Explore nossa coleção e encontre o look perfeito.
                    </p>
                  </div>
                  <button 
                    onClick={() => setIsCartOpen(false)}
                    className="text-sm font-medium underline underline-offset-4 hover:text-primary transition-colors"
                  >
                    Continuar Comprando
                  </button>
                </div>
              ) : (
                items.map((item) => (
                  <div key={item.id} className="flex gap-4 group">
                    <div className="w-24 aspect-[9/16] bg-surface-container-low overflow-hidden">
                      <Link 
                        to={item.handle ? `/produto/${item.handle}` : '#'} 
                        onClick={() => setIsCartOpen(false)}
                      >
                        <img 
                          src={item.image} 
                          alt={item.name} 
                          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                        />
                      </Link>
                    </div>
                    <div className="flex-1 flex flex-col justify-between py-1">
                      <div>
                        <div className="flex justify-between items-start">
                          <div>
                          <Link 
                            to={item.handle ? `/produto/${item.handle}` : '#'} 
                            onClick={() => setIsCartOpen(false)}
                            className="hover:text-primary transition-colors block"
                          >
                            <span className="text-[10px] uppercase tracking-widest text-on-surface-variant font-medium">
                              {item.brand}
                            </span>
                            <h4 className="font-headline italic text-lg leading-tight">{item.name}</h4>
                          </Link>
                          </div>
                          <button 
                            onClick={() => removeItem(item.id)}
                            className="text-on-surface-variant hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-xs text-on-surface-variant font-light mt-1">
                          Tamanho: {item.size} • {item.period}
                        </p>
                        {item.dates && (
                          <p className="text-[10px] text-primary font-medium mt-1 leading-tight">
                            {item.dates}
                          </p>
                        )}
                      </div>

                      <div className="flex justify-between items-end mt-4">
                        <span className="text-xs text-on-surface-variant font-medium">
                          Qtd: {item.quantity}
                        </span>
                        <span className="font-medium text-sm">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price * item.quantity)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="p-6 bg-surface-container-lowest border-t border-outline-variant/20 space-y-4">
                <div className="flex justify-between items-end">
                  <span className="text-sm text-on-surface-variant font-light lowercase">subtotal</span>
                  <span className="font-headline italic text-2xl">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(subtotal)}
                  </span>
                </div>
                <p className="text-[10px] text-on-surface-variant font-light text-center">
                  Taxas e frete calculados no checkout.
                </p>
                <button 
                  onClick={handleCheckout}
                  className="w-full bg-on-surface text-surface py-4 text-xs font-bold uppercase tracking-[0.2em] hover:bg-on-surface-variant transition-all flex items-center justify-center gap-2 group"
                >
                  Finalizar Aluguel
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
