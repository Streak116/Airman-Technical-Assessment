'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  UserCheck, 
  UserX, 
  Clock, 
  Shield, 
  Search,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Plane
} from 'lucide-react';
import Navbar from '@/components/layout/Navbar';

export default function ApprovalsPage() {
  const router = useRouter();
  const [pendingStudents, setPendingStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    
    if (!userData || !token) {
      router.push('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    if (parsedUser.role === 'STUDENT') {
      router.push('/');
      return;
    }

    setUser(parsedUser);
    fetchPendingStudents(token);
  }, []);

  async function fetchPendingStudents(token: string) {
    try {
      const res = await fetch('http://localhost:4000/api/v1/users/pending-students', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.status === 'success') {
        setPendingStudents(data.data.students);
      }
    } catch (err) {
      console.error('Failed to fetch pending students:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(userId: string, action: 'approve' | 'suspend') {
    const token = localStorage.getItem('token');
    setActioningId(userId);
    try {
      const res = await fetch(`http://localhost:4000/api/v1/users/${userId}/${action}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.status === 'success') {
        setPendingStudents(prev => prev.filter(s => s.id !== userId));
      } else {
        alert(data.message || `Failed to ${action} user`);
      }
    } catch (err) {
      alert(`Error during ${action}`);
    } finally {
      setActioningId(null);
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <Plane className="w-8 h-8 text-sky-500 animate-pulse" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans">
      <Navbar />
      
      <div className="p-8">
        <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              Personnel Approval Queue
            </h1>
            <p className="text-slate-500 mt-1 font-mono text-sm uppercase tracking-wider">
              Verification required for system access
            </p>
          </div>
          <div className="flex items-center gap-3 bg-slate-900/50 border border-white/5 px-4 py-2 rounded-2xl backdrop-blur-md">
            <Shield className="w-5 h-5 text-sky-400" />
            <div className="text-xs font-mono">
              <span className="text-slate-500">Security Clearance:</span>
              <span className="ml-2 text-sky-400">{user?.role}</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-6 backdrop-blur-sm">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-sky-500/10 rounded-xl">
                <Clock className="w-6 h-6 text-sky-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{pendingStudents.length}</div>
                <div className="text-xs text-slate-500 uppercase tracking-tighter">Awaiting Approval</div>
              </div>
            </div>
          </div>
        </div>

        {/* List */}
        <div className="bg-slate-900/40 border border-white/5 rounded-3xl overflow-hidden backdrop-blur-md">
          <div className="p-6 border-b border-white/5 flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              Pending Registrations
              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] text-slate-400 font-mono">
                Real-time
              </span>
            </h2>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input 
                type="text" 
                placeholder="Search callsigns..." 
                className="bg-slate-950/50 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-sky-500/50 transition-all w-64"
              />
            </div>
          </div>

          <div className="divide-y divide-white/5">
            {pendingStudents.length === 0 ? (
              <div className="p-20 text-center">
                <CheckCircle2 className="w-12 h-12 text-slate-800 mx-auto mb-4" />
                <p className="text-slate-500 font-mono text-sm">No pending approvals detected.</p>
              </div>
            ) : (
              pendingStudents.map((student) => (
                <div key={student.id} className="p-6 flex items-center justify-between hover:bg-white/5 transition-colors group">
                  <div className="flex items-center gap-6">
                    <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-sky-500 font-bold border border-white/5 group-hover:border-sky-500/30 transition-all">
                      {student.username[0]}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white uppercase tracking-wider">{student.username}</span>
                        <span className="px-2 py-0.5 rounded-md bg-sky-500/10 text-[10px] text-sky-400 font-mono uppercase">
                          {student.role}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1 flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Joined {new Date(student.createdAt).toLocaleDateString()}
                        </span>
                        <span className="w-1 h-1 bg-slate-700 rounded-full" />
                        <span>Academy: {student.tenant?.name || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleAction(student.id, 'approve')}
                      disabled={actioningId === student.id}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-xl transition-all shadow-[0_4px_10px_rgba(16,185,129,0.2)] disabled:opacity-50"
                    >
                      <UserCheck className="w-4 h-4" />
                      {actioningId === student.id ? 'Processing...' : 'Approve'}
                    </button>
                    <button
                      onClick={() => handleAction(student.id, 'suspend')}
                      disabled={actioningId === student.id}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-red-950 text-slate-400 hover:text-red-400 text-sm font-bold rounded-xl border border-white/5 transition-all disabled:opacity-50"
                    >
                      <UserX className="w-4 h-4" />
                      Suspend
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Info */}
        <div className="mt-8 flex items-center gap-4 p-4 bg-sky-500/5 border border-sky-500/10 rounded-2xl">
          <Shield className="w-5 h-5 text-sky-500 flex-shrink-0" />
          <p className="text-xs text-sky-400/80 leading-relaxed font-mono">
            PROTOCOL ADVISORY: Approving a student grants them immediate access to the selected Academy's learning modules and operational data. Ensure all personnel have been verified against official academy rosters before granting system clearance.
          </p>
        </div>
        </div>
      </div>
    </div>
  );
}
