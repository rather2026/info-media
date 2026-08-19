'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Lock, User, Eye, EyeOff, Sparkles, ArrowRight, ShieldCheck, KeyRound } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        // Redirect to main dashboard
        router.push('/');
        router.refresh();
      } else {
        setError(data.error || 'فشل تسجيل الدخول. يرجى التحقق من صحة البيانات.');
      }
    } catch (err: any) {
      setError(err.message || 'خطأ في الاتصال بالخادم.');
    } finally {
      setIsLoading(false);
    }
  };

  const fillDefaultCredentials = () => {
    setUsername('admin');
    setPassword('SahelIntel2026!*');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans select-none">
      {/* Background Glow Decorations */}
      <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[20%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-md relative z-10">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 mb-4 shadow-lg shadow-emerald-950/50 backdrop-blur-md">
            <Shield className="w-8 h-8 text-emerald-400" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
            منظومة الرصد والاستخبارات
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1.5 font-medium tracking-wide">
            Sahel Strategic Intelligence Platform • DZ
          </p>
          <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-emerald-400/90 font-medium bg-emerald-950/40 border border-emerald-800/40 rounded-full px-3 py-1 w-fit mx-auto">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            بوابة الدخول الآمنة • المصالح الاستراتيجية
          </div>
        </div>

        {/* Card */}
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          {error && (
            <div className="mb-5 p-3.5 bg-rose-950/50 border border-rose-800/60 rounded-xl text-rose-300 text-xs sm:text-sm flex items-center gap-2.5 animate-shake">
              <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0"></span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 text-right">
                اسم المستخدم / Identifiant
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  className="w-full bg-slate-950/70 border border-slate-800 rounded-xl py-2.5 pr-10 pl-3.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition"
                  dir="ltr"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 text-right">
                كلمة المرور / Mot de passe
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-slate-950/70 border border-slate-800 rounded-xl py-2.5 pr-10 pl-10 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 hover:text-slate-200 transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-emerald-950/60 flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>جاري التحقق من الصلاحيات...</span>
                </>
              ) : (
                <>
                  <span>تسجيل الدخول إلى المنصة</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Default Credentials Pill */}
          <div className="mt-6 pt-5 border-t border-slate-800/80">
            <button
              type="button"
              onClick={fillDefaultCredentials}
              className="w-full p-3 rounded-xl bg-slate-950/50 border border-dashed border-slate-800 hover:border-emerald-500/50 text-slate-400 hover:text-emerald-300 text-xs flex items-center justify-between transition cursor-pointer group"
            >
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition" />
                <span className="font-medium">ملء بالبيانات الافتراضية (admin)</span>
              </div>
              <span className="text-[10px] bg-slate-800 group-hover:bg-emerald-900/50 text-slate-300 group-hover:text-emerald-200 px-2 py-0.5 rounded-md font-mono transition">
                SahelIntel2026!*
              </span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-xs text-slate-500">
          منظومة رصد الساحل • حماية وتشفير عالي المستوى
        </div>
      </div>
    </div>
  );
}
