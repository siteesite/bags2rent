import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { Navigate, useNavigate } from 'react-router-dom';
import { ShieldCheck, Truck, CreditCard, MapPin, User as UserIcon, Loader2, CheckCircle2, Building2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { TermsModal } from '../components/TermsModal';

const STATE_TO_REGION: Record<string, string> = {
  'AC': 'shipping_north', 'AM': 'shipping_north', 'AP': 'shipping_north', 'PA': 'shipping_north', 'RO': 'shipping_north', 'RR': 'shipping_north', 'TO': 'shipping_north',
  'AL': 'shipping_northeast', 'BA': 'shipping_northeast', 'CE': 'shipping_northeast', 'MA': 'shipping_northeast', 'PB': 'shipping_northeast', 'PE': 'shipping_northeast', 'PI': 'shipping_northeast', 'RN': 'shipping_northeast', 'SE': 'shipping_northeast',
  'DF': 'shipping_central_west', 'GO': 'shipping_central_west', 'MT': 'shipping_central_west', 'MS': 'shipping_central_west',
  'ES': 'shipping_southeast', 'MG': 'shipping_southeast', 'RJ': 'shipping_southeast', 'SP': 'shipping_southeast',
  'PR': 'shipping_south', 'RS': 'shipping_south', 'SC': 'shipping_south'
};

const REGION_LABELS: Record<string, string> = {
  'shipping_north': 'Região Norte',
  'shipping_northeast': 'Região Nordeste',
  'shipping_central_west': 'Região Centro-Oeste',
  'shipping_southeast': 'Região Sudeste',
  'shipping_south': 'Região Sul'
};

export function Checkout() {
  const { user } = useAuth();
  const { items, subtotal, clearCart } = useCart();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [shippingRates, setShippingRates] = useState<any>(null);
  const [shippingMethod, setShippingMethod] = useState<'delivery' | 'pickup'>('delivery');
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [shippingInfo, setShippingInfo] = useState<{ price: number; days: number } | null>(null);
  const [paymentOption, setPaymentOption] = useState<'credit_card' | 'pix'>('credit_card');
  const [pixData, setPixData] = useState<{ qr_code: string; qr_code_url: string } | null>(null);

  // Coupon States
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponError, setCouponError] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);

  // Form States
  const [formData, setFormData] = useState({
    fullName: '',
    cpf: '',
    phone: '',
    cep: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    cardName: '',
    cardNumber: '',
    cardExpiry: '',
    cardExpMonth: '',
    cardExpYear: '',
    cardCvv: '',
    installments: '1'
  });

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

  useEffect(() => {
    if (user) {
      // 1. Pre-fill name from auth if empty
      if (!formData.fullName) {
        const isEmailBased = user.name.includes('@') || user.name === 'Usuário' || !user.name.includes(' ');
        setFormData(prev => ({ 
          ...prev, 
          fullName: isEmailBased ? '' : user.name 
        }));
      }

      // 2. Fetch detailed customer data from 'customers' table
      const fetchCustomerData = async () => {
        const { data, error } = await supabase
          .from('customers')
          .select('*')
          .eq('email', user.email)
          .maybeSingle();

        if (data && !error) {
          const addr = data.default_address || {};
          setFormData(prev => ({
            ...prev,
            fullName: prev.fullName || `${data.first_name || ''} ${data.last_name || ''}`.trim(),
            cpf: data.cpf || prev.cpf,
            phone: data.phone || prev.phone,
            cep: addr.zip || prev.cep,
            street: addr.street || prev.street,
            number: addr.number || prev.number,
            complement: addr.complement || prev.complement,
            neighborhood: addr.neighborhood || prev.neighborhood,
            city: addr.city || prev.city,
            state: addr.state || prev.state
          }));
        }
      };
      
      fetchCustomerData();
    }
  }, [user]);

  useEffect(() => {
    if (formData.state && shippingRates) {
      if (shippingMethod === 'pickup' && formData.state === 'SP') {
        setShippingInfo({
          price: 0,
          days: 0
        });
      } else {
        const region = STATE_TO_REGION[formData.state];
        if (region) {
          const priceKey = region;
          const daysKey = region.replace('shipping_', 'delivery_');
          setShippingInfo({
            price: Number(shippingRates[priceKey]) || 0,
            days: Number(shippingRates[daysKey]) || 0
          });
        }
      }
    }
  }, [formData.state, shippingMethod, shippingRates]);

  useEffect(() => {
    if (success) {
      window.scrollTo(0, 0);
    }
  }, [success]);
  
  if (items.length === 0 && !success) {
    return <Navigate to="/" />;
  }

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponError('');
    setAppliedCoupon(null);

    try {
      const { data: coupon, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', couponCode.trim().toUpperCase())
        .maybeSingle();

      if (error || !coupon) {
        throw new Error('Cupom inválido ou não encontrado.');
      }

      if (!coupon.is_active) {
        throw new Error('Este cupom não está mais ativo.');
      }

      if (coupon.valid_until && new Date(coupon.valid_until) < new Date()) {
        throw new Error('Este cupom expirou.');
      }

      if (coupon.valid_from && new Date(coupon.valid_from) > new Date()) {
        throw new Error('Este cupom ainda não é válido.');
      }

      if (coupon.min_order_value && subtotal < coupon.min_order_value) {
        throw new Error(`O valor mínimo para usar este cupom é ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(coupon.min_order_value)}.`);
      }

      if (coupon.max_uses && coupon.uses_count >= coupon.max_uses) {
        throw new Error('Este cupom atingiu o limite máximo de usos.');
      }

      setAppliedCoupon(coupon);
      setCouponCode('');
    } catch (err: any) {
      setCouponError(err.message);
    } finally {
      setCouponLoading(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponError('');
  };

  const discountAmount = appliedCoupon 
    ? (appliedCoupon.discount_type === 'percentage' 
      ? subtotal * (appliedCoupon.discount_value / 100) 
      : appliedCoupon.discount_value)
    : 0;

  const actualShippingPrice = shippingMethod === 'pickup' || appliedCoupon?.free_shipping 
    ? 0 
    : (shippingInfo?.price || 0);

  const finalTotal = Math.max(0, subtotal - discountAmount) + actualShippingPrice;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let formattedValue = value;

    if (name === 'cardNumber') {
      formattedValue = value.replace(/\D/g, '').replace(/(\d{4})(?=\d)/g, '$1 ').substring(0, 19);
    } else if (name === 'cpf') {
      formattedValue = value.replace(/\D/g, '').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})/, '$1-$2').substring(0, 14);
    } else if (name === 'phone') {
      const numbers = value.replace(/\D/g, '');
      if (numbers.length <= 10) {
        formattedValue = numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
      } else {
        formattedValue = numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
      }
      formattedValue = formattedValue.substring(0, 15);
    } else if (name === 'cep') {
      formattedValue = value.replace(/\D/g, '').replace(/(\d{5})(\d)/, '$1-$2').substring(0, 9);
    }

    setFormData(prev => ({ ...prev, [name]: formattedValue }));

    // Auto-fill CEP
    if (name === 'cep' && formattedValue.replace(/\D/g, '').length === 8) {
      fetchAddress(formattedValue);
    }
  };

  const fetchAddress = async (cep: string) => {
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep.replace(/\D/g, '')}/json/`);
      const data = await response.json();
      if (!data.erro) {
        setFormData(prev => ({
          ...prev,
          street: data.logradouro,
          neighborhood: data.bairro,
          city: data.localidade,
          state: data.uf
        }));
      }
    } catch (e) {
      console.error('ViaCEP Error', e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const orderName = `C2R-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      
      let paymentData = {};

      if (paymentOption === 'credit_card') {
        // Validate card fields
        if (!formData.cardNumber || !formData.cardName || !formData.cardCvv) {
          throw new Error('Por favor, preencha todos os dados do cartão.');
        }

        const cardNumberClean = formData.cardNumber.replace(/\D/g, '');
        const cardExpMonth = formData.cardExpMonth || '';
        const cardExpYear = formData.cardExpYear || '';

        if (cardNumberClean.length < 13) {
          throw new Error('Número do cartão inválido.');
        }
        if (!cardExpMonth || !cardExpYear) {
          throw new Error('Data de expiração do cartão inválida.');
        }

        const cleanCvv = String(formData.cardCvv).trim();
        console.log('[Checkout] Pre-processing card data...', { 
          hasCvv: !!cleanCvv, 
          cvvLength: cleanCvv.length 
        });

        // Send raw card data to Edge Function (server-side tokenization avoids CORS)
        paymentData = {
          payment_method: 'credit_card',
          card: {
            number: cardNumberClean,
            holder_name: formData.cardName.toUpperCase().trim(),
            exp_month: parseInt(cardExpMonth),
            exp_year: parseInt(cardExpYear.length === 2 ? '20' + cardExpYear : cardExpYear),
            cvv: cleanCvv
          },
          installments: parseInt(formData.installments)
        };
      } else {
        paymentData = {
          payment_method: 'pix'
        };
      }

      const cpfClean = formData.cpf.replace(/\D/g, "");
      const phoneClean = formData.phone.replace(/\D/g, "");
      const fullName = formData.fullName.trim();

      if (fullName.split(" ").length < 2) {
        throw new Error("Por favor, insira seu nome completo (Nome e Sobrenome).");
      }
      if (cpfClean.length !== 11) {
        throw new Error("CPF inválido. Certifique-se de inserir os 11 dígitos.");
      }
      if (phoneClean.length < 10) {
        throw new Error("Telefone inválido. Certifique-se de inserir o DDD e o número.");
      }

      // Get client IP for antifraud
      let clientIp = '127.0.0.1';
      try {
        const ipRes = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipRes.json();
        clientIp = ipData.ip;
      } catch (e) {
        console.warn('Could not fetch IP, using default');
      }

      const { data: response, error: paymentError } = await supabase.functions.invoke('process-payment', {
        body: {
          order_name: orderName,
          customer: {
            name: fullName,
            email: user?.email,
            cpf: cpfClean,
            phone: phoneClean
          },
          address: {
            street: formData.street,
            number: formData.number,
            neighborhood: formData.neighborhood,
            city: formData.city,
            state: formData.state,
            zip: formData.cep
          },
          items: items.map(i => ({
            id: i.product_id, // Usar o ID real do produto para o Asaas/DB
            cart_item_id: i.id, // ID único do carrinho para referência
            name: i.name,
            price: i.price,
            quantity: i.quantity || 1,
            size: i.size,
            color: i.color,
            period: i.period,
            dates: i.dates
          })),
          amount: finalTotal,
          payment: {
            ...paymentData,
            remoteIp: clientIp
          }
        }
      });

      if (paymentError || response?.error) {
        if (paymentError) {
          console.error('Erro detalhado da função:', paymentError);
          throw new Error(paymentError.message || "Erro ao processar pagamento.");
        }

        if (response && !response.success) {
          console.error('Erro retornado pela função:', response.error);
          throw new Error(response.error);
        }
      }

      if (paymentOption === 'pix') {
        setPixData({
          qr_code: response.pix_qr_code,
          qr_code_url: response.pix_qr_code_url
        });
      }

      // Insert Rentals
      const rentalInserts = items.map(item => {
        return {
          product_id: item.product_id,
          user_id: user?.id,
          start_date: item.startDate || new Date().toISOString().split('T')[0],
          end_date: item.endDate || new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0],
          status: paymentOption === 'pix' ? 'pending' : 'confirmed',
          total_price: item.price,
          order_name: orderName
        };
      });

      const { error: rentalsError } = await supabase
        .from('rentals')
        .insert(rentalInserts);

      if (rentalsError) throw rentalsError;

      // Increment coupon uses count
      if (appliedCoupon) {
        await supabase
          .from('coupons')
          .update({ uses_count: appliedCoupon.uses_count + 1 })
          .eq('id', appliedCoupon.id);
      }

      // Send Confirmation Email
      try {
        await supabase.functions.invoke('send-email', {
          body: {
            to: user?.email,
            template_type: 'order_created',
            variables: {
              customer_name: fullName,
              order_id: orderName,
              total_amount: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(finalTotal)
            }
          }
        });
      } catch (emailErr) {
        console.error('Error triggering email:', emailErr);
      }

      // Update user profile with full name if it's new
      if (user && fullName !== user.name) {
        await supabase.auth.updateUser({
          data: { full_name: fullName }
        });
      }

      // 8. Update/Create entry in 'customers' table for future persistence
      if (user?.email) {
        const [firstName, ...lastNames] = fullName.split(' ');
        const lastName = lastNames.join(' ');
        
        await supabase.from('customers').upsert({
          email: user.email,
          first_name: firstName,
          last_name: lastName,
          phone: phoneClean,
          cpf: cpfClean,
          default_address: {
            zip: formData.cep,
            street: formData.street,
            number: formData.number,
            complement: formData.complement,
            neighborhood: formData.neighborhood,
            city: formData.city,
            state: formData.state,
            name: fullName
          }
        }, { onConflict: 'email' });
      }

      setSuccess(true);
      clearCart();
    } catch (err: any) {
      console.error('Erro ao processar pedido:', err);
      const msg = err?.message || 'Ocorreu um erro ao processar seu pedido. Por favor, tente novamente.';
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center bg-surface px-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full text-center space-y-6"
        >
          <div className="flex justify-center">
            <CheckCircle2 className="w-20 h-20 text-emerald-500" />
          </div>
          <h2 className="font-headline italic text-4xl">{paymentOption === 'pix' ? 'Pagamento Pendente' : 'Pedido Realizado!'}</h2>
          
          {paymentOption === 'pix' && pixData && (
            <div className="bg-surface-container-lowest p-8 border border-outline-variant/20 rounded shadow-sm space-y-6">
              <p className="text-sm font-medium">Escaneie o QR Code abaixo para pagar via PIX:</p>
              <div className="flex justify-center">
                <img src={pixData.qr_code} alt="QR Code PIX" className="w-48 h-48" />
              </div>
              <div className="space-y-4">
                <p className="text-xs text-on-surface-variant font-light break-all p-3 bg-surface-container rounded border border-outline-variant/10">
                  {pixData.qr_code_url}
                </p>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(pixData.qr_code_url);
                    alert('Código Copiado!');
                  }}
                  className="text-xs font-bold text-primary hover:underline"
                >
                  COPIAR CÓDIGO PIX
                </button>
              </div>
              <div className="pt-4 border-t border-outline-variant/20 text-[10px] text-on-surface-variant italic">
                O pagamento é processado instantaneamente. Após a confirmação, sua reserva será ativada.
              </div>
            </div>
          )}

          <p className="text-on-surface-variant font-light">
            {paymentOption === 'pix' 
              ? 'Realize o pagamento para confirmar sua reserva. As instruções também foram enviadas para o seu e-mail.'
              : 'Sua reserva foi confirmada. Você receberá os detalhes do aluguel e as instruções de entrega no seu e-mail.'
            }
          </p>
          <button 
            onClick={() => navigate('/minha-conta')}
            className="w-full bg-on-surface text-surface py-4 text-xs font-bold uppercase tracking-[0.2em] hover:bg-on-surface-variant transition-all"
          >
            Acompanhar Pedido
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="bg-surface min-h-screen py-6 lg:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-16">
          
          {/* Checkout Form (Left) */}
          <div className="flex-grow space-y-12 order-last lg:order-first">
            <div>
              <h1 className="font-headline italic text-4xl mb-2">Finalizar Aluguel</h1>
              <p className="text-sm text-on-surface-variant font-light">Complete seus dados para garantir sua reserva.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-12">
              {/* Personal Data */}
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <UserIcon className="w-5 h-5 text-primary" />
                  <h3 className="font-label uppercase tracking-widest text-xs font-bold">1. Dados Pessoais</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-widest text-on-surface-variant ml-1">E-mail</label>
                    <input 
                      type="email" 
                      value={user?.email} 
                      disabled 
                      className="w-full border-0 border-b border-outline-variant bg-surface-container/30 px-3 py-3 text-sm opacity-60"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-widest text-on-surface-variant ml-1">Nome Completo</label>
                    <input 
                      type="text" 
                      name="fullName"
                      required
                      placeholder="Seu Nome e Sobrenome"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      className="w-full border-0 border-b border-outline-variant bg-transparent px-3 py-3 text-sm focus:border-primary focus:ring-0 transition-all font-medium"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-widest text-on-surface-variant ml-1">CPF</label>
                    <input 
                      type="text" 
                      name="cpf"
                      required
                      placeholder="000.000.000-00"
                      value={formData.cpf}
                      onChange={handleInputChange}
                      className="w-full border-0 border-b border-outline-variant bg-transparent px-3 py-3 text-sm focus:border-primary focus:ring-0 transition-all font-medium"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-widest text-on-surface-variant ml-1">Telefone WhatsApp</label>
                    <input 
                      type="tel" 
                      name="phone"
                      required
                      placeholder="(11) 99999-9999"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full border-0 border-b border-outline-variant bg-transparent px-3 py-3 text-sm focus:border-primary focus:ring-0 transition-all font-medium"
                    />
                  </div>
                </div>
              </section>

              {/* Delivery Address */}
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <MapPin className="w-5 h-5 text-primary" />
                  <h3 className="font-label uppercase tracking-widest text-xs font-bold">2. Endereço de Entrega</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-[10px] uppercase tracking-widest text-on-surface-variant ml-1">CEP</label>
                    <input 
                      type="text" 
                      name="cep"
                      required
                      placeholder="00000-000"
                      value={formData.cep}
                      onChange={handleInputChange}
                      className="w-full border-0 border-b border-outline-variant bg-transparent px-3 py-3 text-sm focus:border-primary focus:ring-0 transition-all"
                    />
                  </div>
                  <div className="md:col-span-4 space-y-1">
                    <label className="text-[10px] uppercase tracking-widest text-on-surface-variant ml-1">Logradouro / Rua</label>
                    <input 
                      type="text" 
                      name="street"
                      required
                      value={formData.street}
                      onChange={handleInputChange}
                      className="w-full border-0 border-b border-outline-variant bg-transparent px-3 py-3 text-sm focus:border-primary focus:ring-0 transition-all"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-[10px] uppercase tracking-widest text-on-surface-variant ml-1">Número</label>
                    <input 
                      type="text" 
                      name="number"
                      required
                      value={formData.number}
                      onChange={handleInputChange}
                      className="w-full border-0 border-b border-outline-variant bg-transparent px-3 py-3 text-sm focus:border-primary focus:ring-0 transition-all"
                    />
                  </div>
                  <div className="md:col-span-4 space-y-1">
                    <label className="text-[10px] uppercase tracking-widest text-on-surface-variant ml-1">Complemento / Bairro</label>
                    <input 
                      type="text" 
                      name="neighborhood"
                      value={formData.neighborhood}
                      onChange={handleInputChange}
                      className="w-full border-0 border-b border-outline-variant bg-transparent px-3 py-3 text-sm focus:border-primary focus:ring-0 transition-all"
                    />
                  </div>
                  <div className="md:col-span-3 space-y-1">
                    <label className="text-[10px] uppercase tracking-widest text-on-surface-variant ml-1">Cidade</label>
                    <input 
                      type="text" 
                      name="city"
                      required
                      value={formData.city}
                      onChange={handleInputChange}
                      className="w-full border-0 border-b border-outline-variant bg-transparent px-3 py-3 text-sm focus:border-primary focus:ring-0 transition-all"
                    />
                  </div>
                  <div className="md:col-span-3 space-y-1">
                    <label className="text-[10px] uppercase tracking-widest text-on-surface-variant ml-1">Estado</label>
                    <input 
                      type="text" 
                      name="state"
                      required
                      maxLength={2}
                      value={formData.state}
                      onChange={handleInputChange}
                      placeholder="SP"
                      className="w-full border-0 border-b border-outline-variant bg-transparent px-3 py-3 text-sm focus:border-primary focus:ring-0 transition-all"
                    />
                  </div>
                </div>

                {/* Shipping Method Selection */}
                {formData.state === 'SP' && (
                  <div className="mt-8 space-y-4 p-6 bg-surface-container-lowest border border-outline-variant/10">
                    <div className="flex items-center gap-2 mb-4 p-2 bg-primary/5 w-fit rounded">
                      <Truck className="w-3 h-3 text-primary" />
                      <h4 className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">Opções de Frete</h4>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4">
                      <button
                        type="button"
                        onClick={() => setShippingMethod('delivery')}
                        className={`flex-1 flex items-center justify-between p-4 border transition-all ${
                          shippingMethod === 'delivery' ? 'border-primary bg-primary/5' : 'border-outline-variant/20 hover:border-outline-variant'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Truck className={`w-4 h-4 ${shippingMethod === 'delivery' ? 'text-primary' : 'text-on-surface-variant'}`} />
                          <div className="text-left">
                            <span className="text-xs font-bold block">Entrega</span>
                            <span className="text-[10px] text-on-surface-variant italic">Transportadora</span>
                          </div>
                        </div>
                        {shippingMethod === 'delivery' && <CheckCircle2 className="w-4 h-4 text-primary" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => setShippingMethod('pickup')}
                        className={`flex-1 flex items-center justify-between p-4 border transition-all ${
                          shippingMethod === 'pickup' ? 'border-primary bg-primary/5' : 'border-outline-variant/20 hover:border-outline-variant'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Building2 className={`w-4 h-4 ${shippingMethod === 'pickup' ? 'text-primary' : 'text-on-surface-variant'}`} />
                          <div className="text-left">
                            <span className="text-xs font-bold block">Retirada na Loja</span>
                            <span className="text-[10px] text-primary italic">São Paulo - SP (Grátis)</span>
                          </div>
                        </div>
                        {shippingMethod === 'pickup' && <CheckCircle2 className="w-4 h-4 text-primary" />}
                      </button>
                    </div>
                  </div>
                )}
              </section>

              {/* Payment Data */}
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <CreditCard className="w-5 h-5 text-primary" />
                  <h3 className="font-label uppercase tracking-widest text-xs font-bold">3. Método de Pagamento</h3>
                </div>

                <div className="flex gap-4 mb-8">
                  <button
                    type="button"
                    onClick={() => setPaymentOption('credit_card')}
                    className={`flex-1 flex items-center justify-center gap-3 p-4 border transition-all ${
                      paymentOption === 'credit_card' ? 'border-primary bg-primary/5' : 'border-outline-variant/20 hover:border-outline-variant'
                    }`}
                  >
                    <CreditCard className={`w-4 h-4 ${paymentOption === 'credit_card' ? 'text-primary' : 'text-on-surface-variant'}`} />
                    <span className="text-xs font-bold uppercase tracking-wider">Cartão de Crédito</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentOption('pix')}
                    className={`flex-1 flex items-center justify-center gap-3 p-4 border transition-all ${
                      paymentOption === 'pix' ? 'border-primary bg-primary/5' : 'border-outline-variant/20 hover:border-outline-variant'
                    }`}
                  >
                    <svg viewBox="0 0 512 512" className={`w-4 h-4 fill-current ${paymentOption === 'pix' ? 'text-primary' : 'text-on-surface-variant'}`}>
                      <path d="M242.4 292.5c1.2 1.2 3.1 1.2 4.3 0l7.5-7.5c1.2-1.2 1.2-3.1 0-4.3L193 221c-1.2-1.2-3.1-1.2-4.3 0l-7.5 7.5c-1.2 1.2-1.2 3.1 0 4.3l61.2 59.7zm33.5-62.1c-1.2-1.2-3.1-1.2-4.3 0l-7.5 7.5c-1.2 1.2-1.2 3.1 0 4.3l61.2 59.7c1.2 1.2 3.1 1.2 4.3 0l7.5-7.5c1.2-1.2 1.2-3.1 0-4.3L275.9 230.4zm-19.1-19.1c-1.2-1.2-3.1-1.2-4.3 0l-7.5 7.5c-1.2 1.2-1.2 3.1 0 4.3l12.4 12.1c1.2 1.2 3.1 1.2 4.3 0l7.5-7.5c1.2-1.2 1.2-3.1 0-4.3l-12.4-12.1zM512 256c0 141.4-114.6 256-256 256S0 397.4 0 256 114.6 0 256 0s256 114.6 256 256zM256 64C150.1 64 64 150.1 64 256s86.1 192 192 192 192-86.1 192-192S361.9 64 256 64z"/>
                    </svg>
                    <span className="text-xs font-bold uppercase tracking-wider">PIX à Vista</span>
                  </button>
                </div>

                {paymentOption === 'pix' ? (
                  <div className="bg-surface-container-lowest p-8 border border-outline-variant/20 rounded shadow-sm text-center space-y-4">
                    <div className="flex justify-center mb-2">
                      <div className="bg-emerald-500/10 p-3 rounded-full">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                      </div>
                    </div>
                    <h4 className="font-medium text-sm">PIX disponível para este pedido</h4>
                    <p className="text-xs text-on-surface-variant leading-relaxed max-w-sm mx-auto">
                      Ao selecionar PIX, você receberá um QR Code para pagamento. A reserva é confirmada instantaneamente após a transação.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 bg-surface-container-lowest p-8 border border-outline-variant/20 rounded shadow-sm">
                    <div className="space-y-1 md:col-span-4">
                      <label className="text-[10px] uppercase tracking-widest text-on-surface-variant ml-1">Nome no Cartão</label>
                        <input 
                          type="text" 
                          name="cardName"
                          required={paymentOption === 'credit_card'}
                          placeholder="Como está impresso no cartão"
                          value={formData.cardName}
                          onChange={handleInputChange}
                          className="w-full border-0 border-b border-outline-variant bg-transparent px-0 py-3 text-sm focus:border-primary focus:ring-0 transition-all font-medium"
                        />
                      </div>
                      <div className="space-y-1 md:col-span-4">
                        <label className="text-[10px] uppercase tracking-widest text-on-surface-variant ml-1">Número do Cartão</label>
                        <input 
                          type="text" 
                          name="cardNumber"
                          required={paymentOption === 'credit_card'}
                          placeholder="0000 0000 0000 0000"
                          value={formData.cardNumber}
                          onChange={handleInputChange}
                          className="w-full border-0 border-b border-outline-variant bg-transparent px-0 py-3 text-sm focus:border-primary focus:ring-0 transition-all font-medium"
                        />
                      </div>
                      <div className="space-y-1 md:col-span-1">
                        <label className="text-[10px] uppercase tracking-widest text-on-surface-variant ml-1">Mês (MM)</label>
                        <input 
                          type="text" 
                          name="cardExpMonth"
                          required={paymentOption === 'credit_card'}
                          placeholder="MM"
                          maxLength={2}
                          value={formData.cardExpMonth}
                          onChange={handleInputChange}
                          className="w-full border-0 border-b border-outline-variant bg-transparent px-0 py-3 text-sm focus:border-primary focus:ring-0 transition-all font-medium"
                        />
                      </div>
                      <div className="space-y-1 md:col-span-1">
                        <label className="text-[10px] uppercase tracking-widest text-on-surface-variant ml-1">Ano (AA)</label>
                        <input 
                          type="text" 
                          name="cardExpYear"
                          required={paymentOption === 'credit_card'}
                          placeholder="AA"
                          maxLength={2}
                          value={formData.cardExpYear}
                          onChange={handleInputChange}
                          className="w-full border-0 border-b border-outline-variant bg-transparent px-0 py-3 text-sm focus:border-primary focus:ring-0 transition-all font-medium"
                        />
                      </div>
                      <div className="space-y-1 md:col-span-2">
                        <label className="text-[10px] uppercase tracking-widest text-on-surface-variant ml-1">CVV</label>
                        <input 
                          type="text" 
                          name="cardCvv"
                          required={paymentOption === 'credit_card'}
                          placeholder="123"
                          maxLength={4}
                          value={formData.cardCvv}
                          onChange={handleInputChange}
                          className="w-full border-0 border-b border-outline-variant bg-transparent px-0 py-3 text-sm focus:border-primary focus:ring-0 transition-all font-medium"
                        />
                      </div>
                      <div className="space-y-1 md:col-span-4">
                        <label className="text-[10px] uppercase tracking-widest text-on-surface-variant ml-1">Parcelamento</label>
                        <select 
                          name="installments"
                          value={formData.installments}
                          onChange={(e) => setFormData(prev => ({ ...prev, installments: e.target.value }))}
                          className="w-full border-0 border-b border-outline-variant bg-transparent px-0 py-3 text-sm focus:border-primary focus:ring-0 transition-all font-medium"
                        >
                          <option value="1">1x de {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(finalTotal)} (Sem juros)</option>
                          <option value="2">2x de {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(finalTotal / 2)} (Sem juros)</option>
                          <option value="3">3x de {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(finalTotal / 3)} (Sem juros)</option>
                        </select>
                      </div>
                    </div>
                  )}
                </section>

              {/* Rental Agreement Acceptance */}
              <div className="mb-8 p-6 bg-primary/5 border border-primary/10 rounded flex items-start gap-4">
                <div className="pt-0.5">
                  <input
                    type="checkbox"
                    id="terms-agreement"
                    required
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary transition-all cursor-pointer"
                  />
                </div>
                <label 
                  htmlFor="terms-agreement" 
                  className="text-xs text-on-surface-variant leading-relaxed cursor-pointer"
                >
                  Li e concordo com o{" "}
                  <button
                    type="button"
                    onClick={() => setShowTermsModal(true)}
                    className="text-primary font-bold hover:underline"
                  >
                    Contrato de Locação
                  </button>{" "}
                  da Bags2rent. Declaro ser maior de 18 anos.
                </label>
              </div>

              <button 
                type="submit"
                disabled={loading || !agreedToTerms}
                className="w-full bg-on-surface text-surface py-5 text-sm font-bold uppercase tracking-[0.2em] hover:bg-on-surface-variant transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    Confirmar Aluguel • {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(finalTotal)}
                  </>
                )}
              </button>
            </form>

            <TermsModal 
              isOpen={showTermsModal} 
              onClose={() => setShowTermsModal(false)}
              userData={{
                name: user?.name,
                ...formData
              }}
            />
          </div>

          {/* Sidebar Summary (Right) — first on mobile, right column on desktop */}
          <div className="w-full lg:w-[400px] shrink-0 order-first lg:order-last">
            <div className="bg-surface-container-lowest border border-outline-variant/20 p-6 lg:p-8 lg:sticky lg:top-32">
              <h3 className="font-headline italic text-2xl mb-6">Sua Seleção</h3>
              <div className="space-y-6 mb-8 max-h-[40vh] overflow-y-auto pr-2">
                {items.map(item => (
                  <div key={item.id} className="flex gap-4">
                    <div className="w-20 aspect-[3/4] bg-surface-container-low flex-shrink-0">
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 flex flex-col justify-center">
                      <h4 className="text-sm font-medium leading-tight">{item.name}</h4>
                      <p className="text-[10px] text-on-surface-variant font-light mt-1">
                        Tamanho: {item.size} • {item.period}
                      </p>
                      {item.dates && (
                        <p className="text-[10px] text-primary font-medium mt-0.5 leading-tight">
                          {item.dates}
                        </p>
                      )}
                      <span className="text-xs font-medium mt-2">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-4 pt-6 border-t border-outline-variant/20">
                {/* Coupon Field */}
                <div className="pb-4">
                  <label className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-2 block">Cupom de Desconto</label>
                  {appliedCoupon ? (
                    <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 text-emerald-800">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold uppercase tracking-wider">{appliedCoupon.code}</span>
                        <span className="text-[10px]">
                          {appliedCoupon.discount_type === 'percentage' 
                            ? `${appliedCoupon.discount_value}% de desconto` 
                            : `- R$ ${appliedCoupon.discount_value.toFixed(2).replace('.', ',')}`}
                          {appliedCoupon.free_shipping ? ' + Frete Grátis' : ''}
                        </span>
                      </div>
                      <button 
                        type="button" 
                        onClick={removeCoupon}
                        className="text-emerald-800 hover:text-emerald-900 text-xs font-bold underline"
                      >
                        Remover
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        placeholder="Insira seu cupom"
                        className="flex-1 border border-outline-variant bg-transparent px-3 py-2 text-sm focus:border-primary focus:ring-0 transition-all uppercase tracking-wider font-mono"
                      />
                      <button 
                        type="button"
                        onClick={handleApplyCoupon}
                        disabled={!couponCode.trim() || couponLoading}
                        className="bg-primary text-on-primary px-4 py-2 text-xs font-bold uppercase tracking-widest disabled:opacity-50"
                      >
                        {couponLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Aplicar'}
                      </button>
                    </div>
                  )}
                  {couponError && <p className="text-[10px] text-red-500 mt-1">{couponError}</p>}
                </div>

                <div className="flex justify-between text-sm font-light">
                  <span className="text-on-surface-variant">Subtotal</span>
                  <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm font-light">
                  <span className="text-on-surface-variant">Seguro Higienização</span>
                  <span>Incluso</span>
                </div>
                {appliedCoupon && discountAmount > 0 && (
                  <div className="flex justify-between text-sm font-bold text-emerald-600">
                    <span>Desconto ({appliedCoupon.code})</span>
                    <span>- {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(discountAmount)}</span>
                  </div>
                )}
                {shippingInfo ? (
                  <div className="flex justify-between text-sm font-light py-2 border-y border-outline-variant/10">
                    <div className="flex flex-col">
                      <span className="text-on-surface-variant flex items-center gap-2">
                        {shippingMethod === 'pickup' ? (
                          <>
                            <Building2 className="w-3 h-3" />
                            Retirada na Loja
                          </>
                        ) : (
                          <>
                            <Truck className="w-3 h-3" />
                            {REGION_LABELS[STATE_TO_REGION[formData.state]] || 'Frete'}
                          </>
                        )}
                      </span>
                      <span className="text-[10px] text-primary italic">
                        {shippingMethod === 'pickup' ? 'Pronto para retirar em 2h' : `Chega em até ${shippingInfo.days} dias úteis`}
                      </span>
                    </div>
                    <span className={`font-medium ${appliedCoupon?.free_shipping && shippingMethod !== 'pickup' ? 'text-emerald-600 line-through' : ''}`}>
                      {shippingInfo.price === 0 ? 'Grátis' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(shippingInfo.price)}
                    </span>
                    {appliedCoupon?.free_shipping && shippingMethod !== 'pickup' && (
                      <span className="font-bold text-emerald-600 block text-right">Grátis</span>
                    )}
                  </div>
                ) : (
                  <div className="flex justify-between text-[11px] font-light py-3 border-y border-outline-variant/5 text-on-surface-variant/60 italic">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3 h-3" />
                      Aguardando CEP para calcular frete...
                    </div>
                  </div>
                )}
                <div className="flex justify-between text-lg font-medium pt-2">
                  <span>Total</span>
                  <span className="font-headline italic text-2xl text-primary">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(finalTotal)}
                  </span>
                </div>
              </div>

              <div className="mt-8 space-y-4">
                <div className="flex items-center gap-3 text-xs text-on-surface-variant bg-surface-container/30 p-3">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Ambiente de pagamento criptografado</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-on-surface-variant bg-surface-container/30 p-3">
                  <Truck className="w-4 h-4 text-primary" />
                  <span>Entrega e devolução garantidas</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
