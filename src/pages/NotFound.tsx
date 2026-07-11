import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';

export function NotFound() {
  const containerRef = useRef<HTMLDivElement>(null);

  // Parallax mouse effect
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e;
      const { innerWidth, innerHeight } = window;
      const xOffset = (clientX / innerWidth - 0.5) * 30;
      const yOffset = (clientY / innerHeight - 0.5) * 30;

      const numEl = container.querySelector<HTMLElement>('.parallax-num');
      const textEl = container.querySelector<HTMLElement>('.parallax-text');

      if (numEl) {
        numEl.style.transform = `translate(${xOffset * -1}px, ${yOffset * -1}px)`;
      }
      if (textEl) {
        textEl.style.transform = `translate(${xOffset * 0.5}px, ${yOffset * 0.5}px)`;
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative min-h-screen bg-white flex flex-col items-center justify-center overflow-hidden"
    >
      {/* Background decorative lines */}
      <div className="absolute inset-0 pointer-events-none select-none">
        {/* Vertical lines */}
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute top-0 bottom-0 w-px bg-black/5"
            style={{ left: `${(i + 1) * (100 / 7)}%` }}
          />
        ))}
        {/* Horizontal lines */}
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="absolute left-0 right-0 h-px bg-black/5"
            style={{ top: `${(i + 1) * (100 / 5)}%` }}
          />
        ))}
      </div>

      {/* Top label */}
      <motion.p
        initial={{ opacity: 0, letterSpacing: '0.1em' }}
        animate={{ opacity: 1, letterSpacing: '0.5em' }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
        className="font-label uppercase text-[9px] tracking-[0.5em] text-black/40 mb-12 z-10"
      >
        2Bags2rent
      </motion.p>

      {/* Giant 404 */}
      <div className="relative z-10 select-none">
        <div
          className="parallax-num transition-transform duration-150 ease-out"
          style={{ willChange: 'transform' }}
        >
          <motion.h1
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="font-headline italic text-[22vw] md:text-[18vw] leading-none text-black select-none"
            style={{ lineHeight: '0.85' }}
          >
            404
          </motion.h1>
        </div>

        {/* Overlaid editorial text */}
        <div
          className="parallax-text absolute inset-0 flex items-center justify-center transition-transform duration-150 ease-out pointer-events-none"
          style={{ willChange: 'transform' }}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 1 }}
            className="text-center"
          >
            <p className="font-headline italic text-white text-sm md:text-xl tracking-widest mix-blend-difference">
              PÁGINA NÃO ENCONTRADA
            </p>
          </motion.div>
        </div>
      </div>

      {/* Description */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.8 }}
        className="relative z-10 text-center mt-12 max-w-sm px-6"
      >
        <p className="font-light text-black/50 text-sm leading-relaxed mb-10">
          Esta página foi para o closet e não voltou.
          <br />
          Explore nosso acervo e encontre o look perfeito.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          <Link
            to="/"
            className="px-10 py-3.5 bg-black text-white text-[9px] uppercase tracking-[0.4em] hover:bg-black/80 transition-colors duration-300 font-medium"
          >
            Voltar ao Início
          </Link>
          <Link
            to="/categoria"
            className="px-10 py-3.5 border border-black text-black text-[9px] uppercase tracking-[0.4em] hover:bg-black hover:text-white transition-all duration-300 font-medium"
          >
            Ver Coleção
          </Link>
        </div>
      </motion.div>

      {/* Bottom accent line */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 1.2, duration: 1, ease: [0.16, 1, 0.3, 1] }}
        className="absolute bottom-0 left-0 right-0 h-px bg-black"
        style={{ originX: 0 }}
      />

      {/* Bottom label */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4, duration: 0.8 }}
        className="absolute bottom-6 right-8 font-label text-[8px] uppercase tracking-[0.3em] text-black/30"
      >
        Erro 404
      </motion.p>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4, duration: 0.8 }}
        className="absolute bottom-6 left-8 font-label text-[8px] uppercase tracking-[0.3em] text-black/30"
      >
        A Revolução do Aluguel de Luxo
      </motion.p>
    </div>
  );
}
