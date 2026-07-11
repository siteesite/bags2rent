import { useState, useEffect } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ChevronDown, Heart, Share2, Ruler, ShieldCheck, ArrowRight, Loader2, Truck, Building2, MapPin, MessageCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { parseProductSizes } from '../lib/sizes';
import { motion } from 'motion/react';
import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';
import { RentalCalculator } from '../components/RentalCalculator';
import { SizeGuideModal } from '../components/SizeGuideModal';
import { useSiteSettings } from '../context/SettingsContext';

// Canonical color map — same as ProductsAdmin COLOR_MAP
const COLOR_MAP: { name: string; hex: string }[] = [
  { name: 'Amarelo',      hex: '#F5C542' },
  { name: 'Azul',         hex: '#2563EB' },
  { name: 'Bege',         hex: '#D4B896' },
  { name: 'Branco',       hex: '#FFFFFF' },
  { name: 'Cinza',        hex: '#9CA3AF' },
  { name: 'Dourado',      hex: '#C9A84C' },
  { name: 'Laranja',      hex: '#F97316' },
  { name: 'Marrom',       hex: '#92400E' },
  { name: 'Multicolorido',hex: 'linear-gradient(135deg,#f00,#ff0,#0f0,#0ff,#00f,#f0f)' },
  { name: 'Off-white',    hex: '#F5F0E8' },
  { name: 'Prata',        hex: '#B0B7BC' },
  { name: 'Preto',        hex: '#111111' },
  { name: 'Rosa',         hex: '#F472B6' },
  { name: 'Roxo',         hex: '#7C3AED' },
  { name: 'Verde',        hex: '#16A34A' },
  { name: 'Vermelho',     hex: '#DC2626' },
  { name: 'Gold',         hex: '#D4AF37' },
  { name: 'Silver',       hex: '#C0C0C0' },
  { name: 'Floral',       hex: 'conic-gradient(at center, #ff9a9e, #fecfef, #feada6, #ff9a9e)' },
  { name: 'Animal Print', hex: 'radial-gradient(circle at center, #d2b48c 0%, #8b4513 40%, #000 70%)' },
  { name: 'Faixa',        hex: 'repeating-linear-gradient(90deg, #111, #111 5px, #fff 5px, #fff 10px)' },
  { name: 'Grisalho',     hex: '#B8B8B8' },
  { name: 'Geometrico',   hex: 'linear-gradient(135deg, #111 25%, transparent 25%, transparent 75%, #111 75%, #111)' },
  // Additional colours present in some imported products
  { name: 'Bordô',        hex: '#800000' },
  { name: 'Vinho',        hex: '#722F37' },
  { name: 'Nude',         hex: '#EBC8B2' },
  { name: 'Rose',         hex: '#FFC0CB' },
  { name: 'Pink',         hex: '#FF69B4' },
  { name: 'Marinho',      hex: '#000080' },
  { name: 'Celeste',      hex: '#B2FFFF' },
  { name: 'Esmeralda',    hex: '#50C878' },
  { name: 'Oliva',        hex: '#808000' },
  { name: 'Lilás',        hex: '#C8A2C8' },
  { name: 'Violeta',      hex: '#EE82EE' },
  { name: 'Creme',        hex: '#FFFDD0' },
  { name: 'Gelo',         hex: '#F0F8FF' },
  { name: 'Grafite',      hex: '#383838' },
  { name: 'Terracota',    hex: '#E2725B' },
  { name: 'Caramelo',     hex: '#AF6F09' },
];

/**
 * Resolve a raw color string (from the DB) to a canonical COLOR_MAP entry.
 * Strategy:
 *  1. Exact match (case-insensitive)
 *  2. First token before "-" or number ("amarela-1" → "amarela" → "Amarelo")
 *  3. Substring match
 * Returns null when no known color is found — caller should render a text badge.
 */
