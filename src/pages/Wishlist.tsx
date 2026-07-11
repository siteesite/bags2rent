import { Link } from 'react-router-dom';
import { Heart, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { useWishlist } from '../context/WishlistContext';
import { useSiteSettings } from '../context/SettingsContext';

export function Wishlist() {
  const { wishlist, removeFromWishlist } = useWishlist();
  const { settings } = useSiteSettings();

  return (
    <div className="bg-surface min-h-screen">
      {/* Page Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="font-headline italic text-4xl mb-2">Sua Wishlist</h1>
        <p className="text-sm text-on-surface-variant font-light">
          {wishlist.length} {wishlist.length === 1 ? 'item salvo' : 'itens salvos'}
        </p>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        {wishlist.length === 0 ? (
          <div className="text-center py-24 bg-surface-container-lowest border border-outline-variant/20">
            <Heart className="w-12 h-12 mx-auto text-outline-variant mb-4" />
            <h2 className="font-headline italic text-2xl mb-2">Sua wishlist está vazia</h2>
            <p className="text-on-surface-variant font-light mb-8">
              Salve seus itens favoritos para alugar depois.
            </p>
            <Link to="/categoria" className="inline-flex items-center gap-2 bg-primary text-on-primary px-8 py-4 text-sm font-medium hover:bg-primary-container transition-colors">
              Explorar Coleção <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-12">
            {wishlist.map((product, index) => (
              <motion.div 
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
                className="group"
              >
                <div className="relative aspect-[3/4] bg-surface-container-low overflow-hidden mb-4">
                  <Link to={`/produto/${product.handle || product.id}`}>
                    <img 
                      src={product.image} 
                      alt={product.name} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      referrerPolicy="no-referrer"
                    />
                  </Link>
                  <button 
                    onClick={() => removeFromWishlist(product.id)}
                    className="absolute top-4 right-4 p-2 bg-surface-container-lowest/80 backdrop-blur-sm rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-red-500 hover:bg-surface-container-lowest"
                  >
                    <Heart className="w-4 h-4 fill-current" />
                  </button>
                  {/* Quick Add Overlay */}
                  <div className="absolute bottom-0 left-0 w-full p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                    <button className="w-full bg-surface-container-lowest/90 backdrop-blur-md text-primary py-3 text-xs font-medium uppercase tracking-widest hover:bg-primary hover:text-on-primary transition-colors">
                      Adicionar à Sacola
                    </button>
                  </div>
                </div>
                <div className="text-center">
                  <span className="font-label uppercase tracking-widest text-[10px] text-on-surface-variant mb-1 block">{product.brand}</span>
                  <h3 className="font-headline italic text-lg mb-1">
                    <Link to={`/produto/${product.handle || product.id}`} className="hover:text-on-surface-variant transition-colors">{product.name}</Link>
                  </h3>
                  <p className="text-sm font-light">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(product.price))} / {settings.rental_min_days} dias
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
