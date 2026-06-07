import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Clock, ChevronRight, LogOut, BarChart2, Calendar, AlertCircle, CheckCircle2, Play, Trash2 } from 'lucide-react';
import { api } from '../lib/api';

const formatTime = (seconds = 0) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs.toString().padStart(2, '0')}s`;
};

export default function Dashboard() {
  const [quizzes, setQuizzes] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('available'); 
  
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || 'null');

  const fetchData = async () => {
    try {
      const [quizRes, attemptRes] = await Promise.all([
        api.get('/quizzes'),
        api.get('/attempts')
      ]);
      setQuizzes(quizRes.data);
      setAttempts(attemptRes.data);
    } catch (error) {
      console.error('Failed to fetch dashboard data', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/', { replace: true });
  };

  const handleDeleteHistory = async (attemptId) => {
    if (!window.confirm("Are you sure you want to delete this attempt history? This cannot be undone.")) return;
    try {
      await api.delete(`/attempts/${attemptId}`);
      fetchData(); // Refresh list
    } catch (err) {
      alert("Failed to delete history.");
    }
  };

  const getPendingCount = (attempt) => attempt.answers?.filter(a => a.needsManualReview).length || 0;

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-950 font-sans">
      <div className="mx-auto max-w-7xl px-6 py-8 lg:px-10">
        
        <header className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-neutral-500 font-semibold">Student Dashboard</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Welcome, {user?.name?.split(' ')[0] || 'Student'}</h1>
            <p className="mt-2 text-sm text-neutral-500">Manage your active assessments and review past results.</p>
          </div>
          <button onClick={handleLogout} className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-5 py-2.5 text-sm font-medium text-neutral-700 shadow-sm transition hover:border-neutral-300 hover:text-neutral-950">
            <LogOut size={16} /> Sign out
          </button>
        </header>

        <div className="flex items-center gap-8 mb-8 border-b border-neutral-200">
          <button onClick={() => setActiveTab('available')} className={`pb-4 text-sm font-semibold transition-colors relative ${activeTab === 'available' ? 'text-neutral-950' : 'text-neutral-400 hover:text-neutral-700'}`}>
            Available Assessments
            {activeTab === 'available' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-neutral-950 rounded-t-full"></span>}
          </button>
          <button onClick={() => setActiveTab('history')} className={`pb-4 text-sm font-semibold transition-colors relative ${activeTab === 'history' ? 'text-neutral-950' : 'text-neutral-400 hover:text-neutral-700'}`}>
            Your History
            {activeTab === 'history' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-neutral-950 rounded-t-full"></span>}
          </button>
        </div>

        {loading ? (
          <div className="rounded-3xl border border-neutral-200 bg-white p-12 text-center text-sm font-medium text-neutral-500">Loading your data...</div>
        ) : activeTab === 'available' ? (
          quizzes.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-neutral-300 bg-white p-12 text-center text-neutral-500">No published quizzes are available right now.</div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {quizzes.map((quiz) => (
                <button key={quiz._id} onClick={() => navigate(`/quiz/${quiz._id}`)} className="group flex flex-col rounded-3xl border border-neutral-200 bg-white p-6 text-left shadow-[0_4px_20px_rgba(0,0,0,0.02)] transition hover:-translate-y-1 hover:border-neutral-300 hover:shadow-md">
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-950 text-white transition group-hover:scale-105 shadow-sm"><BookOpen size={20} /></div>
                  <h3 className="text-lg font-semibold tracking-tight">{quiz.title}</h3>
                  <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-neutral-500 flex-1">{quiz.description || 'Standard verbal ability assessment.'}</p>
                  <div className="mt-6 flex w-full items-center justify-between border-t border-neutral-100 pt-5 text-sm">
                    <span className="inline-flex items-center gap-1.5 text-neutral-500 font-medium bg-neutral-50 px-3 py-1 rounded-lg"><Clock size={14} /> {formatTime(quiz.totalTimeSeconds || 0)}</span>
                    <span className="inline-flex items-center gap-1 font-semibold text-neutral-900 group-hover:text-emerald-600 transition-colors">Start <ChevronRight size={16} /></span>
                  </div>
                </button>
              ))}
            </div>
          )
        ) : (
          attempts.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-neutral-300 bg-white p-12 text-center text-neutral-500">You haven't attempted any assessments yet.</div>
          ) : (
            <div className="flex flex-col gap-4">
              {attempts.map(attempt => {
                const isCompleted = attempt.status === 'completed';
                const pendingCount = getPendingCount(attempt);
                
                return (
                  <div key={attempt._id} className="flex flex-col md:flex-row md:items-center justify-between p-5 bg-white border border-neutral-200 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.02)] transition hover:border-neutral-300">
                    <div className="flex items-center gap-5">
                      <div className={`p-4 rounded-xl flex items-center justify-center shadow-sm ${isCompleted ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                        {isCompleted ? <BarChart2 size={24} /> : <Play size={24} className="ml-1" />}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold tracking-tight text-neutral-900">{attempt.quizId?.title || 'Unknown Assessment'}</h3>
                        <div className="mt-1.5 flex flex-wrap items-center gap-3 text-sm text-neutral-500">
                          <span className="flex items-center gap-1.5 font-medium"><Calendar size={14} className="text-neutral-400" /> {new Date(attempt.updatedAt || attempt.createdAt).toLocaleDateString()}</span>
                          <span className="text-neutral-300">•</span>
                          {isCompleted ? (
                            pendingCount > 0 ? <span className="flex items-center gap-1.5 text-amber-600 font-medium bg-amber-50 px-2 py-0.5 rounded-md"><AlertCircle size={14} /> Pending Manual Review</span> : <span className="flex items-center gap-1.5 text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-md"><CheckCircle2 size={14} /> Fully Graded</span>
                          ) : <span className="text-amber-600 font-medium bg-amber-50 px-2 py-0.5 rounded-md">In Progress</span>}
                        </div>
                      </div>
                    </div>
                    <div className="mt-5 md:mt-0 flex gap-2 w-full md:w-auto">
                      <button onClick={() => navigate(isCompleted ? `/result/${attempt._id}` : `/quiz/${attempt.quizId?._id}`)} className={`flex-1 md:flex-none inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition shadow-sm border ${isCompleted ? 'bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-50' : 'bg-neutral-900 border-neutral-900 text-white hover:bg-neutral-800'}`}>
                        {isCompleted ? 'View Results' : 'Resume'} <ChevronRight size={16} className={isCompleted ? "text-neutral-400" : "text-white"} />
                      </button>
                      <button onClick={() => handleDeleteHistory(attempt._id)} className="inline-flex items-center justify-center rounded-xl px-4 py-3 border border-neutral-200 text-red-500 hover:bg-red-50 transition shadow-sm" title="Delete History">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>
    </div>
  );
}