const resolveColor = (raw: string): { name: string; hex: string } | null => {
  if (!raw) return null;
  const input = raw.trim();
  const inputLow = input.toLowerCase();

  // 1. Exact
  const exact = COLOR_MAP.find(c => c.name.toLowerCase() === inputLow);
  if (exact) return exact;

  // 2. First token (strip suffix like "-1", "-2", numbers)
  const firstToken = inputLow.replace(/[-_]\d+.*$/, '').replace(/\d+$/, '').trim();
  if (firstToken && firstToken !== inputLow) {
    const tokenMatch = COLOR_MAP.find(c => c.name.toLowerCase() === firstToken);
    if (tokenMatch) return tokenMatch;
  }

  // 3. Substring — color name contains the input token or vice-versa
  const sub = COLOR_MAP.find(c => {
    const cl = c.name.toLowerCase();
    return cl.startsWith(firstToken || inputLow) || (firstToken || inputLow).startsWith(cl);
  });
  if (sub) return sub;

  return null; // unknown color
};

const getPrettyColorName = (raw: string) => resolveColor(raw)?.name ?? raw;

export function ProductDetail() {
  const { handle } = useParams();
  const location = useLocation();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { addItem } = useCart();
  const { settings } = useSiteSettings();

  const [product, setProduct] = useState<any>(location.state?.product || null);
  const [loading, setLoading] = useState(!product);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [rentalData, setRentalData] = useState<{ startDate: string; endDate: string; totalDays: number; totalPrice: number } | null>(null);
  const [shippingRates, setShippingRates] = useState<any>(null);
  const [cep, setCep] = useState('');
  const [cepLoading, setCepLoading] = useState(false);
  const [shippingInfo, setShippingInfo] = useState<{ price: number; days: number } | null>(null);
  const [isSPCapital, setIsSPCapital] = useState(false);
  const [shippingMethod, setShippingMethod] = useState<'delivery' | 'pickup'>('delivery');
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
  const [selectedImage, setSelectedImage] = useState<string>('');

  const STATE_TO_REGION: Record<string, string> = {
    'AC': 'shipping_north', 'AM': 'shipping_north', 'AP': 'shipping_north', 'PA': 'shipping_north', 'RO': 'shipping_north', 'RR': 'shipping_north', 'TO': 'shipping_north',
    'AL': 'shipping_northeast', 'BA': 'shipping_northeast', 'CE': 'shipping_northeast', 'MA': 'shipping_northeast', 'PB': 'shipping_northeast', 'PE': 'shipping_northeast', 'PI': 'shipping_northeast', 'RN': 'shipping_northeast', 'SE': 'shipping_northeast',
    'DF': 'shipping_central_west', 'GO': 'shipping_central_west', 'MT': 'shipping_central_west', 'MS': 'shipping_central_west',
    'ES': 'shipping_southeast', 'MG': 'shipping_southeast', 'RJ': 'shipping_southeast', 'SP': 'shipping_southeast',
    'PR': 'shipping_south', 'RS': 'shipping_south', 'SC': 'shipping_south'
  };

  useEffect(() => {
    async function fetchShippingRates() {
      const { data } = await supabase
        .from('public_settings')
        .select(`
          shipping_north, shipping_northeast, shipping_central_west, shipping_southeast, shipping_south,
          delivery_north, delivery_northeast, delivery_central_west, delivery_southeast, delivery_south,
          rental_min_days
        `)
        .eq('id', '00000000-0000-0000-0000-000000000000')
        .single();
      
      if (data) {
        setShippingRates(data);
      }
    }
    fetchShippingRates();
  }, []);

  const handleCepLookup = async (value: string) => {
    const cleanCep = value.replace(/\D/g, '');
    setCep(cleanCep);
    
    if (cleanCep.length === 8) {
      setCepLoading(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await response.json();
        
        if (!data.erro && shippingRates) {
          if (data.uf === 'SP' && data.localidade === 'São Paulo') {
            setIsSPCapital(true);
          } else {
            setIsSPCapital(false);
            setShippingMethod('delivery');
          }

          const regionKey = STATE_TO_REGION[data.uf];
          if (regionKey) {
            const priceKey = regionKey;
            const daysKey = regionKey.replace('shipping_', 'delivery_');
            setShippingInfo({
              price: Number(shippingRates[priceKey]) || 0,
              days: Number(shippingRates[daysKey]) || 0
            });
          }
        } else {
          setShippingInfo(null);
          setIsSPCapital(false);
          setShippingMethod('delivery');
        }
      } catch (error) {
        console.error('Error fetching CEP:', error);
        setShippingInfo(null);
        setIsSPCapital(false);
        setShippingMethod('delivery');
      } finally {
        setCepLoading(false);
      }
    } else {
      setShippingInfo(null);
      setIsSPCapital(false);
      setShippingMethod('delivery');
    }
  };

  useEffect(() => {
    async function fetchProduct() {
      if (!handle) return;

      // Se temos o produto via location.state, já definimos a imagem selecionada imediatamente
      if (product && product.handle === handle && !selectedImage) {
        setSelectedImage(product.image_url);
      }

      // Sempre buscamos os dados do Supabase se o handle mudou, se não temos o produto 
      // ou se o objeto que temos está incompleto (faltando a descrição)
      const currentHandle = handle?.trim();
      if (!product || product.handle !== currentHandle || !product.description_html) {
        setLoading(true);
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .ilike('handle', currentHandle || '')
          .maybeSingle(); // maybeSingle is safer than single() as it doesn't throw 406 if not found
        
        if (!error && data) {
          const productData = { ...data, image: data.image_url };
          setProduct(productData);
          if (data.image_url) {
            setSelectedImage(data.image_url);
          }
        } else if (error) {
          console.error('Erro ao buscar produto:', error);
        }
        setLoading(false);
      }
    }
    fetchProduct();
  }, [handle, product?.handle]); // Depende do handle e do handle do produto atual

  // Garante que a imagem selecionada acompanhe a mudança de produto
  useEffect(() => {
    if (product?.image_url && (!selectedImage || !allImages.includes(selectedImage))) {
      setSelectedImage(product.image_url);
    }
  }, [product?.id, product?.image_url]);

  const allImages = product ? [product.image_url, ...(product.extra_images || [])].filter(Boolean) : [];

  // Values in the size field that are NOT clothing sizes (rental periods, defaults, etc.)
  // Parse product sizes from the size field
  const productSizes = parseProductSizes(product?.size);

  // Initialize selectedColor from product
  useEffect(() => {
    if (product?.color) {
      const first = String(product.color).split(';')[0].trim();
      setSelectedColor(first);
    }
  }, [product?.color]);

  // Auto-select first size when product loads
  useEffect(() => {
    if (productSizes.length > 0 && !selectedSize) {
      setSelectedSize(productSizes[0]);
    }
  }, [productSizes.join(',')]); // eslint-disable-line

  // Fetch related products (same category, exclude current product by handle)
  useEffect(() => {
    if (!product) return;

    async function fetchRelated() {
      const FIELDS = 'id, name, brand, price, image_url, handle, category, size, description_html';

      let query = supabase
        .from('products')
        .select(FIELDS)
        .eq('status', 'active')
        .neq('handle', product.handle)
        .limit(4);

      if (product.category) {
        query = query.eq('category', product.category);
      }

      const { data, error } = await query;

      if (!error && data && data.length > 0) {
        setRelatedProducts(data.map((p) => ({ ...p, image: p.image_url })));
      } else {
        // Fallback: any 4 products, no category filter
        const { data: fallback } = await supabase
          .from('products')
          .select(FIELDS)
          .eq('status', 'active')
          .neq('handle', product.handle)
          .limit(4);
        if (fallback) setRelatedProducts(fallback.map((p) => ({ ...p, image: p.image_url })));
      }
    }

    fetchRelated();
  }, [product?.handle]);

  const handleAddToCart = () => {
    if (!rentalData) {
      alert('Por favor, selecione um período de locação válido.');
      return;
    }

    const start = new Date(rentalData.startDate + 'T12:00:00');
    const end = new Date(rentalData.endDate + 'T12:00:00');
    const dateStr = `Locação: ${start.toLocaleDateString('pt-BR')} • Devolução: ${end.toLocaleDateString('pt-BR')}`;

    addItem({
      product_id: String(product.id),
      handle: product.handle,
      name: product.name,
      brand: product.brand,
      price: rentalData.totalPrice,
      image: product.image,
      size: selectedSize,
      period: `${rentalData.totalDays} Dias`,
      dates: dateStr,
      startDate: rentalData.startDate,
      endDate: rentalData.endDate,
      quantity: 1
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
          <p className="font-headline italic text-2xl tracking-wide">Buscando no closet...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="text-center space-y-6 max-w-sm px-4">
          <h1 className="font-headline italic text-4xl">Peça não encontrada</h1>
          <p className="font-light text-on-surface-variant">Parece que este item não está mais disponível em nosso acervo.</p>
          <Link to="/categoria" className="inline-block bg-black text-white px-8 py-4 text-xs font-bold uppercase tracking-widest hover:bg-gray-800 transition-colors">
            Explorar Acervo
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface min-h-screen">
      {/* Breadcrumbs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <nav className="flex text-xs text-on-surface-variant" aria-label="Breadcrumb">
          <ol className="inline-flex items-center space-x-1 md:space-x-3">
            <li className="inline-flex items-center">
              <Link to="/" className="hover:text-on-surface transition-colors">Home</Link>
            </li>
            <li>
              <div className="flex items-center">
                <span className="mx-2">/</span>
                <Link to="/categoria" className="hover:text-on-surface transition-colors">Mulher</Link>
              </div>
            </li>
            <li>
              <div className="flex items-center">
                <span className="mx-2">/</span>
                <Link to="/categoria" className="hover:text-on-surface transition-colors">Vestidos</Link>
              </div>
            </li>
            <li aria-current="page">
              <div className="flex items-center">
                <span className="mx-2">/</span>
                <span className="text-on-surface font-medium">{product.brand}</span>
              </div>
            </li>
          </ol>
        </nav>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="flex flex-col lg:flex-row gap-16">
          
          {/* Image Gallery */}
          <div className="w-full lg:w-[70%] flex flex-col md:flex-row gap-4">
            {/* Thumbnails */}
            <div className="order-2 md:order-1 flex md:flex-col gap-2 overflow-x-auto md:overflow-y-auto no-scrollbar md:w-20 lg:w-24 shrink-0">
              {allImages.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(img)}
                  className={`aspect-[9/16] border-2 transition-all shrink-0 w-20 md:w-full overflow-hidden ${
                    selectedImage === img ? 'border-primary' : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt={`Thumbnail ${idx}`} className="w-full h-full object-cover object-top" />
                </button>
              ))}
            </div>

            {/* Main Image */}
            <div className="order-1 md:order-2 flex-1 aspect-[9/16] bg-surface-container-low overflow-hidden">
              <motion.img 
                key={selectedImage}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                src={selectedImage} 
                alt={product.name} 
                className="w-full h-full object-contain object-top"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>

          {/* Product Info - Sticky */}
          <div className="w-full lg:w-[30%]">
            <div className="sticky top-24">
              <div className="flex justify-between items-start mb-2">
                <span className="font-label uppercase tracking-widest text-[10px] text-on-surface-variant block">{product.brand}</span>
                <div className="flex gap-4 text-on-surface-variant">
                  <button 
                    onClick={() => toggleWishlist(product)}
                    className={`transition-colors ${isInWishlist(product.id) ? 'text-red-500' : 'hover:text-red-500'}`}
                  >
                    <Heart className={`w-5 h-5 ${isInWishlist(product.id) ? 'fill-current' : ''}`} />
                  </button>
                  <button className="hover:text-on-surface transition-colors"><Share2 className="w-5 h-5" /></button>
                </div>
              </div>
              
              <h1 className="font-headline italic text-4xl mb-2">{product.name}</h1>
              
              {product.color && (() => {
                const colors = String(product.color).split(';').map((c: string) => c.trim()).filter(Boolean);
                if (colors.length === 0) return null;
                return (
                  <div className="mb-5">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">Cor:</span>
                      <span className="text-xs text-on-surface font-medium">{getPrettyColorName(selectedColor)}</span>
                    </div>
                    <div className="flex gap-2 flex-wrap items-center">
                      {colors.map(cor => {
                        const resolved = resolveColor(cor);
                        const isLight = resolved?.name === 'Branco' || resolved?.name === 'Off-white' || resolved?.name === 'Gelo' || resolved?.name === 'Creme';
                        const isGradient = resolved?.hex?.includes('gradient');

                        if (resolved) {
                          // Known color → show swatch circle
                          return (
                            <button
                              key={cor}
                              title={resolved.name}
                              onClick={() => setSelectedColor(cor)}
                              className={`w-8 h-8 rounded-full border-[3px] transition-all duration-200 ${
                                selectedColor === cor ? 'border-primary scale-110 shadow-md' : 'border-transparent hover:border-outline-variant'
                              } ${isLight ? 'ring-1 ring-outline-variant/40' : ''}`}
                              style={isGradient ? { background: resolved.hex } : { backgroundColor: resolved.hex }}
                            />
                          );
                        } else {
                          // Unknown color → text badge only (no grey circle)
                          const label = cor.split('-')[0].trim();
                          const displayLabel = label.charAt(0).toUpperCase() + label.slice(1);
                          return (
                            <button
                              key={cor}
                              title={cor}
                              onClick={() => setSelectedColor(cor)}
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border transition-all duration-200 ${
                                selectedColor === cor
                                  ? 'bg-primary text-on-primary border-primary scale-105'
                                  : 'bg-surface-container border-outline-variant text-on-surface-variant hover:border-primary'
                              }`}
                            >
                              {displayLabel}
                            </button>
                          );
                        }
                      })}
                    </div>
                  </div>
                );
              })()}
              
              <div className="flex items-baseline gap-4 mb-8">
                <span className="text-2xl font-light">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(product.price))}
                </span>
                <span className="text-sm text-on-surface-variant">/ {rentalData?.totalDays || shippingRates?.rental_min_days || settings.rental_min_days} dias</span>
                {product.compare_at_price && (
                  <span className="text-xs text-on-surface-variant line-through ml-2">
                    Varejo: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(product.compare_at_price))}
                  </span>
                )}
              </div>

              {/* Rental Calculator */}
              <div className="mb-8 border-t border-b border-outline-variant/10 py-8">
                <RentalCalculator 
                  productId={String(product.id)}
                  pricePerDay={Number(product.price)}
                  lateFeePerDay={Number(product.price) * 0.2} // 20% of price per day as default penalty
                  onRentalSimulation={(data) => setRentalData(data)}
                />
              </div>

              {/* Shipping Simulator */}
              <div className="mb-8 border-b border-outline-variant/10 pb-8">
                <div className="flex items-center gap-2 mb-4">
                  <Truck className="w-4 h-4 text-primary" />
                  <span className="font-label uppercase tracking-widest text-[10px] text-on-surface-variant">Simular Frete</span>
                </div>
                
                <div className="flex flex-col gap-3">
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="00000-000"
                      maxLength={9}
                      value={cep}
                      onChange={(e) => handleCepLookup(e.target.value)}
                      className="w-full bg-surface-container-low border border-outline-variant px-4 py-3 text-sm focus:border-primary focus:outline-none transition-colors"
                    />
                    {cepLoading && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      </div>
                    )}
                  </div>

                  {shippingInfo !== null && (
                    <motion.div 
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex flex-col gap-3"
                    >
                      {isSPCapital && (
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <button
                            type="button"
                            onClick={() => setShippingMethod('delivery')}
                            className={`flex flex-col items-center justify-center gap-1 p-3 border transition-colors ${
                              shippingMethod === 'delivery' ? 'border-primary bg-primary/5' : 'border-outline-variant/30 hover:border-outline-variant'
                            }`}
                          >
                            <Truck className={`w-5 h-5 ${shippingMethod === 'delivery' ? 'text-primary' : 'text-on-surface-variant'}`} />
                            <span className={`font-medium ${shippingMethod === 'delivery' ? 'text-primary' : 'text-on-surface-variant'}`}>
                              Frete
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setShippingMethod('pickup')}
                            className={`flex flex-col items-center justify-center gap-1 p-3 border transition-colors ${
                              shippingMethod === 'pickup' ? 'border-primary bg-primary/5' : 'border-outline-variant/30 hover:border-outline-variant'
                            }`}
                          >
                            <Building2 className={`w-5 h-5 ${shippingMethod === 'pickup' ? 'text-primary' : 'text-on-surface-variant'}`} />
                            <span className={`font-medium ${shippingMethod === 'pickup' ? 'text-primary' : 'text-on-surface-variant'}`}>
                              Retirar na Loja
                            </span>
                          </button>
                        </div>
                      )}

                      {shippingMethod === 'pickup' ? (
                        <div className="flex justify-between items-center bg-surface-container-lowest p-3 border border-outline-variant/20 rounded-sm">
                          <div className="flex flex-col">
                            <span className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold flex items-center gap-1">
                              <MapPin className="w-3 h-3" /> Jardins, SP
                            </span>
                            <span className="text-xs text-on-surface-variant font-medium mt-0.5">Disponível em até 2hrs</span>
                          </div>
                          <span className="text-sm font-bold text-emerald-600">
                            Grátis
                          </span>
                        </div>
                      ) : (
                        <div className="flex justify-between items-center bg-surface-container-lowest p-3 border border-outline-variant/20 rounded-sm">
                          <div className="flex flex-col">
                            <span className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">Previsão de Entrega</span>
                            <span className="text-xs text-on-surface-variant font-medium">Em até {shippingInfo.days} dias úteis</span>
                          </div>
                          <span className="text-sm font-bold text-on-surface">
                            {shippingInfo.price === 0 ? 'Grátis' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(shippingInfo.price)}
                          </span>
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Size Selection */}
              <div className="mb-8">
                <div className="flex justify-between items-center mb-4">
                  <span className="font-label uppercase tracking-widest text-[10px] text-on-surface-variant">Tamanho</span>
                  <button 
                    onClick={() => setIsSizeGuideOpen(true)}
                    className="text-xs text-on-surface-variant underline flex items-center gap-1 hover:text-on-surface transition-colors"
                  >
                    <Ruler className="w-3 h-3" /> Guia de Medidas
                  </button>
                </div>

                {productSizes.length > 0 ? (
                  <div className={`grid gap-2 ${productSizes.length === 1 ? 'grid-cols-1' : productSizes.length <= 3 ? 'grid-cols-3' : 'grid-cols-4'}`}>
                    {productSizes.map(size => (
                      <button 
                        key={size}
                        onClick={() => setSelectedSize(size)}
                        className={`border py-3 text-sm font-medium transition-colors ${
                          selectedSize === size
                            ? 'border-primary bg-primary text-on-primary'
                            : 'border-outline-variant hover:border-primary'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                ) : (
                  // Fallback: tamanho único / sem variação
                  <div className="border border-outline-variant/40 px-4 py-3 text-sm text-on-surface-variant font-light">
                    Tamanho Único
                  </div>
                )}
              </div>

              {/* CTA */}
              <button 
                onClick={handleAddToCart}
                disabled={!rentalData}
                className="w-full bg-primary text-on-primary py-4 font-medium text-sm hover:bg-primary-container transition-colors mb-4 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {rentalData ? 'Adicionar à Sacola' : 'Selecione as Datas'}
              </button>
              
              <div className="flex flex-col items-center justify-center gap-3 mb-12">
                <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Lavanderia e seguro básico inclusos</span>
                </div>
                
                {settings.whatsapp_number && (
                  <a 
                    href={`https://wa.me/${settings.whatsapp_number.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá! Gostaria de tirar algumas dúvidas sobre o produto: ${product.brand} - ${product.name}`)}`}
                    target={settings.whatsapp_new_tab ? "_blank" : "_self"}
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest text-emerald-600 hover:text-emerald-700 transition-colors"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    Dúvidas? Chame no WhatsApp
                  </a>
                )}
              </div>

              {/* Accordions */}
              <div className="border-t border-outline-variant/20">
                <details className="group" open>
                  <summary className="flex justify-between items-center font-medium cursor-pointer list-none py-6 border-b border-outline-variant/20">
                    <span className="font-label uppercase tracking-widest text-[10px]">Descrição</span>
                    <span className="transition group-open:rotate-180">
                      <ChevronDown className="w-4 h-4" />
                    </span>
                  </summary>
                  <div 
                    className="text-on-surface-variant text-sm font-light leading-relaxed pb-6 pt-2 space-y-2 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_strong]:font-semibold"
                    dangerouslySetInnerHTML={{ __html: (product.description_html || product.description || '').trim() || 'Sem descrição disponível.' }}
                  />
                </details>
                <details className="group">
                  <summary className="flex justify-between items-center font-medium cursor-pointer list-none py-6 border-b border-outline-variant/20">
                    <span className="font-label uppercase tracking-widest text-[10px]">Detalhes & Medidas</span>
                    <span className="transition group-open:rotate-180">
                      <ChevronDown className="w-4 h-4" />
                    </span>
                  </summary>
                  <div className="text-on-surface-variant text-sm font-light leading-relaxed pb-6 pt-2">
                    <ul className="list-disc pl-4 space-y-2">
                      {product.brand && <li>Marca: {product.brand}</li>}
                      {product.category && <li>Categoria: {product.category}</li>}
                      {product.size && <li>Tamanhos: {String(product.size).replace(/;/g, ', ')}</li>}
                      {product.color && <li>Cores: {String(product.color).split(';').map(c => getPrettyColorName(c.trim())).join(', ')}</li>}
                      {product.metafields?.['Tecido (product.metafields.shopify.fabric)'] && (
                        <li>Tecido: {product.metafields['Tecido (product.metafields.shopify.fabric)']}</li>
                      )}
                      {product.metafields?.['Decote (product.metafields.shopify.neckline)'] && (
                        <li>Decote: {product.metafields['Decote (product.metafields.shopify.neckline)']}</li>
                      )}
                      {product.compare_at_price && (
                        <li>Valor Original: R$ {product.compare_at_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</li>
                      )}
                      {!product.brand && !product.category && !product.size && (
                        <li>Confira a descrição para mais detalhes técnicos.</li>
                      )}
                    </ul>
                  </div>
                </details>
                <details className="group">
                  <summary className="flex justify-between items-center font-medium cursor-pointer list-none py-6 border-b border-outline-variant/20">
                    <span className="font-label uppercase tracking-widest text-[10px]">Como Funciona</span>
                    <span className="transition group-open:rotate-180">
                      <ChevronDown className="w-4 h-4" />
                    </span>
                  </summary>
                  <div className="text-on-surface-variant text-sm font-light leading-relaxed pb-6 pt-2">
                    Escolha o período {shippingRates?.rental_min_days > 1 ? `mínimo de ${shippingRates.rental_min_days} dias` : 'da sua diária'}. Entregamos a peça higienizada e pronta para uso. Após o evento, basta colocar na embalagem de retorno pré-paga e agendar a coleta. Nós cuidamos da lavanderia.
                  </div>
                </details>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Complete o Look — mesma categoria */}
      <section className="py-24 bg-surface-container-lowest border-t border-outline-variant/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-end mb-12">
            <div className="space-y-1">
              <h2 className="font-headline italic text-3xl">Complete o Look</h2>
              {product?.category && (
                <p className="text-[9px] uppercase tracking-widest text-on-surface-variant">
                  Mais em {product.category}
                </p>
              )}
            </div>
            <Link
              to={`/categoria${product?.category ? `?cat=${encodeURIComponent(product.category)}` : ''}`}
              className="hidden md:flex items-center gap-2 text-sm font-medium hover:text-on-surface-variant transition-colors"
            >
              Ver todos <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {relatedProducts.length > 0 ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedProducts.map((rel) => (
                <Link
                  key={rel.id}
                  to={`/produto/${rel.handle}`}
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  state={{ product: rel }}
                  className="group text-center relative"
                >
                  <div className="relative aspect-[9/16] overflow-hidden bg-surface-container-low mb-4">
                    <img
                      src={rel.image}
                      alt={rel.name}
                      className="w-full h-full object-contain transition-transform duration-700 group-hover:scale-105"
                      referrerPolicy="no-referrer"
                    />
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        toggleWishlist(rel);
                      }}
                      className={`absolute top-4 right-4 p-2 bg-surface-container-lowest/80 backdrop-blur-sm rounded-full transition-all duration-300 z-10 ${
                        isInWishlist(rel.id)
                          ? 'text-red-500 opacity-100'
                          : 'opacity-0 group-hover:opacity-100 hover:text-red-500'
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${isInWishlist(rel.id) ? 'fill-current' : ''}`} />
                    </button>
                  </div>
                  <span className="font-label uppercase tracking-widest text-[10px] text-on-surface-variant mb-1 block">
                    {rel.brand}
                  </span>
                  <h3 className="font-headline italic text-lg mb-1 line-clamp-2">{rel.name}</h3>
                  <p className="text-sm font-light">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(Number(rel.price))} / {settings.rental_min_days} dias
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-on-surface-variant font-light italic">
              Explorando o acervo...
            </div>
          )}
        </div>
      </section>

      {/* Size Guide Modal */}
      <SizeGuideModal 
        isOpen={isSizeGuideOpen}
        onClose={() => setIsSizeGuideOpen(false)}
      />
    </div>
  );
}
