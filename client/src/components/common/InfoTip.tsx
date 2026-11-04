import React, { useState, useRef, useEffect } from 'react';
import { HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface InfoTipProps {
  content: string | React.ReactNode;
  title?: string;
  className?: string;
  align?: 'left' | 'center' | 'right';
  side?: 'top' | 'bottom';
}

/**
 * Reusable progressive-disclosure micro-hint component.
 * Displays an understated (?) icon that reveals a tooltip/popover
 * on hover or tap, keeping interfaces clean and uncluttered (Impeccable Distill).
 */
export const InfoTip: React.FC<InfoTipProps> = ({
  content,
  title,
  className = '',
  align = 'center',
  side = 'top',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);

  // Close on outside click for mobile tap support
  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  const alignClasses = {
    left: 'left-0 translate-x-0',
    center: 'left-1/2 -translate-x-1/2',
    right: 'right-0 translate-x-0',
  }[align];

  const sideClasses = side === 'top' ? 'bottom-full mb-2' : 'top-full mt-2';

  return (
    <span
      ref={containerRef}
      className={`relative inline-flex items-center align-middle ${className}`}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setIsOpen(false)}
        className="text-slate-400 hover:text-white transition-colors p-0.5 rounded-full hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-400 cursor-help"
        aria-label="Más información"
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: side === 'top' ? 4 : -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: side === 'top' ? 4 : -4, scale: 0.96 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={`absolute ${sideClasses} ${alignClasses} z-50 w-64 max-w-[85vw] p-2.5 rounded-xl bg-[#0f1523] border border-white/[0.12] shadow-2xl text-slate-200 text-xs pointer-events-auto leading-relaxed select-text`}
          >
            {title && (
              <div className="font-semibold text-white mb-1 text-[11px] font-sans flex items-center gap-1.5 border-b border-white/[0.08] pb-1">
                <span>{title}</span>
              </div>
            )}
            <div className="text-[11px] text-slate-300 font-normal">
              {content}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
};
