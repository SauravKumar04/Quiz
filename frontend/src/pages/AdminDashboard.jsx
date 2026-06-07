import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import RichTextEditor from '../components/RichTextEditor';
import { Edit2, LogOut, Plus, Save, Trash2, ClipboardCheck, User, MessageSquare, ChevronLeft, CheckCircle2 } from 'lucide-react';

const createQuestion = (index = 0) => ({ title: `Question ${index + 1}`, type: 'fillBlank', content: '', expectedAnswer: '', imageUrl: '', timeLimit: 120, revealTime: 30, allowManualReview: true, marks: 10, orderIndex: index + 1 });
const createDefaultForm = () => ({ title: '', description: '', isPublished: false, questions: [] });
const cloneQuizToForm = (quiz) => ({
  _id: quiz._id, title: quiz.title || '', description: quiz.description || '', isPublished: !!quiz.isPublished,
  questions: (quiz.questions || []).map((q, idx) => ({ ...q, timeLimit: q.timeLimit || 120, revealTime: q.revealTime || 30, marks: q.marks || 10, orderIndex: q.orderIndex || idx + 1 }))
});

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('quizzes'); // 'quizzes' | 'grading'
  
  // Quizzes State
  const [quizzes, setQuizzes] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(createDefaultForm());
  
  // Grading State
  const [reviews, setReviews] = useState([]);
  const [selectedReview, setSelectedReview] = useState(null);
  const [gradingForms, setGradingForms] = useState({});

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const user = JSON.parse(localStorage.getItem('user') || 'null');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [quizRes, reviewRes] = await Promise.all([
        api.get('/admin/quizzes'),
        api.get('/admin/reviews')
      ]);
      setQuizzes(quizRes.data);
      setReviews(reviewRes.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const savedDraft = localStorage.getItem('adminQuizDraft');
    if (savedDraft && !editingId) {
      try { setFormData(JSON.parse(savedDraft)); } catch { localStorage.removeItem('adminQuizDraft'); }
    }
    fetchData();
  }, []);

  useEffect(() => {
    if (!editingId && isCreating) localStorage.setItem('adminQuizDraft', JSON.stringify(formData));
  }, [formData, editingId, isCreating]);

  const stats = useMemo(() => ({
    total: quizzes.length,
    published: quizzes.filter(q => q.isPublished).length,
    pendingGrades: reviews.length,
  }), [quizzes, reviews]);

  // --- QUIZ MANAGEMENT LOGIC ---
  const uploadQuizImage = async (file) => {
    const fd = new FormData(); fd.append('file', file);
    const { data } = await api.post('/uploads/image', fd, { headers: { 'Content-Type': 'multipart/form-data' }});
    return data.url;
  };
  const addQuestion = () => setFormData(prev => ({ ...prev, questions: [...prev.questions, createQuestion(prev.questions.length)] }));
  const updateQuestion = (index, field, value) => {
    setFormData(prev => {
      const next = [...prev.questions];
      next[index] = { ...next[index], [field]: value };
      if (field === 'type' && value !== 'passageRecall') next[index].revealTime = 0;
      return { ...prev, questions: next };
    });
  };
  const removeQuestion = (index) => setFormData(prev => ({ ...prev, questions: prev.questions.filter((_, i) => i !== index) }));
  
  const handleSaveQuiz = async () => {
    setSaving(true);
    try {
      const payload = {
        ...formData,
        questions: (formData.questions || []).map((q, index) => ({
          ...q, orderIndex: index + 1, timeLimit: Math.max(1, Number(q.timeLimit) || 120),
          revealTime: q.type === 'passageRecall' ? Math.max(0, Number(q.revealTime) || 0) : 0,
          marks: Math.max(0, Number(q.marks) || 0),
        })),
      };
      if (editingId) await api.put(`/admin/quizzes/${editingId}`, payload);
      else { await api.post('/admin/quizzes', payload); localStorage.removeItem('adminQuizDraft'); }

      setIsCreating(false); setEditingId(null); setFormData(createDefaultForm()); await fetchData();
    } catch (error) { alert(error?.response?.data?.error || 'Error saving quiz.'); } finally { setSaving(false); }
  };
  
  const handleEdit = (quiz) => { setFormData(cloneQuizToForm(quiz)); setEditingId(quiz._id); setIsCreating(true); };
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this quiz permanently?')) return;
    try { await api.delete(`/admin/quizzes/${id}`); await fetchData(); } catch (error) { alert('Error deleting quiz.'); }
  };

  // --- MANUAL GRADING LOGIC ---
  const openReviewPanel = (attempt) => {
    const initialForms = {};
    attempt.answers.forEach(a => {
      if (a.needsManualReview) initialForms[a._id] = { marks: 0, feedback: '' };
    });
    setGradingForms(initialForms);
    setSelectedReview(attempt);
  };

  const handleGradeInput = (answerId, field, value) => {
    setGradingForms(prev => ({ ...prev, [answerId]: { ...prev[answerId], [field]: value } }));
  };

  const submitGrade = async (answerId, maxMarks) => {
    const form = gradingForms[answerId];
    if (form.marks > maxMarks || form.marks < 0) return alert(`Marks must be between 0 and ${maxMarks}`);
    
    try {
      await api.patch(`/admin/attempts/${selectedReview._id}/answers/${answerId}/evaluate`, {
        marksAwarded: form.marks,
        adminFeedback: form.feedback
      });

      // Update Local State without refetching immediately for smooth UX
      const updatedReview = { ...selectedReview };
      const ansIndex = updatedReview.answers.findIndex(a => a._id === answerId);
      updatedReview.answers[ansIndex].needsManualReview = false;

      const remaining = updatedReview.answers.filter(a => a.needsManualReview).length;
      if (remaining === 0) {
        setSelectedReview(null);
        await fetchData(); // Full refresh when attempt is complete
      } else {
        setSelectedReview(updatedReview);
      }
    } catch (err) {
      alert("Failed to save grade.");
    }
  };

  const handleLogout = () => { localStorage.clear(); navigate('/', { replace: true }); };

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-950 font-sans">
      <div className="mx-auto max-w-7xl px-6 py-8 lg:px-10">
        
        {/* Header */}
        <header className="mb-10 flex flex-col gap-4 border-b border-neutral-200 pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-neutral-500 font-bold">System Admin</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Welcome, {user?.name || 'Admin'}</h1>
            <p className="mt-2 text-sm text-neutral-500">Build quizzes and manually grade subjective responses.</p>
          </div>
          <button onClick={handleLogout} className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-5 py-2.5 text-sm font-medium text-neutral-700 transition hover:border-neutral-300 hover:text-neutral-950 shadow-sm">
            <LogOut size={16} /> Sign out
          </button>
        </header>

        {/* Tab Navigation */}
        <div className="flex items-center gap-8 mb-8 border-b border-neutral-200">
          <button onClick={() => { setActiveTab('quizzes'); setSelectedReview(null); }} className={`pb-4 text-sm font-semibold transition-colors relative ${activeTab === 'quizzes' ? 'text-neutral-950' : 'text-neutral-400 hover:text-neutral-700'}`}>
            Manage Quizzes
            {activeTab === 'quizzes' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-neutral-950 rounded-t-full"></span>}
          </button>
          <button onClick={() => setActiveTab('grading')} className={`pb-4 text-sm font-semibold transition-colors relative ${activeTab === 'grading' ? 'text-neutral-950' : 'text-neutral-400 hover:text-neutral-700'}`}>
            Manual Grading {reviews.length > 0 && <span className="ml-1.5 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{reviews.length}</span>}
            {activeTab === 'grading' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-neutral-950 rounded-t-full"></span>}
          </button>
        </div>

        {/* Stats */}
        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          {[['Total quizzes', stats.total], ['Published', stats.published], ['Pending Grades', stats.pendingGrades]].map(([label, value]) => (
            <div key={label} className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
              <div className="text-xs uppercase tracking-[0.2em] text-neutral-500 font-semibold">{label}</div>
              <div className="mt-2 text-3xl font-semibold text-neutral-900">{value}</div>
            </div>
          ))}
        </div>

        {/* --- QUIZZES TAB --- */}
        {activeTab === 'quizzes' && (
          isCreating ? (
            <div className="overflow-hidden rounded-[28px] border border-neutral-200 bg-white shadow-sm mb-12">
               <div className="border-b border-neutral-200 bg-neutral-950 text-white px-6 py-5 md:px-8">
                 <h2 className="text-xl font-semibold tracking-tight">{editingId ? 'Edit Assessment' : 'Create New Assessment'}</h2>
               </div>
               
               {/* Form Content (unchanged styling) */}
               <div className="space-y-8 px-6 py-6 md:px-8 md:py-8">
                 <div className="grid gap-4">
                   <input className="w-full rounded-2xl border border-neutral-200 px-4 py-3 text-2xl font-semibold outline-none transition focus:border-neutral-950" placeholder="Quiz title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
                   <textarea className="min-h-[100px] w-full resize-none rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none transition focus:border-neutral-950" placeholder="Instructions..." value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
                   <label className="inline-flex w-fit items-center gap-2 rounded-xl bg-neutral-50 px-4 py-3 text-sm font-medium border border-neutral-200">
                     <input type="checkbox" checked={formData.isPublished} onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })} className="h-4 w-4 rounded text-neutral-950 focus:ring-neutral-950" /> Publish immediately
                   </label>
                 </div>

                 <div className="space-y-5">
                   {formData.questions.map((question, index) => (
                     <div key={index} className="rounded-3xl border border-neutral-200 bg-neutral-50 p-6 shadow-sm">
                       <div className="mb-4 flex items-center justify-between">
                         <div className="text-sm font-bold text-neutral-700 bg-white px-3 py-1 rounded-md border border-neutral-200">Question {index + 1}</div>
                         <button onClick={() => removeQuestion(index)} className="rounded-xl p-2 text-red-500 hover:bg-red-50"><Trash2 size={18} /></button>
                       </div>
                       
                       <div className="grid gap-4 md:grid-cols-2 mb-4">
                         <div>
                           <label className="mb-1 block text-sm font-semibold text-neutral-700">Type</label>
                           <select className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:border-neutral-950" value={question.type} onChange={(e) => updateQuestion(index, 'type', e.target.value)}>
                             <option value="fillBlank">Fill in the blank (Auto Graded)</option>
                             <option value="passageRecall">Passage Recall (Manual Grade)</option>
                             <option value="emailWriting">Email Writing (Manual Grade)</option>
                           </select>
                         </div>
                         <div className="grid grid-cols-2 gap-3">
                           <div>
                             <label className="mb-1 block text-sm font-semibold text-neutral-700">Reveal (sec)</label>
                             <input type="number" disabled={question.type !== 'passageRecall'} className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:border-neutral-950 disabled:bg-neutral-100 disabled:text-neutral-400" value={question.revealTime} onChange={(e) => updateQuestion(index, 'revealTime', e.target.value)} />
                           </div>
                           <div>
                             <label className="mb-1 block text-sm font-semibold text-neutral-700">Time (sec)</label>
                             <input type="number" className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:border-neutral-950" value={question.timeLimit} onChange={(e) => updateQuestion(index, 'timeLimit', e.target.value)} />
                           </div>
                         </div>
                       </div>

                       <div className="space-y-4 bg-white p-4 rounded-2xl border border-neutral-200">
                         <div>
                           <label className="mb-1 block text-sm font-semibold text-neutral-700">Prompt / Content</label>
                           <RichTextEditor value={question.content} onChange={(html) => updateQuestion(index, 'content', html)} onUploadImage={uploadQuizImage} />
                         </div>
                         <div>
                           <label className="mb-1 block text-sm font-semibold text-neutral-700">Rubric / Expected Answer</label>
                           <RichTextEditor value={question.expectedAnswer} onChange={(html) => updateQuestion(index, 'expectedAnswer', html)} onUploadImage={uploadQuizImage} />
                         </div>
                         <div className="flex items-center gap-3 border-t border-neutral-100 pt-4">
                           <span className="text-sm font-semibold text-neutral-700">Max Marks:</span>
                           <input type="number" className="w-24 rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none" value={question.marks} onChange={(e) => updateQuestion(index, 'marks', e.target.value)} />
                         </div>
                       </div>
                     </div>
                   ))}

                   <button onClick={addQuestion} className="w-full rounded-2xl border-2 border-dashed border-neutral-300 bg-white py-5 text-sm font-semibold text-neutral-600 hover:border-neutral-400 hover:text-neutral-950 transition flex justify-center items-center gap-2">
                     <Plus size={18} /> Add Question
                   </button>
                 </div>

                 <div className="flex justify-end gap-3 border-t border-neutral-200 pt-6">
                   <button onClick={() => { setIsCreating(false); setEditingId(null); }} className="rounded-xl border border-neutral-200 bg-white px-6 py-3 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition">Cancel</button>
                   <button onClick={handleSaveQuiz} disabled={saving} className="rounded-xl bg-neutral-950 px-8 py-3 text-sm font-semibold text-white hover:bg-neutral-800 transition shadow-md flex items-center gap-2">
                     <Save size={16} /> {editingId ? 'Update Quiz' : 'Publish Quiz'}
                   </button>
                 </div>
               </div>
            </div>
          ) : (
            <div>
              <button onClick={() => { setIsCreating(true); setFormData(createDefaultForm()); }} className="mb-6 inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 shadow-sm"><Plus size={16} /> Create New Quiz</button>
              {loading ? <p className="text-neutral-500">Loading quizzes...</p> : quizzes.length === 0 ? <div className="p-10 border border-dashed rounded-3xl text-center text-neutral-500 bg-white">No quizzes built yet.</div> : (
                <div className="grid gap-4">
                  {quizzes.map(quiz => (
                    <div key={quiz._id} className="flex flex-col md:flex-row justify-between items-center p-5 bg-white border border-neutral-200 rounded-2xl shadow-sm hover:shadow-md transition">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-lg font-semibold text-neutral-900">{quiz.title}</h3>
                          <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${quiz.isPublished ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{quiz.isPublished ? 'Published' : 'Draft'}</span>
                        </div>
                        <p className="text-sm text-neutral-500">{quiz.questions?.length || 0} Questions • {quiz.totalTimeSeconds || 0}s Total</p>
                      </div>
                      <div className="flex gap-2 mt-4 md:mt-0">
                        <button onClick={() => handleEdit(quiz)} className="p-2.5 rounded-xl border border-neutral-200 text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 transition"><Edit2 size={16}/></button>
                        <button onClick={() => handleDelete(quiz._id)} className="p-2.5 rounded-xl border border-red-100 text-red-500 hover:bg-red-50 transition"><Trash2 size={16}/></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        )}

        {/* --- MANUAL GRADING TAB --- */}
        {activeTab === 'grading' && (
          selectedReview ? (
            <div className="max-w-4xl mx-auto space-y-6">
              <button onClick={() => setSelectedReview(null)} className="flex items-center gap-2 text-sm font-semibold text-neutral-500 hover:text-neutral-900 transition">
                <ChevronLeft size={16}/> Back to Queue
              </button>

              <div className="bg-white rounded-[28px] border border-neutral-200 shadow-sm p-8">
                <h2 className="text-2xl font-bold text-neutral-900 mb-1">Evaluating: {selectedReview.userId?.name}</h2>
                <p className="text-neutral-500 text-sm">{selectedReview.quizId?.title}</p>
              </div>

              {selectedReview.answers.filter(a => a.needsManualReview).map((ans, idx) => {
                const question = selectedReview.quizId?.questions?.find(q => String(q._id) === String(ans.questionId));
                const maxMarks = question?.marks || 0;

                return (
                  <div key={ans._id} className="bg-white rounded-[28px] border border-neutral-200 shadow-sm overflow-hidden">
                    <div className="bg-neutral-50 border-b border-neutral-200 px-8 py-5 flex items-center justify-between">
                      <h3 className="font-semibold text-neutral-900">Pending Review {idx + 1}</h3>
                      <span className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-full">Out of {maxMarks} Marks</span>
                    </div>

                    <div className="p-8 space-y-8">
                      {/* Original Prompt */}
                      <div>
                        <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-3">Original Question</h4>
                        <div className="prose prose-neutral max-w-none text-sm text-neutral-700 bg-neutral-50 p-5 rounded-2xl border border-neutral-200" dangerouslySetInnerHTML={{ __html: question?.content || 'No content' }} />
                      </div>

                      {/* Side by Side Answers */}
                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-3 flex items-center gap-2"><User size={14}/> Student's Answer</h4>
                          <div className="bg-white border border-neutral-200 p-5 rounded-2xl text-sm leading-relaxed text-neutral-900 whitespace-pre-wrap h-full min-h-[150px]">
                            {ans.userAnswer || <span className="italic text-neutral-400">Left blank</span>}
                          </div>
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-3 flex items-center gap-2"><ClipboardCheck size={14}/> Admin Rubric</h4>
                          <div className="bg-blue-50 border border-blue-100 p-5 rounded-2xl text-sm leading-relaxed text-blue-900 prose prose-blue h-full min-h-[150px]" dangerouslySetInnerHTML={{ __html: question?.expectedAnswer || 'No rubric provided' }} />
                        </div>
                      </div>

                      {/* Grading Input Form */}
                      <div className="bg-neutral-900 rounded-2xl p-6 shadow-md mt-6">
                        <h4 className="text-white font-semibold mb-4 flex items-center gap-2"><CheckCircle2 size={18}/> Assign Grade</h4>
                        <div className="flex flex-col md:flex-row gap-4 items-end">
                          <div className="w-full md:w-1/4">
                            <label className="block text-xs text-neutral-400 font-semibold mb-2">Marks Awarded</label>
                            <input type="number" max={maxMarks} min={0} value={gradingForms[ans._id]?.marks || ''} onChange={(e) => handleGradeInput(ans._id, 'marks', e.target.value)} className="w-full bg-neutral-800 border border-neutral-700 text-white rounded-xl px-4 py-3 outline-none focus:border-neutral-500" placeholder="0" />
                          </div>
                          <div className="w-full md:w-3/4">
                            <label className="block text-xs text-neutral-400 font-semibold mb-2 flex items-center gap-2"><MessageSquare size={12}/> Feedback (Optional)</label>
                            <input type="text" value={gradingForms[ans._id]?.feedback || ''} onChange={(e) => handleGradeInput(ans._id, 'feedback', e.target.value)} className="w-full bg-neutral-800 border border-neutral-700 text-white rounded-xl px-4 py-3 outline-none focus:border-neutral-500" placeholder="Great job on..." />
                          </div>
                          <button onClick={() => submitGrade(ans._id, maxMarks)} className="w-full md:w-auto bg-white text-neutral-900 font-bold px-8 py-3 rounded-xl hover:bg-neutral-200 transition shrink-0">
                            Save Grade
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div>
              {loading ? <p className="text-neutral-500">Checking for pending reviews...</p> : reviews.length === 0 ? (
                <div className="p-12 border border-dashed rounded-3xl text-center bg-white shadow-sm">
                  <ClipboardCheck size={48} className="mx-auto text-neutral-300 mb-4" />
                  <h3 className="text-lg font-semibold text-neutral-900 mb-1">All Caught Up!</h3>
                  <p className="text-neutral-500">There are no subjective answers pending manual review.</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {reviews.map(attempt => (
                    <div key={attempt._id} className="bg-white border border-neutral-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition flex flex-col">
                      <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mb-4"><ClipboardCheck size={20}/></div>
                      <h3 className="font-bold text-neutral-900 truncate">{attempt.userId?.name || 'Unknown Student'}</h3>
                      <p className="text-sm text-neutral-500 truncate mb-4">{attempt.quizId?.title}</p>
                      
                      <div className="mt-auto pt-4 border-t border-neutral-100 flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-md">{attempt.answers.filter(a => a.needsManualReview).length} Answers Pending</span>
                        <button onClick={() => openReviewPanel(attempt)} className="text-sm font-bold text-neutral-900 hover:text-blue-600 transition">Grade Now →</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        )}

      </div>
    </div>
  );
}