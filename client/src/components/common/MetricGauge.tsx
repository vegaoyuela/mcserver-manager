import React from 'react';
import { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';

interface MetricGaugeProps {
  title: string;
  value: string | number;
  subtitle?: string;
  percentage?: number;
  icon: LucideIcon;
  variant?: 'emerald' | 'cyan' | 'amber' | 'rose' | 'indigo';
  extraContent?: React.ReactNode;
}

export const MetricGauge: React.FC<MetricGaugeProps> = ({
  title,
  value,
  subtitle,
  percentage,
  icon: Icon,
  variant = 'emerald',
  extraContent,
}) => {
  const variantStyles = {
    emerald: {
      border: 'border-white/[0.08] hover:border-emerald-500/40',
      iconBg: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
      barColor: 'bg-emerald-500',
    },
    cyan: {
      border: 'border-white/[0.08] hover:border-cyan-500/40',
      iconBg: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
      barColor: 'bg-cyan-500',
    },
    amber: {
      border: 'border-white/[0.08] hover:border-amber-500/40',
      iconBg: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
      barColor: 'bg-amber-500',
    },
    rose: {
      border: 'border-white/[0.08] hover:border-rose-500/40',
      iconBg: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
      barColor: 'bg-rose-500',
    },
    indigo: {
      border: 'border-white/[0.08] hover:border-indigo-500/40',
      iconBg: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
      barColor: 'bg-indigo-500',
    },
  };

  const style = variantStyles[variant];
  const clampedPercentage = percentage !== undefined ? Math.min(Math.max(percentage, 0), 100) : null;

  return (
    <motion.div
      className={`bg-[#0b0f17] rounded-xl p-4 sm:p-5 flex flex-col justify-between border transition-all duration-200 cursor-default shadow-sm ${style.border}`}
      whileHover={{ y: -2, transition: { type: 'spring', stiffness: 400, damping: 25 } }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono">
          {title}
        </span>
        <motion.div
          className={`p-2 rounded-lg ${style.iconBg}`}
          whileHover={{ scale: 1.08 }}
          transition={{ type: 'spring', stiffness: 350, damping: 20 }}
        >
          <Icon className="w-4 h-4" />
        </motion.div>
      </div>

      <div className="space-y-1 my-1">
        <div className="text-2xl font-bold text-white tracking-tight font-mono">
          {value}
        </div>
        {subtitle && <p className="text-xs text-slate-400 font-normal">{subtitle}</p>}
      </div>

      {clampedPercentage !== null && (
        <div className="mt-3 space-y-1.5">
          <div className="flex justify-between text-[11px] font-mono text-slate-400">
            <span>Uso</span>
            <span className="font-semibold text-slate-300">{clampedPercentage.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-white/[0.06] rounded-full h-1.5 overflow-hidden">
            <motion.div
              className={`h-full ${style.barColor} rounded-full`}
              initial={{ width: 0 }}
              animate={{ width: `${clampedPercentage}%` }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
        </div>
      )}

      {extraContent && <div className="mt-3 pt-2.5 border-t border-white/[0.06]">{extraContent}</div>}
    </motion.div>
  );
};
