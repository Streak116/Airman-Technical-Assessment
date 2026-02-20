'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Plane, LogOut, ArrowLeft } from 'lucide-react';
import EscalationDropdown from '../escalations/EscalationDropdown';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);

  const isHome = pathname === '/';
  
  // Decide where to go back to based on the current path
  const getBackUrl = () => {
    if (pathname.startsWith('/tenants/')) return '/tenants';
    if (pathname.startsWith('/learning/')) {
        // If we're on a specific course/lesson page, we might want to go back to the learning list
        // but for now, simple parent or home
        if (pathname === '/learning') return '/';
        return '/learning';
    }
    return '/';
  };

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  if (!user) return null;

  return (
    <nav className="relative z-50 border-b border-white/10 bg-slate-900/50 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {!isHome && (
            <button 
              onClick={() => router.push(getBackUrl())}
              className="p-2 hover:bg-white/5 rounded-lg transition-colors border border-transparent hover:border-white/10 group"
              title="Return to Previous Tier"
            >
              <ArrowLeft className="w-5 h-5 text-sky-400 group-hover:-translate-x-0.5 transition-transform" />
            </button>
          )}
          
          <button 
            onClick={() => router.push('/')}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <div className="w-8 h-8 bg-sky-600 rounded flex items-center justify-center shadow-[0_0_15px_rgba(14,165,233,0.3)]">
              <Plane className="w-5 h-5 text-white -rotate-45" />
            </div>
            <span className="font-bold tracking-tight text-white uppercase text-sm md:text-base">
              Airman <span className="text-sky-400">Core</span>
            </span>
          </button>
          
          {!isHome && (
            <div className="hidden sm:flex items-center gap-2">
              <div className="h-4 w-px bg-white/10 mx-1" />
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest animate-pulse">
                {pathname.split('/')[1]?.replace(/-/g, ' ')}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-[10px] md:text-xs font-mono text-slate-400">
            <span className="w-1.5 h-1.5 md:w-2 md:h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_#10b981]" />
            <span className="hidden sm:inline">{user.username} // {user.role}</span>
            {user.tenant?.name && (
              <span className="ml-1 px-2 py-0.5 bg-sky-500/10 border border-sky-500/20 rounded text-sky-400 text-[9px] md:text-[10px] uppercase tracking-widest truncate max-w-[100px] md:max-w-[200px]">
                {user.tenant.name}
              </span>
            )}
          </div>
          
          {(user.role === 'ADMIN' || user.role === 'TENANT') && (
            <EscalationDropdown />
          )}

          <button 
            onClick={handleLogout}
            className="text-slate-400 hover:text-white transition-colors p-1"
            title="Terminate Session"
          >
            <LogOut className="w-4 h-4 md:w-5 md:h-5" />
          </button>
        </div>
      </div>
    </nav>
  );
}
