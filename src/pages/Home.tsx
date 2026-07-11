import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { ProductCard } from '../components/ProductCard';
import { useSiteSettings } from '../context/SettingsContext';

interface Product {
  id: string;
  name: string;
  brand: string;
  price: number;
  image_url: string;
  category: string;
  handle: string;
}

interface HeroItem {
  type: 'product' | 'image';
  id?: string;
  name?: string;
  brand?: string;
  price?: number;
  image_url: string;
  image_url_tablet?: string;
  image_url_mobile?: string;
  handle?: string;
}

const brands = [
  { name: 'Saint Laurent', logo: '/brands/saint_laurent.png' },
  { name: 'Gucci', logo: '/brands/gucci.png' },
  { name: 'Prada', logo: '/brands/prada.png' },
  { name: 'Chanel', logo: '/brands/chanel.png' },
  { name: 'Dior', logo: '/brands/dior.png' },
  { name: 'Valentino', logo: '/brands/valentino.png' },
  { name: 'Zimmermann', logo: '/brands/zimmermann.png' },
  { name: 'PatBo', logo: '/brands/patbo.png' },
  { name: 'Animale', logo: '/brands/animale.png' },
  { name: 'Ralph Lauren', logo: '/brands/ralph_lauren.png' },
  { name: 'Cult Gaia', logo: '/brands/cult_gaia.png' },
  { name: 'Agilitá', logo: '/brands/agilita.png' },
  { name: 'Cris Barros', logo: '/brands/cris_barros.png' },
  { name: 'Fabiana Milazzo', logo: '/brands/fabiana_milazzo.png' },
  { name: 'Le Lis Blanc', logo: '/brands/le_lis_blanc.png' },
  { name: 'Ganni', logo: '/brands/ganni.png' },
];

