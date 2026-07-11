import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronDown, Heart, Loader2, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { useWishlist } from '../context/WishlistContext';
import { useSiteSettings } from '../context/SettingsContext';
import { supabase } from '../lib/supabase';
import { EVENT_GROUPS, OCCASION_METAFIELD_KEY } from './EventCategory';

const SORT_OPTIONS = [
  { value: 'created_at:desc', label: 'Mais Recentes' },
  { value: 'price:asc',       label: 'Menor Preço' },
  { value: 'price:desc',      label: 'Maior Preço' },
  { value: 'name:asc',        label: 'A–Z' },
];

const ITEMS_PER_PAGE = 16;

export function EventListing() {
  const { eventSlug } = useParams<{ eventSlug: string }>();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { settings } = useSiteSettings();

  const eventInfo = EVENT_GROUPS.find((e) => e.slug === eventSlug);

  const [products, setProducts]             = useState<any[]>([]);
  const [loading, setLoading]               = useState(true);
  const [totalItems, setTotalItems]         = useState(0);
  const [currentPage, setCurrentPage]       = useState(1);
  const [sort, setSort]                     = useState('created_at:desc');
  const [sortOpen, setSortOpen]             = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categories, setCategories]         = useState<string[]>([]);

  const filteredEvents = EVENT_GROUPS.filter(ev => 
    !(settings?.menu_hidden_items || []).includes(ev.label)
  );

  // Reset on slug/sort change
  useEffect(() => {
    setCurrentPage(1);
    setSelectedCategory('');
  }, [eventSlug, sort]);

  // Fetch distinct categories for this event
  useEffect(() => {
    if (!eventInfo) return;
    supabase
      .from('products')
      .select('category')
      .ilike(`metafields->>${OCCASION_METAFIELD_KEY}`, `%${eventInfo.keyword}%`)
      .eq('status', 'active')
      .then(({ data }) => {
        if (data) {
          const unique = [...new Set(data.map((d) => d.category).filter(Boolean))].sort();
          setCategories(unique);
        }
      });
  }, [eventSlug]);

  // Fetch products
  useEffect(() => {
    if (!eventInfo) return;

    async function fetchProducts() {
      setLoading(true);
      const [col, dir] = sort.split(':');

      // Use PostgreSQL ILIKE on the harmonized metafield key
      let query = supabase
        .from('products')
        .select('*', { count: 'exact' })
        .ilike(`metafields->>${OCCASION_METAFIELD_KEY}`, `%${eventInfo!.keyword}%`)
        .eq('status', 'active')
        .order(col, { ascending: dir === 'asc' });

      if (selectedCategory) {
        query = query.eq('category', selectedCategory);
      }

      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      query = query.range(from, from + ITEMS_PER_PAGE - 1);

      const { data, count, error } = await query;
      if (!error && data) {
        setProducts(data);
        if (count !== null) setTotalItems(count);
      }
      setLoading(false);
    }

    fetchProducts();
  }, [eventSlug, sort, selectedCategory, currentPage]);

  if (!eventInfo) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white gap-4">
        <p className="font-headline italic text-4xl text-black/30">Evento não encontrado</p>
        <Link to="/evento" className="text-xs uppercase tracking-widest underline">
          Ver todos os eventos
        </Link>
      </div>
    );
  }

  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const sortLabel  = SORT_OPTIONS.find((o) => o.value === sort)?.label ?? 'Ordenar';

  return (
    <div className="bg-white min-h-screen pb-24">
      {/* Hero strip */}
      <div className="relative bg-black text-white overflow-hidden" style={{ minHeight: '40vh' }}>
        {/* Background image */}
        <img
          src={eventInfo.image}
          alt={eventInfo.label}
          className="absolute inset-0 w-full h-full object-cover opacity-30"
        />
        <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 py-16 flex flex-col justify-between h-full gap-8">
          <Link
            to="/evento"
            className="flex items-center gap-2 text-[9px] uppercase tracking-[0.4em] text-white/40 hover:text-white/80 transition-colors self-start"
          >
            <ArrowLeft className="w-3 h-3" />
            Aluguel por Evento
          </Link>

          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <p className="font-label text-[9px] uppercase tracking-[0.4em] text-white/40 mb-2">
                Ocasião Ideal
              </p>
              <div className="flex items-center gap-5">
                <span className="text-5xl">{eventInfo.emoji}</span>
                <h1 className="font-headline italic text-6xl md:text-8xl leading-none">
                  {eventInfo.label}
                </h1>
              </div>
              <p className="font-light text-white/60 text-sm max-w-md mt-4 leading-relaxed">
                {eventInfo.description}
              </p>
            </div>

            {/* Event switcher */}
            <div className="flex gap-2 flex-wrap">
              {filteredEvents.map((ev) => (
                <Link
                  key={ev.slug}
                  to={`/evento/${ev.slug}`}
                  className={`px-4 py-2 text-[9px] uppercase tracking-[0.25em] transition-all duration-300 ${
                    eventSlug === ev.slug
                      ? 'bg-white text-black'
                      : 'border border-white/20 text-white/40 hover:border-white hover:text-white'
                  }`}
                >
                  {ev.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="border-b border-gray-200 sticky top-0 bg-white z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            {/* Category pills */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[9px] uppercase tracking-widest text-black font-medium mr-1">Categoria:</span>
              <button
                onClick={() => setSelectedCategory('')}
                className={`px-3 py-1 text-[9px] uppercase tracking-wider transition-all duration-200 ${
                  selectedCategory === ''
                    ? 'bg-black text-white'
                    : 'border border-gray-300 text-gray-500 hover:border-black hover:text-black'
                }`}
              >
                Todas
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 text-[9px] uppercase tracking-wider transition-all duration-200 ${
                    selectedCategory === cat
                      ? 'bg-black text-white'
                      : 'border border-gray-300 text-gray-500 hover:border-black hover:text-black'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Sort + count */}
            <div className="flex items-center gap-4 shrink-0">
              <span className="text-[9px] text-gray-400">{totalItems} produtos</span>
              <div className="relative">
                <button
                  onClick={() => setSortOpen((o) => !o)}
                  className="flex items-center gap-1.5 text-[9px] uppercase tracking-widest hover:text-black transition-colors text-gray-500"
                >
                  {sortLabel}{' '}
                  <ChevronDown className={`w-3 h-3 transition-transform ${sortOpen ? 'rotate-180' : ''}`} />
                </button>
                {sortOpen && (
                  <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 shadow-lg z-30 min-w-[160px]">
                    {SORT_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => { setSort(opt.value); setSortOpen(false); }}
                        className={`block w-full text-left px-4 py-2.5 text-[9px] uppercase tracking-widest hover:bg-gray-50 transition-colors ${
                          sort === opt.value ? 'text-black font-medium' : 'text-gray-500'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Product grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
        {loading ? (
          <div className="flex justify-center items-center py-32 text-gray-400">
            <Loader2 className="w-7 h-7 animate-spin" />
            <span className="ml-3 text-sm font-light tracking-wide">Buscando do acervo...</span>
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-40 gap-4 text-gray-400">
            <span className="text-5xl">{eventInfo.emoji}</span>
            <p className="font-light text-sm tracking-wide">
              Nenhuma peça encontrada para este evento no momento.
            </p>
            <Link
              to="/evento"
              className="mt-4 text-[9px] uppercase tracking-[0.4em] underline underline-offset-4 text-black"
            >
              Ver outros eventos
            </Link>
          </div>
        ) : (
          <>
            <motion.div
              key={`${eventSlug}-${currentPage}-${sort}-${selectedCategory}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-x-4 lg:gap-x-6 gap-y-12"
            >
              {products.map((product) => {
                const prodItem = { ...product, image: product.image_url };
                // Get the occasion value for this product (harmonized key)
                const occasionRaw: string = product.metafields?.[OCCASION_METAFIELD_KEY] ?? '';
                const occasions = String(occasionRaw).split(';').map((s: string) => s.trim()).filter(Boolean);

                return (
                  <div key={product.id} className="group flex flex-col">
                    <div className="relative aspect-[3/4] bg-gray-50 overflow-hidden mb-4">
                      <Link to={`/produto/${product.handle}`} state={{ product: prodItem }}>
                        <img
                          src={prodItem.image}
                          alt={prodItem.name}
                          className="w-full h-full object-cover transition-opacity duration-300 group-hover:opacity-90"
                          referrerPolicy="no-referrer"
                        />
                      </Link>
                      {/* Occasion badges */}
                      {occasions.length > 0 && (
                        <div className="absolute top-3 left-3 flex flex-col gap-1">
                          <span className="bg-black/80 text-white text-[7px] uppercase tracking-widest px-2 py-0.5 font-medium">
                            {occasions[0]}
                          </span>
                        </div>
                      )}
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          toggleWishlist(prodItem);
                        }}
                        className={`absolute top-3 right-3 p-2 bg-white/60 backdrop-blur-sm rounded-full transition-all duration-300 ${
                          isInWishlist(product.id)
                            ? 'text-black opacity-100'
                            : 'text-gray-500 opacity-0 group-hover:opacity-100 hover:text-black'
                        }`}
                      >
                        <Heart className={`w-4 h-4 ${isInWishlist(product.id) ? 'fill-current' : ''}`} />
                      </button>
                    </div>
                    <Link
                      to={`/produto/${product.handle}`}
                      state={{ product: prodItem }}
                      className="text-left flex flex-col flex-grow group-hover:opacity-70 transition-opacity"
                    >
                      <h3 className="text-[11px] sm:text-xs text-black font-light mb-2 line-clamp-2 leading-relaxed">
                        {product.name} — {product.brand}
                      </h3>
                      <p className="text-[11px] sm:text-xs text-gray-400 mt-auto">
                        De{' '}
                        <span className="font-medium text-black">
                          R$ {Number(product.price).toFixed(0)},00
                        </span>{' '}
                        por {product.period || 3} dias
                      </p>
                    </Link>
                  </div>
                );
              })}
            </motion.div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-16 pt-8 border-t border-gray-200">
                <nav className="flex justify-center items-center gap-4 text-xs text-gray-500">
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setCurrentPage(i + 1);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className={`pb-1 px-1 transition-all ${
                        currentPage === i + 1
                          ? 'text-black border-b border-black font-medium'
                          : 'hover:text-black'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                  {currentPage < totalPages && (
                    <button
                      onClick={() => {
                        setCurrentPage((p) => p + 1);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="ml-2 text-gray-400 hover:text-black transition-colors"
                    >
                      <ChevronDown className="w-3 h-3 -rotate-90" />
                    </button>
                  )}
                </nav>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
