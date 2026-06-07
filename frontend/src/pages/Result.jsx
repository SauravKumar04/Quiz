import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Clock, CircleDashed, RotateCcw, BookOpen } from 'lucide-react';
import { api } from '../lib/api';

const formatTime = (seconds = 0) => {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}m ${secs.toString().padStart(2, '0')}s`;
};

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
      } catch (err) {
        setError(err?.response?.data?.error || 'Failed to load result.');
      } finally {
        setLoading(false);
      }
    };
    fetchResult();
  }, [attemptId]);

  const quizQuestions = useMemo(() => Array.isArray(attempt?.quizId?.questions) ? attempt.quizId.questions : [], [attempt]);

  const summary = useMemo(() => {
    const answers = Array.isArray(attempt?.answers) ? attempt.answers : [];
    return {
      total: answers.length,
      attempted: answers.filter((a) => a.status === 'answered').length,
      skipped: answers.filter((a) => a.status === 'skipped').length,
      totalTime: attempt?.totalTimeTakenSeconds || 0,
    };
  }, [attempt]);

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-neutral-50 text-neutral-500 font-medium">Compiling your result...</div>;

  if (error || !attempt) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
        <div className="max-w-md rounded-3xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-neutral-950">Result Not Available</h1>
          <p className="mt-2 text-sm text-neutral-500">{error || 'Could not locate data.'}</p>
          <button onClick={() => navigate('/dashboard')} className="mt-6 rounded-2xl bg-neutral-900 px-6 py-3 text-sm font-semibold text-white hover:bg-neutral-800 transition">Back to dashboard</button>
        </div>
      </div>
    );
  }

  const answers = Array.isArray(attempt.answers) ? attempt.answers : [];

  return (
    <div className="min-h-screen bg-neutral-50 px-4 py-8 md:px-6 md:py-12 font-sans">
      <div className="mx-auto max-w-5xl space-y-8">
        
        {/* Header Ribbon */}
        <div className="overflow-hidden rounded-[28px] border border-neutral-200 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
          <div className="border-b border-neutral-200 bg-neutral-900 px-6 py-8 text-white md:px-10">
            <p className="text-xs uppercase tracking-[0.25em] text-neutral-400 font-semibold mb-2">Assessment Completed</p>
            <h1 className="text-3xl font-semibold tracking-tight">{attempt.quizId?.title || 'Quiz Result'}</h1>
            <p className="mt-2 text-sm text-neutral-300">Detailed breakdown of your submissions and expected solutions.</p>
          </div>

          <div className="grid grid-cols-2 gap-4 p-6 md:grid-cols-4 md:p-10">
            {[
              ['Total Parts', summary.total],
              ['Attempted', summary.attempted],
              ['Skipped', summary.skipped],
              ['Time Taken', formatTime(summary.totalTime)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-3xl border border-neutral-200 bg-neutral-50 p-5">
                <div className="text-xs uppercase tracking-[0.2em] text-neutral-500 font-semibold mb-2">{label}</div>
                <div className="text-2xl font-semibold text-neutral-900">{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Detailed Answers Section */}
        <div className="space-y-6">
          {answers.map((ans, idx) => {
            const question = quizQuestions.find((q) => String(q._id) === String(ans.questionId));

            return (
              <div key={ans._id || idx} className="rounded-[28px] border border-neutral-200 bg-white p-6 shadow-sm md:p-10">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between border-b border-neutral-100 pb-6 mb-6">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                      <span className="rounded-lg bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-600">Part {idx + 1}</span>
                      <span className={`rounded-lg px-3 py-1 text-xs font-semibold ${ans.status === 'answered' ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-500'}`}>
                        {ans.status === 'answered' ? 'Attempted' : 'Skipped'}
                      </span>
                    </div>
                    <h2 className="text-xl font-semibold tracking-tight text-neutral-900">{question?.title || 'Question Prompt'}</h2>
                  </div>
                  <div className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-2 text-sm font-mono font-medium text-neutral-600">
                    <Clock size={16} /> {formatTime(ans.timeTakenSeconds || 0)}
                  </div>
                </div>

                {question?.content && (
                  <div className="mb-6 rounded-2xl border border-neutral-200 bg-neutral-50 p-6">
                    <div className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-3">Context / Passage</div>
                    <div className="prose prose-neutral max-w-none prose-p:leading-relaxed text-sm text-neutral-700" dangerouslySetInnerHTML={{ __html: question.content }} />
                  </div>
                )}

                <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-inner">
                  <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-500">
                    <CircleDashed size={16} className="text-neutral-400" /> Your Submission
                  </div>
                  <div className="whitespace-pre-wrap text-base leading-relaxed text-neutral-900">
                    {ans.userAnswer || <span className="italic text-neutral-400">No response provided by the user.</span>}
                  </div>
                </div>

                {question?.expectedAnswer && (
                  <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-6 shadow-sm">
                    <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-700">
                      <BookOpen size={16} /> Expected Answer / Admin Rubric
                    </div>
                    <div className="prose prose-blue max-w-none text-blue-900 prose-p:leading-relaxed text-sm" dangerouslySetInnerHTML={{ __html: question.expectedAnswer }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex justify-center pt-6 pb-12">
          <button onClick={() => navigate('/dashboard')} className="inline-flex items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-8 py-4 text-sm font-semibold text-neutral-700 shadow-sm transition hover:border-neutral-300 hover:text-neutral-950 hover:bg-neutral-50">
            <RotateCcw size={16} /> Return to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}