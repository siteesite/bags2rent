import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Search, User, ShoppingBag, Menu, Heart, X, ChevronDown, Home, MessageCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useWishlist } from '../context/WishlistContext';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { CartDrawer } from './CartDrawer';
import { SearchModal } from './SearchModal';
import { useSiteSettings } from '../context/SettingsContext';
import { createSlug } from '../utils/slug';

const MENU_ITEMS = [
  { label: 'Home', path: '/' },
  { label: 'New in', path: '/categoria/new-in' },
  {
    label: 'Aluguel por Peça',
    items: [
      { label: 'Vestidos' },
      { label: 'Calças' },
      { label: 'Colar' },
      { label: 'Bolsas' },
      { label: 'Blusas/ Top Croppeds' },
      { label: 'Conjuntos' },
      { label: 'Kimonos' },
      { label: 'Saias' },
      { label: 'Parkas' },
    ]
  },
  {
    label: 'Aluguel por tamanho',
    headerPath: '/tamanho',
    items: [
      { label: 'P — Pequeno', path: '/tamanho/p' },
      { label: 'M — Médio',   path: '/tamanho/m' },
      { label: 'G — Grande',  path: '/tamanho/g' },
    ]
  },
  {
    label: 'Aluguel por Eventos',
    headerPath: '/evento',
    items: [
      { label: 'Casamento',    path: '/evento/casamento' },
      { label: 'Festa',        path: '/evento/festa' },
      { label: 'Formatura',    path: '/evento/formatura' },
      { label: 'Gala',         path: '/evento/gala' },
      { label: 'Coquitel',     path: '/evento/coquitel' },
    ]
  },
  {
    label: 'Nossas Marcas',
    headerPath: '/marcas',
    items: [
      'Acler','Agilità','Animale','AVE RARA','AYA','Candy Brown','Catarina Mina',
      'Cris Barros','Cult Gaia','Débora Mangabeira','Fabiana Milazzo',
      'Ganni','Hisha','Jenny Hoo','Le Lis Blanc','Mac Duggal','Mageste',
      'Mariana Penteado','Marina Bitu','NX','PatBo','Ralph Lauren',
      'Solace London','Unity Seven','Wanessa Fittireis','ZARA','Zimmermann',
    ].map((b) => ({ label: b, path: `/categoria?brand=${encodeURIComponent(b)}` }))
  }
];

