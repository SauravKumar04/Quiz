import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Clock, EyeOff, Sparkles, LogOut, Play } from 'lucide-react';
import { api } from '../lib/api';

const STORAGE_PREFIX = 'verbal-quiz-session';
const safeParse = (value) => { try { return JSON.parse(value); } catch { return null; } };
const formatClock = (seconds = 0) => {
  const total = Math.max(0, Math.floor(seconds));
  return `${Math.floor(total / 60)}:${(total % 60).toString().padStart(2, '0')}`;
};

export default function QuizEngine() {
  const { quizId } = useParams();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState('write');
  const [answer, setAnswer] = useState('');
  
  // Timers and Flow
  const [timeLeft, setTimeLeft] = useState(0);
  const [hasStarted, setHasStarted] = useState(false); // Controls Pre-Quiz Modal
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('Draft');

  const busyRef = useRef(false);
  const timerRef = useRef(null);
  const autosaveTimerRef = useRef(null);
  const lastSavedRef = useRef('');

  const currentQuestion = useMemo(() => quiz?.questions?.[currentIndex] || null, [quiz, currentIndex]);

  const persistState = () => {
    if (!attempt?._id) return;
    localStorage.setItem(`${STORAGE_PREFIX}:${attempt._id}`, JSON.stringify({ currentIndex, phase, answer, timeLeft }));
  };

  const clearPersistedState = () => localStorage.removeItem(`${STORAGE_PREFIX}:${attempt?._id}`);

  // Prevent Accidental Tab Close
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasStarted && !loading) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasStarted, loading]);

  useEffect(() => {
    const init = async () => {
      try {
        const { data } = await api.post(`/quizzes/${quizId}/start`);
        if (data.attempt.status === 'completed') return navigate(`/result/${data.attempt._id}`, { replace: true });

        setQuiz(data.quiz);
        setAttempt(data.attempt);

        const saved = safeParse(localStorage.getItem(`${STORAGE_PREFIX}:${data.attempt._id}`));
        const nextIndex = typeof saved?.currentIndex === 'number' ? saved.currentIndex : Math.max(0, data.attempt.answers.findIndex(a => a.status === 'unanswered'));
        
        setCurrentIndex(nextIndex);
        setPhase(saved?.phase || (data.quiz.questions[nextIndex]?.type === 'passageRecall' ? 'read' : 'write'));
        setAnswer(saved?.answer || '');
        setTimeLeft(typeof saved?.timeLeft === 'number' ? saved.timeLeft : (saved?.phase === 'read' ? data.quiz.questions[nextIndex]?.revealTime : data.quiz.questions[nextIndex]?.timeLimit));
        lastSavedRef.current = saved?.answer || '';
      } catch (err) {
        alert("Failed to load quiz");
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [quizId, navigate]);

  // Main Timer Logic
  useEffect(() => {
    if (hasStarted && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          persistState();
          return prev - 1;
        });
      }, 1000);
    } else if (hasStarted && timeLeft === 0) {
      handleTimeout();
    }
    return () => clearInterval(timerRef.current);
  }, [hasStarted, timeLeft]);

  const handleTimeout = async () => {
    if (busyRef.current) return;
    if (currentQuestion?.type === 'passageRecall' && phase === 'read') {
      setPhase('write');
      setTimeLeft(currentQuestion.timeLimit || 0);
      setAnswer('');
      lastSavedRef.current = '';
    } else {
      await saveCurrentAnswer({ advanceOnSave: true });
    }
  };

  const saveCurrentAnswer = async ({ advanceOnSave = false } = {}) => {
    if (!attempt?._id || !currentQuestion || busyRef.current) return;
    busyRef.current = true;
    setSaving(true);
    setSaveStatus('Saving...');

    try {
      const { data } = await api.post(`/attempts/${attempt._id}/submit`, {
        questionId: currentQuestion._id,
        userAnswer: answer,
        timeTakenSeconds: currentQuestion.timeLimit - timeLeft, // Approximate
        isFinal: currentIndex === quiz.questions.length - 1,
        advanceOnSave,
      });

      setAttempt(data);
      setSaveStatus('Saved');

      if (!advanceOnSave) {
        lastSavedRef.current = answer;
        setTimeout(() => setSaveStatus('Draft'), 2000);
        return;
      }

      if (data.status === 'completed' || currentIndex + 1 >= quiz.questions.length) {
        clearPersistedState();
        return navigate(`/result/${data._id}`, { replace: true });
      }

      const nextQ = quiz.questions[currentIndex + 1];
      setCurrentIndex(currentIndex + 1);
      setAnswer('');
      setPhase(nextQ.type === 'passageRecall' ? 'read' : 'write');
      setTimeLeft(nextQ.type === 'passageRecall' ? nextQ.revealTime : nextQ.timeLimit);
      setSaveStatus('Draft');
      lastSavedRef.current = '';
    } catch (err) {
      setSaveStatus('Draft');
    } finally {
      setSaving(false);
      busyRef.current = false;
    }
  };

  useEffect(() => {
    clearTimeout(autosaveTimerRef.current);
    if (hasStarted && phase !== 'read' && answer.trim() !== String(lastSavedRef.current || '').trim()) {
      setSaveStatus('Draft');
      autosaveTimerRef.current = setTimeout(() => saveCurrentAnswer({ advanceOnSave: false }), 1000);
    }
    return () => clearTimeout(autosaveTimerRef.current);
  }, [answer, hasStarted, phase]);

  const handleManualExit = () => {
    if (window.confirm("Pause Quiz? Your progress is saved and you can resume from the dashboard.")) {
      persistState();
      navigate('/dashboard');
    }
  };

  if (loading || !quiz || !currentQuestion) return <div className="flex h-screen items-center justify-center bg-neutral-50 text-neutral-500">Preparing session...</div>;

  // PRE-QUIZ MODAL
  if (!hasStarted) {
    return (
      <div className="flex h-screen items-center justify-center bg-neutral-100 p-4 font-sans">
        <div className="bg-white rounded-3xl shadow-xl max-w-lg w-full p-8 md:p-10 text-center border border-neutral-200">
          <div className="w-16 h-16 bg-neutral-900 text-white rounded-full flex items-center justify-center mx-auto mb-6"><Play size={28} className="ml-1" /></div>
          <h1 className="text-2xl font-bold text-neutral-900 mb-2">{quiz.title}</h1>
          <p className="text-neutral-500 mb-8 leading-relaxed">You are about to enter a secure, timed session. Do not refresh the page or use the back button. Your progress will autosave safely.</p>
          <div className="flex flex-col gap-3">
            <button onClick={() => setHasStarted(true)} className="w-full bg-neutral-900 text-white rounded-xl py-4 font-semibold hover:bg-neutral-800 transition shadow-md">Begin Assessment Now</button>
            <button onClick={() => navigate('/dashboard')} className="w-full bg-white text-neutral-600 rounded-xl py-3 font-semibold hover:bg-neutral-50 border border-neutral-200 transition">Cancel</button>
          </div>
        </div>
      </div>
    );
  }

  const isPassageRecall = currentQuestion.type === 'passageRecall';
  const isReadPhase = isPassageRecall && phase === 'read';

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-white text-neutral-950 font-sans">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-neutral-200 bg-white px-6 md:px-8">
        <div className="flex items-center gap-4">
          <button onClick={handleManualExit} className="text-neutral-400 hover:text-neutral-900 transition flex items-center gap-2 text-sm font-medium"><LogOut size={16}/> Pause & Exit</button>
          <span className="w-px h-6 bg-neutral-200 hidden sm:block"></span>
          <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-600">Part {currentIndex + 1} of {quiz.questions.length}</span>
        </div>
        <div className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-bold font-mono transition-colors ${timeLeft <= 10 ? 'bg-red-50 text-red-600 animate-pulse' : 'bg-neutral-50 text-neutral-900'}`}>
          <Clock size={16} className={timeLeft <= 10 ? 'text-red-500' : 'text-neutral-400'} />
          {formatClock(timeLeft)}
        </div>
      </header>

      <main className="flex flex-1 flex-col lg:flex-row overflow-hidden">
        {/* LEFT COLUMN: Prompt */}
        <section className="flex flex-col w-full lg:w-1/2 h-full overflow-y-auto bg-neutral-50 border-r border-neutral-200">
          <div className="mx-auto w-full max-w-2xl px-6 py-8 md:px-12 md:py-12">
            <h2 className="mb-8 text-3xl font-semibold tracking-tight text-neutral-900 leading-snug">{currentQuestion.title}</h2>
            {!isPassageRecall || isReadPhase ? (
              <div className="space-y-8">
                {currentQuestion.imageUrl && <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm"><img src={currentQuestion.imageUrl} alt="Reference" className="h-auto w-full object-contain" /></div>}
                {currentQuestion.content && <div className="prose prose-neutral prose-lg max-w-none text-neutral-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: currentQuestion.content }} />}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-neutral-300 bg-neutral-100/50 py-20 text-center px-6">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-neutral-200 mb-4"><EyeOff size={28} className="text-neutral-500" /></div>
                <h3 className="text-lg font-medium text-neutral-900">Passage Hidden</h3>
                <p className="mt-2 text-sm text-neutral-500 max-w-sm">The reading phase has ended. Rely on your memory to answer.</p>
              </div>
            )}
          </div>
        </section>

        {/* RIGHT COLUMN: Action */}
        <section className="flex flex-col w-full lg:w-1/2 h-full bg-white relative">
          {isReadPhase ? (
            <div className="flex flex-col h-full items-center justify-center p-12 text-center bg-white">
              <AlertTriangle size={48} className="text-amber-500 mb-6" />
              <h2 className="text-2xl font-semibold text-neutral-900 mb-3">Reading Phase Active</h2>
              <p className="text-lg text-neutral-500 max-w-md mx-auto leading-relaxed">Memorize the context on the left. It will disappear when the timer ends.</p>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between px-8 py-6 border-b border-neutral-100">
                <div className="text-sm font-medium text-neutral-700">Your Response</div>
                <div className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${saveStatus === 'Saved' ? 'text-emerald-600' : 'text-neutral-400'}`}>
                  {saveStatus === 'Saved' && <CheckCircle2 size={14} />} {saveStatus}
                </div>
              </div>
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Start typing your answer here..."
                spellCheck="false"
                className="flex-1 w-full resize-none bg-white px-8 py-6 text-lg text-neutral-800 leading-loose outline-none placeholder:text-neutral-300"
              />
              <div className="shrink-0 border-t border-neutral-100 bg-white px-8 py-6 flex items-center justify-between">
                <p className="text-xs text-neutral-400 max-w-xs leading-relaxed hidden sm:block">Work autosaves automatically.</p>
                <button onClick={() => saveCurrentAnswer({ advanceOnSave: true })} disabled={saving} className="inline-flex items-center gap-2 rounded-2xl bg-neutral-900 px-8 py-4 text-sm font-semibold text-white shadow-sm transition hover:bg-neutral-800 disabled:cursor-not-allowed">
                  {currentIndex === quiz.questions.length - 1 ? <><Sparkles size={16} /> Submit Assessment</> : 'Save & Next'}
                </button>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}