import { Link } from 'react-router-dom';
import { X, ArrowRight, ShieldCheck, Truck } from 'lucide-react';
import { motion } from 'motion/react';

export function Cart() {
  return (
    <div className="bg-surface min-h-screen">
      {/* Page Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="font-headline italic text-4xl mb-2">Sua Seleção</h1>
        <p className="text-sm text-on-surface-variant font-light">
          Revise os itens antes de prosseguir para o pagamento.
        </p>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="flex flex-col lg:flex-row gap-16">
          
          {/* Items List (Left) */}
          <div className="w-full lg:w-[60%]">
            <div className="border-t border-outline-variant/20">
              
              {/* Item 1 */}
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-6 py-8 border-b border-outline-variant/20 relative"
              >
                <button className="absolute top-8 right-0 text-on-surface-variant hover:text-red-500 transition-colors">
                  <X className="w-5 h-5" />
                </button>
                <div className="w-32 aspect-[3/4] bg-surface-container-low flex-shrink-0">
                  <img 
                    src="https://images.unsplash.com/photo-1595777457583-95e059d581b8?q=80&w=2883&auto=format&fit=crop" 
                    alt="Vestido Longo Seda" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="flex flex-col justify-between py-2 w-full pr-8">
                  <div>
                    <span className="font-label uppercase tracking-widest text-[10px] text-on-surface-variant mb-1 block">Saint Laurent</span>
                    <h3 className="font-headline italic text-2xl mb-2">Vestido Longo Seda</h3>
                    <div className="text-sm font-light text-on-surface-variant space-y-1">
                      <p>Tamanho: P</p>
                      <p>Período: 4 Dias</p>
                      <p>Data: 15/10 - 19/10</p>
                    </div>
                  </div>
                  <div className="text-lg font-medium mt-4">
                    R$ 450
                  </div>
                </div>
              </motion.div>

              {/* Item 2 */}
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="flex gap-6 py-8 border-b border-outline-variant/20 relative"
              >
                <button className="absolute top-8 right-0 text-on-surface-variant hover:text-red-500 transition-colors">
                  <X className="w-5 h-5" />
                </button>
                <div className="w-32 aspect-[3/4] bg-surface-container-low flex-shrink-0">
                  <img 
                    src="https://images.unsplash.com/photo-1584273143981-41c073dfe8f8?q=80&w=2787&auto=format&fit=crop" 
                    alt="Bolsa Classic Flap" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="flex flex-col justify-between py-2 w-full pr-8">
                  <div>
                    <span className="font-label uppercase tracking-widest text-[10px] text-on-surface-variant mb-1 block">Chanel</span>
                    <h3 className="font-headline italic text-2xl mb-2">Classic Flap Mini</h3>
                    <div className="text-sm font-light text-on-surface-variant space-y-1">
                      <p>Tamanho: Único</p>
                      <p>Período: 4 Dias</p>
                      <p>Data: 15/10 - 19/10</p>
                    </div>
                  </div>
                  <div className="text-lg font-medium mt-4">
                    R$ 380
                  </div>
                </div>
              </motion.div>

            </div>
          </div>

          {/* Order Summary (Right) */}
          <div className="w-full lg:w-[40%]">
            <div className="bg-surface-container-lowest p-8 sticky top-24 border border-outline-variant/20">
              <h2 className="font-headline italic text-2xl mb-6">Resumo do Pedido</h2>
              
              <div className="space-y-4 mb-8 border-b border-outline-variant/20 pb-8">
                <div className="flex justify-between text-sm font-light">
                  <span className="text-on-surface-variant">Subtotal (2 itens)</span>
                  <span>R$ 830</span>
                </div>
                <div className="flex justify-between text-sm font-light">
                  <span className="text-on-surface-variant">Seguro Proteção Básica</span>
                  <span>Incluso</span>
                </div>
                <div className="flex justify-between text-sm font-light">
                  <span className="text-on-surface-variant">Frete (Entrega & Coleta)</span>
                  <span>R$ 45</span>
                </div>
              </div>

              <div className="flex justify-between items-end mb-8">
                <span className="font-medium">Total</span>
                <span className="font-headline italic text-3xl">R$ 875</span>
              </div>

              {/* Promo Code */}
              <div className="mb-8">
                <label className="font-label uppercase tracking-widest text-[10px] text-on-surface-variant block mb-2">Código Promocional</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Insira o código" 
                    className="flex-grow border border-outline-variant bg-transparent px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <button className="border border-primary text-primary px-6 py-3 text-sm font-medium hover:bg-primary hover:text-on-primary transition-colors">
                    Aplicar
                  </button>
                </div>
              </div>

              {/* Checkout CTA */}
              <button className="w-full bg-primary text-on-primary py-4 font-medium text-sm hover:bg-primary-container transition-colors mb-6 flex items-center justify-center gap-2">
                Finalizar Aluguel <ArrowRight className="w-4 h-4" />
              </button>

              {/* Trust Badges */}
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-xs text-on-surface-variant">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Pagamento 100% seguro via Stripe</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-on-surface-variant">
                  <Truck className="w-4 h-4" />
                  <span>Entrega expressa e coleta agendada</span>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
