import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Clock, CircleDashed, RotateCcw, BookOpen } from 'lucide-react';
import { api } from '../lib/api';

const formatTime = (seconds = 0) => `${Math.floor(seconds / 60)}m ${(seconds % 60).toString().padStart(2, '0')}s`;

export default function Result() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchResult = async () => {
      try {
        const { data } = await api.get(`/attempts/${attemptId}`);
        setAttempt(data);
      } catch (err) { setError('Result not found.'); } finally { setLoading(false); }
    };
    fetchResult();
  }, [attemptId]);

  const quizQuestions = useMemo(() => Array.isArray(attempt?.quizId?.questions) ? attempt.quizId.questions : [], [attempt]);
  const answers = Array.isArray(attempt?.answers) ? attempt.answers : [];

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-neutral-50 font-medium text-neutral-500">Compiling result...</div>;

  return (
    <div className="min-h-screen bg-neutral-50 px-4 py-12 font-sans">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="overflow-hidden rounded-[32px] border border-neutral-200 bg-white shadow-sm">
          <div className="bg-neutral-900 px-10 py-10 text-white">
            <h1 className="text-3xl font-semibold tracking-tight">{attempt?.quizId?.title}</h1>
            <p className="mt-2 text-neutral-400">Assessment complete. Review your performance below.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-neutral-100 border-t border-neutral-100">
            {[['Total', answers.length], ['Attempted', answers.filter(a => a.status === 'answered').length], ['Skipped', answers.filter(a => a.status === 'skipped').length], ['Time', formatTime(attempt?.totalTimeTakenSeconds)]].map(([l, v]) => (
              <div key={l} className="p-6 text-center hover:bg-neutral-50 transition cursor-default">
                <div className="text-[10px] uppercase font-bold text-neutral-400 tracking-widest">{l}</div>
                <div className="text-xl font-bold mt-1 text-neutral-900">{v}</div>
              </div>
            ))}
          </div>
        </div>

        {answers.map((ans, idx) => {
          const q = quizQuestions.find((q) => String(q._id) === String(ans.questionId));
          return (
            <div key={ans._id} className="rounded-[32px] border border-neutral-200 bg-white p-8 shadow-sm">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Part {idx + 1}</span>
                  <h2 className="text-xl font-semibold mt-1">{q?.title}</h2>
                </div>
                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${ans.status === 'answered' ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100'}`}>
                  {ans.status}
                </span>
              </div>
              <div className="bg-neutral-50 p-6 rounded-2xl mb-6 text-sm text-neutral-700" dangerouslySetInnerHTML={{ __html: q?.content }} />
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-5 border border-neutral-200 rounded-2xl bg-white">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-2">Your Answer</div>
                  <p className="text-sm text-neutral-900">{ans.userAnswer || 'Skipped'}</p>
                </div>
                <div className="p-5 border border-blue-100 bg-blue-50/50 rounded-2xl">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-blue-500 mb-2">Rubric</div>
                  <div className="text-sm text-blue-900" dangerouslySetInnerHTML={{ __html: q?.expectedAnswer }} />
                </div>
              </div>
            </div>
          );
        })}
        <button onClick={() => navigate('/dashboard')} className="mx-auto flex items-center gap-2 px-6 py-3 bg-white border border-neutral-200 rounded-full font-semibold text-sm hover:border-neutral-400 transition active:scale-95 cursor-pointer">
          <RotateCcw size={16} /> Return to Dashboard
        </button>
      </div>
    </div>
  );
}