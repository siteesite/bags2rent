import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Ruler, Info } from 'lucide-react';

interface SizeGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SizeGuideModal({ isOpen, onClose }: SizeGuideModalProps) {
  const sizes = [
    { label: 'PP', size: '34', bust: '80-84', waist: '60-64', hip: '88-92' },
    { label: 'P', size: '36-38', bust: '86-90', waist: '66-70', hip: '94-98' },
    { label: 'M', size: '40-42', bust: '92-96', waist: '72-76', hip: '100-104' },
    { label: 'G', size: '44-46', bust: '100-104', waist: '80-84', hip: '108-112' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 m-auto w-full max-w-2xl h-fit max-h-[90vh] bg-surface z-[101] shadow-2xl overflow-y-auto"
          >
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-outline-variant/10 sticky top-0 bg-surface z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-on-surface/5 rounded-full">
                  <Ruler className="w-5 h-5 text-on-surface" />
                </div>
                <h3 className="font-headline italic text-2xl tracking-wide">Guia de Medidas</h3>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-on-surface/5 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-8 space-y-10">
              {/* Measurement Table */}
              <div className="space-y-4">
                <h4 className="font-label uppercase tracking-widest text-xs font-bold text-on-surface-variant">Tabela de Dimensões (cm)</h4>
                <div className="overflow-x-auto border border-outline-variant/20">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-surface-container-low">
                      <tr>
                        <th className="p-4 font-medium text-on-surface-variant border-r border-outline-variant/10">Tamanho</th>
                        <th className="p-4 font-medium text-on-surface-variant border-r border-outline-variant/10">Manequim</th>
                        <th className="p-4 font-medium text-on-surface-variant border-r border-outline-variant/10">Busto</th>
                        <th className="p-4 font-medium text-on-surface-variant border-r border-outline-variant/10">Cintura</th>
                        <th className="p-4 font-medium text-on-surface-variant">Quadril</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/10">
                      {sizes.map((item) => (
                        <tr key={item.label} className="hover:bg-on-surface/[0.02] transition-colors">
                          <td className="p-4 font-bold text-primary border-r border-outline-variant/10">{item.label}</td>
                          <td className="p-4 text-on-surface border-r border-outline-variant/10">{item.size}</td>
                          <td className="p-4 text-on-surface-variant border-r border-outline-variant/10">{item.bust}</td>
                          <td className="p-4 text-on-surface-variant border-r border-outline-variant/10">{item.waist}</td>
                          <td className="p-4 text-on-surface-variant">{item.hip}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* How to Measure Section */}
              <div className="space-y-6 pt-6 border-t border-outline-variant/10">
                <h4 className="font-label uppercase tracking-widest text-xs font-bold text-on-surface-variant">Como Medir Corretamente</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="space-y-2">
                    <p className="font-headline italic text-lg text-primary">01. Busto</p>
                    <p className="text-xs text-on-surface-variant font-light leading-relaxed">
                      Passe a fita métrica sobre a parte mais saliente do busto e pelas costas, na altura das escápulas.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="font-headline italic text-lg text-primary">02. Cintura</p>
                    <p className="text-xs text-on-surface-variant font-light leading-relaxed">
                      Envolva a fita na parte mais estreita do tronco, geralmente dois dedos acima do umbigo.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="font-headline italic text-lg text-primary">03. Quadril</p>
                    <p className="text-xs text-on-surface-variant font-light leading-relaxed">
                      Passe a fita métrica na parte mais larga dos quadris, contornando a região das nádegas.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-primary/5 border border-primary/10 rounded-sm flex gap-3">
                <Info className="w-5 h-5 text-primary shrink-0" />
                <p className="text-[10px] text-primary/80 leading-relaxed italic">
                  As medidas podem variar levemente de acordo com o corte e tecido de cada marca. 
                  Em caso de dúvida, sugerimos sempre optar pelo tamanho maior para garantir o conforto.
                </p>
              </div>

              <button 
                onClick={onClose}
                className="w-full bg-black text-white py-4 font-bold uppercase tracking-widest text-xs hover:bg-on-surface-variant transition-colors"
              >
                Fechar
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
