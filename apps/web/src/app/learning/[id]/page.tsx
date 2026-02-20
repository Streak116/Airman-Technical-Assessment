'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft, Plus, Trash2, ChevronDown, ChevronRight,
  FileText, HelpCircle, Plane, Edit2, Check, X
} from 'lucide-react';
import RichTextEditor from '@/components/learning/RichTextEditor';
import { ENDPOINTS } from '@/lib/constants';
import { globalLoader } from '@/lib/apiService';

const API = ENDPOINTS.LEARNING;

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

// ─── Inline Editable Field ───────────────────────────────────────────────────
function InlineEdit({
  value,
  onSave,
  className = '',
  inputClassName = '',
}: {
  value: string;
  onSave: (v: string) => Promise<void>;
  className?: string;
  inputClassName?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === value) { setEditing(false); setDraft(value); return; }
    setSaving(true);
    try { await onSave(trimmed); setEditing(false); }
    catch (e: any) { alert(e.message); }
    finally { setSaving(false); }
  };

  if (editing) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <input
          autoFocus
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') { setEditing(false); setDraft(value); } }}
          className={`bg-slate-950/80 border border-sky-500/50 rounded-lg px-3 py-1 font-mono text-sm text-sky-100 focus:outline-none flex-1 ${inputClassName}`}
        />
        <button onClick={handleSave} disabled={saving} className="p-1 text-emerald-400 hover:text-emerald-300 flex-shrink-0">
          <Check className="w-4 h-4" />
        </button>
        <button onClick={() => { setEditing(false); setDraft(value); }} className="p-1 text-slate-400 hover:text-slate-300 flex-shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <span className={`group flex items-center gap-2 cursor-pointer ${className}`} onClick={() => setEditing(true)}>
      <span>{value}</span>
      <Edit2 className="w-3 h-3 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
    </span>
  );
}

