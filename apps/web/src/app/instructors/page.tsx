'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Key, X, Users, Lock, ShieldCheck, Plane } from 'lucide-react';
import { apiService } from '@/lib/apiService';
import Navbar from '@/components/layout/Navbar';
import { encryptData } from '@/lib/crypto';

export default function InstructorsPage() {
  const router = useRouter();
  const [instructors, setInstructors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Add Instructor Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [addForm, setAddForm] = useState({ username: '', password: '' });

  // Reset Password Modal
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [selectedInstructor, setSelectedInstructor] = useState<any>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) { router.push('/login'); return; }
    const user = JSON.parse(storedUser);
    if (user.role !== 'TENANT') { router.push('/'); return; }

    const fetchInstructors = async () => {
      try {
        const res = await apiService.getMyInstructors();
        if (res.status === 'success') {
          setInstructors(res.data.instructors);
        }
      } catch (err: any) {
        setError('Failed to load instructors');
      } finally {
        setIsLoading(false);
      }
    };
    fetchInstructors();
  }, [router]);

  const handleAddInstructor = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const res = await apiService.createInstructor({
        username: encryptData(addForm.username),
        password: encryptData(addForm.password),
      });
      if (res.status === 'success') {
        setInstructors(prev => [...prev, res.data.instructor]);
        setIsAddModalOpen(false);
        setAddForm({ username: '', password: '' });
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create instructor');
    } finally {
      setIsCreating(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInstructor) return;
    setIsResetting(true);
    try {
      await apiService.updateInstructorPassword(selectedInstructor.id, {
        newPassword: encryptData(resetPassword),
      });
      alert(`Access key for ${selectedInstructor.username} has been re-synced.`);
      setIsResetModalOpen(false);
      setResetPassword('');
      setSelectedInstructor(null);
    } catch (err: any) {
      alert(err.message || 'Failed to update access key');
    } finally {
      setIsResetting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-sky-400 font-mono animate-pulse">
        Loading Flight Crew...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans">
      <Navbar />

      <main className="relative z-10 max-w-5xl mx-auto px-4 py-12">
        <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">Instructor Roster</h1>
            <p className="text-slate-400 font-mono text-[10px] uppercase tracking-[0.2em]">
              System: Airman Cockpit // Clearance: Academy Admin
            </p>
          </div>
          
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 bg-sky-600 hover:bg-sky-500 text-white text-[10px] font-bold px-4 py-2 rounded-lg transition-all shadow-[0_0_15px_rgba(14,165,233,0.3)] uppercase tracking-widest active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Commission Instructor
          </button>
        </header>

        <div className="h-px w-full bg-gradient-to-r from-transparent via-sky-500/20 to-transparent mb-12" />

        {error && (
          <div className="mb-8 p-4 bg-red-950/20 border border-red-500/30 rounded-xl flex items-center gap-3 text-red-400 text-sm">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
            {error}
          </div>
        )}

        {/* Stats Bar */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Total Instructors', value: instructors.length, color: 'sky' },
            { label: 'Active', value: instructors.length, color: 'emerald' },
            { label: 'Pending Assignment', value: 0, color: 'amber' },
          ].map(stat => (
            <div key={stat.label} className="bg-slate-900/40 border border-white/5 rounded-xl p-4 backdrop-blur-sm">
              <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-1">{stat.label}</p>
              <p className={`text-3xl font-bold text-${stat.color}-400`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Instructor Table */}
        <div className="bg-slate-900/40 border border-white/5 rounded-2xl overflow-hidden backdrop-blur-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-white/5 text-[10px] font-mono uppercase tracking-widest text-slate-400">
                <th className="px-6 py-4">Callsign / Username</th>
                <th className="px-6 py-4">Clearance Level</th>
                <th className="px-6 py-4">Commissioned</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono text-xs">
              {instructors.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3 text-slate-600">
                      <Users className="w-10 h-10" />
                      <p>No instructors assigned to this academy.</p>
                      <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="text-sky-400 hover:text-sky-300 transition-colors text-xs"
                      >
                        + Assign your first instructor
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                instructors.map(inst => (
                  <tr key={inst.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-4 text-sky-100 group-hover:text-sky-400 transition-colors font-bold">
                      {inst.username}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px]">
                        {inst.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {new Date(inst.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-emerald-500">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        ACTIVE
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => { setSelectedInstructor(inst); setIsResetModalOpen(true); }}
                        className="p-2 hover:bg-sky-500/10 text-slate-400 hover:text-sky-400 rounded-lg transition-colors"
                        title="Reset Access Key"
                      >
                        <Key className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* Add Instructor Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white flex items-center gap-3">
                <Plus className="w-5 h-5 text-sky-400" /> Assign Instructor
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleAddInstructor} className="p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-mono font-bold text-sky-400/80 uppercase tracking-widest flex items-center gap-2">
                  <Users className="w-3 h-3" /> Callsign (Username)
                </label>
                <div className="relative">
                  <Users className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                  <input
                    required
                    value={addForm.username}
                    onChange={e => setAddForm({ ...addForm, username: e.target.value })}
                    placeholder="INSTRUCTOR_CALLSIGN"
                    className="w-full bg-slate-950/50 border border-white/10 rounded-xl py-3 pl-10 pr-4 font-mono text-sm text-sky-100 placeholder:opacity-30 focus:outline-none focus:border-sky-500/50 transition-all uppercase"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-mono font-bold text-sky-400/80 uppercase tracking-widest flex items-center gap-2">
                  <Lock className="w-3 h-3" /> Security Access Key
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                  <input
                    required
                    type="password"
                    value={addForm.password}
                    onChange={e => setAddForm({ ...addForm, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full bg-slate-950/50 border border-white/10 rounded-xl py-3 pl-10 pr-4 font-mono text-sm text-sky-100 placeholder:opacity-30 focus:outline-none focus:border-sky-500/50 transition-all"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3 bg-sky-500/5 border border-sky-500/20 p-4 rounded-xl">
                <ShieldCheck className="w-7 h-7 text-sky-400 flex-shrink-0" />
                <p className="text-[10px] text-sky-200/60 font-mono leading-relaxed uppercase">
                  Instructor will have <span className="text-sky-400 font-bold">content creation</span> clearance. Data encrypted before uplink.
                </p>
              </div>
              <button
                type="submit"
                disabled={isCreating}
                className="w-full bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all shadow-[0_0_20px_rgba(14,165,233,0.3)]"
              >
                {isCreating ? 'Commissioning...' : 'Commission Instructor'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white flex items-center gap-3">
                <Key className="w-5 h-5 text-sky-400" /> Reset Access Key
              </h3>
              <button onClick={() => { setIsResetModalOpen(false); setSelectedInstructor(null); }} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleResetPassword} className="p-6 space-y-5">
              <div className="bg-sky-500/5 border border-sky-500/20 p-4 rounded-xl">
                <p className="text-[10px] text-sky-200/60 font-mono uppercase">
                  Regenerating key for: <span className="text-sky-400 font-bold">{selectedInstructor?.username}</span>
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-mono font-bold text-sky-400/80 uppercase tracking-widest flex items-center gap-2">
                  <Lock className="w-3 h-3" /> New Security Access Key
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                  <input
                    required
                    type="password"
                    value={resetPassword}
                    onChange={e => setResetPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950/50 border border-white/10 rounded-xl py-3 pl-10 pr-4 font-mono text-sm text-sky-100 placeholder:opacity-30 focus:outline-none focus:border-sky-500/50 transition-all"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={isResetting}
                className="w-full bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all shadow-[0_0_20px_rgba(14,165,233,0.3)]"
              >
                {isResetting ? 'Re-syncing...' : 'Update Access Key'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
