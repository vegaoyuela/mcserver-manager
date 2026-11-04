import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from './AuthContext';
import { Lock, ArrowRight, Eye, EyeOff, AlertCircle, Terminal } from 'lucide-react';
import { InfoTip } from '../../components/common/InfoTip';

export const LoginView: React.FC = () => {
  const { login, isLoading } = useAuth();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shakeKey, setShakeKey] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError('Introduce la contraseña maestra');
      setShakeKey((prev) => prev + 1);
      return;
    }
    setError(null);
    try {
      await login(password);
    } catch (err: any) {
      setError(err.message || 'Contraseña incorrecta');
      setShakeKey((prev) => prev + 1);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 bg-[#080b11] text-slate-200 selection:bg-emerald-500/30 selection:text-emerald-200 relative overflow-hidden">
      {/* Subtle top ambient glow */}
      <div 
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[350px] pointer-events-none opacity-40 blur-[100px]"
        style={{
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.18) 0%, rgba(6, 182, 212, 0.05) 50%, transparent 70%)',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[390px] relative z-10"
      >
        {/* Brand Header */}
        <div className="text-center mb-7">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 shadow-inner mb-4 relative">
            <Terminal className="w-5 h-5 text-emerald-400" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
          </div>

          <h1 className="text-xl font-semibold text-white tracking-tight">
            MCServer Manager
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Panel de administración del servidor
          </p>
        </div>

        {/* Minimalist Card */}
        <motion.div
          key={shakeKey}
          animate={shakeKey > 0 ? { x: [-6, 6, -4, 4, -2, 2, 0] } : {}}
          transition={{ duration: 0.35 }}
          className="bg-slate-900/70 border border-white/[0.08] backdrop-blur-xl rounded-2xl p-6 sm:p-7 shadow-xl shadow-black/40"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -4, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -4, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2 overflow-hidden"
                >
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <label className="text-xs font-medium text-slate-300">
                    Contraseña
                  </label>
                  <InfoTip content="Introduce la contraseña maestra configurada en ADMIN_PASSWORD (por defecto: admin)." />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPassword('admin');
                    setError(null);
                  }}
                  className="text-[11px] text-slate-500 hover:text-emerald-400 transition-colors cursor-pointer font-mono"
                >
                  Usar <span className="underline decoration-slate-700 hover:decoration-emerald-500">admin</span>
                </button>
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-3.5 h-3.5" />
                </div>

                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-10 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/60 font-mono transition-colors shadow-inner"
                  autoFocus
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                  title={showPassword ? 'Ocultar' : 'Mostrar'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white text-xs sm:text-sm font-medium rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-950/30 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Iniciar Sesión</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        </motion.div>

        {/* Minimalist Footer */}
        <p className="text-center text-[11px] text-slate-600 mt-6 font-mono">
          Panel de Control Seguro
        </p>
      </motion.div>
    </div>
  );
};