export function Home() {
  const { settings, loading: settingsLoading } = useSiteSettings();
  const [loading, setLoading] = useState(true);
  const [heroProducts, setHeroProducts] = useState<(HeroItem | null)[]>([null, null, null]);
  const [activeSlide, setActiveSlide] = useState(0);
  const [dynamicProducts, setDynamicProducts] = useState<Record<string, any[]>>({});
  const sliderTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    async function fetchAllData() {
      try {
        setLoading(true);

        // 1. Set hero products from settings
        if (settings.hero_products && Array.isArray(settings.hero_products)) {
          const hp = settings.hero_products.map((item: any) => {
            if (!item) return null;
            return {
              ...item,
              type: item.type || 'product'
            };
          });
          while (hp.length < 3) hp.push(null);
          setHeroProducts(hp);
        }

        // 2. Fetch/Fallback products for showcases
        const showcaseData: Record<string, any[]> = {};
        for (let i = 1; i <= 5; i++) {
          const productsKey = `showcase_${i}_products` as keyof typeof settings;
          const titleKey = `showcase_${i}_title` as keyof typeof settings;
          const savedProducts = settings[productsKey] as any[];
          
          if (savedProducts && savedProducts.length > 0) {
            showcaseData[i] = savedProducts.slice(0, 4);
          } else {
            // Fallback strategy: fetch by title keywords
            const title = (settings[titleKey] as string || '').toLowerCase();
            let query = supabase.from('products').select('*').limit(4);
            
            if (title.includes('party') || title.includes('festa')) {
              query = query.ilike('category', '%festa%');
            } else if (title.includes('noiva')) {
              query = query.ilike('category', '%noiva%');
            } else if (title.includes('crop') || title.includes('top')) {
              query = query.ilike('category', '%crop%');
            } else if (title.includes('casual')) {
              query = query.ilike('category', '%casual%');
            } else {
              // Default to dresses or latest
              query = query.ilike('category', '%vestido%');
            }

            const { data: fallbackData } = await query;
            if (fallbackData && fallbackData.length > 0) {
              showcaseData[i] = fallbackData.slice(0, 4);
            } else {
              const { data: latestData } = await supabase.from('products').select('*').limit(4);
              showcaseData[i] = (latestData || []).slice(0, 4);
            }
          }
        }
        setDynamicProducts(showcaseData);

      } catch (error) {
        console.error('Error fetching Home data:', error);
      } finally {
        setLoading(false);
      }
    }

    if (!settingsLoading) {
      fetchAllData();
    }
  }, [settings, settingsLoading]);

  // Auto-advance slider on mobile
  useEffect(() => {
    sliderTimerRef.current = setInterval(() => {
      setActiveSlide(prev => (prev + 1) % 3);
    }, 4000);
    return () => {
      if (sliderTimerRef.current) clearInterval(sliderTimerRef.current);
    };
  }, []);

  const goToSlide = (index: number) => {
    setActiveSlide(index);
    if (sliderTimerRef.current) clearInterval(sliderTimerRef.current);
    sliderTimerRef.current = setInterval(() => {
      setActiveSlide(prev => (prev + 1) % 3);
    }, 4000);
  };

  const heroSlides = [heroProducts[0], heroProducts[1], heroProducts[2]] as (HeroItem | null)[];
  const slideVariants = {
    enter: { opacity: 0, x: 60 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -60 },
  };

  const renderHtml = (html: string) => {
    if (!html) return { __html: '' };
    // Replace className= with class= to make it work with dangerouslySetInnerHTML out of the box
    return { __html: html.replace(/className=/g, 'class=') };
  };

  return (
    <div className="flex flex-col bg-white">

      {/* ===== MOBILE: Slider automático ===== */}
      <section className="relative h-screen overflow-hidden md:hidden">
        <AnimatePresence mode="wait">
          {heroSlides.map((slide, index) =>
            index === activeSlide ? (
              <motion.div
                key={index}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.5, ease: 'easeInOut' }}
                className="absolute inset-0"
              >
                {slide ? (
                    <Link
                      to={slide.type === 'image' ? '/categoria/new-in' : `/produto/${slide.handle}`}
                      className="relative w-full h-full block group"
                    >
                      <picture className="absolute inset-0 w-full h-full">
                        {slide.image_url_tablet && <source media="(min-width: 768px)" srcSet={slide.image_url_tablet} />}
                        {slide.image_url_mobile && <source media="(max-width: 767px)" srcSet={slide.image_url_mobile} />}
                        <img
                          src={slide.image_url}
                          alt={slide.name || 'Banner'}
                          className="w-full h-full object-cover"
                          style={(index !== 1 && slide.type !== 'image') ? { filter: 'grayscale(100%)' } : undefined}
                        />
                      </picture>
                    <div className={`absolute inset-0 ${index === 1 ? 'bg-black/30' : 'bg-black/10'}`} />
                    
                    {/* Texto sobreposto customizável para Mobile */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      {index === 0 && settings.banner_news_html && (
                        <div dangerouslySetInnerHTML={renderHtml(settings.banner_news_html)} className="w-full relative z-10 text-center px-4" />
                      )}
                      
                      {index === 1 && (
                        settings.banner_noivas_html ? (
                          <div dangerouslySetInnerHTML={renderHtml(settings.banner_noivas_html)} className="w-full relative z-10 text-center px-4" />
                        ) : (slide.type === 'product' && settings.banner_noivas_title) ? (
                          <div className="text-center px-4 relative z-10">
                            <h1 className="font-headline italic text-6xl leading-none tracking-tight mb-4 text-white">
                              {settings.banner_noivas_title}
                            </h1>
                            <p className="font-label uppercase tracking-[0.4em] text-[10px] opacity-80 text-white">
                              A Revolução do Aluguel de Luxo
                            </p>
                          </div>
                        ) : null
                      )}

                      {index === 2 && settings.banner_alugue_html && (
                        <div dangerouslySetInnerHTML={renderHtml(settings.banner_alugue_html)} className="w-full relative z-10 text-center px-4" />
                      )}
                    </div>

                    {/* Info do produto na base */}
                    {slide.type === 'product' && (
                      <div className="absolute bottom-16 left-0 right-0 p-6 bg-gradient-to-t from-black/70 to-transparent">
                        <p className="text-[10px] uppercase tracking-widest text-white/70 font-bold">{slide.brand}</p>
                        <p className="text-sm text-white font-medium leading-tight mt-1 line-clamp-2">{slide.name}</p>
                        <p className="text-xs text-white/80 mt-1">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(slide.price))} / {settings.rental_min_days} dias</p>
                      </div>
                    )}
                  </Link>
                ) : (
                  <div className="absolute inset-0 bg-surface-container" />
                )}
              </motion.div>
            ) : null
          )}
        </AnimatePresence>

        {/* Dot indicators */}
        <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2 z-20">
          {[0, 1, 2].map(i => (
            <button
              key={i}
              onClick={() => goToSlide(i)}
              className={`transition-all duration-300 rounded-full ${
                i === activeSlide
                  ? 'w-6 h-2 bg-white'
                  : 'w-2 h-2 bg-white/40'
              }`}
            />
          ))}
        </div>
      </section>

      {/* ===== DESKTOP: 3 Painéis lado a lado ===== */}
      <section className="relative h-screen hidden md:grid grid-cols-3 gap-0 overflow-hidden">

        {heroProducts[0] ? (
          <Link
            to={heroProducts[0].type === 'image' ? '/categoria/new-in' : `/produto/${heroProducts[0].handle}`}
            className="relative h-full overflow-hidden group block"
          >
            <picture className="absolute inset-0 w-full h-full">
              {heroProducts[0].image_url_tablet && <source media="(max-width: 1024px)" srcSet={heroProducts[0].image_url_tablet} />}
              <img
                src={heroProducts[0].image_url}
                alt={heroProducts[0].name || 'Banner'}
                className={`w-full h-full object-cover transition-all duration-700 group-hover:scale-105 ${heroProducts[0].type !== 'image' ? 'grayscale group-hover:grayscale-0' : ''}`}
              />
            </picture>
            <div className="absolute inset-0 bg-black/10 transition-colors duration-500 group-hover:bg-black/40" />
            
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center opacity-0 group-hover:opacity-100 transition-all duration-500 z-10 px-4 pointer-events-none drop-shadow-2xl translate-y-4 group-hover:translate-y-0">
              {settings.banner_news_html && (
                <div dangerouslySetInnerHTML={renderHtml(settings.banner_news_html)} className="w-full relative text-center mix-blend-normal" />
              )}
            </div>

            {heroProducts[0].type === 'product' && (
              <div className="absolute bottom-0 left-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-t from-black/70 to-transparent z-20">
                <p className="text-[10px] uppercase tracking-widest text-white/70 font-bold">{heroProducts[0].brand}</p>
                <p className="text-sm text-white font-medium leading-tight mt-1 line-clamp-2">{heroProducts[0].name}</p>
                <p className="text-xs text-white/80 mt-1">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(heroProducts[0].price))} / {settings.rental_min_days} dias</p>
              </div>
            )}
          </Link>
        ) : (
          <div className="relative h-full overflow-hidden bg-surface-container" />
        )}

        {/* Panel Centro (Destaque) */}
        {heroProducts[1] ? (
          <Link
            to={heroProducts[1].type === 'image' ? '/categoria/new-in' : `/produto/${heroProducts[1].handle}`}
            className="relative h-full overflow-hidden group flex items-center justify-center block"
          >
            <picture className="absolute inset-0 w-full h-full">
              {heroProducts[1].image_url_tablet && <source media="(max-width: 1024px)" srcSet={heroProducts[1].image_url_tablet} />}
              <img
                src={heroProducts[1].image_url}
                alt={heroProducts[1].name || 'Banner'}
                className="w-full h-full object-cover"
              />
            </picture>
            {/* Gradiente radial ao invés de caixa escura pesada no centro para manter visibilidade do produto */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-black/40 via-black/10 to-transparent transition-opacity duration-500 group-hover:opacity-80" />
            
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-500" />
            
            <div className="relative h-full flex flex-col items-center justify-center text-center z-10 px-4 pointer-events-none drop-shadow-2xl">
              {settings.banner_noivas_html ? (
                <div dangerouslySetInnerHTML={renderHtml(settings.banner_noivas_html)} className="w-full relative" />
              ) : heroProducts[1].type === 'product' && settings.banner_noivas_title ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                >
                  <h1 className="font-headline italic text-7xl xl:text-8xl leading-none tracking-tight mb-4 text-white drop-shadow-lg">
                    {settings.banner_noivas_title}
                  </h1>
                  <p className="font-label uppercase tracking-[0.4em] text-xs xl:text-sm text-white opacity-90 drop-shadow-md">
                    A Revolução do Aluguel de Luxo
                  </p>
                </motion.div>
              ) : null}
            </div>
            {heroProducts[1].type === 'product' && (
              <div className="absolute bottom-0 left-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-t from-black/70 to-transparent z-20">
                <p className="text-[10px] uppercase tracking-widest text-white/70 font-bold">{heroProducts[1].brand}</p>
                <p className="text-sm text-white font-medium leading-tight mt-1 line-clamp-2">{heroProducts[1].name}</p>
                <p className="text-xs text-white/80 mt-1">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(heroProducts[1].price))} / {settings.rental_min_days} dias</p>
              </div>
            )}
          </Link>
        ) : (
          <div className="relative h-full overflow-hidden flex items-center justify-center bg-black">
            <div className="relative text-center z-10 px-4">
              {settings.banner_noivas_title && (
                <>
                  <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1 }}
                    className="font-headline italic text-6xl md:text-8xl leading-none tracking-tight mb-4 text-white"
                  >
                    {settings.banner_noivas_title}
                  </motion.h1>
                  <p className="font-label uppercase tracking-[0.4em] text-[10px] opacity-80 text-white">
                    A Revolução do Aluguel de Luxo
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        {heroProducts[2] ? (
          <Link
            to={heroProducts[2].type === 'image' ? '/categoria/new-in' : `/produto/${heroProducts[2].handle}`}
            className="relative h-full overflow-hidden group block"
          >
            <picture className="absolute inset-0 w-full h-full">
              {heroProducts[2].image_url_tablet && <source media="(max-width: 1024px)" srcSet={heroProducts[2].image_url_tablet} />}
              <img
                src={heroProducts[2].image_url}
                alt={heroProducts[2].name || 'Banner'}
                className={`w-full h-full object-cover transition-all duration-700 group-hover:scale-105 ${heroProducts[2].type !== 'image' ? 'grayscale group-hover:grayscale-0' : ''}`}
              />
            </picture>
            <div className="absolute inset-0 bg-black/10 transition-colors duration-500 group-hover:bg-black/40" />
            
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center opacity-0 group-hover:opacity-100 transition-all duration-500 z-10 px-4 pointer-events-none drop-shadow-2xl -translate-y-4 group-hover:translate-y-0">
              {settings.banner_alugue_html && (
                <div dangerouslySetInnerHTML={renderHtml(settings.banner_alugue_html)} className="w-full relative text-center mix-blend-normal" />
              )}
            </div>

            {heroProducts[2].type === 'product' && (
              <div className="absolute bottom-0 left-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-t from-black/70 to-transparent z-20">
                <p className="text-[10px] uppercase tracking-widest text-white/70 font-bold">{heroProducts[2].brand}</p>
                <p className="text-sm text-white font-medium leading-tight mt-1 line-clamp-2">{heroProducts[2].name}</p>
                <p className="text-xs text-white/80 mt-1">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(heroProducts[2].price))} / {settings.rental_min_days} dias</p>
              </div>
            )}
          </Link>
        ) : (
          <div className="relative h-full overflow-hidden bg-surface-container" />
        )}

      </section>

      {/* Vitrine 1 (Anteriormente Mais Buscados) */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="flex justify-between items-center mb-12">
          <div className="space-y-1">
            <h2 className="font-headline italic text-4xl">{settings.showcase_1_title || 'Mais Buscados'}</h2>
            <div className="h-[1px] w-24 bg-primary"></div>
          </div>
          <Link to="/categoria" className="text-xs uppercase tracking-widest hover:underline decoration-1 underline-offset-4 text-black">
            Ver Tudo
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
          {(dynamicProducts[1] || []).map((product: any) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* NEWS FOR RENT Banner */}
      <section className="relative h-[80vh] flex items-center justify-center overflow-hidden">
        <picture className="absolute inset-0 w-full h-full">
          {settings.banner_news_desktop && <source media="(min-width: 1024px)" srcSet={settings.banner_news_desktop} />}
          {settings.banner_news_tablet && <source media="(min-width: 768px)" srcSet={settings.banner_news_tablet} />}
          <img
            src={settings.banner_news_mobile || settings.banner_news_desktop || "/banners/news_for_rent.png"}
            alt="News for Rent"
            className="absolute inset-0 w-full h-full object-cover object-top md:object-[50%_-200px]"
          />
        </picture>
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative text-center text-white space-y-4 px-4 w-full h-full flex flex-col items-center justify-end pb-16">
          {settings.banner_news_title && (
            <h2 
              className="font-headline italic text-5xl md:text-8xl"
              style={{ color: settings.banner_news_text_color || '#FFFFFF' }}
            >
              {settings.banner_news_title}
            </h2>
          )}
          <p className="font-label uppercase tracking-widest text-xs opacity-90 max-w-lg mx-auto">
            Novas curadorias chegam semanalmente ao nosso closet global.
          </p>
          <Link to="/categoria" className="inline-block mt-8 border-b-2 border-white pb-2 text-xs uppercase tracking-[0.3em] font-medium hover:opacity-70 transition-opacity">
            Ver Mais
          </Link>
        </div>
      </section>

      {/* Vitrine 2 - Bolsas de Festa */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="flex justify-between items-center mb-12">
          <div className="space-y-1">
            <h2 className="font-headline italic text-4xl">{settings.showcase_2_title || 'Bolsas de Festa'}</h2>
            <div className="h-[1px] w-24 bg-primary"></div>
          </div>
          <Link to="/categoria" className="text-xs uppercase tracking-widest hover:underline decoration-1 underline-offset-4 text-black">
             Explore
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
          {(dynamicProducts[2] || []).map((product: any) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* Vitrine 3 - Para o Dia a Dia */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full pt-0">
        <div className="flex justify-between items-center mb-12">
          <div className="space-y-1">
            <h2 className="font-headline italic text-4xl">{settings.showcase_3_title || 'Para o Dia a Dia'}</h2>
            <div className="h-[1px] w-24 bg-primary"></div>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
          {(dynamicProducts[3] || []).map((product: any) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* BOLSAS EM DESTAQUE Editorial Banner & Vitrine 4 */}
      <section className="w-full">
        <div className="relative h-[60vh] flex items-center justify-center overflow-hidden mb-24">
          <picture className="absolute inset-0 w-full h-full">
            {settings.banner_noivas_desktop && <source media="(min-width: 1024px)" srcSet={settings.banner_noivas_desktop} />}
            {settings.banner_noivas_tablet && <source media="(min-width: 768px)" srcSet={settings.banner_noivas_tablet} />}
            <img
              src={settings.banner_noivas_mobile || settings.banner_noivas_desktop || "/banners/noivas.png"}
              alt="Bolsas em Destaque"
              className="absolute inset-0 w-full h-full object-cover"
            />
          </picture>
          <div className="absolute inset-0 bg-white/10"></div>
          <div className="relative text-center space-y-4 w-full h-full flex flex-col items-center justify-center">
            {settings.banner_noivas_title && (
              <h2 
                className="font-headline italic text-5xl md:text-8xl"
                style={{ color: settings.banner_noivas_text_color || '#000000' }}
              >
                {settings.banner_noivas_title}
              </h2>
            )}

          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-24">
          <div className="flex justify-between items-center mb-12">
             <div className="space-y-1">
               <h2 className="font-headline italic text-4xl">{settings.showcase_4_title || 'Coleção Premium'}</h2>
               <div className="h-[1px] w-24 bg-primary"></div>
             </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
            {(dynamicProducts[4] || []).map((product: any) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* Alugue Agora Editorial */}
      <section className="bg-surface-container-lowest grid md:grid-cols-12 items-center">
        <div className="md:col-span-5 relative py-20 px-8 flex flex-col justify-center space-y-8 z-10">
          <div className="space-y-4">
            {settings.banner_alugue_title1 && (
              <h2 
                className="font-headline italic text-4xl"
                style={{ color: settings.banner_alugue_text_color || '#000000' }}
              >
                {settings.banner_alugue_title1}
              </h2>
            )}
            {settings.banner_alugue_title2 && (
              <h2 
                className="font-headline italic text-4xl ml-12"
                style={{ color: settings.banner_alugue_text_color || '#000000' }}
              >
                {settings.banner_alugue_title2}
              </h2>
            )}
          </div>
          <p className="font-light text-on-surface-variant max-w-sm leading-relaxed text-black">
            Uma curadoria pensada para quem não apenas veste, mas expressa. Alugue o hoje, vista o futuro.
          </p>
          <div className="pt-8">
            <Link to="/categoria" className="inline-block border-b border-black pb-1 text-[10px] uppercase tracking-widest text-black hover:text-primary hover:border-primary transition-colors">
              Alugue Agora
            </Link>
          </div>
        </div>
        <div className="md:col-span-7 h-[80vh] relative flex items-end justify-center">
          <picture className="absolute inset-0 w-full h-full">
            {settings.banner_alugue_desktop && <source media="(min-width: 1024px)" srcSet={settings.banner_alugue_desktop} />}
            {settings.banner_alugue_tablet && <source media="(min-width: 768px)" srcSet={settings.banner_alugue_tablet} />}
            <img
              src={settings.banner_alugue_mobile || settings.banner_alugue_desktop || "/banners/alugue_agora.png"}
              alt="Editorial Alugue Agora"
              className="absolute inset-0 w-full h-full object-cover"
            />
          </picture>
        </div>
      </section>

      {/* Vitrine 5 - Bolsas Casuais */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="space-y-1 mb-12">
          <h2 className="font-headline italic text-4xl">{settings.showcase_5_title || 'Bolsas Casuais'}</h2>
          <div className="h-[1px] w-24 bg-primary"></div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
          {(dynamicProducts[5] || []).map((product: any) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* Brands Logos Carousel */}
      <section className="py-32 bg-black overflow-hidden border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 text-center mb-20">
           <h3 className="font-headline italic text-3xl text-white tracking-widest">Marcas Parceiras</h3>
        </div>
        
        <div className="relative flex overflow-hidden">
          <motion.div
            animate={{ x: ["0%", "-50%"] }}
            transition={{ 
              repeat: Infinity, 
              duration: 40, 
              ease: "linear",
              repeatType: "loop"
            }}
            className="flex gap-16 md:gap-24 items-center whitespace-nowrap px-12"
          >
            {[...brands, ...brands].map((brand, index) => (
              <Link 
                key={`${brand.name}-${index}`}
                to={`/categoria?brand=${brand.name}`} 
                className="flex-shrink-0 group transition-all duration-500"
              >
                <img 
                  src={brand.logo} 
                  alt={brand.name} 
                  className="h-24 md:h-32 w-auto object-contain opacity-50 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500 grayscale group-hover:grayscale-0 mix-blend-screen" 
                />
              </Link>
            ))}
          </motion.div>
        </div>

        <div className="flex justify-center mt-24">
           <Link to="/categoria" className="px-16 py-4 border border-white text-white text-[10px] uppercase tracking-[0.4em] hover:bg-white hover:text-black transition-all duration-500 font-bold">
            Explorar Tudo
          </Link>
        </div>
      </section>
    </div>
  );
}
