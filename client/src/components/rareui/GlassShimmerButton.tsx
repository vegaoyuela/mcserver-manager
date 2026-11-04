import React from 'react';

interface GlassShimmerButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
  variant?: 'emerald' | 'cyan' | 'amber' | 'rose' | 'default';
  size?: 'sm' | 'md' | 'lg';
}

export const GlassShimmerButton: React.FC<GlassShimmerButtonProps> = ({
  children,
  className = '',
  variant = 'emerald',
  size = 'md',
  ...props
}) => {
  const variantStyles = {
    emerald: 'border-emerald-500/30 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/50 hover:border-emerald-400/60 shadow-[0_0_20px_rgba(16,185,129,0.15)]',
    cyan: 'border-cyan-500/30 bg-cyan-950/40 text-cyan-300 hover:bg-cyan-900/50 hover:border-cyan-400/60 shadow-[0_0_20px_rgba(6,182,212,0.15)]',
    amber: 'border-amber-500/30 bg-amber-950/40 text-amber-300 hover:bg-amber-900/50 hover:border-amber-400/60 shadow-[0_0_20px_rgba(245,158,11,0.15)]',
    rose: 'border-rose-500/30 bg-rose-950/40 text-rose-300 hover:bg-rose-900/50 hover:border-rose-400/60 shadow-[0_0_20px_rgba(244,63,94,0.15)]',
    default: 'border-slate-700 bg-slate-900/80 text-slate-200 hover:bg-slate-800 hover:border-slate-600 shadow-md',
  };

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-xs font-semibold',
    lg: 'px-6 py-2.5 text-sm font-semibold',
  };

  return (
    <button
      className={`group relative inline-flex items-center justify-center overflow-hidden rounded-xl border backdrop-blur-md transition-all duration-300 active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {/* Shimmer sweeping beam on hover */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 h-full w-full -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.12) 50%, transparent 100%)',
        }}
      />

      {/* Top Gloss Border */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-60" />

      {/* Bottom Gloss Border */}
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-30" />

      {/* Content */}
      <span className="relative z-10 flex items-center gap-2 drop-shadow-sm">{children}</span>
    </button>
  );
};
