'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plane, User, Lock, Building2, ChevronRight, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { apiService } from '@/lib/apiService';

export default function SignupPage() {
  const router = useRouter();
  const [tenants, setTenants] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    tenantId: '',
  });

  useEffect(() => {
    fetchTenants();
  }, []);

  async function fetchTenants() {
    try {
      const res = await apiService.getTenants();
      if (res.status === 'success') {
        setTenants(res.data.tenants);
      }
    } catch (err) {
      console.error('Failed to fetch academies');
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    if (!formData.tenantId) {
      setError('Please select an academy to join');
      setIsLoading(false);
      return;
    }

    try {
      const payload = {
        username: formData.username,
        password: formData.password,
        role: 'STUDENT',
        tenantId: formData.tenantId
      };

      const res = await apiService.register(payload);

      if (res.status === 'success') {
        setIsSuccess(true);
      } else {
        setError(res.message || 'Signup failed');
      }
    } catch (err: any) {
      setError(err.message || 'Network connection error');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6">
        <div className="max-w-md w-full bg-slate-900/60 backdrop-blur-md border border-sky-500/20 rounded-3xl p-10 text-center shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-sky-500/50 to-transparent" />
          <CheckCircle2 className="w-20 h-20 text-sky-400 mx-auto mb-6 animate-bounce" />
          <h1 className="text-3xl font-bold text-white mb-4 uppercase tracking-tighter">Registration Logged</h1>
          <p className="text-slate-400 font-mono text-sm leading-relaxed mb-8">
            Your flight credentials have been transmitted to the Academy's Command Center. 
            <br /><br />
            <span className="text-sky-400 font-bold uppercase tracking-widest">Status: Pending Approval</span>
            <br />
            Access to the Airman Core will be granted once your instructor verifies your roster status.
          </p>
          <button
            onClick={() => router.push('/login')}
            className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 border border-white/5"
          >
            <ArrowLeft className="w-4 h-4" />
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6 font-sans text-slate-200 overflow-hidden relative">
      {/* HUD Background elements */}
      <div className="absolute inset-0 z-0 opacity-10 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #0ea5e9 0%, transparent 70%)', opacity: 0.1 }}></div>
      </div>

      <div className="w-full max-w-xl relative z-10">
        <button 
          onClick={() => router.push('/login')}
          className="flex items-center gap-2 text-slate-500 hover:text-sky-400 transition-colors mb-8 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-xs font-mono uppercase tracking-widest">Back to Login</span>
        </button>

        <div className="bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-3xl p-8 md:p-12 shadow-2xl relative">
          {/* Corner Accents */}
          <div className="absolute top-0 left-0 w-12 h-12 border-t-2 border-l-2 border-sky-500/30 rounded-tl-3xl" />
          <div className="absolute bottom-0 right-0 w-12 h-12 border-b-2 border-r-2 border-sky-500/30 rounded-br-3xl" />

          <div className="mb-10">
            <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-4">
              <div className="p-2 bg-sky-600 rounded-lg -rotate-45">
                <Plane className="w-6 h-6 text-white" />
              </div>
              STUDENT ENLISTMENT
            </h1>
            <p className="text-slate-500 mt-2 font-mono text-[10px] uppercase tracking-[0.3em]">Join a flight academy workspace</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Academy Selection */}
            <div className="space-y-2">
              <label className="text-[10px] font-mono font-bold text-sky-400/80 uppercase tracking-widest ml-1">Select Academy</label>
              <div className="relative group">
                <div className="absolute left-0 inset-y-0 w-12 flex items-center justify-center bg-slate-800/50 border-r border-white/5 rounded-l-xl">
                  <Building2 className="w-5 h-5 text-slate-400 group-focus-within:text-sky-400" />
                </div>
                <select
                  className="w-full bg-slate-950/50 border border-white/10 rounded-xl py-4 pl-16 pr-4 font-mono text-sm text-sky-100 focus:outline-none focus:border-sky-500/50 appearance-none transition-all cursor-pointer"
                  value={formData.tenantId}
                  onChange={(e) => setFormData({ ...formData, tenantId: e.target.value })}
                  required
                >
                  <option value="" disabled className="bg-slate-900">Select Academy Room...</option>
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id} className="bg-slate-900">{t.name.toUpperCase()}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Callsign */}
            <div className="space-y-2">
              <label className="text-[10px] font-mono font-bold text-sky-400/80 uppercase tracking-widest ml-1">Desired Callsign</label>
              <div className="relative group">
                <div className="absolute left-0 inset-y-0 w-12 flex items-center justify-center bg-slate-800/50 border-r border-white/5 rounded-l-xl">
                  <User className="w-5 h-5 text-slate-400 group-focus-within:text-sky-400" />
                </div>
                <input
                  type="text"
                  placeholder="e.g. ICEMAN"
                  className="w-full bg-slate-950/50 border border-white/10 rounded-xl py-4 pl-16 pr-4 font-mono text-sm text-sky-100 focus:outline-none focus:border-sky-500/50 transition-all uppercase tracking-widest"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Passwords */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-mono font-bold text-sky-400/80 uppercase tracking-widest ml-1">Access Key</label>
                <div className="relative group">
                  <div className="absolute left-0 inset-y-0 w-12 flex items-center justify-center bg-slate-800/50 border-r border-white/5 rounded-l-xl">
                    <Lock className="w-5 h-5 text-slate-400 group-focus-within:text-sky-400" />
                  </div>
                  <input
                    type="password"
                    placeholder="••••••••"
                    className="w-full bg-slate-950/50 border border-white/10 rounded-xl py-4 pl-16 pr-4 font-mono text-sm text-sky-100 focus:outline-none focus:border-sky-500/50 transition-all"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-mono font-bold text-sky-400/80 uppercase tracking-widest ml-1">Confirm Key</label>
                <div className="relative group">
                  <div className="absolute left-0 inset-y-0 w-12 flex items-center justify-center bg-slate-800/50 border-r border-white/5 rounded-l-xl">
                    <Lock className="w-5 h-5 text-slate-400 group-focus-within:text-sky-400" />
                  </div>
                  <input
                    type="password"
                    placeholder="••••••••"
                    className="w-full bg-slate-950/50 border border-white/10 rounded-xl py-4 pl-16 pr-4 font-mono text-sm text-sky-100 focus:outline-none focus:border-sky-500/50 transition-all"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    required
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
                <p className="text-rose-400 text-xs font-mono">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-sky-600 hover:bg-sky-500 text-white font-bold py-5 rounded-xl transition-all shadow-[0_4px_20px_rgba(2,132,199,0.4)] hover:shadow-[0_0_30px_rgba(56,189,248,0.5)] flex items-center justify-center gap-2 group/btn disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="uppercase tracking-widest text-sm">Transmitting Data...</span>
                </>
              ) : (
                <>
                  <span className="uppercase tracking-widest text-sm">Transmit Enlistment</span>
                  <ChevronRight className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
