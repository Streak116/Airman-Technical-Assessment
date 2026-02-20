import { useState, useEffect, useRef } from 'react';
import { Bell, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from '@/lib/constants';

interface Escalation {
  id: string;
  bookingId: string;
  message: string;
  createdAt: string;
  booking: {
    student: {
      username: string;
    };
    startTime: string;
  };
}

export default function EscalationDropdown() {
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    // Only fetch if admin or tenant
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.role !== 'ADMIN' && user.role !== 'TENANT') return;

    fetchEscalations();

    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchEscalations = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/escalations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.status === 'success') {
        setEscalations(data.data.escalations);
      }
    } catch (err) {
      console.error('Failed to fetch escalations', err);
    }
  };

  const handleDismiss = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_BASE_URL}/escalations/${id}/resolve`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      setEscalations(prev => prev.filter(esc => esc.id !== id));
    } catch (err) {
      console.error('Failed to dismiss escalation', err);
    }
  };

  const unreadCount = escalations.length;

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
        title="Escalations / Alerts"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-slate-900 animate-pulse" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl overflow-hidden z-50 transform origin-top-right transition-all">
          <div className="bg-slate-800/50 p-3 border-b border-slate-700 flex justify-between items-center">
            <h3 className="font-semibold text-slate-200 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Active Escalations
            </h3>
            <span className="text-xs font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded">
              {unreadCount}
            </span>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {escalations.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-sm">
                <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-50 text-emerald-500" />
                No active escalations. All flights have instructors.
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {escalations.map((esc) => (
                  <div 
                    key={esc.id}
                    className="p-3 hover:bg-slate-800/50 transition-colors group relative"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-xs font-mono text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">
                        UNASSIGNED
                      </span>
                      <button 
                        onClick={(e) => handleDismiss(e, esc.id)}
                        className="text-[10px] text-slate-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-widest"
                      >
                        Dismiss
                      </button>
                    </div>
                    <p className="text-sm text-slate-300 leading-snug mb-2">
                      {esc.message}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(esc.createdAt).toLocaleDateString()}
                      </span>
                      <span className="truncate">
                        Student: <span className="text-slate-400">{esc.booking.student.username}</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
