'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LayoutDashboard, Settings, ClipboardList, Calendar, UserCheck, Shield, User } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      router.push('/login');
    } else {
      setUser(JSON.parse(storedUser));
    }
  }, [router]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans">
      {/* HUD Background elements */}
      <div className="fixed inset-0 pointer-events-none opacity-20 z-0">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-sky-500 to-transparent shadow-[0_0_15px_rgba(14,165,233,0.5)]" />
        <div className="absolute inset-x-0 top-1/2 h-px bg-sky-500/10" />
        <div className="absolute inset-y-0 left-1/2 w-px bg-sky-500/10" />
      </div>

      {/* Navigation Bar */}
      <Navbar />

      <main className="relative z-10 max-w-7xl mx-auto px-4 py-12">
        <header className="mb-12">
          <h1 className="text-3xl font-bold text-white mb-2">Flight Operations Control</h1>
          <p className="text-slate-400 font-mono text-xs uppercase tracking-[0.2em]">Pilot: {user.username} // Academy: Miramar</p>
        </header>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {user.role === 'ADMIN' ? (
            <>
              <DashboardCard 
                title="Tenant Management" 
                desc="Onboard and manage flight school tenants" 
                icon={<LayoutDashboard className="w-6 h-6" />}
                accent="sky"
                onClick={() => router.push('/tenants')}
              />
              {/* <DashboardCard 
                title="Global Approvals" 
                desc="Review pending registrations across the network" 
                icon={<Shield className="w-6 h-6" />}
                accent="amber"
                onClick={() => router.push('/approvals')}
              /> */}
            </>
          ) : (
            <>
              {(user.role === 'TENANT' || user.role === 'INSTRUCTOR' || user.role === 'STUDENT') && (
                <DashboardCard 
                  title="Learning Center" 
                  desc="Ground school modules and materials" 
                  icon={<ClipboardList className="w-6 h-6" />}
                  accent="sky"
                  onClick={() => router.push('/learning')}
                />
              )}
              <DashboardCard 
                title="Flight Schedule" 
                desc="Manage bookings and instructor time" 
                icon={<Calendar className="w-6 h-6" />}
                accent="emerald"
                onClick={() => router.push('/schedule')}
              />
              {/* <DashboardCard 
                title="Profile & Logbook" 
                desc="Personal flight record and credentials" 
                icon={<User className="w-6 h-6" />}
                accent="amber"
              /> */}
              {user.role === 'TENANT' && (
                <>
                  <DashboardCard 
                    title="Student Approvals" 
                    desc="Process pending student registrations" 
                    icon={<UserCheck className="w-6 h-6" />}
                    accent="amber"
                    onClick={() => router.push('/approvals')}
                  />
                  <DashboardCard 
                    title="Instructor Management" 
                    desc="Manage academy instructors and access keys" 
                    icon={<Settings className="w-6 h-6" />}
                    accent="slate"
                    onClick={() => router.push('/instructors')}
                  />
                </>
              )}
            </>
          )}
        </div>

        {/* <section className="mt-12 bg-slate-900/40 border border-white/5 rounded-2xl p-8 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-white">Directives</h2>
            <span className="text-[10px] font-mono text-sky-400/50 uppercase tracking-widest">Live Updates</span>
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-white/5 rounded-lg border border-white/5">
              <div className="w-2 h-2 bg-sky-500 rounded-full" />
              <p className="text-sm text-slate-300">Phase 2 Core Infrastructure online. Authentication protocols engaged.</p>
            </div>
            <div className="flex items-center gap-4 p-4 bg-white/5 rounded-lg border border-white/5 opacity-50">
              <div className="w-2 h-2 bg-slate-500 rounded-full" />
              <p className="text-sm text-slate-400">Phase 3 Learning Modules awaiting deployment...</p>
            </div>
          </div>
        </section> */}
      </main>
    </div>
  );
}

function DashboardCard({ title, desc, icon, accent, onClick }: { title: string, desc: string, icon: any, accent: string, onClick?: () => void }) {
  const colors = {
    sky: 'border-sky-500/30 hover:border-sky-500/60 shadow-sky-500/5',
    emerald: 'border-emerald-500/30 hover:border-emerald-500/60 shadow-emerald-500/5',
    amber: 'border-amber-500/30 hover:border-amber-500/60 shadow-amber-500/5',
    slate: 'border-slate-500/30 hover:border-slate-500/60 shadow-slate-500/5',
  }[accent];

  return (
    <div 
      onClick={onClick}
      className={`bg-slate-900/60 backdrop-blur-sm border p-6 rounded-2xl transition-all duration-300 cursor-pointer group hover:-translate-y-1 shadow-xl ${colors}`}
    >
      <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-white font-bold mb-2">{title}</h3>
      <p className="text-slate-400 text-sm">{desc}</p>
    </div>
  );
}