export function Layout() {
  const { wishlist } = useWishlist();
  const { user } = useAuth();
  const { setIsCartOpen, totalItems } = useCart();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openMobileDropdown, setOpenMobileDropdown] = useState<string | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { settings, loading } = useSiteSettings();
  const location = useLocation();

  const getAccountLink = () => {
    if (!user) return '/login';
    if (user.role === 'admin') return '/admin';
    return '/minha-conta';
  };

  const toggleMobileDropdown = (label: string) => {
    setOpenMobileDropdown(openMobileDropdown === label ? null : label);
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      <AnimatePresence mode="wait">
        {loading && (
          <motion.div
            key="splash"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
            className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center gap-6"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="flex flex-col items-center"
            >
              <h1 className="font-headline italic text-4xl sm:text-6xl text-white tracking-widest mb-2">
                Bags2rent
              </h1>
              <div className="h-[1px] w-48 bg-white/20 relative overflow-hidden">
                <motion.div
                  initial={{ x: "-100%" }}
                  animate={{ x: "100%" }}
                  transition={{ 
                    duration: 1.5, 
                    repeat: Infinity, 
                    ease: "linear" 
                  }}
                  className="absolute inset-y-0 w-24 bg-gradient-to-r from-transparent via-gray-400 to-transparent"
                />
              </div>
            </motion.div>
            
            <div className="flex items-center gap-2 text-gray-500 text-[10px] uppercase tracking-[0.2em] font-medium">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Carregando curadoria</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="min-h-screen flex flex-col font-sans">
      
      {/* Top Promo Banner */}
      <div 
        className="text-center py-2 text-[10px] sm:text-xs font-light tracking-widest flex items-center justify-center transition-colors duration-500"
        style={{ 
          backgroundColor: settings.topbar_bg_color || '#000000', 
          color: settings.topbar_text_color || '#FFFFFF' 
        }}
      >
        <span className="mx-auto uppercase">{settings.topbar_text || 'Uso o cupom BAGS1 na sua primeira aluguel'}</span>
      </div>

      {/* Navigation */}
      <nav className="sticky top-0 w-full z-50 bg-white border-b border-outline-variant/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">

            {/* Desktop: left icons | Mobile: hidden */}
            <div className="hidden lg:flex items-center gap-4">
              <Link to="/" className="font-headline italic text-2xl tracking-tight">
                Bags2rent
              </Link>
            </div>

            {/* Mobile: logo centralizada */}
            <div className="lg:hidden flex-1 flex justify-center">
              <Link to="/" className="font-headline italic text-2xl tracking-tight">
                Bags2rent
              </Link>
            </div>
            
            {/* Desktop: nav links */}
            <div className="hidden lg:flex items-center gap-6">
              {MENU_ITEMS.filter(item => {
                if (item.label === 'Aluguel por Peça') return settings.menu_peca_visible;
                if (item.label === 'Aluguel por tamanho') return settings.menu_tamanho_visible;
                if (item.label === 'Aluguel por Eventos') return settings.menu_eventos_visible;
                if (item.label === 'Nossas Marcas') return settings.menu_marcas_visible;
                return true;
              }).map((item) => (
                item.items ? (
                  <div className="relative group" key={item.label}>
                    <button className="flex items-center gap-1 text-sm font-medium hover:text-on-surface-variant transition-colors py-5">
                      {item.label}
                      <ChevronDown className="w-3 h-3 transition-transform group-hover:rotate-180" />
                    </button>
                    <div className="absolute top-full left-0 hidden group-hover:block bg-surface-container-lowest border border-outline-variant/20 shadow-lg min-w-[220px] max-h-[60vh] overflow-y-auto z-50">
                      <div className="py-2">
                        {item.items.filter(subItem => {
                          const label = typeof subItem === 'string' ? subItem : subItem.label;
                          return !(settings.menu_hidden_items || []).includes(label);
                        }).map((subItem) => {
                          const label = typeof subItem === 'string' ? subItem : subItem.label;
                          const to = typeof subItem === 'object' && subItem.path
                            ? subItem.path
                            : `/categoria/${createSlug(label)}`;
                          return (
                            <Link
                              key={label}
                              to={to}
                              className="block px-4 py-2 text-sm text-on-surface hover:bg-surface-container hover:text-primary transition-colors"
                            >
                              {label}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <Link 
                    key={item.label} 
                    to={item.path} 
                    className="text-sm font-medium hover:text-on-surface-variant transition-colors py-5"
                  >
                    {item.label}
                  </Link>
                )
              ))}
            </div>

            {/* Desktop: right icons */}
            <div className="hidden lg:flex items-center gap-2">
              <button
                onClick={() => setIsSearchOpen(true)}
                className="p-2 text-on-surface hover:bg-surface-container rounded-full transition-colors"
                aria-label="Buscar"
              >
                <Search className="w-5 h-5" />
              </button>
              <Link to={getAccountLink()} className="p-2 text-on-surface hover:bg-surface-container rounded-full transition-colors">
                <User className="w-5 h-5" />
              </Link>
              <Link to="/favoritos" className="p-2 text-on-surface hover:bg-surface-container rounded-full transition-colors relative">
                <Heart className="w-5 h-5" />
                {wishlist.length > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full"></span>
                )}
              </Link>
              <button 
                onClick={() => setIsCartOpen(true)}
                className="p-2 text-on-surface hover:bg-surface-container rounded-full transition-colors relative"
              >
                <ShoppingBag className="w-5 h-5" />
                {totalItems > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full"></span>
                )}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay (slide from right) */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
          <div className="fixed inset-y-0 right-0 w-full max-w-xs bg-surface-container-lowest shadow-xl flex flex-col overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-outline-variant/20">
              <span className="font-headline italic text-xl">Menu</span>
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 hover:bg-surface-container rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 py-4">
              {MENU_ITEMS.filter(item => {
                if (item.label === 'Aluguel por Peça') return settings.menu_peca_visible;
                if (item.label === 'Aluguel por tamanho') return settings.menu_tamanho_visible;
                if (item.label === 'Aluguel por Eventos') return settings.menu_eventos_visible;
                if (item.label === 'Nossas Marcas') return settings.menu_marcas_visible;
                return true;
              }).map((item) => (
                <div key={item.label} className="border-b border-outline-variant/10 last:border-0">
                  {item.items ? (
                    <div>
                      <button 
                        onClick={() => toggleMobileDropdown(item.label)}
                        className="flex items-center justify-between w-full px-4 py-4 text-left font-medium"
                      >
                        {item.label}
                        <ChevronDown className={`w-4 h-4 transition-transform ${openMobileDropdown === item.label ? 'rotate-180' : ''}`} />
                      </button>
                      {openMobileDropdown === item.label && (
                        <div className="bg-surface-container/30 px-4 py-2 space-y-1">
                          {item.items.filter(subItem => {
                            const label = typeof subItem === 'string' ? subItem : subItem.label;
                            return !(settings.menu_hidden_items || []).includes(label);
                          }).map((subItem) => {
                            const label = typeof subItem === 'string' ? subItem : subItem.label;
                            const to = typeof subItem === 'object' && subItem.path
                              ? subItem.path
                              : `/categoria/${createSlug(label)}`;
                            return (
                              <Link
                                key={label}
                                to={to}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="block py-2 text-sm text-on-surface-variant hover:text-on-surface"
                              >
                                {label}
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ) : (
                    <Link 
                      to={item.path} 
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block px-4 py-4 font-medium"
                    >
                      {item.label}
                    </Link>
                  )}
                </div>
              ))}
            </div>

            {/* Conta no menu móvel */}
            <div className="border-t border-outline-variant/20 p-4 space-y-2">
              <Link
                to={getAccountLink()}
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-surface-container transition-colors"
              >
                <User className="w-5 h-5" />
                <span className="text-sm font-medium">Minha Conta</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-grow pb-16 lg:pb-0">
        <Outlet />
      </main>

      <CartDrawer />
      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

      {/* Footer */}
      <footer className="hidden lg:block bg-white pt-16 pb-8 border-t border-outline-variant/20 font-light mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center">
          
          {!location.pathname.startsWith('/admin') && (
            <>
              <div className="max-w-md w-full mb-16">
                <h4 className="font-medium mb-6 text-sm">Se inscreva em nossa newsletter</h4>
                <form className="relative flex items-center border-b border-black pb-2" onSubmit={(e) => e.preventDefault()}>
                  <input 
                    type="email" 
                    placeholder="E-mail" 
                    className="w-full bg-transparent text-sm focus:outline-none focus:ring-0 placeholder-gray-500"
                  />
                  <button type="submit" className="absolute right-0 text-black hover:text-gray-600 transition-colors">
                    <span className="block">&rarr;</span>
                  </button>
                </form>
              </div>

              <div className="flex flex-wrap justify-center items-center gap-3 mb-8">
                <img src="https://upload.wikimedia.org/wikipedia/commons/f/fa/American_Express_logo_%282018%29.svg" className="h-5 object-contain" alt="Amex" title="American Express" />
                <img src="https://upload.wikimedia.org/wikipedia/commons/a/a6/Diners_Club_Logo3.svg" className="h-5 object-contain" alt="Diners" title="Diners Club" />
                <img src="https://upload.wikimedia.org/wikipedia/commons/d/da/Elo_card_association_logo_-_black_text.svg" className="h-5 object-contain" alt="Elo" title="Elo" />
                <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" className="h-5 object-contain" alt="Mastercard" title="Mastercard" />
                <img src="https://upload.wikimedia.org/wikipedia/commons/5/5c/Visa_Inc._logo_%282021%E2%80%93present%29.svg" className="h-4 object-contain" alt="Visa" title="Visa" />
              </div>
            </>
          )}

          <div className="w-full mt-12 pt-8 border-t border-outline-variant/10 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-[10px] text-gray-500 flex flex-col md:flex-row items-center gap-2 md:gap-4 order-2 md:order-1">
               <span>© {new Date().getFullYear()}, Clothing 2 rent</span>
               <span className="hidden md:inline">-</span>
               <Link to="/politica-de-privacidade" className="hover:underline">Política de privacidade</Link>
               <span className="hidden md:inline">-</span>
               <Link to="/politica-de-reembolso" className="hover:underline">Política de reembolso</Link>
               <span className="hidden md:inline">-</span>
               <Link to="/termos-de-uso" className="hover:underline">Termos de serviço</Link>
            </div>

            <a 
              href="https://siteesite.com.br/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 group order-1 md:order-2 hover:opacity-80 transition-opacity"
              title="Site & Site - Desenvolvimento Web"
            >
              <span className="text-[9px] uppercase tracking-widest text-gray-400 font-medium">Desenvolvido por</span>
              <div className="flex items-center">
                <span className="font-black text-xl bg-gradient-to-r from-[#4A6CF7] via-[#9B51E0] to-[#E84393] bg-clip-text text-transparent tracking-tighter">
                  Site & Site
                </span>
              </div>
            </a>

            {/* WhatsApp Link no Rodapé */}
            {settings.whatsapp_number && (
              <a 
                href={`https://wa.me/${String(settings.whatsapp_number).replace(/\D/g, '')}${settings.whatsapp_message ? `?text=${encodeURIComponent(settings.whatsapp_message)}` : ''}`}
                target={settings.whatsapp_new_tab ? "_blank" : "_self"}
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest text-emerald-600 hover:text-emerald-700 transition-colors order-3 md:order-3"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                Fale conosco via WhatsApp
              </a>
            )}
          </div>

        </div>
      </footer>

        {settings.whatsapp_number && (
          <a 
            href={`https://wa.me/${String(settings.whatsapp_number).replace(/\D/g, '')}${settings.whatsapp_message ? `?text=${encodeURIComponent(settings.whatsapp_message)}` : ''}`} 
            target={settings.whatsapp_new_tab ? "_blank" : "_self"} 
            rel="noopener noreferrer"
            className="fixed bottom-[calc(4rem+1.5rem)] lg:bottom-6 right-6 bg-[#25D366] text-white p-3 rounded-full shadow-lg hover:scale-110 transition-transform z-40 flex items-center justify-center cursor-pointer md:bottom-6"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
            </svg>
          </a>
        )}

      {/* ===== MOBILE BOTTOM NAVIGATION ===== */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-white border-t border-gray-200 shadow-[0_-2px_12px_rgba(0,0,0,0.08)]">
        <div className="flex items-center justify-around h-16">

          {/* Home */}
          <Link
            to="/"
            className={`flex flex-col items-center justify-center gap-0.5 px-3 py-1 rounded-xl transition-colors ${
              isActive('/') ? 'text-black' : 'text-gray-400 hover:text-gray-700'
            }`}
          >
            <Home className="w-5 h-5" strokeWidth={isActive('/') ? 2.5 : 1.5} />
            <span className="text-[10px] font-medium">Home</span>
          </Link>

          {/* Busca */}
          <button
            onClick={() => setIsSearchOpen(true)}
            className={`flex flex-col items-center justify-center gap-0.5 px-3 py-1 rounded-xl transition-colors ${
              isSearchOpen ? 'text-black' : 'text-gray-400 hover:text-gray-700'
            }`}
            aria-label="Buscar"
          >
            <Search className="w-5 h-5" strokeWidth={isSearchOpen ? 2.5 : 1.5} />
            <span className="text-[10px] font-medium">Buscar</span>
          </button>

          {/* Favoritos */}
          <Link
            to="/favoritos"
            className={`flex flex-col items-center justify-center gap-0.5 px-3 py-1 rounded-xl relative transition-colors ${
              isActive('/favoritos') ? 'text-black' : 'text-gray-400 hover:text-gray-700'
            }`}
          >
            <div className="relative">
              <Heart className="w-5 h-5" strokeWidth={isActive('/favoritos') ? 2.5 : 1.5} />
              {wishlist.length > 0 && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-black rounded-full"></span>
              )}
            </div>
            <span className="text-[10px] font-medium">Favoritos</span>
          </Link>

          {/* Carrinho */}
          <button
            onClick={() => setIsCartOpen(true)}
            className="flex flex-col items-center justify-center gap-0.5 px-3 py-1 rounded-xl text-gray-400 hover:text-gray-700 transition-colors relative"
          >
            <div className="relative">
              <ShoppingBag className="w-5 h-5" strokeWidth={1.5} />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-black rounded-full"></span>
              )}
            </div>
            <span className="text-[10px] font-medium">Carrinho</span>
          </button>

          {/* Menu */}
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className={`flex flex-col items-center justify-center gap-0.5 px-3 py-1 rounded-xl transition-colors ${
              isMobileMenuOpen ? 'text-black' : 'text-gray-400 hover:text-gray-700'
            }`}
          >
            <Menu className="w-5 h-5" strokeWidth={isMobileMenuOpen ? 2.5 : 1.5} />
            <span className="text-[10px] font-medium">Menu</span>
          </button>

        </div>
      </nav>
    </div>
    </>
  );
}
