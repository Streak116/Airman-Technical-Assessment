'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plane, ArrowLeft, Building2, Plus, Users, Search } from 'lucide-react';
import { apiService } from '@/lib/apiService';

export default function TenantsPage() {
  const router = useRouter();
  const [tenants, setTenants] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser || JSON.parse(storedUser).role !== 'ADMIN') {
      router.push('/');
      return;
    }

    const fetchTenants = async () => {
      try {
        const data = await apiService.getTenants();
        if (data.status === 'success') {
          setTenants(data.data.tenants);
        }
      } catch (err) {
        console.error('Failed to fetch tenants', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTenants();
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans">
      <nav className="border-b border-white/10 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.push('/')}
              className="p-2 hover:bg-white/5 rounded-lg transition-colors border border-transparent hover:border-white/10"
            >
              <ArrowLeft className="w-5 h-5 text-sky-400" />
            </button>
            <div className="h-4 w-px bg-white/10 mx-2" />
            <span className="font-bold tracking-tight text-white uppercase text-sm">Tenant Control // Global</span>
          </div>
          
          <button 
            onClick={() => router.push('/tenants/tenant-form')}
            className="flex items-center gap-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold px-4 py-2 rounded-lg transition-all shadow-[0_0_15px_rgba(14,165,233,0.3)]"
          >
            <Plus className="w-4 h-4" />
            Onboard New Academy
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-12">
        <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">Active Flight Schools</h1>
            <p className="text-slate-400 font-mono text-xs uppercase tracking-[0.2em]">Deployment Tier: Global // Active Nodes: {tenants.length}</p>
          </div>
          
          <div className="relative group min-w-[300px]">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500 group-focus-within:text-sky-400 transition-colors" />
            <input 
              type="text" 
              placeholder="Filter by Frequency..." 
              className="w-full bg-slate-900/50 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-sky-500/50 transition-all font-mono"
            />
          </div>
        </header>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
            {[1, 2, 3].map(i => <div key={i} className="h-48 bg-white/5 rounded-2xl border border-white/5" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tenants.map(tenant => (
              <div 
                key={tenant.id} 
                onClick={() => router.push(`/tenants/tenant-form?id=${tenant.id}`)}
                className="bg-slate-900 recursive-border border border-white/5 p-6 rounded-2xl hover:border-sky-500/30 transition-all group cursor-pointer relative overflow-hidden"
              >                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Building2 className="w-16 h-16 text-sky-400" />
                </div>
                
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-10 h-10 bg-sky-500/10 rounded-lg flex items-center justify-center border border-sky-500/20">
                    <Building2 className="w-5 h-5 text-sky-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold group-hover:text-sky-400 transition-colors">{tenant.name}</h3>
                    <p className="text-[10px] font-mono text-slate-500 uppercase">{tenant.id}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                    <div className="flex items-center gap-2 mb-1">
                      <Users className="w-3 h-3 text-slate-400" />
                      <span className="text-[10px] text-slate-500 font-mono uppercase">Personnel</span>
                    </div>
                    <p className="text-sm font-bold text-white">---</p>
                  </div>
                  <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                    <div className="flex items-center gap-2 mb-1">
                      <Plane className="w-3 h-3 text-slate-400" />
                      <span className="text-[10px] text-slate-500 font-mono uppercase">Status</span>
                    </div>
                    <p className="text-sm font-bold text-emerald-500">Active</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
