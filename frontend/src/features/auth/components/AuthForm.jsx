import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Mail, Lock, LogIn, UserPlus, Loader2, Sparkles } from 'lucide-react';

export function AuthForm({ onSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, register, error, loading, clearError } = useAuth();

  const handleToggle = () => {
    setIsLogin(!isLogin);
    clearError();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return;

    let success;
    if (isLogin) {
      success = await login(email, password);
    } else {
      success = await register(email, password);
    }

    if (success && onSuccess) {
      onSuccess();
    }
  };

  return (
    <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl transition-all duration-300">
      <div className="flex flex-col items-center mb-8">
        <div className="w-12 h-12 bg-gradient-to-tr from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 mb-4 animate-bounce-slow">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-center bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
          {isLogin ? 'Welcome Back' : 'Create Account'}
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          {isLogin ? 'Sign in to practice your English skills' : 'Start your English learning journey today'}
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
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
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full pl-11 pr-4 py-3 bg-slate-950/40 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all duration-200"
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
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full pl-11 pr-4 py-3 bg-slate-950/40 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all duration-200"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 px-6 rounded-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white transition-all duration-200 shadow-lg shadow-blue-500/10 flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
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
        {isLogin ? "Don't have an account? " : "Already have an account? "}
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
