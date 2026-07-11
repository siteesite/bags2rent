import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Calendar as CalendarIcon, AlertCircle, Info, CheckCircle2 } from 'lucide-react';
import { DayPicker, DateRange } from 'react-day-picker';
import { format, addDays, subDays, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import 'react-day-picker/dist/style.css';

interface RentalCalculatorProps {
  productId: string;
  pricePerDay: number;
  lateFeePerDay: number;
  minRentalDays?: number;
  maxRentalDays?: number;
  onRentalSimulation: (data: {
    startDate: string;
    endDate: string;
    totalDays: number;
    totalPrice: number;
  } | null) => void;
}

export function RentalCalculator({
  productId,
  pricePerDay,
  lateFeePerDay,
  minRentalDays = 4,
  maxRentalDays = 15,
  onRentalSimulation
}: RentalCalculatorProps) {
  const [range, setRange] = useState<DateRange | undefined>();
  const [occupiedDates, setOccupiedDates] = useState<{ start: Date; end: Date }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [totalDays, setTotalDays] = useState(0);
  const [totalPrice, setTotalPrice] = useState(0);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<{
    rental_min_days: number;
    preparation_days: number;
    late_fee_percentage: number;
    rental_buffer_days: number;
    rental_max_days?: number;
    rental_periods: {
      days: number;
      type: 'fixed' | 'percentage';
      value: number;
      label: string;
    }[];
  } | null>(null);

  // Fetch settings
  useEffect(() => {
    async function fetchSettings() {
      const { data } = await supabase
        .from('public_settings')
        .select('rental_min_days, preparation_days, late_fee_percentage, rental_buffer_days, rental_periods, rental_max_days')
        .eq('id', '00000000-0000-0000-0000-000000000000')
        .single();
      
      if (data) {
        setSettings(data);
      }
    }
    fetchSettings();
  }, []);

  // Fetch occupied dates
  useEffect(() => {
    async function fetchOccupiedDates() {
      if (!productId) return;
      setLoading(true);
      try {
        const { data, error: fetchError } = await supabase
          .from('rentals')
          .select('start_date, end_date')
          .eq('product_id', productId)
          .in('status', ['active', 'confirmed', 'pending']); // Include pending to avoid double booking during checkout

        if (fetchError) throw fetchError;

        if (data) {
          const ranges = data.map(r => ({
            start: startOfDay(new Date(r.start_date + 'T12:00:00')),
            end: startOfDay(new Date(r.end_date + 'T12:00:00'))
          }));
          setOccupiedDates(ranges);
        }
      } catch (err) {
        console.error('Error fetching rentals:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchOccupiedDates();
  }, [productId]);

  // Validation and calculation logic
  useEffect(() => {
    if (!range?.from || !range?.to) {
      setTotalDays(0);
      setTotalPrice(0);
      onRentalSimulation(null);
      setError(null);
      return;
    }

    const start = startOfDay(range.from);
    const end = startOfDay(range.to);

    // 1. Calculate days
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end day

    // 2. Check if any date in the selected range overlaps with occupied dates (including buffer)
    const bufferDays = settings?.rental_buffer_days || 0;
    const isOverlapping = occupiedDates.some(occ => {
      // Expand occupied range by buffer days on both sides
      const bufferedStart = subDays(occ.start, bufferDays);
      const bufferedEnd = addDays(occ.end, bufferDays);
      return (start <= bufferedEnd && end >= bufferedStart);
    });

    if (isOverlapping) {
      setError('O período selecionado contém datas já ocupadas ou em período de preparação entre locações.');
      onRentalSimulation(null);
      return;
    }

    // 3. Min/Max validation
    const effectiveMin = settings?.rental_min_days || minRentalDays;
    if (diffDays < effectiveMin) {
      setError(`O período mínimo é de ${effectiveMin} dias.`);
      onRentalSimulation(null);
      return;
    }

    const effectiveMax = settings?.rental_max_days || maxRentalDays;
    if (diffDays > effectiveMax) {
      setError(`O período máximo é de ${effectiveMax} dias.`);
      onRentalSimulation(null);
      return;
    }

    // 4. Calculate Price
    let calculatedPrice = pricePerDay;
    const rules = settings?.rental_periods || [];
    const applicableRule = [...rules]
      .sort((a, b) => b.days - a.days)
      .find(r => diffDays >= r.days);

    if (applicableRule) {
      if (applicableRule.type === 'fixed') {
        calculatedPrice = pricePerDay + applicableRule.value;
      } else {
        calculatedPrice = pricePerDay * (1 + applicableRule.value / 100);
      }
    }

    setTotalDays(diffDays);
    setTotalPrice(calculatedPrice);
    setError(null);

    onRentalSimulation({
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(end, 'yyyy-MM-dd'),
      totalDays: diffDays,
      totalPrice: calculatedPrice
    });
  }, [range, occupiedDates, settings, pricePerDay, minRentalDays, maxRentalDays]);

  // Generate disabled dates for DayPicker
  const today = startOfDay(new Date());
  const prepDays = settings?.preparation_days || 0;
  const bufferDays = settings?.rental_buffer_days || 0;
  const minSelectableDate = addDays(today, prepDays);

  const disabledDays = [
    { before: minSelectableDate }, // Past and preparation days
    // Already rented dates + buffer days on each side for cleaning/logistics
    ...occupiedDates.map(range => ({
      from: subDays(range.start, bufferDays),
      to: addDays(range.end, bufferDays)
    }))
  ];

  return (
    <div className="bg-surface-container-lowest border border-outline-variant/30 p-6 rounded-none space-y-6">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-primary" />
          <h3 className="font-label uppercase tracking-widest text-[11px] font-bold">Datas da Locação</h3>
        </div>
        {loading && (
          <div className="flex items-center gap-2 text-[10px] text-on-surface-variant italic">
            <div className="animate-spin rounded-full h-2 w-2 border-b-2 border-primary"></div>
            Sincronizando...
          </div>
        )}
      </div>

      <div className="flex justify-center bg-surface-container/20 p-4 border border-outline-variant/10">
        <DayPicker
          mode="range"
          selected={range}
          onSelect={setRange}
          disabled={disabledDays}
          locale={ptBR}
          numberOfMonths={1}
          className="mx-auto"
          modifiersStyles={{
            range_start: { backgroundColor: 'black', color: 'white', borderRadius: '50%' },
            range_end: { backgroundColor: 'black', color: 'white', borderRadius: '50%' },
            range_middle: { backgroundColor: '#f3f4f6', color: 'black' }
          }}
        />
      </div>

      <div className="grid grid-cols-2 gap-4 border-t border-b border-outline-variant/10 py-4">
        <div className="space-y-1">
          <span className="text-[10px] font-label uppercase text-on-surface-variant block">Retirada</span>
          <span className="text-sm font-medium">
            {range?.from ? format(range.from, "dd 'de' MMMM", { locale: ptBR }) : '---'}
          </span>
        </div>
        <div className="space-y-1 text-right">
          <span className="text-[10px] font-label uppercase text-on-surface-variant block">Devolução</span>
          <span className="text-sm font-medium">
            {range?.to ? format(range.to, "dd 'de' MMMM", { locale: ptBR }) : '---'}
          </span>
        </div>
      </div>

      {error ? (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-100 text-red-700 text-xs animate-in fade-in slide-in-from-top-1">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      ) : totalDays > 0 ? (
        <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
          <div className="flex justify-between items-end pb-4">
            <div className="space-y-1">
              <span className="text-[10px] font-label uppercase text-on-surface-variant block">Resumo</span>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-medium">{totalDays} dias selecionados</span>
                </div>
                {settings?.rental_periods && (
                  <span className="text-[9px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold uppercase w-fit">
                    {([...settings.rental_periods].sort((a,b) => b.days - a.days).find(r => totalDays >= r.days)?.label) || 'Tarifa Base'}
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-label uppercase text-on-surface-variant block">Total</span>
              <span className="text-xl font-light text-on-surface">R$ {totalPrice.toLocaleString('pt-BR')}</span>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-blue-50/50 border border-blue-100/50 rounded-sm">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-[11px] font-medium text-blue-900 leading-tight">Informação importante</p>
              <p className="text-[10px] text-blue-800/80 leading-relaxed">
                As datas selecionadas incluem o dia da retirada e devolução. A peça deve ser postada até as 16h do dia da devolução.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center p-4 border border-dashed border-outline-variant/30">
          <p className="text-[10px] text-on-surface-variant italic leading-relaxed">
            Clique na data de <b>retirada</b> e depois na data de <b>devolução</b> no calendário acima.
          </p>
        </div>
      )}
    </div>
  );
}
