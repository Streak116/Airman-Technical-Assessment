'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Search, BookOpen, Layers, ChevronRight, Plane, Trash2, Edit2 } from 'lucide-react';
import { ENDPOINTS } from '@/lib/constants';
import Navbar from '@/components/layout/Navbar';

const API = ENDPOINTS.LEARNING;

async function apiFetch(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem('token');
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  // 204 No Content (e.g. DELETE) has no body — don't try to parse JSON
  if (res.status === 204 || res.headers.get('content-length') === '0') {
    if (!res.ok) throw new Error('Request failed');
    return { status: 'success' };
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

export default function LearningCenterPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Create course modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ title: '', description: '' });
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) { router.push('/login'); return; }
    setUser(JSON.parse(stored));
  }, [router]);

  const fetchCourses = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '9' });
      if (search) params.set('search', search);
      const res = await apiFetch(`${API.COURSES}?${params}`);
      setCourses(res.data.courses);
      setTotalPages(res.pages);
      setTotal(res.total);
    } catch (e: any) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [user, page, search]);

  useEffect(() => { fetchCourses(); }, [fetchCourses]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const res = await apiFetch(API.COURSES, {
        method: 'POST',
        body: JSON.stringify(createForm),
      });
      setCourses(prev => [res.data.course, ...prev]);
      setIsCreateOpen(false);
      setCreateForm({ title: '', description: '' });
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!confirm('Decommission this course? All modules and lessons will be erased.')) return;
    try {
      await apiFetch(API.COURSE(courseId), { method: 'DELETE' });
      setCourses(prev => prev.filter(c => c.id !== courseId));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const isInstructor = user?.role === 'INSTRUCTOR' || user?.role === 'TENANT' || user?.role === 'ADMIN';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans">
      <Navbar />

      <main className="relative z-10 max-w-7xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">Ground School</h1>
              <p className="text-slate-400 font-mono text-[10px] uppercase tracking-[0.2em]">
                {total} course{total !== 1 ? 's' : ''} available // {user?.role}
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              {/* Search */}
              <form onSubmit={handleSearch} className="flex gap-2">
                <div className="relative group">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500 group-focus-within:text-sky-400 transition-colors" />
                  <input
                    value={searchInput}
                    onChange={e => setSearchInput(e.target.value)}
                    placeholder="Search courses..."
                    className="bg-slate-900/60 border border-white/10 rounded-xl py-2 pl-9 pr-4 font-mono text-sm text-sky-100 placeholder:opacity-30 focus:outline-none focus:border-sky-500/50 transition-all w-full sm:w-64"
                  />
                </div>
                <button type="submit" className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-sky-400 text-xs font-bold rounded-xl border border-sky-400/20 transition-all active:scale-95">
                  Filter
                </button>
              </form>

              {isInstructor && (
                <button
                  onClick={() => setIsCreateOpen(true)}
                  className="flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-500 text-white text-[10px] font-bold px-6 py-2.5 rounded-xl transition-all shadow-[0_0_15px_rgba(14,165,233,0.3)] uppercase tracking-widest h-full whitespace-nowrap active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  New Course
                </button>
              )}
            </div>
          </div>
          <div className="h-px w-full bg-gradient-to-r from-transparent via-sky-500/20 to-transparent" />
        </div>

        {/* Course Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-slate-900/40 border border-white/5 rounded-2xl p-6 animate-pulse h-48" />
            ))}
          </div>
        ) : courses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-600 gap-4">
            <BookOpen className="w-16 h-16" />
            <p className="font-mono text-sm">No courses found{search ? ` for "${search}"` : ''}.</p>
            {isInstructor && (
              <button onClick={() => setIsCreateOpen(true)} className="text-sky-400 hover:text-sky-300 text-xs font-mono transition-colors">
                + Create your first course
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map(course => (
              <div
                key={course.id}
                className="bg-slate-900/40 border border-white/5 hover:border-sky-500/30 rounded-2xl p-6 backdrop-blur-sm transition-all duration-300 group hover:-translate-y-1 cursor-pointer relative"
                onClick={() => router.push(`/learning/${course.id}`)}
              >
                {isInstructor && (
                  <button
                    onClick={e => { e.stopPropagation(); handleDeleteCourse(course.id); }}
                    className="absolute top-4 right-4 p-1.5 hover:bg-red-500/10 text-slate-600 hover:text-red-400 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <BookOpen className="w-5 h-5 text-sky-400" />
                </div>
                <h3 className="text-white font-bold mb-1 group-hover:text-sky-400 transition-colors pr-6">{course.title}</h3>
                <p className="text-slate-500 text-xs mb-4 line-clamp-2">{course.description || 'No description provided.'}</p>
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-600">
                  <div className="flex items-center gap-1">
                    <Layers className="w-3 h-3" />
                    {course._count?.modules ?? 0} module{course._count?.modules !== 1 ? 's' : ''}
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    <span className="text-sky-500/60 uppercase tracking-[0.1em]">Owner: {course.instructor?.username}</span>
                    {course.lastModified && (
                      <span className="text-amber-500/60 uppercase tracking-[0.1em] text-[8px]">
                        Last Modified By: {course.lastModified.username}
                      </span>
                    )}
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-1 text-sky-400/60 text-xs font-mono group-hover:text-sky-400 transition-colors">
                  {isInstructor ? 'Edit Course' : 'View Course'} <ChevronRight className="w-3 h-3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-10">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-sky-400 text-xs font-bold rounded-xl border border-sky-400/20 transition-all"
            >
              ← Prev
            </button>
            <span className="text-slate-500 font-mono text-xs">{page} / {totalPages}</span>
            <button
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-sky-400 text-xs font-bold rounded-xl border border-sky-400/20 transition-all"
            >
              Next →
            </button>
          </div>
        )}
      </main>

      {/* Create Course Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white flex items-center gap-3">
                <Plus className="w-5 h-5 text-sky-400" /> New Course
              </h3>
              <button onClick={() => setIsCreateOpen(false)} className="p-2 hover:bg-white/5 rounded-lg transition-colors text-slate-400">✕</button>
            </div>
            <form onSubmit={handleCreateCourse} className="p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-mono font-bold text-sky-400/80 uppercase tracking-widest">Course Title</label>
                <input
                  required
                  value={createForm.title}
                  onChange={e => setCreateForm({ ...createForm, title: e.target.value })}
                  placeholder="e.g. Private Pilot Ground School"
                  className="w-full bg-slate-950/50 border border-white/10 rounded-xl py-3 px-4 font-mono text-sm text-sky-100 placeholder:opacity-30 focus:outline-none focus:border-sky-500/50 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-mono font-bold text-sky-400/80 uppercase tracking-widest">Description</label>
                <textarea
                  rows={3}
                  value={createForm.description}
                  onChange={e => setCreateForm({ ...createForm, description: e.target.value })}
                  placeholder="Brief overview of what students will learn..."
                  className="w-full bg-slate-950/50 border border-white/10 rounded-xl py-3 px-4 font-mono text-sm text-sky-100 placeholder:opacity-30 focus:outline-none focus:border-sky-500/50 transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={isCreating}
                className="w-full bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all shadow-[0_0_20px_rgba(14,165,233,0.3)]"
              >
                {isCreating ? 'Deploying...' : 'Deploy Course'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
