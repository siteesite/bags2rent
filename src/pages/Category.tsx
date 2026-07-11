import { useState, useEffect } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
import { ChevronDown, SlidersHorizontal, Heart, Search, Loader2, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useWishlist } from '../context/WishlistContext';
import { useSiteSettings } from '../context/SettingsContext';
import { supabase } from '../lib/supabase';

const SORT_OPTIONS = [
  { value: 'created_at:desc', label: 'Em destaque' },
  { value: 'price:asc', label: 'Menor Preço' },
  { value: 'price:desc', label: 'Maior Preço' },
  { value: 'name:asc', label: 'A–Z' },
];

const AVAILABILITY_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'in_stock', label: 'Disponível' },
];

const PRICE_OPTIONS = [
  { value: 'all', label: 'Todos os preços' },
  { value: '0-500', label: 'Até R$ 500' },
  { value: '500-1000', label: 'R$ 500 a R$ 1.000' },
  { value: '1000-2000', label: 'R$ 1.000 a R$ 2.000' },
  { value: '2000+', label: 'Acima de R$ 2.000' },
];

export function Category() {
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { settings } = useSiteSettings();
  const { categorySlug } = useParams();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const brand = searchParams.get('brand');
  
  // Map singular/plural slugs to display titles and DB queries
  const slugToCategory: Record<string, { title: string, matches: string[] }> = {
    'vestidos': { title: 'Vestidos', matches: ['Vestidos', 'Vestido'] },
    'calcas': { title: 'Calças', matches: ['Calças', 'Calça'] },
    'bolsas': { title: 'Bolsas', matches: ['Bolsas', 'Bolsa'] },
    'kimonos': { title: 'Kimonos', matches: ['Kimonos', 'Kimono'] },
    'saias': { title: 'Saias', matches: ['Saias', 'Saia'] },
    'parkas': { title: 'Parkas', matches: ['Parkas', 'Parka'] },
    'conjuntos': { title: 'Conjuntos', matches: ['Conjuntos', 'Conjunto'] },
    'blusas-top-croppeds': { title: 'Blusas / Top Croppeds', matches: ['Blusas/ Top Croppeds', 'Blusas', 'Blusa', 'Top Cropped', 'Top Croppeds', 'Top', 'Cropped'] },
    'colar': { title: 'Colares', matches: ['Colar', 'Colares'] },
    'new-in': { title: 'New In', matches: [] }
  };

  const categoryInfo = categorySlug ? slugToCategory[categorySlug] : { title: 'Todos os Produtos', matches: [] };
  const categoryTitle = brand ? `Produtos: ${brand}` : categoryInfo.title;

  const [dbProducts, setDbProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const ITEMS_PER_PAGE = 16;
  
  // Filter & Sort States
  const [sort, setSort] = useState('created_at:desc');
  const [availability, setAvailability] = useState('all');
  const [priceRange, setPriceRange] = useState('all');
  
  const [sortOpen, setSortOpen] = useState(false);
  const [availabilityOpen, setAvailabilityOpen] = useState(false);
  const [priceOpen, setPriceOpen] = useState(false);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.filter-dropdown')) {
        setSortOpen(false);
        setAvailabilityOpen(false);
        setPriceOpen(false);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reseta a pagina se mudar de categoria ou filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [categoryTitle, sort, availability, priceRange]);

  useEffect(() => {
    async function fetchProducts() {
      setLoading(true);
      let query = supabase.from('products').select('*', { count: 'exact' }).eq('status', 'active');
      
      if (categorySlug && categorySlug !== 'new-in') {
        const possibleMatches = categoryInfo.matches;
        if (possibleMatches.length > 0) {
          query = query.in('category', possibleMatches);
        }
      }
      
      if (brand) {
        query = query.eq('brand', brand);
      }
      
      // Apply Availability Filter
      if (availability === 'in_stock') {
        query = query.gt('stock_qty', 0);
      }

      // Apply Price Filter
      if (priceRange !== 'all') {
        if (priceRange === '0-500') query = query.lte('price', 500);
        else if (priceRange === '500-1000') query = query.gte('price', 500).lte('price', 1000);
        else if (priceRange === '1000-2000') query = query.gte('price', 1000).lte('price', 2000);
        else if (priceRange === '2000+') query = query.gte('price', 2000);
      }

      // Apply Sorting
      const [col, dir] = sort.split(':');
      query = query.order(col, { ascending: dir === 'asc' });

      // Pagination
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      query = query.range(from, to);

      const { data, count, error } = await query;
      
      if (!error && data) {
        setDbProducts(data);
        if (count !== null) setTotalItems(count);
      } else {
        console.error('Erro ao buscar produtos:', error);
      }
      setLoading(false);
    }
    
    fetchProducts();
  }, [categoryTitle, currentPage, brand, sort, availability, priceRange]);

  const sortLabel = SORT_OPTIONS.find(o => o.value === sort)?.label || 'Mais Recentes';
  const availabilityLabel = AVAILABILITY_OPTIONS.find(o => o.value === availability)?.label || 'Todos';
  const priceLabel = PRICE_OPTIONS.find(o => o.value === priceRange)?.label || 'Todos';

  return (
    <div className="bg-white min-h-screen pt-8 pb-24 font-sans">
      
      {/* Page Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-10">
        <h1 className="text-3xl lg:text-[2.5rem] font-light text-black tracking-wide">{categoryTitle}</h1>
      </div>

      {/* Filter Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-10 border-b border-gray-200 pb-4">
        <div className="flex flex-col md:flex-row justify-between items-center text-xs text-gray-500 gap-4">
          <div className="flex items-center gap-4 w-full md:w-auto flex-wrap">
            <span className="font-medium text-black text-[9px] uppercase tracking-widest">Filtros:</span>
            
            {/* Availability Dropdown */}
            <div className="relative filter-dropdown">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setAvailabilityOpen(!availabilityOpen);
                  setPriceOpen(false);
                  setSortOpen(false);
                }}
                className="flex items-center gap-1 hover:text-black transition-colors"
              >
                Availability <ChevronDown className={`w-3 h-3 transition-transform ${availabilityOpen ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {availabilityOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute left-0 mt-2 w-48 bg-white border border-gray-100 shadow-xl z-50 py-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {AVAILABILITY_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => {
                          setAvailability(opt.value);
                          setAvailabilityOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center justify-between text-[11px] uppercase tracking-wider"
                      >
                        <span className={availability === opt.value ? 'text-black font-medium' : 'text-gray-500'}>
                          {opt.label}
                        </span>
                        {availability === opt.value && <Check className="w-3 h-3 text-black" />}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Price Dropdown */}
            <div className="relative filter-dropdown">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setPriceOpen(!priceOpen);
                  setAvailabilityOpen(false);
                  setSortOpen(false);
                }}
                className="flex items-center gap-1 hover:text-black transition-colors"
              >
                Price <ChevronDown className={`w-3 h-3 transition-transform ${priceOpen ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {priceOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute left-0 mt-2 w-48 bg-white border border-gray-100 shadow-xl z-50 py-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {PRICE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => {
                          setPriceRange(opt.value);
                          setPriceOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center justify-between text-[11px] uppercase tracking-wider"
                      >
                        <span className={priceRange === opt.value ? 'text-black font-medium' : 'text-gray-500'}>
                          {opt.label}
                        </span>
                        {priceRange === opt.value && <Check className="w-3 h-3 text-black" />}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Size quick-links */}
            <div className="flex items-center gap-2 border-l border-gray-200 pl-4 ml-2">
              <span className="text-[9px] uppercase tracking-widest text-gray-400 mr-1">Tamanho:</span>
              {(['p', 'm', 'g'] as const).map((s) => (
                <Link
                  key={s}
                  to={`/tamanho/${s}`}
                  className="px-2.5 py-1 border border-gray-300 text-[9px] uppercase tracking-widest text-gray-500 hover:border-black hover:text-black hover:bg-black hover:text-white transition-all duration-200"
                >
                  {s.toUpperCase()}
                </Link>
              ))}
            </div>
          </div>
          
          <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
            <div className="flex items-center gap-2">
              <span>Ordenar por:</span>
              <div className="relative filter-dropdown">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setSortOpen(!sortOpen);
                    setAvailabilityOpen(false);
                    setPriceOpen(false);
                  }}
                  className="flex items-center gap-1 text-black font-medium hover:text-gray-700 transition-colors"
                >
                  {sortLabel} <ChevronDown className={`w-3 h-3 transition-transform ${sortOpen ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {sortOpen && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 mt-2 w-48 bg-white border border-gray-100 shadow-xl z-50 py-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {SORT_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => {
                            setSort(opt.value);
                            setSortOpen(false);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center justify-between text-[11px] uppercase tracking-wider"
                        >
                          <span className={sort === opt.value ? 'text-black font-medium' : 'text-gray-500'}>
                            {opt.label}
                          </span>
                          {sort === opt.value && <Check className="w-3 h-3 text-black" />}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
            <span>{totalItems} produtos</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Product Grid */}
        {loading ? (
          <div className="flex justify-center items-center py-32 text-gray-500">
            <Loader2 className="w-8 h-8 animate-spin" />
            <span className="ml-3 font-light text-lg tracking-wide">Buscando do acervo...</span>
          </div>
        ) : dbProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-gray-500">
            <p className="font-light text-lg tracking-wide mb-2">Nenhum produto encontrado nesta categoria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 lg:gap-x-6 gap-y-12">
            {dbProducts.map((product) => {
              const prodItem = { ...product, image: product.image_url };
              return (
                <div key={product.id} className="group flex flex-col">
                  <div className="relative aspect-[9/16] bg-gray-50 overflow-hidden mb-4">
                    <Link to={`/produto/${product.handle}`} state={{ product: prodItem }}>
                      <img 
                        src={prodItem.image} 
                        alt={prodItem.name} 
                        className="w-full h-full object-contain transition-opacity duration-300 group-hover:opacity-90"
                        referrerPolicy="no-referrer"
                      />
                    </Link>
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        toggleWishlist(prodItem);
                      }}
                      className={`absolute top-3 right-3 p-2 bg-white/50 backdrop-blur-sm rounded-full transition-all duration-300 ${isInWishlist(product.id) ? 'text-black opacity-100' : 'text-gray-500 opacity-0 group-hover:opacity-100 hover:text-black hover:bg-white/80'}`}
                    >
                      <Heart className={`w-4 h-4 ${isInWishlist(product.id) ? 'fill-current' : ''}`} />
                    </button>
                  </div>
                  <Link to={`/produto/${product.handle}`} state={{ product: prodItem }} className="text-left flex flex-col flex-grow group-hover:opacity-70 transition-opacity">
                    <h3 className="text-[11px] sm:text-xs text-black font-light mb-2 line-clamp-2 leading-relaxed">
                      {product.name} - {product.brand}
                    </h3>
                    <p className="text-[11px] sm:text-xs text-gray-500 mt-auto">
                      De <span className="font-medium text-black">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(product.price))}</span> por {product.period || settings.rental_min_days} dias
                    </p>
                  </Link>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalItems > ITEMS_PER_PAGE && (
          <div className="mt-16 pt-8 border-t border-gray-200">
            <nav className="flex justify-center items-center gap-4 text-xs text-gray-500">
              {Array.from({ length: Math.ceil(totalItems / ITEMS_PER_PAGE) }).map((_, i) => (
                <button 
                  key={i} 
                  onClick={() => {
                    setCurrentPage(i + 1);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className={`pb-1 px-1 transition-all ${currentPage === i + 1 ? 'text-black border-b border-black font-medium' : 'hover:text-black hover:border-b hover:border-gray-300'}`}
                >
                  {i + 1}
                </button>
              ))}
              {currentPage < Math.ceil(totalItems / ITEMS_PER_PAGE) && (
                <button 
                  onClick={() => {
                    setCurrentPage(prev => prev + 1);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  aria-label="Next page" 
                  className="ml-2 text-gray-400 hover:text-black transition-colors"
                >
                  <ChevronDown className="w-3 h-3 -rotate-90" />
                </button>
              )}
            </nav>
          </div>
        )}
      </div>
    </div>
  );
}
