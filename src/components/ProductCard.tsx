import React from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { useWishlist } from '../context/WishlistContext';
import { useSiteSettings } from '../context/SettingsContext';
import { motion } from 'motion/react';

interface Product {
  id: string | number;
  name: string;
  brand: string;
  price: number | string;
  image_url: string;
  category?: string;
  handle: string;
}

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { settings } = useSiteSettings();

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="group"
    >
      <Link to={`/produto/${product.handle}`} className="block group">
        <div className="relative aspect-[9/16] overflow-hidden bg-surface-container-low mb-4">
          <img 
            src={product.image_url} 
            alt={product.name} 
            className="w-full h-full object-contain transition-transform duration-700 group-hover:scale-105"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-500"></div>
          
          <button 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation(); // Better to stop propagation
              toggleWishlist({
                id: product.id as number,
                name: product.name,
                brand: product.brand,
                price: product.price.toString(),
                image: product.image_url
              });
            }}
            className={`absolute top-4 right-4 p-2 bg-white/80 backdrop-blur-sm rounded-full transition-all duration-300 z-10 ${
              isInWishlist(product.id as number) ? 'text-red-500 opacity-100' : 'opacity-0 group-hover:opacity-100 hover:text-red-500'
            }`}
          >
            <Heart className={`w-4 h-4 ${isInWishlist(product.id as number) ? 'fill-current' : ''}`} />
          </button>
        </div>

        <div className="space-y-1 px-1">
          <span className="font-label uppercase tracking-widest text-[9px] text-on-surface-variant block">
            {product.brand}
          </span>
          <h3 className="font-headline italic text-sm md:text-base leading-tight group-hover:underline decoration-1 underline-offset-4">
            {product.name}
          </h3>
          <p className="text-xs md:text-sm font-light text-on-surface-variant">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(product.price))} / {settings.rental_min_days} dias
          </p>
        </div>
      </Link>
    </motion.div>
  );
}
