'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Building2, Save, Trash2, ShieldCheck, Mail, Phone, MapPin, AlignLeft, Users, Plus, X, Lock, Key } from 'lucide-react';
import { apiService } from '@/lib/apiService';
import Navbar from '@/components/layout/Navbar';
import { encryptData } from '@/lib/crypto';

function TenantFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const isNew = !id;

  const [isLoading, setIsLoading] = useState(!isNew);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    email: '',
    phone: '',
    address: ''
  });

  // Personnel State
  const [users, setUsers] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [userForm, setUserForm] = useState({ username: '', password: '' });

  // Password Reset State
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser || JSON.parse(storedUser).role !== 'ADMIN') {
      router.push('/');
      return;
    }

    if (!isNew && id) {
      const fetchData = async () => {
        try {
          const [tenantRes, usersRes] = await Promise.all([
            apiService.getTenant(id),
            apiService.getTenantUsers(id, page)
          ]);

          if (tenantRes.status === 'success') {
            const t = tenantRes.data.tenant;
            setFormData({
              name: t.name || '',
              description: t.description || '',
              email: t.email || '',
              phone: t.phone || '',
              address: t.address || ''
            });
          }

          if (usersRes.status === 'success') {
            setUsers(usersRes.data.users);
            setTotalPages(usersRes.pages || 1);
          }
        } catch (err: any) {
          setError('Failed to load academy data');
        } finally {
          setIsLoading(false);
        }
      };
      fetchData();
    }
  }, [id, isNew, router, page]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');

    try {
      if (isNew) {
        await apiService.createTenant(formData);
      } else if (id) {
        await apiService.updateTenant(id, formData);
      }
      router.push('/tenants');
    } catch (err: any) {
      setError(err.message || 'Saving failed. Check flight logs.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setIsCreatingUser(true);
    
    try {
      const encryptedData = {
        username: encryptData(userForm.username),
        password: encryptData(userForm.password)
      };
      
      const res = await apiService.createTenantUser(id, encryptedData);
      if (res.status === 'success') {
        setUsers([...users, res.data.user]);
        setIsUserModalOpen(false);
        setUserForm({ username: '', password: '' });
      }
    } catch (err: any) {
      alert(err.message || 'Failed to onboard personnel');
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !selectedUser) return;
    setIsResetting(true);

    try {
      const encryptedData = {
        newPassword: encryptData(resetPassword)
      };

      await apiService.updatePersonnelPassword(id, selectedUser.id, encryptedData);
      alert(`Access key for ${selectedUser.username} has been re-synced.`);
      setIsResetModalOpen(false);
      setResetPassword('');
      setSelectedUser(null);
    } catch (err: any) {
      alert(err.message || 'Failed to update access key');
    } finally {
      setIsResetting(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    if (!confirm('Are you sure you want to decommission this academy? All flight data will be grounded.')) return;
    
    try {
      await apiService.deleteTenant(id);
      router.push('/tenants');
    } catch (err: any) {
      setError('Decommissioning failed.');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-sky-400 font-mono animate-pulse">
        Initializing HUD...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">
              {isNew ? 'Academy Onboarding' : 'Modify Configuration'}
            </h1>
            <p className="text-slate-400 font-mono text-[10px] uppercase tracking-[0.2em]">
              System: Airman Cockpit // Node ID: {id?.slice(0, 8) || 'NEW'}
            </p>
          </div>

          <div className="flex items-center gap-3">
             {!isNew && (
               <button 
                 onClick={handleDelete}
                 className="p-1.5 hover:bg-red-500/10 text-red-500/60 hover:text-red-500 rounded-lg transition-colors group"
                 title="Decommission Node"
               >
                 <Trash2 className="w-4 h-4" />
               </button>
             )}
             <button 
               onClick={handleSubmit}
               disabled={isSaving}
               className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-[10px] font-bold px-4 py-2 rounded-lg transition-all shadow-[0_0_10px_rgba(16,185,129,0.2)] uppercase tracking-widest"
             >
               {isSaving ? 'Syncing...' : (
                 <>
                   <Save className="w-4 h-4" />
                   Sync Node
                 </>
               )}
             </button>
          </div>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-950/20 border border-red-500/30 rounded-xl flex items-center gap-3 text-red-400 text-sm">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
            {error}
          </div>
        )}

        <div className="space-y-12">
          {/* Main Details Section */}
          <section className="bg-slate-900/40 border border-white/5 rounded-2xl p-8 backdrop-blur-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <Building2 className="w-32 h-32 text-sky-400" />
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
              <div className="space-y-6 md:col-span-2">
                <div className="space-y-2">
                  <label className="text-[10px] font-mono font-bold text-sky-400/80 uppercase tracking-widest flex items-center gap-2">
                    <ShieldCheck className="w-3 h-3" /> Flight School Name
                  </label>
                  <input 
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="ALPHA BRAVO ACADEMY"
                    className="w-full bg-slate-950/50 border border-white/10 rounded-xl py-3 px-4 font-mono text-sm text-sky-100 placeholder:opacity-30 focus:outline-none focus:border-sky-500/50 focus:bg-slate-900/80 transition-all uppercase"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-mono font-bold text-sky-400/80 uppercase tracking-widest flex items-center gap-2">
                    <AlignLeft className="w-3 h-3" /> Operational Description
                  </label>
                  <textarea 
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    rows={3}
                    placeholder="Brief overview of site operations..."
                    className="w-full bg-slate-950/50 border border-white/10 rounded-xl py-3 px-4 font-mono text-sm text-sky-100 placeholder:opacity-30 focus:outline-none focus:border-sky-500/50 focus:bg-slate-900/80 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-mono font-bold text-sky-400/80 uppercase tracking-widest flex items-center gap-2">
                  <Mail className="w-3 h-3" /> Communication Frequency (Email)
                </label>
                <input 
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="OPS@SKYNET.COM"
                  className="w-full bg-slate-950/50 border border-white/10 rounded-xl py-3 px-4 font-mono text-sm text-sky-100 placeholder:opacity-30 focus:outline-none focus:border-sky-500/50 focus:bg-slate-900/80 transition-all uppercase"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-mono font-bold text-sky-400/80 uppercase tracking-widest flex items-center gap-2">
                  <Phone className="w-3 h-3" /> Secure Line (Phone)
                </label>
                <input 
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  placeholder="+1-800-PILOT"
                  className="w-full bg-slate-950/50 border border-white/10 rounded-xl py-3 px-4 font-mono text-sm text-sky-100 placeholder:opacity-30 focus:outline-none focus:border-sky-500/50 focus:bg-slate-900/80 transition-all"
                />
              </div>

              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-mono font-bold text-sky-400/80 uppercase tracking-widest flex items-center gap-2">
                  <MapPin className="w-3 h-3" /> Operations Hangar (Address)
                </label>
                <input 
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  placeholder="HANGAR 1, MIRAMAR AIR BASE"
                  className="w-full bg-slate-950/50 border border-white/10 rounded-xl py-3 px-4 font-mono text-sm text-sky-100 placeholder:opacity-30 focus:outline-none focus:border-sky-500/50 focus:bg-slate-900/80 transition-all uppercase"
                />
              </div>
            </form>
          </section>

          {/* Personnel Management Section */}
          {!isNew && (
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                    <Users className="w-6 h-6 text-sky-400" /> Academy Personnel
                  </h2>
                  <p className="text-slate-500 font-mono text-[10px] uppercase tracking-wider mt-1">Authorized Flight School Administrators</p>
                </div>
                <button 
                  onClick={() => setIsUserModalOpen(true)}
                  className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-sky-400 text-xs font-bold px-4 py-2 rounded-lg border border-sky-400/20 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Onboard User
                </button>
              </div>

              <div className="bg-slate-900/40 border border-white/5 rounded-2xl overflow-hidden backdrop-blur-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/5 text-[10px] font-mono uppercase tracking-widest text-slate-400">
                      <th className="px-6 py-4">Callsign / Username</th>
                      <th className="px-6 py-4">Clearance</th>
                      <th className="px-6 py-4">Registered Date</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono text-xs">
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-slate-600">No personnel registered for this node.</td>
                      </tr>
                    ) : (
                      users.map(u => (
                        <tr key={u.id} className="hover:bg-white/5 transition-colors group">
                          <td className="px-6 py-4 text-sky-100 group-hover:text-sky-400 transition-colors font-bold">{u.username}</td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-0.5 rounded-md bg-sky-500/10 border border-sky-500/20 text-sky-400 text-[9px]">{u.role}</span>
                          </td>
                          <td className="px-6 py-4 text-slate-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 text-emerald-500">
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              ACTIVE
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button 
                              onClick={() => {
                                setSelectedUser(u);
                                setIsResetModalOpen(true);
                              }}
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

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 mt-4">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-sky-400 text-xs rounded-lg transition-all"
                  >
                    Prev
                  </button>
                  <span className="text-slate-500 font-mono text-xs">{page} / {totalPages}</span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-sky-400 text-xs rounded-lg transition-all"
                  >
                    Next
                  </button>
                </div>
              )}
            </section>
          )}
        </div>
      </main>

      {/* User Onboarding Modal */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white flex items-center gap-3">
                <Plus className="w-5 h-5 text-sky-400" /> Onboard Personnel
              </h3>
              <button 
                onClick={() => setIsUserModalOpen(false)}
                className="p-2 hover:bg-white/5 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleAddUser} className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-mono font-bold text-sky-400/80 uppercase tracking-widest flex items-center gap-2">
                    <Users className="w-3 h-3" aria-hidden="true" /> Callsign (Username)
                  </label>
                  <div className="relative">
                    <Users className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                    <input 
                      required
                      value={userForm.username}
                      onChange={(e) => setUserForm({...userForm, username: e.target.value})}
                      placeholder="CALLSIGN_1"
                      className="w-full bg-slate-950/50 border border-white/10 rounded-xl py-3 pl-10 pr-4 font-mono text-sm text-sky-100 placeholder:opacity-30 focus:outline-none focus:border-sky-500/50 focus:bg-slate-900/80 transition-all uppercase"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-mono font-bold text-sky-400/80 uppercase tracking-widest flex items-center gap-2">
                    <Lock className="w-3 h-3" /> Security Access Key (Password)
                  </label>
                  <div className="relative">
                    <Key className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                    <input 
                      required
                      type="password"
                      value={userForm.password}
                      onChange={(e) => setUserForm({...userForm, password: e.target.value})}
                      placeholder="••••••••"
                      className="w-full bg-slate-950/50 border border-white/10 rounded-xl py-3 pl-10 pr-4 font-mono text-sm text-sky-100 placeholder:opacity-30 focus:outline-none focus:border-sky-500/50 focus:bg-slate-900/80 transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 bg-sky-500/5 border border-sky-500/20 p-4 rounded-xl">
                <ShieldCheck className="w-8 h-8 text-sky-400 flex-shrink-0" />
                <p className="text-[10px] text-sky-200/60 font-mono leading-relaxed uppercase">
                  This user will be granted <span className="text-sky-400 font-bold">level 1 academy clearance (TENANT)</span>. sensitive data is encrypted before uplink.
                </p>
              </div>

              <button 
                type="submit"
                disabled={isCreatingUser}
                className="w-full bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all shadow-[0_0_20px_rgba(14,165,233,0.3)] flex items-center justify-center gap-2"
              >
                {isCreatingUser ? 'Syncing...' : 'Complete Onboarding'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Access Key Reset Modal */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white flex items-center gap-3">
                <Key className="w-5 h-5 text-sky-400" /> Reset Access Key
              </h3>
              <button 
                onClick={() => {
                  setIsResetModalOpen(false);
                  setSelectedUser(null);
                }}
                className="p-2 hover:bg-white/5 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="p-6 space-y-6">
              <div className="bg-sky-500/5 border border-sky-500/20 p-4 rounded-xl">
                <p className="text-[10px] text-sky-200/60 font-mono leading-relaxed uppercase">
                  Regenerating access key for callsign: <span className="text-sky-400 font-bold">{selectedUser?.username}</span>
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
                    onChange={(e) => setResetPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950/50 border border-white/10 rounded-xl py-3 pl-10 pr-4 font-mono text-sm text-sky-100 placeholder:opacity-30 focus:outline-none focus:border-sky-500/50 focus:bg-slate-900/80 transition-all"
                  />
                </div>
              </div>

              <button 
                type="submit"
                disabled={isResetting}
                className="w-full bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all shadow-[0_0_20px_rgba(14,165,233,0.3)] flex items-center justify-center gap-2"
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

export default function TenantFormPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-sky-400 font-mono animate-pulse">Loading HUD...</div>}>
      <TenantFormContent />
    </Suspense>
  );
}