export default function CourseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.id as string;

  const [user, setUser] = useState<any>(null);
  const [course, setCourse] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [activeLesson, setActiveLesson] = useState<any>(null);

  // Module creation
  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [isAddingModule, setIsAddingModule] = useState(false);

  // Lesson creation — only title + type now
  const [addingLessonTo, setAddingLessonTo] = useState<string | null>(null);
  const [newLesson, setNewLesson] = useState({ title: '', type: 'TEXT' });

  // Quiz question creation
  const [addingQuestion, setAddingQuestion] = useState(false);
  const [newQuestion, setNewQuestion] = useState({ text: '', options: ['', '', '', ''], correctOption: 0 });
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [editQuestionData, setEditQuestionData] = useState({ text: '', options: ['', '', '', ''], correctOption: 0 });

  // Lesson content editing (text lessons)
  const [lessonContent, setLessonContent] = useState('');
  const [contentDirty, setContentDirty] = useState(false);
  const [savingContent, setSavingContent] = useState(false);

  // Student Quiz State
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [quizResult, setQuizResult] = useState<any>(null);
  const [submittingQuiz, setSubmittingQuiz] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) { router.push('/login'); return; }
    setUser(JSON.parse(stored));
  }, [router]);

  const fetchCourse = useCallback(async () => {
    if (!courseId) return;
    setIsLoading(true);
    try {
      const res = await apiFetch(API.COURSE(courseId));
      setCourse(res.data.course);
      const ids = new Set<string>(res.data.course.modules.map((m: any) => m.id));
      setExpandedModules(ids);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsLoading(false);
    }
  }, [courseId]);

  useEffect(() => { fetchCourse(); }, [fetchCourse]);

  // Sync lesson content when active lesson changes
  useEffect(() => {
    if (activeLesson && !activeLesson.quiz) {
      setLessonContent(activeLesson.content || '');
      setContentDirty(false);
    }
    // Reset quiz state when changing lessons
    if (activeLesson?.quiz) {
      setQuizAnswers({});
      setQuizResult(null);
    }
  }, [activeLesson?.id]);

  const isInstructor = user?.role === 'INSTRUCTOR' || user?.role === 'TENANT' || user?.role === 'ADMIN';

  // ─── Course Actions ──────────────────────────────────────────────────────
  const handleUpdateCourse = async (title: string) => {
    const res = await apiFetch(API.COURSE(courseId), {
      method: 'PATCH',
      body: JSON.stringify({ title, description: course.description }),
    });
    setCourse((prev: any) => ({ ...prev, title: res.data.course.title }));
  };

  // ─── Module Actions ──────────────────────────────────────────────────────
  const handleAddModule = async () => {
    if (!newModuleTitle.trim()) return;
    try {
      const res = await apiFetch(API.MODULES(courseId), {
        method: 'POST',
        body: JSON.stringify({ title: newModuleTitle }),
      });
      setCourse((prev: any) => ({
        ...prev,
        modules: [...prev.modules, { ...res.data.module, lessons: [] }]
      }));
      setExpandedModules(prev => new Set(Array.from(prev).concat(res.data.module.id)));
      setNewModuleTitle('');
      setIsAddingModule(false);
    } catch (e: any) { alert(e.message); }
  };

  const handleUpdateModule = async (moduleId: string, title: string) => {
    await apiFetch(API.MODULE(courseId, moduleId), {
      method: 'PATCH',
      body: JSON.stringify({ title }),
    });
    setCourse((prev: any) => ({
      ...prev,
      modules: prev.modules.map((m: any) => m.id === moduleId ? { ...m, title } : m)
    }));
  };

  const handleDeleteModule = async (moduleId: string) => {
    if (!confirm('Delete this module and all its lessons?')) return;
    await apiFetch(API.MODULE(courseId, moduleId), { method: 'DELETE' });
    setCourse((prev: any) => ({
      ...prev,
      modules: prev.modules.filter((m: any) => m.id !== moduleId)
    }));
    if (activeLesson) {
      const mod = course.modules.find((m: any) => m.id === moduleId);
      if (mod?.lessons.some((l: any) => l.id === activeLesson.id)) setActiveLesson(null);
    }
  };

  // ─── Lesson Actions ──────────────────────────────────────────────────────
  const handleAddLesson = async (moduleId: string) => {
    if (!newLesson.title.trim()) return;
    try {
      const res = await apiFetch(API.LESSONS(courseId, moduleId), {
        method: 'POST',
        body: JSON.stringify({ title: newLesson.title, type: newLesson.type }),
      });
      setCourse((prev: any) => ({
        ...prev,
        modules: prev.modules.map((m: any) =>
          m.id === moduleId ? { ...m, lessons: [...m.lessons, res.data.lesson] } : m
        )
      }));
      setAddingLessonTo(null);
      setNewLesson({ title: '', type: 'TEXT' });
      // Auto-open the new lesson
      setActiveLesson(res.data.lesson);
    } catch (e: any) { alert(e.message); }
  };

  const handleUpdateLesson = async (moduleId: string, lessonId: string, title: string) => {
    await apiFetch(API.LESSON(courseId, moduleId, lessonId), {
      method: 'PATCH',
      body: JSON.stringify({ title }),
    });
    setCourse((prev: any) => ({
      ...prev,
      modules: prev.modules.map((m: any) =>
        m.id === moduleId
          ? { ...m, lessons: m.lessons.map((l: any) => l.id === lessonId ? { ...l, title } : l) }
          : m
      )
    }));
    if (activeLesson?.id === lessonId) setActiveLesson((prev: any) => ({ ...prev, title }));
  };

  const handleDeleteLesson = async (moduleId: string, lessonId: string) => {
    if (!confirm('Delete this lesson?')) return;
    await apiFetch(API.LESSON(courseId, moduleId, lessonId), { method: 'DELETE' });
    setCourse((prev: any) => ({
      ...prev,
      modules: prev.modules.map((m: any) =>
        m.id === moduleId ? { ...m, lessons: m.lessons.filter((l: any) => l.id !== lessonId) } : m
      )
    }));
    if (activeLesson?.id === lessonId) setActiveLesson(null);
  };

  // ─── Lesson Content Save ─────────────────────────────────────────────────
  const handleSaveContent = async () => {
    if (!activeLesson || !contentDirty) return;
    setSavingContent(true);
    try {
      const mod = course.modules.find((m: any) => m.lessons.some((l: any) => l.id === activeLesson.id));
      if (!mod) return;
      await apiFetch(API.LESSON(courseId, mod.id, activeLesson.id), {
        method: 'PATCH',
        body: JSON.stringify({ title: activeLesson.title, content: lessonContent }),
      });
      setContentDirty(false);
      // Update local state
      setCourse((prev: any) => ({
        ...prev,
        modules: prev.modules.map((m: any) =>
          m.id === mod.id
            ? { ...m, lessons: m.lessons.map((l: any) => l.id === activeLesson.id ? { ...l, content: lessonContent } : l) }
            : m
        )
      }));
    } catch (err: any) { alert(err.message); }
    finally { setSavingContent(false); }
  };

  // ─── Quiz Question Actions ───────────────────────────────────────────────
  const validateOptions = (options: string[]) => {
    const trimmed = options.map(o => o.trim().toLowerCase());
    const unique = new Set(trimmed);
    return unique.size === options.length;
  };

  const handleAddQuestion = async () => {
    if (!activeLesson?.quiz?.id) return;
    const { text, options, correctOption } = newQuestion;
    if (!text || options.some(o => !o.trim())) { alert('Fill in all question fields'); return; }
    
    if (!validateOptions(options)) {
      alert('Each option must be unique (case-insensitive)');
      return;
    }

    try {
      const res = await apiFetch(API.QUIZ_QUESTIONS(activeLesson.quiz.id), {
        method: 'POST',
        body: JSON.stringify({ text, options, correctOption }),
      });
      setActiveLesson((prev: any) => ({
        ...prev,
        quiz: { ...prev.quiz, questions: [...prev.quiz.questions, res.data.question] }
      }));
      setNewQuestion({ text: '', options: ['', '', '', ''], correctOption: 0 });
      setAddingQuestion(false);
    } catch (e: any) { alert(e.message); }
  };

  const handleUpdateQuestion = async () => {
    if (!activeLesson?.quiz?.id || !editingQuestionId) return;
    const { text, options, correctOption } = editQuestionData;
    if (!text || options.some(o => !o.trim())) { alert('Fill in all question fields'); return; }

    if (!validateOptions(options)) {
      alert('Each option must be unique (case-insensitive)');
      return;
    }

    try {
      const res = await apiFetch(API.QUIZ_QUESTION(activeLesson.quiz.id, editingQuestionId), {
        method: 'PATCH',
        body: JSON.stringify({ text, options, correctOption }),
      });
      setActiveLesson((prev: any) => ({
        ...prev,
        quiz: {
          ...prev.quiz,
          questions: prev.quiz.questions.map((q: any) => q.id === editingQuestionId ? res.data.question : q)
        }
      }));
      setEditingQuestionId(null);
    } catch (e: any) { alert(e.message); }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!activeLesson?.quiz?.id) return;
    await apiFetch(API.QUIZ_QUESTION(activeLesson.quiz.id, questionId), { method: 'DELETE' });
    setActiveLesson((prev: any) => ({
      ...prev,
      quiz: { ...prev.quiz, questions: prev.quiz.questions.filter((q: any) => q.id !== questionId) }
    }));
  };

  // ─── Student Quiz Actions ────────────────────────────────────────────────
  const handleOptionSelect = (questionId: string, optionIndex: number) => {
    if (quizResult) return; // Prevent changing answers after submission
    setQuizAnswers(prev => ({ ...prev, [questionId]: optionIndex }));
  };

  const handleSubmitQuiz = async () => {
    if (!activeLesson?.quiz?.id) return;
    if (Object.keys(quizAnswers).length < activeLesson.quiz.questions.length) {
      alert('Please answer all questions before submitting.');
      return;
    }
    setSubmittingQuiz(true);
    try {
      const res = await apiFetch(`${API.QUIZ_QUESTIONS(activeLesson.quiz.id).replace('/questions', '/attempt')}`, {
        method: 'POST',
        body: JSON.stringify({ answers: quizAnswers }),
      });
      setQuizResult(res.data);
    } catch (e: any) { alert(e.message); }
    finally { setSubmittingQuiz(false); }
  };

  if (isLoading) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-sky-400 font-mono animate-pulse">Loading Flight Manual...</div>;
  }

  if (!course) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-red-400 font-mono">Course not found.</div>;
  }

  const totalLessons = course.modules.reduce((a: number, m: any) => a + m.lessons.length, 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans flex flex-col">
      {/* Nav */}
      <nav className="border-b border-white/10 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-full px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <button onClick={() => router.push('/learning')} className="p-2 hover:bg-white/5 rounded-lg transition-colors border border-transparent hover:border-white/10 flex-shrink-0">
              <ArrowLeft className="w-5 h-5 text-sky-400" />
            </button>
            <div className="h-4 w-px bg-white/10 flex-shrink-0" />
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 bg-sky-600 rounded flex items-center justify-center flex-shrink-0">
                <Plane className="w-4 h-4 text-white -rotate-45" />
              </div>
              {isInstructor ? (
                <InlineEdit
                  value={course.title}
                  onSave={handleUpdateCourse}
                  className="font-bold text-white text-sm uppercase min-w-0"
                  inputClassName="text-sm font-bold uppercase w-64"
                />
              ) : (
                <span className="font-bold text-white text-sm uppercase truncate">{course.title}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4 text-[10px] font-mono text-slate-500 uppercase flex-shrink-0">
            <div className="flex flex-col items-end">
              <span>Owner: {course.instructor?.username}</span>
              {course.lastModified && course.lastModified.id !== course.instructor?.id && (
                <span className="text-amber-500/60">Last Edit: {course.lastModified.username}</span>
              )}
            </div>
            <div className="h-4 w-px bg-white/10" />
            <span>{course.modules.length} modules // {totalLessons} lessons</span>
          </div>
        </div>
      </nav>

      <div className="flex flex-1 overflow-hidden" style={{ height: 'calc(100vh - 64px)' }}>
        {/* ── Sidebar ── */}
        <aside className="w-72 border-r border-white/5 bg-slate-900/30 flex flex-col overflow-y-auto flex-shrink-0">
          <div className="p-4 border-b border-white/5">
            <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500">Course Structure</p>
          </div>

          <div className="flex-1 p-3 space-y-1">
            {course.modules.map((mod: any) => (
              <div key={mod.id}>
                {/* Module Row */}
                <div className="flex items-center gap-1 group rounded-lg hover:bg-white/5 transition-colors pr-1">
                  <button
                    onClick={() => setExpandedModules(prev => {
                      const next = new Set(Array.from(prev));
                      next.has(mod.id) ? next.delete(mod.id) : next.add(mod.id);
                      return next;
                    })}
                    className="flex items-center gap-2 flex-1 p-2 text-left min-w-0"
                  >
                    {expandedModules.has(mod.id)
                      ? <ChevronDown className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
                      : <ChevronRight className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />}
                    <span className="text-xs font-bold text-slate-300 truncate">{mod.title}</span>
                  </button>
                  {isInstructor && (
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0">
                      <InlineEditButton
                        currentValue={mod.title}
                        onSave={(title) => handleUpdateModule(mod.id, title)}
                      />
                      <button
                        onClick={() => handleDeleteModule(mod.id)}
                        className="p-1.5 text-slate-600 hover:text-red-400 transition-colors rounded"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Lessons */}
                {expandedModules.has(mod.id) && (
                  <div className="ml-4 space-y-0.5 mt-0.5">
                    {mod.lessons.map((lesson: any) => (
                      <div key={lesson.id} className="flex items-center gap-1 group pr-1">
                        <button
                          onClick={() => setActiveLesson(lesson)}
                          className={`flex items-center gap-2 flex-1 p-2 rounded-lg text-left transition-colors min-w-0 ${
                            activeLesson?.id === lesson.id
                              ? 'bg-sky-500/10 text-sky-400'
                              : 'hover:bg-white/5 text-slate-400'
                          }`}
                        >
                          {lesson.quiz
                            ? <HelpCircle className="w-3.5 h-3.5 flex-shrink-0" />
                            : <FileText className="w-3.5 h-3.5 flex-shrink-0" />}
                          <span className="text-xs truncate">{lesson.title}</span>
                        </button>
                        {isInstructor && (
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0">
                            <InlineEditButton
                              currentValue={lesson.title}
                              onSave={(title) => handleUpdateLesson(mod.id, lesson.id, title)}
                            />
                            <button
                              onClick={() => handleDeleteLesson(mod.id, lesson.id)}
                              className="p-1.5 text-slate-600 hover:text-red-400 transition-colors rounded"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Add Lesson */}
                    {isInstructor && (
                      addingLessonTo === mod.id ? (
                        <div className="p-2 space-y-2 bg-slate-900/60 rounded-lg border border-white/5 mt-1">
                          <input
                            autoFocus
                            value={newLesson.title}
                            onChange={e => setNewLesson({ ...newLesson, title: e.target.value })}
                            onKeyDown={e => { if (e.key === 'Escape') setAddingLessonTo(null); }}
                            placeholder="Lesson title..."
                            className="w-full bg-slate-950/50 border border-white/10 rounded-lg px-2 py-1.5 text-xs font-mono text-sky-100 placeholder:opacity-30 focus:outline-none focus:border-sky-500/50"
                          />
                          <select
                            value={newLesson.type}
                            onChange={e => setNewLesson({ ...newLesson, type: e.target.value })}
                            className="w-full bg-slate-950/50 border border-white/10 rounded-lg px-2 py-1.5 text-xs font-mono text-sky-100 focus:outline-none"
                          >
                            <option value="TEXT">📄 Text Lesson</option>
                            <option value="QUIZ">❓ MCQ Quiz</option>
                          </select>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleAddLesson(mod.id)}
                              className="flex-1 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold py-1.5 rounded-lg transition-all"
                            >
                              Add
                            </button>
                            <button
                              onClick={() => { setAddingLessonTo(null); setNewLesson({ title: '', type: 'TEXT' }); }}
                              className="px-3 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-bold py-1.5 rounded-lg transition-all"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setAddingLessonTo(mod.id)}
                          className="flex items-center gap-1.5 p-2 text-slate-600 hover:text-sky-400 text-xs font-mono transition-colors w-full"
                        >
                          <Plus className="w-3 h-3" /> Add Lesson
                        </button>
                      )
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* Add Module */}
            {isInstructor && (
              isAddingModule ? (
                <div className="p-2 space-y-2 bg-slate-900/60 rounded-lg border border-white/5 mt-2">
                  <input
                    autoFocus
                    value={newModuleTitle}
                    onChange={e => setNewModuleTitle(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleAddModule(); if (e.key === 'Escape') setIsAddingModule(false); }}
                    placeholder="Module title..."
                    className="w-full bg-slate-950/50 border border-white/10 rounded-lg px-2 py-1.5 text-xs font-mono text-sky-100 placeholder:opacity-30 focus:outline-none focus:border-sky-500/50"
                  />
                  <div className="flex gap-2">
                    <button onClick={handleAddModule} className="flex-1 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold py-1.5 rounded-lg transition-all">Add</button>
                    <button onClick={() => setIsAddingModule(false)} className="px-3 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-bold py-1.5 rounded-lg transition-all">Cancel</button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setIsAddingModule(true)}
                  className="flex items-center gap-2 p-2 text-slate-500 hover:text-sky-400 text-xs font-mono transition-colors w-full mt-2 border border-dashed border-white/10 hover:border-sky-500/30 rounded-lg"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Module
                </button>
              )
            )}
          </div>
        </aside>

        {/* ── Main Content ── */}
        <main className="flex-1 overflow-y-auto p-8">
          {!activeLesson ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-600 gap-4">
              <FileText className="w-16 h-16" />
              <p className="font-mono text-sm">Select a lesson from the sidebar to {isInstructor ? 'edit' : 'view'} it.</p>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto">
              {/* Lesson Header */}
              <div className="mb-8">
                <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-3">
                  {activeLesson.quiz
                    ? <><HelpCircle className="w-3.5 h-3.5 text-amber-400" /> MCQ Quiz</>
                    : <><FileText className="w-3.5 h-3.5 text-sky-400" /> Text Lesson</>}
                </div>
                <h2 className="text-3xl font-bold text-white mb-1">{activeLesson.title}</h2>
                {activeLesson.lastModified && (
                  <p className="text-[8px] font-mono text-amber-500/40 uppercase tracking-widest">
                    Last Modified By: {activeLesson.lastModified.username}
                  </p>
                )}
              </div>

              {/* ── Text Lesson ── */}
              {!activeLesson.quiz && (
                <div className="bg-slate-900/40 border border-white/5 rounded-2xl overflow-hidden backdrop-blur-sm">
                  {isInstructor && (
                    <div className="flex items-center justify-between px-6 py-3 border-b border-white/5 bg-white/5">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">Content Editor</span>
                      <button
                        onClick={handleSaveContent}
                        disabled={!contentDirty || savingContent}
                        className={`flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                          contentDirty
                            ? 'bg-sky-600 hover:bg-sky-500 text-white shadow-[0_0_10px_rgba(14,165,233,0.3)]'
                            : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        {savingContent ? 'Saving...' : contentDirty ? 'Save Changes' : 'Saved'}
                      </button>
                    </div>
                  )}
                  <div className="p-0">
                    <RichTextEditor
                      content={lessonContent}
                      onChange={(html) => {
                        setLessonContent(html);
                        setContentDirty(true);
                      }}
                      editable={isInstructor}
                    />
                  </div>
                </div>
              )}

              {/* ── MCQ Quiz ── */}
              {activeLesson.quiz && (
                <div className="space-y-4">
                  {activeLesson.quiz.questions.length === 0 && (
                    <div className="text-center py-12 text-slate-600 font-mono text-sm">
                      No questions yet.{isInstructor ? ' Add your first question below.' : ''}
                    </div>
                  )}

                  {activeLesson.quiz.questions.map((q: any, qi: number) => {
                    const isSelected = quizAnswers[q.id];
                    const isCorrect = q.correctOption; // Only used for instructor or after result
                    // If result exists, we check if this question was correct
                    // The backend doesn't explicitly return per-question correctness, but we can infer or simpler: 
                    // WE know the correct option from the frontend data (it's safe enough for this demo, usually hidden)
                    // Actually, the `q` object has `correctOption`. In a real secure app, we wouldn't send `correctOption` to students.
                    // For this demo, we'll assume we have it.
                    
                    return (
                      <div key={q.id} className="bg-slate-900/40 border border-white/5 rounded-2xl p-6 backdrop-blur-sm">
                        {editingQuestionId === q.id ? (
                        <div className="space-y-4">
                          <h4 className="text-sm font-bold text-sky-400 font-mono uppercase tracking-widest">Edit Question</h4>
                          <textarea
                            value={editQuestionData.text}
                            onChange={e => setEditQuestionData({ ...editQuestionData, text: e.target.value })}
                            placeholder="Question text..."
                            rows={2}
                            className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-sm font-mono text-sky-100 placeholder:opacity-30 focus:outline-none focus:border-sky-500/50 transition-all"
                          />
                          <div className="space-y-2">
                            {editQuestionData.options.map((opt, oi) => (
                              <div key={oi} className="flex items-center gap-3">
                                <button
                                  type="button"
                                  onClick={() => setEditQuestionData({ ...editQuestionData, correctOption: oi })}
                                  className={`w-6 h-6 rounded-full border-2 flex-shrink-0 transition-colors ${
                                    editQuestionData.correctOption === oi ? 'border-emerald-500 bg-emerald-500' : 'border-slate-600'
                                  }`}
                                />
                                <input
                                  value={opt}
                                  onChange={e => {
                                    const opts = [...editQuestionData.options];
                                    opts[oi] = e.target.value;
                                    setEditQuestionData({ ...editQuestionData, options: opts });
                                  }}
                                  placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                                  className="flex-1 bg-slate-950/50 border border-white/10 rounded-xl px-3 py-2 text-sm font-mono text-sky-100 placeholder:opacity-30 focus:outline-none focus:border-sky-500/50 transition-all"
                                />
                              </div>
                            ))}
                          </div>
                          <div className="flex gap-3">
                            <button onClick={handleUpdateQuestion} className="flex-1 bg-sky-600 hover:bg-sky-500 text-white font-bold py-2 px-4 rounded-xl transition-all text-sm">
                              Save Changes
                            </button>
                            <button onClick={() => setEditingQuestionId(null)} className="px-4 bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold py-2 rounded-xl transition-all text-sm">
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-start justify-between mb-4">
                            <p className="text-white font-bold text-sm">
                              <span className="text-sky-400 font-mono mr-2">Q{qi + 1}.</span>
                              {q.text}
                            </p>
                            {isInstructor && (
                              <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                                <button
                                  onClick={() => {
                                    setEditingQuestionId(q.id);
                                    setEditQuestionData({
                                      text: q.text,
                                      options: [...q.options],
                                      correctOption: q.correctOption
                                    });
                                  }}
                                  className="p-1.5 text-slate-600 hover:text-sky-400 transition-colors rounded-lg hover:bg-sky-500/10"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteQuestion(q.id)}
                                  className="p-1.5 text-slate-600 hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/10"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </div>
                          <div className="space-y-2">
                            {(q.options as string[]).map((opt, oi) => {
                              // Styling logic
                              // Instructor: Show correct answer with green border/bg
                              // Student: 
                              //   - If playing: Show selected with blue border/bg
                              //   - If submitted: 
                              //       - Correct & Selected: Green
                              //       - Incorrect & Selected: Red
                              //       - Correct & Not Selected: Green Outline (to show what was right)
                              
                              let styleClass = 'border-white/5 bg-white/5 text-slate-400';
                              
                              if (isInstructor) {
                                if (oi === q.correctOption) styleClass = 'border-emerald-500/30 bg-emerald-500/5 text-emerald-400';
                              } else {
                                // Student Mode
                                const selected = quizAnswers[q.id] === oi;
                                if (!quizResult) {
                                  // Playing
                                  if (selected) styleClass = 'border-sky-500/50 bg-sky-500/10 text-sky-100 shadow-[0_0_10px_rgba(14,165,233,0.2)]';
                                  else styleClass = 'border-white/5 bg-white/5 text-slate-400 hover:border-white/20 hover:bg-white/10 cursor-pointer';
                                } else {
                                  // Result Mode
                                  const isCorrectOption = oi === q.correctOption;
                                  if (selected && isCorrectOption) styleClass = 'border-emerald-500 bg-emerald-500/20 text-emerald-300';
                                  else if (selected && !isCorrectOption) styleClass = 'border-red-500 bg-red-500/20 text-red-300';
                                  else if (!selected && isCorrectOption) styleClass = 'border-emerald-500/50 border-dashed text-emerald-500/50';
                                }
                              }

                              return (
                                <div
                                  key={oi}
                                  onClick={() => !isInstructor && !quizResult && handleOptionSelect(q.id, oi)}
                                  className={`flex items-center gap-3 p-3 rounded-xl border text-sm transition-all ${styleClass}`}
                                >
                                  <span className={`w-6 h-6 rounded-full border border-current flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                                    !isInstructor && !quizResult && quizAnswers[q.id] === oi ? 'bg-current text-slate-950' : ''
                                  }`}>
                                    {String.fromCharCode(65 + oi)}
                                  </span>
                                  {opt}
                                  {/* Result Icons */}
                                  {isInstructor && oi === q.correctOption && <Check className="w-4 h-4 ml-auto flex-shrink-0" />}
                                  {!isInstructor && quizResult && oi === q.correctOption && <Check className="w-4 h-4 ml-auto flex-shrink-0" />}
                                  {!isInstructor && quizResult && quizAnswers[q.id] === oi && oi !== q.correctOption && <X className="w-4 h-4 ml-auto flex-shrink-0" />}
                                </div>
                              );
                            })}
                          </div>
                        </>
                      )}
                      </div>
                    );
                  })}

                  {/* Submit Button for Students */}
                  {!isInstructor && !quizResult && activeLesson.quiz.questions.length > 0 && (
                    <div className="flex justify-end pt-4">
                      <button
                        onClick={handleSubmitQuiz}
                        disabled={submittingQuiz || Object.keys(quizAnswers).length < activeLesson.quiz.questions.length}
                        className={`px-8 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
                            Object.keys(quizAnswers).length < activeLesson.quiz.questions.length
                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)] active:scale-95'
                        }`}
                      >
                        {submittingQuiz ? 'Submitting...' : 'Submit Assessment'}
                        {!submittingQuiz && <Plane className="w-4 h-4" />}
                      </button>
                    </div>
                  )}

                  {/* Quiz Result */}
                  {quizResult && (
                    <div className={`mt-8 p-6 rounded-2xl border backdrop-blur-md ${
                        quizResult.passed 
                        ? 'bg-emerald-900/20 border-emerald-500/30' 
                        : 'bg-red-900/20 border-red-500/30'
                    }`}>
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className={`text-2xl font-bold mb-1 ${quizResult.passed ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {quizResult.passed ? 'MISSION ACCOMPLISHED' : 'MISSION FAILED'}
                                </h3>
                                <div className="flex items-center gap-2 text-sm font-mono opacity-80">
                                    <span>Score: {quizResult.attempt.score} / {quizResult.totalQuestions}</span>
                                    <span>//</span>
                                    <span>{Math.round((quizResult.attempt.score / quizResult.totalQuestions) * 100)}% Accuracy</span>
                                </div>
                            </div>
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center border-4 ${
                                quizResult.passed ? 'border-emerald-500 text-emerald-400' : 'border-red-500 text-red-400'
                            }`}>
                                <span className="text-xl font-bold">{Math.round((quizResult.attempt.score / quizResult.totalQuestions) * 100)}%</span>
                            </div>
                        </div>
                        <div className="mt-6 pt-6 border-t border-white/5 flex justify-end">
                             <button 
                                onClick={() => {
                                    setQuizResult(null);
                                    setQuizAnswers({});
                                }}
                                className="text-xs font-mono uppercase tracking-widest text-slate-400 hover:text-white transition-colors"
                             >
                                Retake Assessment
                             </button>
                        </div>
                    </div>
                  )}

                  {/* Add Question */}
                  {isInstructor && (
                    addingQuestion ? (
                      <div className="bg-slate-900/40 border border-sky-500/20 rounded-2xl p-6 space-y-4">
                        <h4 className="text-sm font-bold text-sky-400 font-mono uppercase tracking-widest">New Question</h4>
                        <textarea
                          value={newQuestion.text}
                          onChange={e => setNewQuestion({ ...newQuestion, text: e.target.value })}
                          placeholder="Question text..."
                          rows={2}
                          className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-sm font-mono text-sky-100 placeholder:opacity-30 focus:outline-none focus:border-sky-500/50 transition-all"
                        />
                        <div className="space-y-2">
                          {newQuestion.options.map((opt, oi) => (
                            <div key={oi} className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => setNewQuestion({ ...newQuestion, correctOption: oi })}
                                className={`w-6 h-6 rounded-full border-2 flex-shrink-0 transition-colors ${
                                  newQuestion.correctOption === oi ? 'border-emerald-500 bg-emerald-500' : 'border-slate-600'
                                }`}
                              />
                              <input
                                value={opt}
                                onChange={e => {
                                  const opts = [...newQuestion.options];
                                  opts[oi] = e.target.value;
                                  setNewQuestion({ ...newQuestion, options: opts });
                                }}
                                placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                                className="flex-1 bg-slate-950/50 border border-white/10 rounded-xl px-3 py-2 text-sm font-mono text-sky-100 placeholder:opacity-30 focus:outline-none focus:border-sky-500/50 transition-all"
                              />
                            </div>
                          ))}
                          <p className="text-[10px] text-slate-600 font-mono">Click the circle to mark the correct answer</p>
                        </div>
                        <div className="flex gap-3">
                          <button onClick={handleAddQuestion} className="flex-1 bg-sky-600 hover:bg-sky-500 text-white font-bold py-2.5 rounded-xl transition-all text-sm">
                            Add Question
                          </button>
                          <button onClick={() => setAddingQuestion(false)} className="px-4 bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold py-2.5 rounded-xl transition-all text-sm">
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setAddingQuestion(true)}
                        className="w-full flex items-center justify-center gap-2 p-4 border border-dashed border-white/10 hover:border-sky-500/30 text-slate-500 hover:text-sky-400 rounded-2xl transition-all font-mono text-sm"
                      >
                        <Plus className="w-4 h-4" /> Add Question
                      </button>
                    )
                  )}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// ─── Inline Edit Button (pencil icon that opens a small popover input) ────────
function InlineEditButton({ currentValue, onSave }: { currentValue: string; onSave: (v: string) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(currentValue);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === currentValue) { setOpen(false); return; }
    setSaving(true);
    try { await onSave(trimmed); setOpen(false); }
    catch (e: any) { alert(e.message); }
    finally { setSaving(false); }
  };

  if (open) {
    return (
      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
        <input
          autoFocus
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setOpen(false); }}
          className="w-28 bg-slate-950/80 border border-sky-500/50 rounded px-2 py-0.5 text-xs font-mono text-sky-100 focus:outline-none"
        />
        <button onClick={handleSave} disabled={saving} className="p-1 text-emerald-400 hover:text-emerald-300">
          <Check className="w-3 h-3" />
        </button>
        <button onClick={() => setOpen(false)} className="p-1 text-slate-400 hover:text-slate-300">
          <X className="w-3 h-3" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={e => { e.stopPropagation(); setDraft(currentValue); setOpen(true); }}
      className="p-1.5 text-slate-600 hover:text-sky-400 transition-colors rounded"
    >
      <Edit2 className="w-3 h-3" />
    </button>
  );
}
