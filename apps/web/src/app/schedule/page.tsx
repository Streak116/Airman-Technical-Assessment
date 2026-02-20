'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, Calendar as CalendarIcon, Clock, 
  ChevronLeft, ChevronRight, Plus, Check, X, User, Info
} from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import { ENDPOINTS } from '@/lib/constants';
import { globalLoader } from '@/lib/apiService';

const API = {
  BOOKINGS: `${process.env.NEXT_PUBLIC_API_URL}/bookings`,
};

async function apiFetch(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem('token');
  globalLoader.start();
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    });
    if (res.status === 204) return { status: 'success' };
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Request failed');
    return data;
  } finally {
    globalLoader.stop();
  }
}

export default function SchedulePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Calendar State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null); // ISO string of start time
  
  // Booking Modal State
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [bookingDuration, setBookingDuration] = useState(2); // hours
  const [selectedInstructor, setSelectedInstructor] = useState('');
  
  // Assign Instructor Modal State (Tenant)
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);

  // Cancellation Modal State
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  
  // Instructors List (for booking)
  const [instructors, setInstructors] = useState<any[]>([]);

  // Filter State
  const [viewFilter, setViewFilter] = useState('ALL'); // 'ALL' or instructorId

  // Tooltip State
  const [hoveredCancelReason, setHoveredCancelReason] = useState<{ x: number, y: number, text: string } | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) { router.push('/login'); return; }
    setUser(JSON.parse(stored));
  }, [router]);

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch bookings for the current week/month range
      // For MVP, increasing limit to ensure calendar populates properly
      const res = await apiFetch(`${API.BOOKINGS}?limit=100`);
      setBookings(res.data.bookings);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchInstructors = useCallback(async () => {
    try {
      // Re-using the tenant personnel endpoint if strictly needed, 
      // but for now we might need a dedicated endpoint or filtered list.
      // Let's assume we can get them from the tenant endpoint or a new one.
      // For MVP skynet-lite, let's skip strict instructor selection or just use a mock/empty for now
      // UNLESS we quickly add a "get instructors" endpoint.
      // Actually, we already have `GET /tenants/:id/instructors` from Phase 2!
      if (user?.tenantId) {
        const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/tenants/${user.tenantId}/instructors`);
        setInstructors(res.data.instructors);
      }
    } catch (e) { console.error(e); }
  }, [user?.tenantId]);

  useEffect(() => {
    fetchBookings();
    if (user?.role === 'STUDENT' || user?.role === 'TENANT') fetchInstructors();
  }, [fetchBookings, fetchInstructors, user?.role]);

  // ─── Actions ───────────────────────────────────────────────────────────────

  const handleCreateBooking = async () => {
    try {
        if (!bookingDate || !bookingTime) return alert('Please select date and time');
        
        const start = new Date(`${bookingDate}T${bookingTime}`);
        const end = new Date(start.getTime() + bookingDuration * 60 * 60 * 1000);

        await apiFetch(API.BOOKINGS, {
            method: 'POST',
            body: JSON.stringify({
                startTime: start.toISOString(),
                endTime: end.toISOString(),
                instructorId: selectedInstructor || undefined
            })
        });

        setIsBookingModalOpen(false);
        fetchBookings();
        alert('Booking requested successfully! Have a safe flight! ✈️');
    } catch (e: any) {
        alert(e.message);
    }
  };

  const handleAssignInstructor = async () => {
    if (!selectedBookingId || !selectedInstructor) return;
    try {
        await apiFetch(`${API.BOOKINGS}/${selectedBookingId}`, {
            method: 'PATCH',
            body: JSON.stringify({ instructorId: selectedInstructor, status: 'APPROVED' }) // Auto-approve on assignment
        });
        setIsAssignModalOpen(false);
        fetchBookings();
    } catch (e: any) { alert(e.message); }
  };

  const handleUpdateStatus = async (bookingId: string, status: string) => {
    // If cancelling, open modal instead of immediate call
    if (status === 'CANCELLED') {
        setSelectedBookingId(bookingId);
        setCancellationReason('');
        setIsCancelModalOpen(true);
        return;
    }

    try {
        await apiFetch(`${API.BOOKINGS}/${bookingId}`, {
            method: 'PATCH',
            body: JSON.stringify({ status })
        });
        fetchBookings();
    } catch (e: any) {
        alert(e.message);
    }
  };

  const confirmCancellation = async () => {
      if (!selectedBookingId) return;
      if (!cancellationReason.trim()) return alert('Please provide a reason for cancellation');

      try {
          await apiFetch(`${API.BOOKINGS}/${selectedBookingId}`, {
              method: 'PATCH',
              body: JSON.stringify({ status: 'CANCELLED', cancellationReason })
          });
          setIsCancelModalOpen(false);
          fetchBookings();
      } catch (e: any) {
          alert(e.message);
      }
  };

  // ─── Render Helpers ────────────────────────────────────────────────────────

  const getDaysInWeek = (date: Date) => {
    const days = [];
    const start = new Date(date);
    start.setDate(start.getDate() - start.getDay()); // Sunday
    for (let i = 0; i < 7; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        days.push(d);
    }
    return days;
  };

  const weekDays = getDaysInWeek(currentDate);

  const formatTime = (date: string) => {
      return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Group bookings by day for display
  const getBookingsForDay = (day: Date) => {
      return bookings.filter(b => {
          const bDate = new Date(b.startTime);
          const sameDay = bDate.getDate() === day.getDate() && 
                 bDate.getMonth() === day.getMonth() && 
                 bDate.getFullYear() === day.getFullYear();
          
          if (!sameDay) return false;
          
          // Filter Logic
          if (viewFilter === 'ALL') return true;
          if (viewFilter === 'MINE') {
             // For student: own bookings (already filtered by backend mostly, but double check)
             if (user.role === 'STUDENT') return b.student.id === user.id;
             // For instructor: assigned bookings
             if (user.role === 'INSTRUCTOR') return b.instructor?.id === user.id;
          }
          // Specific instructor filter (Tenant view)
          return b.instructor?.id === viewFilter;
      });
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans flex flex-col">
      <Navbar />
      
      <main className="flex-1 max-w-7xl mx-auto w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
                <button onClick={() => router.push('/')} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                    <ArrowLeft className="w-5 h-5 text-sky-400" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <CalendarIcon className="w-6 h-6 text-emerald-400" />
                        Flight Schedule
                    </h1>
                    <p className="text-slate-400 text-xs font-mono uppercase tracking-widest">
                        Week of {String(weekDays[0].getDate()).padStart(2, '0')}-{String(weekDays[0].getMonth() + 1).padStart(2, '0')}-{weekDays[0].getFullYear()}
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-3">
                {/* View Filter */}
                {(user.role === 'TENANT' || user.role === 'INSTRUCTOR') && (
                    <select 
                        value={viewFilter}
                        onChange={e => setViewFilter(e.target.value)}
                        className="bg-slate-900/50 border border-white/5 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none"
                    >
                        <option value="ALL">All Flights</option>
                        <option value="MINE">My Schedule</option>
                        {user.role === 'TENANT' && instructors.map((inst: any) => (
                            <option key={inst.id} value={inst.id}>{inst.username}</option>
                        ))}
                    </select>
                )}

                <div className="flex items-center bg-slate-900/50 rounded-lg p-1 border border-white/5">
                    <button 
                        onClick={() => setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() - 7)))}
                        className="p-1.5 hover:bg-white/5 rounded text-slate-400 hover:text-white"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={() => setCurrentDate(new Date())}
                        className="px-3 text-xs font-bold text-slate-300 hover:text-white"
                    >
                        Today
                    </button>
                    <button 
                        onClick={() => setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() + 7)))}
                        className="p-1.5 hover:bg-white/5 rounded text-slate-400 hover:text-white"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
                
                {user.role === 'STUDENT' && (
                    <button 
                        onClick={() => setIsBookingModalOpen(true)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                    >
                        <Plus className="w-4 h-4" /> Request Flight
                    </button>
                )}
            </div>
        </div>

        {/* Weekly Grid */}
        <div className="grid grid-cols-7 gap-4 mb-8">
            {weekDays.map((day, i) => {
                const isToday = new Date().toDateString() === day.toDateString();
                const dayBookings = getBookingsForDay(day);

                return (
                    <div key={i} className={`flex flex-col gap-3 ${isToday ? 'bg-slate-900/60 border-sky-500/30' : 'bg-slate-900/30 border-white/5'} border rounded-xl p-3 min-h-[400px]`}>
                        <div className={`text-center pb-2 border-b ${isToday ? 'border-sky-500/20' : 'border-white/5'}`}>
                            <p className="text-[10px] font-mono uppercase text-slate-500">{day.toLocaleDateString('en-US', { weekday: 'short' })}</p>
                            <p className={`text-lg font-bold ${isToday ? 'text-sky-400' : 'text-slate-300'}`}>{day.getDate()}</p>
                        </div>
                        
                        <div className="flex-1 space-y-2 overflow-y-auto custom-scrollbar">
                            {dayBookings.map(booking => (
                                <div key={booking.id} className={`p-3 rounded-lg border text-xs relative group transition-all hover:-translate-y-0.5 ${
                                    booking.status === 'REQUESTED' ? 'bg-amber-500/10 border-amber-500/30 text-amber-100' :
                                    booking.status === 'APPROVED' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-100' :
                                    booking.status === 'COMPLETED' ? 'bg-slate-800 border-slate-700 text-slate-400' :
                                    'bg-red-500/10 border-red-500/30 text-red-200/60'
                                }`}>
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="font-mono font-bold opacity-80">
                                            {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
                                        </span>
                                        {/* Student Cancel Option */}
                                        {user.role === 'STUDENT' && booking.status === 'REQUESTED' && booking.student.id === user.id && (
                                            <button 
                                                onClick={() => handleUpdateStatus(booking.id, 'CANCELLED')}
                                                className="p-1 text-red-400 hover:bg-red-500/20 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                                title="Cancel Request"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        )}
                                        {user.role === 'TENANT' && (
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2 bg-slate-950 rounded shadow-lg z-10">
                                                <button 
                                                    onClick={() => {
                                                        setSelectedBookingId(booking.id);
                                                        setSelectedInstructor(booking.instructor?.id || '');
                                                        setIsAssignModalOpen(true);
                                                    }}
                                                    className="p-1 text-sky-400 hover:bg-sky-500/20 rounded"
                                                    title="Assign Instructor"
                                                >
                                                    <User className="w-3 h-3" />
                                                </button>
                                                {booking.status === 'REQUESTED' && (
                                                    <button 
                                                        onClick={() => handleUpdateStatus(booking.id, 'APPROVED')}
                                                        className="p-1 text-emerald-400 hover:bg-emerald-500/20 rounded"
                                                        title="Approve Only"
                                                    >
                                                        <Check className="w-3 h-3" />
                                                    </button>
                                                )}
                                                <button 
                                                    onClick={() => handleUpdateStatus(booking.id, 'CANCELLED')}
                                                    className="p-1 text-red-400 hover:bg-red-500/20 rounded"
                                                    title="Reject/Cancel"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <div className="font-bold truncate" title={booking.student.username}>
                                        {booking.student.username}
                                    </div>
                                    {booking.instructor && (
                                        <div className="flex items-center gap-1 mt-1 opacity-70">
                                            <User className="w-3 h-3" />
                                            <span className="truncate">{booking.instructor.username}</span>
                                        </div>
                                    )}
                                    <div className="mt-2 text-[10px] uppercase tracking-wider font-mono opacity-60 flex items-center gap-1">
                                        {booking.status}
                                        {booking.status === 'CANCELLED' && booking.cancellationReason && (
                                            <div 
                                                className="cursor-help"
                                                onMouseEnter={(e) => {
                                                    const rect = e.currentTarget.getBoundingClientRect();
                                                    setHoveredCancelReason({
                                                        x: rect.left + rect.width / 2,
                                                        y: rect.top,
                                                        text: booking.cancellationReason
                                                    });
                                                }}
                                                onMouseLeave={() => setHoveredCancelReason(null)}
                                            >
                                                <Info className="w-3 h-3 text-red-300" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
      </main>

      {/* Booking Modal */}
      {isBookingModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <Plus className="w-5 h-5 text-emerald-400" />
                    Request Flight Time
                </h3>
                
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-mono uppercase text-slate-500 mb-2">Date (Min. 72h advance)</label>
                        <input 
                            type="date"
                            value={bookingDate}
                            onChange={e => setBookingDate(e.target.value)}
                            min={new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString().split('T')[0]}
                            className="w-full bg-slate-950/50 border border-white/10 rounded-lg px-4 py-3 text-sm text-white focus:border-emerald-500/50 focus:outline-none"
                        />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-mono uppercase text-slate-500 mb-2">Time</label>
                            <input 
                                type="time"
                                value={bookingTime}
                                onChange={e => setBookingTime(e.target.value)}
                                className="w-full bg-slate-950/50 border border-white/10 rounded-lg px-4 py-3 text-sm text-white focus:border-emerald-500/50 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-mono uppercase text-slate-500 mb-2">Duration (Hrs)</label>
                            <select 
                                value={bookingDuration}
                                onChange={e => setBookingDuration(Number(e.target.value))}
                                className="w-full bg-slate-950/50 border border-white/10 rounded-lg px-4 py-3 text-sm text-white focus:border-emerald-500/50 focus:outline-none"
                            >
                                <option value="1">1 Hour</option>
                                <option value="2">2 Hours</option>
                                <option value="3">3 Hours</option>
                                <option value="4">4 Hours</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-mono uppercase text-slate-500 mb-2">Instructor (Optional)</label>
                        <select 
                            value={selectedInstructor}
                            onChange={e => setSelectedInstructor(e.target.value)}
                            className="w-full bg-slate-950/50 border border-white/10 rounded-lg px-4 py-3 text-sm text-white focus:border-emerald-500/50 focus:outline-none"
                        >
                            <option value="">Any Available Instructor</option>
                            {instructors.map((inst: any) => (
                                <option key={inst.id} value={inst.id}>{inst.username}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="flex gap-3 mt-8">
                    <button 
                        onClick={handleCreateBooking}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                    >
                        Submit Request
                    </button>
                    <button 
                        onClick={() => setIsBookingModalOpen(false)}
                        className="px-6 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-xl transition-all"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Assign Instructor Modal */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <User className="w-5 h-5 text-sky-400" />
                    Assign Instructor
                </h3>
                
                <div className="space-y-4 mb-6">
                    <div>
                        <label className="block text-xs font-mono uppercase text-slate-500 mb-2">Select Instructor</label>
                        <select 
                            value={selectedInstructor}
                            onChange={e => setSelectedInstructor(e.target.value)}
                            className="w-full bg-slate-950/50 border border-white/10 rounded-lg px-4 py-3 text-sm text-white focus:border-sky-500/50 focus:outline-none"
                        >
                            <option value="">-- Select Instructor --</option>
                            {instructors.map((inst: any) => (
                                <option key={inst.id} value={inst.id}>{inst.username}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button 
                        onClick={handleAssignInstructor}
                        className="flex-1 bg-sky-600 hover:bg-sky-500 text-white font-bold py-2 rounded-xl transition-all"
                    >
                        Confirm Assignment
                    </button>
                    <button 
                        onClick={() => setIsAssignModalOpen(false)}
                        className="px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2 rounded-xl transition-all"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Cancellation Modal */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl border-red-500/20">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2 text-red-400">
                    <X className="w-5 h-5" />
                    Cancel Booking
                </h3>
                
                <div className="space-y-4 mb-6">
                    <div>
                        <label className="block text-xs font-mono uppercase text-slate-500 mb-2">Reason for Cancellation</label>
                        <textarea 
                            value={cancellationReason}
                            onChange={e => setCancellationReason(e.target.value)}
                            className="w-full bg-slate-950/50 border border-white/10 rounded-lg px-4 py-3 text-sm text-white focus:border-red-500/50 focus:outline-none h-24 resize-none"
                            placeholder="Please provide a reason..."
                        />
                    </div>
                </div>

                <div className="flex gap-3">
                    <button 
                        onClick={confirmCancellation}
                        className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-2 rounded-xl transition-all"
                    >
                        Confirm Cancel
                    </button>
                    <button 
                        onClick={() => setIsCancelModalOpen(false)}
                        className="px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2 rounded-xl transition-all"
                    >
                        Detailed
                    </button>
                </div>
            </div>
        </div>
      )}
      {/* Reason Tooltip */}
      {hoveredCancelReason && (
          <div 
              className="fixed z-[100] p-2 bg-slate-950 border border-white/10 rounded-lg shadow-xl text-[10px] text-slate-300 normal-case tracking-normal pointer-events-none w-48 -translate-x-1/2 -translate-y-full mt-[-8px]"
              style={{ top: hoveredCancelReason.y, left: hoveredCancelReason.x }}
          >
              {hoveredCancelReason.text}
              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-slate-950"></div>
          </div>
      )}
    </div>
  );
}
