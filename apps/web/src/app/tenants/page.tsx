'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plane, ArrowLeft, Building2, Plus, Users, Search } from 'lucide-react';
import { apiService } from '@/lib/apiService';
import Navbar from '@/components/layout/Navbar';

export default function TenantsPage() {
  const router = useRouter();
  const [tenants, setTenants] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
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
        console.error('Failed to load nodes:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTenants();
  }, [router]);

  const filteredTenants = tenants.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 py-12">
        <header className="mb-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">Active Flight Schools</h1>
              <p className="text-slate-400 font-mono text-[10px] uppercase tracking-[0.2em]">Deployment Tier: Global // Active Nodes: {tenants.length}</p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <div className="relative group min-w-[300px]">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500 group-focus-within:text-sky-400 transition-colors" />
                <input 
                  type="text" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name or node ID..." 
                  className="w-full bg-slate-900/50 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-sky-500/50 transition-all font-mono text-sky-100 placeholder:opacity-30"
                />
              </div>

              <button 
                onClick={() => router.push('/tenants/tenant-form')}
                className="flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-500 text-white text-[10px] font-bold px-6 py-2.5 rounded-xl transition-all shadow-[0_0_15px_rgba(14,165,233,0.3)] uppercase tracking-widest h-full whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                Onboard Academy
              </button>
            </div>
          </div>
          
          <div className="h-px w-full bg-gradient-to-r from-transparent via-sky-500/20 to-transparent" />
        </header>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
            {[1, 2, 3].map(i => <div key={i} className="h-48 bg-white/5 rounded-2xl border border-white/5" />)}
          </div>
        ) : filteredTenants.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-600 gap-4 border border-dashed border-white/5 rounded-3xl">
            <Building2 className="w-16 h-16 opacity-20" />
            <p className="font-mono text-sm uppercase tracking-widest">No active nodes found matching criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTenants.map(tenant => (
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
