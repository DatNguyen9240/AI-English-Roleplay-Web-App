import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Mail, Lock, LogIn, UserPlus, Loader2 } from 'lucide-react';
import { Logo } from '@/components/Logo';

interface AuthFormProps {
  onSuccess?: () => void;
}

/**
 * Login / Register form with toggle between modes.
 * Delegates auth calls to the useAuth Zustand store.
 */
export function AuthForm({ onSuccess }: AuthFormProps): React.ReactElement {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, register, error, loading, clearError } = useAuth();

  const handleToggle = (): void => {
    setIsLogin(!isLogin);
    clearError();
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!email || !password) return;

    const success = isLogin
      ? await login(email, password)
      : await register(email, password);

    if (success && onSuccess) {
      onSuccess();
    }
  };

  return (
    <div className="w-full max-w-md bg-panel-bg backdrop-blur-xl border border-panel-border rounded-3xl p-8 shadow-card transition-all duration-300">
      <div className="flex flex-col items-center mb-8">
        <div className="mb-4">
          <Logo showText={false} size="md" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-center bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
          {isLogin ? 'Welcome Back' : 'Create Account'}
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          {isLogin ? 'Sign in to practice your English skills' : 'Start your English learning journey today'}
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-status-error/10 border border-status-error/20 text-status-error text-sm animate-fade-in">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Email Address
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
              <Mail className="w-5 h-5" />
            </span>
            <input
              id="input-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full pl-11 pr-4 py-3 bg-panel-inner border border-panel-border rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all duration-200"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Password
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
              <Lock className="w-5 h-5" />
            </span>
            <input
              id="input-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full pl-11 pr-4 py-3 bg-panel-inner border border-panel-border rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all duration-200"
            />
          </div>
        </div>

        <button
          id="btn-auth-submit"
          type="submit"
          disabled={loading}
          className="w-full py-3.5 px-6 rounded-xl font-bold bg-gradient-to-r from-brand-primary-start to-brand-primary-end hover:brightness-110 text-white transition-all duration-200 shadow-glow-blue flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : isLogin ? (
            <>
              <LogIn className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
              Sign In
            </>
          ) : (
            <>
              <UserPlus className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
              Get Started
            </>
          )}
        </button>
      </form>

      <div className="mt-8 text-center text-sm text-slate-400">
        {isLogin ? "Don't have an account? " : 'Already have an account? '}
        <button
          onClick={handleToggle}
          className="text-blue-400 hover:text-blue-300 font-semibold transition-colors"
        >
          {isLogin ? 'Sign up' : 'Sign in'}
        </button>
      </div>
    </div>
  );
}
