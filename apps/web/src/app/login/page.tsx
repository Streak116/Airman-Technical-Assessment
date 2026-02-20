'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plane, Lock, User, Building2, ChevronRight, Loader2, ShieldCheck } from 'lucide-react';
import { apiService } from '@/lib/apiService';

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const data = await apiService.login(formData);

      // Successful login
      console.log('Login success:', data);
      
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.data.user));

      router.push('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 relative overflow-hidden font-sans text-slate-200">
      {/* HUD Grid Overlay */}
      <div 
        className="absolute inset-0 z-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(56, 189, 248, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(56, 189, 248, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }}
      />
      
      {/* Ambient Glow */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-sky-500/10 rounded-full blur-[128px]" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-[128px]" />

      <div className="w-full max-w-lg p-6 relative z-10">
        {/* Header HUD Element */}
        <div className="mb-8 text-center relative">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-slate-900 recursive-border border border-sky-500/30 rounded-full mb-6 shadow-[0_0_30px_rgba(14,165,233,0.15)] group">
            <Plane className="w-10 h-10 text-sky-400 transform -rotate-45 group-hover:scale-110 transition-transform duration-500" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white mb-2">
            AIRMAN <span className="text-sky-400">CORE</span>
          </h1>
          <div className="flex items-center justify-center gap-3 text-xs font-mono text-slate-400 tracking-widest uppercase opacity-75">
            <span>System Online</span>
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_8px_#10b981] animate-pulse" />
            <span>v2.4.0</span>
          </div>
        </div>

        {/* Login Panel */}
        <div className="bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-2xl p-8 shadow-2xl relative overflow-hidden group">
          {/* Corner Accents */}
          <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-sky-500/50 rounded-tl-lg" />
          <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-sky-500/50 rounded-tr-lg" />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-sky-500/50 rounded-bl-lg" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-sky-500/50 rounded-br-lg" />

          <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
            
            {/* Username */}
            <div className="space-y-2">
              <label className="text-[10px] font-mono font-bold text-sky-400/80 uppercase tracking-widest ml-1">
                Username / Callsign
              </label>
              <div className="relative group/input">
                <div className="absolute left-0 top-0 bottom-0 w-12 flex items-center justify-center bg-slate-800/50 border-r border-white/5 rounded-l-lg">
                  <User className="w-5 h-5 text-slate-400 group-focus-within/input:text-sky-400 transition-colors" />
                </div>
                <input
                  type="text"
                  placeholder="MAVERICK"
                  className="w-full bg-slate-950/50 border border-white/10 rounded-lg py-3.5 pl-16 pr-4 font-mono text-sm text-sky-100 placeholder:text-slate-600 focus:outline-none focus:border-sky-500/50 focus:bg-slate-900/80 focus:ring-1 focus:ring-sky-500/20 transition-all tracking-wider uppercase"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="text-[10px] font-mono font-bold text-sky-400/80 uppercase tracking-widest ml-1">
                Password
              </label>
              <div className="relative group/input">
                <div className="absolute left-0 top-0 bottom-0 w-12 flex items-center justify-center bg-slate-800/50 border-r border-white/5 rounded-l-lg">
                  <Lock className="w-5 h-5 text-slate-400 group-focus-within/input:text-sky-400 transition-colors" />
                </div>
                <input
                  type="password"
                  placeholder="••••••••••••"
                  className="w-full bg-slate-950/50 border border-white/10 rounded-lg py-3.5 pl-16 pr-4 font-mono text-sm text-sky-100 placeholder:text-slate-600 focus:outline-none focus:border-sky-500/50 focus:bg-slate-900/80 focus:ring-1 focus:ring-sky-500/20 transition-all tracking-widest"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-3 bg-rose-500/10 border border-rose-500/20 p-4 rounded-lg animate-in fade-in slide-in-from-top-2">
                <ShieldCheck className="w-5 h-5 text-rose-500" />
                <p className="text-rose-400 text-xs font-mono">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full relative overflow-hidden bg-sky-600 hover:bg-sky-500 text-white font-bold py-4 rounded-lg transition-all duration-300 transform active:scale-[0.98] group/btn shadow-[0_0_20px_rgba(2,132,199,0.3)] hover:shadow-[0_0_30px_rgba(56,189,248,0.5)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-700" />
              <div className="flex items-center justify-center gap-2 uppercase tracking-widest text-sm">
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                  </>
                )}
              </div>
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-white/5 text-center">
            <p className="text-slate-500 text-xs font-mono uppercase tracking-[0.2em] mb-4">New Recruit?</p>
            <button
              onClick={() => router.push('/signup')}
              className="text-sky-400 hover:text-sky-300 font-bold text-sm transition-colors flex items-center justify-center gap-2 mx-auto group"
            >
              Join a Flight Academy
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center opacity-40 hover:opacity-100 transition-opacity">
          <p className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.2em]">
            Restricted Access // Classified Level 2<br />
            Secure Connection via Skynet
          </p>
        </div>
      </div>
    </div>
  );
}
