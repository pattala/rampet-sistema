import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Mail, Lock, KeyRound, ArrowRight, Loader2, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AuthScreenProps {
  onLoginSuccess: (session: any, role: 'admin' | 'employee') => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLoginSuccess }) => {
  const [view, setView] = useState<'login' | 'forgot_password'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setLoading(true);
    setMessage(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      const role = data.user?.user_metadata?.role || 'employee'; // Default a empleado si falla
      onLoginSuccess(data.session, role);
      
    } catch (err: any) {
      console.error('Error logging in:', err);
      setMessage({ type: 'error', text: err.message || 'Error al iniciar sesión. Verifique sus credenciales.' });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });

      if (error) throw error;
      setMessage({ type: 'success', text: 'Te enviamos un enlace de recuperación a tu correo.' });
    } catch (err: any) {
      console.error('Error reset password:', err);
      setMessage({ type: 'error', text: err.message || 'No se pudo enviar el correo de recuperación.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center p-4 min-h-screen">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }} 
        animate={{ opacity: 1, scale: 1 }} 
        className="glass-panel w-full max-w-[320px] p-6 relative overflow-hidden"
      >
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center p-2 shadow-2xl shadow-primary/20 border border-white/10">
            <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
          </div>
        </div>
        
        <h1 className="text-2xl font-black mb-1 uppercase tracking-tighter text-white text-center">RAMPET SISTEMA</h1>
        <p className="text-muted mb-6 text-center text-xs uppercase tracking-widest font-bold">
          {view === 'login' ? 'Ingresa tus credenciales para continuar' : 'Recupera el acceso a tu cuenta'}
        </p>

        {message && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }} 
            animate={{ opacity: 1, height: 'auto' }} 
            className={`mb-6 p-4 rounded-xl text-xs font-bold ${message.type === 'error' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-accent-success/10 text-accent-success border border-accent-success/20'}`}
          >
            {message.text}
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {view === 'login' ? (
            <motion.form 
              key="login-form" 
              initial={{ opacity: 0, x: -20 }} 
              animate={{ opacity: 1, x: 0 }} 
              exit={{ opacity: 0, x: 20 }}
              onSubmit={handleLogin} 
              className="space-y-5"
            >
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-black tracking-widest text-muted pl-1">Correo Electrónico</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted">
                    <Mail size={16} />
                  </div>
                  <input 
                    type="email" 
                    className="input-field pl-10 h-10 w-full text-xs" 
                    placeholder="usuario@rampet.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] uppercase font-black tracking-widest text-muted pl-1">Contraseña</label>
                  <button 
                    type="button" 
                    onClick={() => { setView('forgot_password'); setMessage(null); }} 
                    className="text-[10px] uppercase font-bold text-primary hover:text-white transition-colors"
                  >
                    ¿Olvidaste tu clave?
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted">
                    <Lock size={16} />
                  </div>
                  <input 
                    type={showPassword ? "text" : "password"} 
                    className="input-field pl-10 pr-10 h-10 w-full text-xs font-mono tracking-widest" 
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required 
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={loading || !email || !password}
                className="btn btn-primary w-full h-10 mt-4 text-[11px] uppercase tracking-widest font-black flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : (
                  <>
                    <span>Ingresar al Sistema</span>
                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </motion.form>
          ) : (
            <motion.form 
              key="reset-form" 
              initial={{ opacity: 0, x: 20 }} 
              animate={{ opacity: 1, x: 0 }} 
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handleResetPassword} 
              className="space-y-5"
            >
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-black tracking-widest text-muted pl-1">Correo Electrónico a recuperar</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted">
                    <Mail size={16} />
                  </div>
                  <input 
                    type="email" 
                    className="input-field pl-10 h-10 w-full text-xs" 
                    placeholder="usuario@rampet.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required 
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={loading || !email}
                className="btn btn-primary w-full h-10 mt-4 text-[11px] uppercase tracking-widest font-black flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : (
                  <>
                    <KeyRound size={16} />
                    <span>Enviar Enlace</span>
                  </>
                )}
              </button>

              <button 
                type="button" 
                onClick={() => { setView('login'); setMessage(null); }}
                className="w-full flex items-center justify-center gap-2 text-[11px] font-bold text-muted hover:text-white transition-colors mt-6 uppercase tracking-widest"
              >
                <ArrowLeft size={14} /> Volver al Inicio
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
